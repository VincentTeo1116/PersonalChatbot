import json
import unittest
from unittest.mock import patch

from src.routes import chat as chat_route


def events(question):
    return [json.loads(line) for line in chat_route._stream_chat(question)]


def stages(stream):
    return [item["stage"] for item in stream if item["type"] == "status"]


class ChatProgressTests(unittest.TestCase):
    def setUp(self):
        chat_route.clear_cache()

    def tearDown(self):
        chat_route.clear_cache()

    @patch.object(chat_route, "log_chat")
    @patch.object(chat_route, "generate_answer_stream", return_value=iter(["Hello", " there"]))
    @patch.object(chat_route, "_retrieve", return_value=[])
    @patch.object(chat_route, "_detect_meeting_prefill", return_value=None)
    def test_search_and_generation_stages_match_the_real_path(self, _meeting, _retrieve, _generate, _log):
        stream = events("What did you build?")
        self.assertEqual(stages(stream), [
            "checking_request", "searching_knowledge", "preparing_answer", "writing_response",
        ])
        self.assertEqual([item["text"] for item in stream if item["type"] == "chunk"], ["Hello", " there"])
        self.assertEqual(stream[-1]["type"], "done")
        self.assertFalse(stream[-1]["cache_hit"])

        cached = events("What did you build?")
        self.assertEqual(stages(cached), ["checking_request", "loading_saved_answer"])
        self.assertTrue(cached[-1]["cache_hit"])
        _retrieve.assert_called_once()
        _generate.assert_called_once()

    @patch.object(chat_route, "log_chat")
    @patch.object(chat_route, "_retrieve")
    @patch.object(chat_route, "_detect_meeting_prefill", return_value=chat_route.MeetingPrefill(name="Visitor"))
    def test_meeting_request_skips_search_and_generation(self, _meeting, retrieve, _log):
        stream = events("Can we meet?")
        self.assertEqual(stages(stream), ["checking_request", "opening_meeting"])
        self.assertEqual(stream[-1]["meeting_prefill"]["name"], "Visitor")
        retrieve.assert_not_called()

    @patch.object(chat_route, "log_chat")
    @patch.object(chat_route, "generate_answer_stream", side_effect=chat_route.BusyError("busy"))
    @patch.object(chat_route, "_retrieve", return_value=[])
    @patch.object(chat_route, "_detect_meeting_prefill", return_value=None)
    def test_busy_response_ends_in_error(self, _meeting, _retrieve, _generate, _log):
        stream = events("What did you build?")
        self.assertEqual(stages(stream)[-1], "writing_response")
        self.assertEqual(stream[-1]["type"], "error")


if __name__ == "__main__":
    unittest.main()
