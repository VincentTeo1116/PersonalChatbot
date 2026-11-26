"""Abuse limits: what one caller may do, what everyone together may spend in a day, and what is allowed into the feedback table.
No test here reaches a model, the vector index or the database."""
import json
import os
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from fastapi.testclient import TestClient
from starlette.requests import Request

import app as app_module
from src import config as config_module
from src.config import Config
from src.routes import chat as chat_route
from src.services import budget, feedback_tokens, rate_limit


def fake_request(ip: str) -> Request:
    return Request({"type": "http", "headers": [(b"cf-connecting-ip", ip.encode())], "client": ("10.0.0.1", 1)})


class CallerKeyTests(unittest.TestCase):
    def test_ipv4_addresses_are_counted_singly(self):
        self.assertEqual(rate_limit.caller_key("203.0.113.7"), "203.0.113.7")
        self.assertNotEqual(rate_limit.caller_key("203.0.113.7"), rate_limit.caller_key("203.0.113.8"))

    def test_an_ipv6_block_is_one_caller(self):
        a, b = rate_limit.caller_key("2001:db8:1:2::1"), rate_limit.caller_key("2001:db8:1:2:ffff:ffff:ffff:ffff")
        self.assertEqual(a, b)
        self.assertNotEqual(a, rate_limit.caller_key("2001:db8:1:3::1"))
        self.assertEqual(rate_limit.caller_key("::ffff:203.0.113.7"), "203.0.113.7")

    def test_anything_that_is_not_an_address_falls_into_a_shared_bucket_instead_of_failing(self):
        self.assertEqual(rate_limit.caller_key(""), "unknown")
        self.assertEqual(rate_limit.caller_key("   "), "unknown")
        self.assertEqual(rate_limit.caller_key(None), "unknown")
        self.assertEqual(rate_limit.caller_key("not-an-address"), "not-an-address")
        self.assertEqual(len(rate_limit.caller_key("x" * 5000)), 64)


class CounterTests(unittest.TestCase):
    def setUp(self):
        rate_limit.reset()

    def test_take_records_nothing_when_any_rule_is_full(self):
        rules = [("a", 1, 60), ("b", 5, 60)]
        self.assertEqual(rate_limit.take(rules, now=0), (0, None))
        wait, blocked = rate_limit.take(rules, now=1)
        self.assertGreater(wait, 0)
        self.assertEqual(blocked, "a")
        self.assertEqual(rate_limit.used("b", 60, now=1), 1)  # the refused attempt was not charged to the other rule

    def test_a_limit_of_zero_switches_the_rule_off(self):
        for t in range(50):
            self.assertEqual(rate_limit.take([("off", 0, 60)], now=t), (0, None))

    def test_cleaning_up_minute_counters_does_not_drop_a_daily_one(self):
        with patch.object(rate_limit, "_MAX_KEYS", 50):
            rate_limit.take([("day:someone", 5, 86400)], now=0)
            for i in range(45):
                rate_limit.take([(f"chat:60:{i}", 5, 60)], now=100)
            for i in range(10):  # five minutes later the minute counters are stale; going over the cap triggers the clean-up
                rate_limit.take([(f"chat:60:late{i}", 5, 60)], now=400)
            self.assertLess(len(rate_limit._hits), 15)
            self.assertEqual(rate_limit.used("day:someone", 86400, now=400), 1)

    def test_when_too_many_callers_are_live_the_oldest_go_but_site_wide_counters_stay(self):
        with patch.object(rate_limit, "_MAX_KEYS", 20):
            rate_limit.take([("global:questions", 100, 86400)], now=0)
            for i in range(1, 40):
                rate_limit.take([(f"day:{i}", 5, 86400)], now=i)
            self.assertLessEqual(len(rate_limit._hits), 21)
            self.assertEqual(rate_limit.used("global:questions", 86400, now=40), 1)
            self.assertEqual(rate_limit.used("day:39", 86400, now=40), 1)  # the most recent caller is kept
            self.assertEqual(rate_limit.used("day:1", 86400, now=40), 0)


