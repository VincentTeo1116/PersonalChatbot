"""Logs each chat question to Supabase for the admin to review (see supabase/004_chat_logs.sql).
Pure telemetry -- wrapped so a failure here can only ever log a warning, never break the chat response."""
import logging

import httpx

from src.config import Config

logger = logging.getLogger(__name__)


def log_chat(
    question: str,
    answer: str,
    matched: bool,
    top_score: float | None,
    cache_hit: bool,
    latency_ms: int,
) -> None:
    if not Config.SUPABASE_URL or not Config.SUPABASE_ANON_KEY:
        return

    try:
        httpx.post(
            f"{Config.SUPABASE_URL}/rest/v1/chat_logs",
            headers={
                "apikey": Config.SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {Config.SUPABASE_ANON_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            },
            json={
                "question": question[:500],
                "answer": answer[:2000],
                "matched": matched,
                "top_score": top_score,
                "cache_hit": cache_hit,
                "latency_ms": latency_ms,
            },
            timeout=5,
        ).raise_for_status()
    except Exception:
        # Likely the migration hasn't run yet, or a network hiccup -- the visitor already has their answer.
        logger.warning("chat_logs insert failed (non-fatal)", exc_info=True)
