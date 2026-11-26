"""Which Supabase key writes chat logs and feedback, and what happens when a key is missing or refused."""
import logging
import unittest
from unittest.mock import patch

import httpx

from src.config import Config
from src.services import chat_logging

PRIVATE = "private-key-for-tests"
PUBLIC = "public-key-for-tests"


def reply(status: int) -> httpx.Response:
    return httpx.Response(status, request=httpx.Request("POST", "https://example.test/rest/v1/chat_logs"))


def keys_used(post) -> list[str]:
    return [call.kwargs["headers"]["apikey"] for call in post.call_args_list]


class ChatLoggingKeyTests(unittest.TestCase):
    def setUp(self):
        chat_logging._warned_about_key = False
        self.config = patch.multiple(
            Config, SUPABASE_URL="https://example.test", SUPABASE_ANON_KEY=PUBLIC, SUPABASE_SERVICE_ROLE_KEY=PRIVATE
        )
        self.config.start()
        self.addCleanup(self.config.stop)

    def log(self):
        chat_logging.log_chat("q", "a", True, 0.8, False, 12)

    @patch.object(chat_logging.httpx, "post", return_value=reply(201))
    def test_the_private_key_is_used_when_it_is_set(self, post):
        self.log()
        self.assertEqual(keys_used(post), [PRIVATE])
        self.assertEqual(post.call_args.kwargs["headers"]["Authorization"], f"Bearer {PRIVATE}")
        self.assertTrue(post.call_args.args[0].endswith("/rest/v1/chat_logs"))

    @patch.object(chat_logging.httpx, "post", return_value=reply(201))
    def test_feedback_goes_to_its_own_table_with_the_private_key(self, post):
        chat_logging.log_feedback("q", "a", "up", True)
        self.assertEqual(keys_used(post), [PRIVATE])
        self.assertTrue(post.call_args.args[0].endswith("/rest/v1/chat_feedback"))
        self.assertEqual(post.call_args.kwargs["json"]["rating"], "up")

    @patch.object(chat_logging.httpx, "post", return_value=reply(201))
    def test_without_a_private_key_the_public_key_is_used(self, post):
        with patch.object(Config, "SUPABASE_SERVICE_ROLE_KEY", ""):
            self.log()
        self.assertEqual(keys_used(post), [PUBLIC])

    @patch.object(chat_logging.httpx, "post", side_effect=[reply(401), reply(201), reply(403), reply(201)])
    def test_a_refused_private_key_falls_back_to_the_public_key_and_warns_once(self, post):
        with self.assertLogs(chat_logging.logger, level=logging.WARNING) as logs:
            self.log()
            self.log()
        self.assertEqual(keys_used(post), [PRIVATE, PUBLIC, PRIVATE, PUBLIC])
        self.assertEqual(len(logs.output), 1)

    @patch.object(chat_logging.httpx, "post", return_value=reply(400))
    def test_a_rejected_row_is_not_retried_with_the_public_key(self, post):
        with self.assertLogs(chat_logging.logger, level=logging.WARNING):
            self.log()
        self.assertEqual(keys_used(post), [PRIVATE])

    @patch.object(chat_logging.httpx, "post", return_value=reply(401))
    def test_once_the_public_rule_is_removed_a_public_only_backend_fails_quietly(self, post):
        with patch.object(Config, "SUPABASE_SERVICE_ROLE_KEY", ""):
            with self.assertLogs(chat_logging.logger, level=logging.WARNING):
                self.log()  # must not raise
        self.assertEqual(keys_used(post), [PUBLIC])

    @patch.object(chat_logging.httpx, "post", side_effect=httpx.ConnectError("no network"))
    def test_a_network_failure_never_raises(self, post):
        with self.assertLogs(chat_logging.logger, level=logging.WARNING):
            self.log()
        self.assertEqual(post.call_count, 1)

    @patch.object(chat_logging.httpx, "post", side_effect=[reply(401), reply(401)])
    def test_no_key_ever_appears_in_the_logs(self, post):
        with self.assertLogs(chat_logging.logger, level=logging.WARNING) as logs:
            self.log()
        text = "\n".join(logs.output)
        self.assertNotIn(PRIVATE, text)
        self.assertNotIn(PUBLIC, text)

    @patch.object(chat_logging.httpx, "post", return_value=reply(201))
    def test_nothing_is_sent_without_a_url_or_without_any_key(self, post):
        with patch.object(Config, "SUPABASE_URL", ""):
            self.log()
        with patch.multiple(Config, SUPABASE_ANON_KEY="", SUPABASE_SERVICE_ROLE_KEY=""):
            self.log()
        post.assert_not_called()

    @patch.object(chat_logging.httpx, "post", return_value=reply(201))
    def test_the_private_key_alone_is_enough(self, post):
        with patch.object(Config, "SUPABASE_ANON_KEY", ""):
            self.log()
        self.assertEqual(keys_used(post), [PRIVATE])


if __name__ == "__main__":
    unittest.main()