class MessageTests(unittest.TestCase):
    def setUp(self):
        rate_limit.reset()

    def test_wording_matches_how_long_the_limit_lasts(self):
        self.assertIn("wait a minute", rate_limit.limit_message(60, 30))
        hourly = rate_limit.limit_message(3600, 1500)
        self.assertIn("hourly limit", hourly)
        self.assertIn("about 25 minutes", hourly)
        daily = rate_limit.limit_message(86400, 20000)
        self.assertIn("daily limit", daily)
        self.assertIn("about 6 hours", daily)
        self.assertIn("contact form", daily)
        self.assertIn("about 1 minute.", rate_limit.limit_message(3600, 5))

    def test_a_missing_owner_name_still_gives_a_sentence(self):
        with patch.object(Config, "OWNER_NAME", "  "):
            self.assertIn("reaches the site owner directly", rate_limit.limit_message(86400, 100))
            self.assertIn("the site owner", budget.shared_budget_message())

    def test_hourly_rule_answers_429_with_a_polite_reason_and_a_retry_time(self):
        check = rate_limit.limiter("t", (100, 60), (2, 3600))
        check(fake_request("198.51.100.1"))
        check(fake_request("198.51.100.1"))
        with self.assertRaises(HTTPException) as raised:
            check(fake_request("198.51.100.1"))
        self.assertEqual(raised.exception.status_code, 429)
        self.assertIn("hourly limit", raised.exception.detail)
        self.assertGreater(int(raised.exception.headers["Retry-After"]), 0)
        check(fake_request("198.51.100.2"))  # someone else is unaffected

    def test_two_addresses_in_one_ipv6_block_share_an_allowance(self):
        check = rate_limit.limiter("v6", (2, 60))
        check(fake_request("2001:db8:aa:bb::1"))
        check(fake_request("2001:db8:aa:bb::2"))
        with self.assertRaises(HTTPException):
            check(fake_request("2001:db8:aa:bb::3"))


class LimitSettingTests(unittest.TestCase):
    def test_bad_values_fall_back_to_the_default_and_zero_is_kept(self):
        for raw, expected in (("abc", 15), ("-5", 15), ("", 15), ("   ", 15), ("1.5", 15), ("0", 0), (" 25 ", 25)):
            with patch.dict(os.environ, {"X_LIMIT": raw}):
                self.assertEqual(config_module._limit_env("X_LIMIT", 15), expected, repr(raw))
        os.environ.pop("X_LIMIT", None)
        self.assertEqual(config_module._limit_env("X_LIMIT", 15), 15)


class BudgetUnitTests(unittest.TestCase):
    def setUp(self):
        rate_limit.reset()
        budget._last_warned.clear()

    def test_if_counting_breaks_questions_are_allowed_and_logging_is_skipped(self):
        with patch.object(rate_limit, "take", side_effect=RuntimeError("boom")):
            self.assertTrue(budget.spend_question("203.0.113.9").allowed)
            self.assertFalse(budget.allow_db_write())

    def test_callers_we_cannot_identify_share_one_allowance(self):
        with patch.object(Config, "CALLER_DAILY_QUESTIONS", 1):
            self.assertTrue(budget.spend_question("").allowed)
            refused = budget.spend_question("   ")
            self.assertFalse(refused.allowed)
            self.assertEqual(refused.scope, "caller")

    def test_the_allowance_comes_back_after_24_hours(self):
        with patch.object(Config, "DAILY_QUESTION_BUDGET", 1):
            self.assertTrue(budget.spend_question("203.0.113.1", now=0).allowed)
            refused = budget.spend_question("203.0.113.2", now=10)
            self.assertFalse(refused.allowed)
            self.assertAlmostEqual(refused.retry_after, 86391, delta=2)
            self.assertTrue(budget.spend_question("203.0.113.2", now=86401).allowed)


