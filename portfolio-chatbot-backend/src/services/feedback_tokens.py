"""One-time tickets that let a visitor rate an answer this server actually gave.

Every real answer comes with a random ticket. The server remembers, for a day, which question and answer the ticket belongs to.
A thumbs up or down must present the ticket: the stored copy of the question and answer is what gets saved, never text sent by
the caller, and a ticket works once. So the feedback table can only grow by one row per answer served, and nobody can post
made-up answers into it.

Kept in memory: tickets are lost on a restart, and then that feedback is simply not recorded. Nothing here may break an answer,
so issuing never raises.
"""
import logging
import secrets
import threading

from cachetools import TTLCache

logger = logging.getLogger(__name__)

TICKET_TTL = 86_400
MAX_TICKETS = 2_000  # the oldest are dropped first when more answers than this are waiting for a rating
MAX_TOKEN_LENGTH = 64

_lock = threading.Lock()
_pending: TTLCache = TTLCache(maxsize=MAX_TICKETS, ttl=TICKET_TTL)


def issue(question: str, answer: str, matched: bool) -> str | None:
    """A ticket for this answer, or None if one could not be made (the answer is still sent, just without a rating option)."""
    try:
        token = secrets.token_urlsafe(24)
        with _lock:
            _pending[token] = {"question": question[:500], "answer": answer[:2000], "matched": bool(matched)}
        return token
    except Exception:
        logger.warning("Could not issue a feedback ticket (non-fatal)", exc_info=True)
        return None


def redeem(token: object) -> dict | None:
    """The stored question and answer for a ticket, exactly once. None for a missing, unknown, expired or already used ticket."""
    if not isinstance(token, str) or not token or len(token) > MAX_TOKEN_LENGTH:
        return None
    try:
        with _lock:
            return _pending.pop(token, None)
    except Exception:
        logger.warning("Could not read a feedback ticket (non-fatal)", exc_info=True)
        return None


def reset() -> None:
    with _lock:
        _pending.clear()
