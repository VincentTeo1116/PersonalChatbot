"""Daily spending limits for the things that cost quota or storage.

The per-address limits in rate_limit.py stop one caller; they do nothing against many addresses at once. These are the caps that
hold however many callers there are:

  spend_question   one question that needs the model (up to two Groq calls and one embedding). Checked against the caller's own
                   daily allowance and against a budget shared by everyone. Greetings and cached answers never reach it.
  allow_db_write   one row in chat_logs or chat_feedback, against a shared daily cap, so logging cannot be used to fill the database.

When a budget is used up the caller gets a polite message and no model call is made. If the counting itself ever fails, the
question is allowed (and the error logged): a bug here should not take the chatbot away from real visitors, and the per-address
limits and the providers' own quotas still apply.
"""
import logging
import time
from dataclasses import dataclass

from src.config import Config
from src.services import rate_limit

logger = logging.getLogger(__name__)

DAY = 86_400
GLOBAL_QUESTIONS = "global:questions"
GLOBAL_DB_WRITES = "global:db-writes"
_WARN_EVERY = 3600
_last_warned: dict[str, float] = {}


@dataclass(frozen=True)
class Verdict:
    allowed: bool
    scope: str | None = None  # "caller" or "everyone" when refused
    retry_after: int = 0
    message: str = ""


def _warn(what: str, text: str, *args) -> None:
    """At most one warning an hour per budget: during an attack every refused request would otherwise write a log line."""
    now = time.monotonic()
    if now - _last_warned.get(what, -_WARN_EVERY) >= _WARN_EVERY:
        _last_warned[what] = now
        logger.warning(text, *args)


def shared_budget_message() -> str:
    return (
        "This assistant has answered as many new questions as it can for today, so I can't take this one right now. "
        "Questions it has answered recently still work, and it will be back to normal within a day. "
        f"In the meantime, the contact form on this site reaches {rate_limit.owner_first_name()} directly. Sorry about that!"
    )


def spend_question(ip: str, now: float | None = None) -> Verdict:
    """Call once, just before the first model call for a question. Records the spend only when it is allowed."""
    try:
        caller_rule = f"day:questions:{rate_limit.caller_key(ip)}"
        wait, blocked = rate_limit.take(
            [(caller_rule, Config.CALLER_DAILY_QUESTIONS, DAY), (GLOBAL_QUESTIONS, Config.DAILY_QUESTION_BUDGET, DAY)], now
        )
    except Exception:
        logger.exception("Question budget check failed; allowing the question")
        return Verdict(True)
    if not wait:
        return Verdict(True)
    if blocked == GLOBAL_QUESTIONS:
        _warn("questions", "Daily question budget (%d) is used up; refusing new questions until it frees up", Config.DAILY_QUESTION_BUDGET)
        return Verdict(False, "everyone", wait, shared_budget_message())
    return Verdict(False, "caller", wait, rate_limit.limit_message(DAY, wait))


def allow_db_write(now: float | None = None) -> bool:
    """True when one more log or feedback row may be written today. Refusing only skips the row; the visitor is not affected."""
    try:
        wait, _ = rate_limit.take([(GLOBAL_DB_WRITES, Config.DAILY_LOG_ROWS, DAY)], now)
    except Exception:
        logger.exception("Log budget check failed; skipping the write")
        return False
    if wait:
        _warn("db-writes", "Daily log budget (%d rows) is used up; not logging until it frees up", Config.DAILY_LOG_ROWS)
    return not wait
