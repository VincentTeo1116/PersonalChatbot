"""Logs each chat question to Supabase for the admin to review (see supabase/004_chat_logs.sql).
Pure telemetry -- wrapped so a failure here can only ever log a warning, never break the chat response.

Which key writes the rows: the private SUPABASE_SERVICE_ROLE_KEY when it is set, so the two tables need no public insert rule
(see supabase/025_close_public_chat_inserts.sql). Without it, or if Supabase rejects it as a wrong key, the public key is used,
which only works while the public insert rule still exists. The private key is used for these two inserts and nothing else."""
import logging

import httpx

from src.config import Config

logger = logging.getLogger(__name__)

# What Supabase answers when the key itself is not accepted (as opposed to a bad row or a network problem).
_KEY_REJECTED = (401, 403)
_warned_about_key = False


def _post(table: str, key: str, row: dict) -> httpx.Response:
    return httpx.post(
        f"{Config.SUPABASE_URL}/rest/v1/{table}",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        json=row,
        timeout=5,
    )


def _insert(table: str, row: dict) -> None:
    """Writes one row. Never raises: the visitor already has their answer."""
    global _warned_about_key
    if not Config.SUPABASE_URL:
        return
    private, public = Config.SUPABASE_SERVICE_ROLE_KEY, Config.SUPABASE_ANON_KEY
    if not private and not public:
        return

    try:
        if private:
            response = _post(table, private, row)
            if response.status_code not in _KEY_REJECTED or not public:
                response.raise_for_status()
                return
            # The private key was refused (mistyped, or rotated in Supabase). Say so once, then try the public key so logging
            # keeps working where the public insert rule is still in place.
            if not _warned_about_key:
                _warned_about_key = True
                logger.warning(
                    "Supabase refused SUPABASE_SERVICE_ROLE_KEY (HTTP %d); check the value. Trying the public key instead.",
                    response.status_code,
                )
        _post(table, public, row).raise_for_status()
    except Exception as exc:
        # Likely the migration hasn't run yet, a network hiccup, or no key that is allowed to write. Only the kind of error is
        # logged, never the request itself, so a key can never end up in the logs.
        logger.warning("%s insert failed (non-fatal): %s", table, _describe(exc))


def _describe(exc: Exception) -> str:
    if isinstance(exc, httpx.HTTPStatusError):
        return f"HTTP {exc.response.status_code}"
    return type(exc).__name__


def log_chat(
    question: str,
    answer: str,
    matched: bool,
    top_score: float | None,
    cache_hit: bool,
    latency_ms: int,
) -> None:
    _insert("chat_logs", {
        "question": question[:500],
        "answer": answer[:2000],
        "matched": matched,
        "top_score": top_score,
        "cache_hit": cache_hit,
        "latency_ms": latency_ms,
    })


def log_feedback(question: str, answer: str, rating: str, matched: bool) -> None:
    """Stores a visitor's thumbs up/down on an answer (see supabase/012_chat_feedback.sql). Telemetry only, so it never raises."""
    _insert("chat_feedback", {"question": question[:500], "answer": answer[:2000], "rating": rating, "matched": matched})
