"""Logs each chat question to Supabase so the admin can see what visitors actually
ask (see supabase/004_chat_logs.sql for the table + RLS policies).

This is pure telemetry: if it fails for any reason (table not migrated yet, Supabase
briefly unreachable, etc.) it must never break or slow down the chat response the
visitor is waiting on. Every call is wrapped so it can only log a warning, never raise.
"""
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
        # Most likely cause: 004_chat_logs.sql hasn't been run yet in Supabase, or a
        # transient network hiccup. Either way, the visitor already has their answer --
        # this is best-effort analytics, never allowed to surface as a chat failure.
        logger.warning("chat_logs insert failed (non-fatal)", exc_info=True)
