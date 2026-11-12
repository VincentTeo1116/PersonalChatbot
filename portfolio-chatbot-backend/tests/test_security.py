import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

import app as app_module
from src.config import Config
from src.services import rate_limit


class RateLimitUnitTests(unittest.TestCase):
    def setUp(self):
        rate_limit.reset()

    def test_blocks_after_the_limit_then_allows_again_when_the_window_passes(self):
        results = [rate_limit.retry_after("k", 3, 60, now=t) for t in (0, 1, 2, 3)]
        self.assertEqual(results[:3], [0, 0, 0])
        self.assertGreater(results[3], 0)
        self.assertEqual(rate_limit.retry_after("k", 3, 60, now=61), 0)

    def test_callers_are_counted_separately(self):
        for t in range(3):
            rate_limit.retry_after("a", 3, 60, now=t)
        self.assertGreater(rate_limit.retry_after("a", 3, 60, now=4), 0)
        self.assertEqual(rate_limit.retry_after("b", 3, 60, now=4), 0)


class EndpointSecurityTests(unittest.TestCase):
    def setUp(self):
        rate_limit.reset()
        self.client = TestClient(app_module.app)

    def test_docs_are_off_by_default(self):
        for path in ("/docs", "/redoc", "/openapi.json"):
            self.assertEqual(self.client.get(path).status_code, 404, path)

    def test_sync_rejects_a_missing_or_wrong_secret(self):
        with patch.object(Config, "SYNC_WEBHOOK_SECRET", "correct-horse"):
            self.assertEqual(self.client.post("/api/admin/sync-kb").status_code, 401)
            self.assertEqual(self.client.post("/api/admin/sync-kb", headers={"X-Sync-Secret": "wrong"}).status_code, 401)

    def test_sync_is_throttled(self):
        with patch.object(Config, "SYNC_WEBHOOK_SECRET", "correct-horse"):
            codes = [self.client.post("/api/admin/sync-kb", headers={"X-Sync-Secret": "wrong"}).status_code for _ in range(12)]
        self.assertEqual(codes[:10], [401] * 10)
        self.assertEqual(codes[10:], [429, 429])

    def test_chat_is_throttled_per_caller_and_a_forged_header_does_not_reset_it(self):
        # The platform proxy appends the real address last; whatever the caller put in front of it is ignored.
        first = {"X-Forwarded-For": "1.1.1.1, 5.5.5.5"}
        codes = [self.client.post("/api/chat", json={"question": ""}, headers=first).status_code for _ in range(15)]
        self.assertEqual(set(codes), {422})  # validation error, but each call still counts
        response = self.client.post("/api/chat", json={"question": ""}, headers={"X-Forwarded-For": "9.9.9.9, 5.5.5.5"})
        self.assertEqual(response.status_code, 429)
        self.assertIn("Retry-After", response.headers)

    def test_a_different_cloudflare_address_gets_its_own_allowance(self):
        for _ in range(15):
            self.client.post("/api/chat", json={"question": ""}, headers={"CF-Connecting-IP": "203.0.113.7"})
        blocked = self.client.post("/api/chat", json={"question": ""}, headers={"CF-Connecting-IP": "203.0.113.7"})
        other = self.client.post("/api/chat", json={"question": ""}, headers={"CF-Connecting-IP": "203.0.113.8"})
        self.assertEqual(blocked.status_code, 429)
        self.assertEqual(other.status_code, 422)

    def test_foreign_origin_gets_no_cors_header(self):
        with patch.object(Config, "ALLOWED_ORIGINS", []):
            response = self.client.get("/health", headers={"Origin": "https://evil.example"})
        self.assertNotIn("access-control-allow-origin", response.headers)


if __name__ == "__main__":
    unittest.main()