@patch.object(chat_route, "log_feedback")
@patch.object(chat_route, "log_chat")
@patch.object(chat_route, "generate_answer_formatted", return_value="An answer.")
@patch.object(chat_route, "_retrieve", return_value=[])
@patch.object(chat_route, "_detect_meeting_prefill", return_value=None)
class EndpointTests(unittest.TestCase):
    def setUp(self):
        rate_limit.reset()
        feedback_tokens.reset()
        chat_route.clear_cache()
        budget._last_warned.clear()
        self.client = TestClient(app_module.app)

    def tearDown(self):
        chat_route.clear_cache()
        rate_limit.reset()

    def ask(self, question, ip="203.0.113.1"):
        return self.client.post("/api/chat", json={"question": question}, headers={"CF-Connecting-IP": ip})

    def rate(self, ip="203.0.113.1", **body):
        return self.client.post("/api/chat/feedback", json=body, headers={"CF-Connecting-IP": ip})

    # --- daily budgets ---

    def test_a_caller_over_their_daily_allowance_gets_a_polite_reply_and_no_model_call(self, meeting, retrieve, generate, log_chat, _fb):
        with patch.object(Config, "CALLER_DAILY_QUESTIONS", 2):
            first, second, third = (self.ask(f"What about project {i}?") for i in range(3))
            other = self.ask("What about project 9?", ip="203.0.113.2")
        self.assertEqual([first.json()["kind"], second.json()["kind"]], ["answer", "answer"])
        self.assertEqual(third.status_code, 200)
        body = third.json()
        self.assertEqual(body["kind"], "limit")
        self.assertIn("daily limit", body["answer"])
        self.assertIn("contact form", body["answer"])
        self.assertEqual(body["sources"], [])
        self.assertIsNone(body["feedback_token"])
        self.assertEqual(other.json()["kind"], "answer")
        self.assertEqual(generate.call_count, 3)  # two for the first caller, one for the other, none for the refused question
        self.assertEqual(meeting.call_count, 3)
        self.assertEqual(log_chat.call_count, 3)  # refusals are not written to the database

    def test_when_the_shared_budget_is_used_up_everyone_is_refused_but_saved_answers_and_greetings_still_work(self, meeting, retrieve, generate, log_chat, _fb):
        with patch.object(Config, "DAILY_QUESTION_BUDGET", 2):
            self.ask("What did you build?", ip="203.0.113.1")
            self.ask("Where did you study?", ip="203.0.113.2")
            refused = self.ask("What is your tech stack?", ip="203.0.113.3")
            cached = self.ask("what did you build?", ip="203.0.113.3")
            greeting = self.ask("Hi", ip="203.0.113.3")
        self.assertEqual(refused.json()["kind"], "limit")
        self.assertIn("as many new questions as it can for today", refused.json()["answer"])
        self.assertIn("contact form", refused.json()["answer"])
        self.assertTrue(cached.json()["cache_hit"])
        self.assertEqual(cached.json()["answer"], "An answer.")
        self.assertEqual(greeting.json()["kind"], "smalltalk")
        self.assertEqual(generate.call_count, 2)
        self.assertEqual(retrieve.call_count, 2)
        self.assertEqual(meeting.call_count, 2)

    def test_a_refused_question_does_not_use_up_the_callers_own_allowance(self, *_):
        with patch.object(Config, "DAILY_QUESTION_BUDGET", 1):
            self.ask("First question?", ip="203.0.113.1")
            self.assertEqual(self.ask("Second question?", ip="203.0.113.2").json()["kind"], "limit")
        self.assertEqual(rate_limit.used(f"day:questions:{rate_limit.caller_key('203.0.113.2')}", budget.DAY), 0)
        self.assertEqual(self.ask("Second question?", ip="203.0.113.2").json()["kind"], "answer")

    def test_zero_switches_the_budgets_off(self, _m, _r, generate, *_):
        with patch.object(Config, "DAILY_QUESTION_BUDGET", 0), patch.object(Config, "CALLER_DAILY_QUESTIONS", 0):
            kinds = [self.ask(f"Question number {i}?").json()["kind"] for i in range(6)]
        self.assertEqual(kinds, ["answer"] * 6)
        self.assertEqual(generate.call_count, 6)

    def test_streaming_refuses_the_same_way_without_searching(self, meeting, retrieve, _g, log_chat, _fb):
        with patch.object(Config, "DAILY_QUESTION_BUDGET", 1), patch.object(chat_route, "generate_answer_stream", return_value=iter(["Hi", " there"])) as stream:
            ok = [json.loads(line) for line in chat_route._stream_chat("What did you build?", "203.0.113.1")]
            refused = [json.loads(line) for line in chat_route._stream_chat("Where did you study?", "203.0.113.2")]
        self.assertEqual(ok[-1]["type"], "done")
        self.assertTrue(ok[-1]["feedback_token"])
        self.assertEqual([e["type"] for e in refused], ["status", "chunk", "done"])
        self.assertEqual(refused[-1]["kind"], "limit")
        self.assertEqual(refused[1]["text"], refused[-1]["answer"])
        self.assertNotIn("feedback_token", refused[-1])
        self.assertEqual(stream.call_count, 1)
        self.assertEqual(retrieve.call_count, 1)
        self.assertEqual(log_chat.call_count, 1)

    def test_the_stream_endpoint_passes_the_callers_address_to_the_budget(self, *_):
        with patch.object(Config, "CALLER_DAILY_QUESTIONS", 1), patch.object(chat_route, "generate_answer_stream", side_effect=lambda *a, **k: iter(["ok"])):
            post = lambda q, ip: self.client.post("/api/chat/stream", json={"question": q}, headers={"CF-Connecting-IP": ip})
            last = lambda r: json.loads(r.text.strip().splitlines()[-1])
            self.assertNotIn("kind", last(post("Question one?", "203.0.113.1")))
            self.assertEqual(last(post("Question two?", "203.0.113.1"))["kind"], "limit")
            self.assertNotIn("kind", last(post("Question two?", "203.0.113.2")))

    def test_burst_limit_answers_429_with_a_polite_message(self, *_):
        responses = [self.ask("Hi") for _ in range(16)]
        self.assertEqual({r.status_code for r in responses[:15]}, {200})
        self.assertEqual(responses[15].status_code, 429)
        self.assertIn("wait a minute", responses[15].json()["detail"])
        self.assertIn("Retry-After", responses[15].headers)

    def test_logging_stops_at_its_daily_cap_but_answers_continue(self, _m, _r, _g, log_chat, _fb):
        with patch.object(Config, "DAILY_LOG_ROWS", 1):
            kinds = [self.ask(f"Question number {i}?").json()["kind"] for i in range(3)]
        self.assertEqual(kinds, ["answer"] * 3)
        self.assertEqual(log_chat.call_count, 1)

    # --- feedback ---

    def test_a_rating_is_stored_once_with_the_servers_own_copy_of_the_answer(self, _m, _r, _g, _log, log_feedback):
        token = self.ask("What did you build?").json()["feedback_token"]
        self.assertTrue(token)
        first = self.rate(token=token, rating="up", question="FAKE QUESTION", answer="FAKE ANSWER", matched=True)
        again = self.rate(token=token, rating="down")
        self.assertEqual(first.json(), {"status": "ok"})
        self.assertEqual(again.json(), {"status": "ignored"})
        log_feedback.assert_called_once_with("What did you build?", "An answer.", "up", False)

    def test_ratings_without_a_valid_ticket_are_ignored_not_stored(self, _m, _r, _g, _log, log_feedback):
        legacy = self.rate(question="What?", answer="Anything I like", rating="up", matched=True)  # what an older widget sends
        unknown = self.rate(token="not-a-real-ticket", rating="down")
        empty = self.rate(token="", rating="down")
        self.assertEqual([r.status_code for r in (legacy, unknown, empty)], [200, 200, 200])
        self.assertEqual([r.json()["status"] for r in (legacy, unknown, empty)], ["ignored"] * 3)
        self.assertEqual(self.rate(token="x", rating="sideways").status_code, 422)
        self.assertEqual(self.rate(token="x" * 500, rating="up").status_code, 422)
        log_feedback.assert_not_called()

    def test_greetings_and_refusals_carry_no_ticket_and_a_saved_answer_gets_its_own(self, *_):
        self.assertIsNone(self.ask("Hi").json()["feedback_token"])
        first = self.ask("What did you build?").json()["feedback_token"]
        second = self.ask("What did you build?", ip="203.0.113.2").json()
        self.assertTrue(second["cache_hit"])
        self.assertTrue(second["feedback_token"])
        self.assertNotEqual(first, second["feedback_token"])

    def test_an_answer_is_still_sent_when_a_ticket_cannot_be_made(self, *_):
        with patch.object(feedback_tokens.secrets, "token_urlsafe", side_effect=OSError("no entropy")):
            response = self.ask("What did you build?")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["answer"], "An answer.")
        self.assertIsNone(response.json()["feedback_token"])

    def test_feedback_is_throttled_per_caller(self, *_):
        codes = [self.rate(token="nope", rating="up").status_code for _ in range(6)]
        self.assertEqual(codes, [200] * 5 + [429])
        self.assertEqual(self.rate(ip="203.0.113.50", token="nope", rating="up").status_code, 200)

    def test_feedback_respects_the_daily_log_cap(self, _m, _r, _g, _log, log_feedback):
        with patch.object(Config, "DAILY_LOG_ROWS", 0):  # 0 = no cap
            tokens = [self.ask(f"Question number {i}?").json()["feedback_token"] for i in range(2)]
        with patch.object(Config, "DAILY_LOG_ROWS", 1):
            statuses = [self.rate(token=t, rating="up").json()["status"] for t in tokens]
        self.assertEqual(statuses, ["ok", "ok"])  # the visitor is told nothing went wrong
        self.assertEqual(log_feedback.call_count, 1)


class TicketTests(unittest.TestCase):
    def setUp(self):
        feedback_tokens.reset()

    def test_only_strings_of_a_sane_length_are_looked_up(self):
        token = feedback_tokens.issue("q", "a", True)
        for bad in (None, 123, [], "", "x" * 65):
            self.assertIsNone(feedback_tokens.redeem(bad))
        self.assertEqual(feedback_tokens.redeem(token), {"question": "q", "answer": "a", "matched": True})

    def test_stored_text_is_capped(self):
        entry = feedback_tokens.redeem(feedback_tokens.issue("q" * 9000, "a" * 9000, False))
        self.assertEqual((len(entry["question"]), len(entry["answer"])), (500, 2000))


if __name__ == "__main__":
    unittest.main()
