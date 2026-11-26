import json
import logging
import time
from typing import Annotated, Iterator, Literal

from cachetools import TTLCache
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, StringConstraints

from src.config import Config
from src.services import budget, feedback_tokens, retrieval
from src.services.chat_logging import log_chat, log_feedback
from src.services.groq_service import BusyError, detect_meeting_intent, generate_answer_formatted, generate_answer_stream
from src.services.kb_sync import source_url
from src.services.rate_limit import client_ip, limiter
from src.services.small_talk import small_talk_reply
from src.services.text_utils import highlight, strip_markdown, tidy_markdown

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["chat"])

_cache: TTLCache = TTLCache(maxsize=Config.CACHE_SIZE, ttl=Config.CACHE_TTL)


def clear_cache() -> None:
    """Drop cached answers -- called after a KB sync so visitors never get stale replies."""
    _cache.clear()


class ChatRequest(BaseModel):
    # min_length=1 so a short "Hi" isn't rejected like it used to be; strip_whitespace still catches blank input.
    question: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]


class FeedbackRequest(BaseModel):
    # The ticket that came with the answer (see feedback_tokens.py). The question and answer are looked up from it on the server;
    # older widgets also send their own copies of those, which are accepted and ignored.
    token: Annotated[str, StringConstraints(max_length=feedback_tokens.MAX_TOKEN_LENGTH)] | None = None
    rating: Literal["up", "down"]


class Source(BaseModel):
    category: str
    question: str
    score: float
    url: str = ""
    label: str = ""
    snippet: str = ""


class MeetingPrefill(BaseModel):
    name: str = ""
    position: str = ""
    company: str = ""
    email: str = ""
    phone: str = ""
    message: str = ""


class ChatResponse(BaseModel):
    answer: str
    sources: list[Source]
    cache_hit: bool
    latency_ms: int
    meeting_prefill: MeetingPrefill | None = None
    # "smalltalk" marks a canned greeting/thanks reply: nothing was searched, so the widget shows no sources or feedback controls for it.
    # "limit" marks a polite refusal because a daily limit was reached: no model was called and there is nothing to rate either.
    kind: str = "answer"
    # Present on real answers only: the one-time ticket the widget sends back with a thumbs up or down.
    feedback_token: str | None = None


def _small_talk(question: str) -> str | None:
    return small_talk_reply(question, Config.OWNER_NAME.split()[0])


def _build_context(matches: list[dict]) -> str:
    blocks = []
    for m in matches:
        meta = m["metadata"]
        blocks.append(f"[{meta.get('category', 'General')}] Q: {meta.get('question', '')}\nA: {meta.get('answer', '')}")
    return "\n\n".join(blocks)


def _retrieve(question: str) -> list[dict]:
    """Embed the question and return the Pinecone matches that clear MIN_SCORE."""
    return [m for m in retrieval.search(question) if m["score"] >= Config.MIN_SCORE]


def _snippet(text: str, limit: int = 240) -> str:
    text = " ".join((text or "").split())
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0].rstrip(",;:") + "…"


# Only entries about as relevant as the best one are shown as sources, so a weak 0.55 match doesn't pose as support.
SOURCE_SCORE_WINDOW = 0.08
MAX_SOURCES = 3


def _sources_from_matches(matches: list[dict]) -> list[dict]:
    sources, seen = [], set()
    best = max((m["score"] for m in matches), default=0)
    for m in matches:
        if m["score"] < best - SOURCE_SCORE_WINDOW or len(sources) >= MAX_SOURCES:
            continue
        meta = m["metadata"]
        category = meta.get("category", "")
        url = source_url(category, meta.get("url", ""))
        label = meta.get("label") or category
        if (url, label) in seen:
            continue
        seen.add((url, label))
        sources.append(
            {
                "category": category,
                "question": meta.get("question", ""),
                "score": round(m["score"], 3),
                "url": url,
                "label": label,
                "snippet": _snippet(meta.get("answer", "")),
            }
        )
    return sources


def _highlight_terms(matches: list[dict]) -> list[str]:
    """Names worth bolding in the answer: the matched entries' titles and tags (project names, tools)."""
    terms: list[str] = []
    for m in matches:
        meta = m["metadata"]
        if meta.get("label") and meta.get("label") != meta.get("category"):
            terms.append(meta["label"])
        terms += [t for t in (meta.get("tags") or "").split(",")]
    return terms


def _top_score(sources: list[dict]) -> float | None:
    return max((s["score"] for s in sources), default=None)


BUSY_MESSAGE = "I'm getting a lot of questions right now -- please try again in a few seconds."

MEETING_CONFIRMATION_MESSAGE = (
    "Got it! I've opened the meeting request form for you with what you've shared -- "
    "feel free to review the details and hit Send when you're ready."
)


def _detect_meeting_prefill(question: str) -> MeetingPrefill | None:
    try:
        fields = detect_meeting_intent(question)
    except Exception:
        logger.warning("Meeting-intent detection failed (non-fatal)", exc_info=True)
        return None
    return MeetingPrefill.model_validate(fields) if fields is not None else None


def _log_chat(*args) -> None:
    """log_chat, unless today's logging allowance is used up (see budget.allow_db_write)."""
    if budget.allow_db_write():
        log_chat(*args)


def _log_feedback(*args) -> None:
    if budget.allow_db_write():
        log_feedback(*args)


# Every request counts here, cached or not: a burst allowance plus an hourly cap per caller. What a question may *spend* is
# limited separately, per caller and for everyone together, by budget.spend_question just before the first model call.
chat_limit = limiter("chat", (Config.CHAT_PER_MINUTE, 60), (Config.CHAT_PER_HOUR, 3600))


# Plain def (not async): the model and search calls block, so FastAPI runs this in a worker thread instead of stalling the event loop.
@router.post("", response_model=ChatResponse, dependencies=[Depends(chat_limit)])
def chat(payload: ChatRequest, request: Request, background_tasks: BackgroundTasks) -> ChatResponse:
    start = time.monotonic()
    clean_question = payload.question.strip()
    cache_key = clean_question.lower()
    elapsed = lambda: int((time.monotonic() - start) * 1000)

    greeting = _small_talk(clean_question)
    if greeting is not None:
        latency_ms = elapsed()
        background_tasks.add_task(_log_chat, clean_question, greeting, False, None, False, latency_ms)
        return ChatResponse(answer=greeting, sources=[], cache_hit=False, latency_ms=latency_ms, kind="smalltalk")

    # A saved answer costs nothing, so it is served before anything that calls a model, and still works when the daily budget is
    # used up. Meeting requests are never saved (see below), so a cached question is by definition not one.
    if cache_key in _cache:
        cached = _cache[cache_key]
        latency_ms = elapsed()
        background_tasks.add_task(
            _log_chat, clean_question, cached["plain"], bool(cached["sources"]), _top_score(cached["sources"]), True, latency_ms
        )
        return ChatResponse(
            answer=cached["answer"], sources=cached["sources"], cache_hit=True, latency_ms=latency_ms,
            feedback_token=feedback_tokens.issue(clean_question, cached["plain"], bool(cached["sources"])),
        )

    # From here on the question costs model calls. Refused politely, with no model call and no log row, once the caller's or the
    # site's daily allowance is used up.
    verdict = budget.spend_question(client_ip(request))
    if not verdict.allowed:
        return ChatResponse(answer=verdict.message, sources=[], cache_hit=False, latency_ms=elapsed(), kind="limit")

    # Checked before the normal answer and short-circuits it -- a meeting request gets the
    # one confirmation message, never also the normal grounded (and often unhelpful, "I can't
    # schedule that") answer. Never cached either: the drafted fields are specific to this
    # visitor's own wording, so two different people phrasing it the same way shouldn't reuse
    # each other's prefill.
    meeting_prefill = _detect_meeting_prefill(clean_question)
    if meeting_prefill is not None:
        latency_ms = elapsed()
        background_tasks.add_task(_log_chat, clean_question, MEETING_CONFIRMATION_MESSAGE, False, None, False, latency_ms)
        return ChatResponse(
            answer=MEETING_CONFIRMATION_MESSAGE, sources=[], cache_hit=False, latency_ms=latency_ms,
            meeting_prefill=meeting_prefill,
        )

    matches = _retrieve(clean_question)
    context = _build_context(matches)
    try:
        formatted = generate_answer_formatted(clean_question, context)
    except BusyError:
        raise HTTPException(status_code=503, detail=BUSY_MESSAGE)
    plain = strip_markdown(formatted)  # what gets logged
    answer = highlight(formatted, _highlight_terms(matches))
    sources = _sources_from_matches(matches)

    _cache[cache_key] = {"answer": answer, "plain": plain, "sources": sources}
    latency_ms = elapsed()
    background_tasks.add_task(_log_chat, clean_question, plain, bool(sources), _top_score(sources), False, latency_ms)

    return ChatResponse(
        answer=answer, sources=sources, cache_hit=False, latency_ms=latency_ms,
        feedback_token=feedback_tokens.issue(clean_question, plain, bool(sources)),
    )


def _stream_chat(question: str, ip: str = "unknown") -> Iterator[str]:
    # Stage events describe completed/started backend operations, not model reasoning.
    # "chunk" lines stream text; "done" contains the canonical answer, tidied to the markdown the widget renders.
    # Plain def, not async: the Gemini call blocks, so Starlette runs this in a worker thread.
    start = time.monotonic()
    cache_key = question.lower()
    yield json.dumps({"type": "status", "stage": "checking_request"}) + "\n"

    greeting = _small_talk(question)
    if greeting is not None:
        yield json.dumps({"type": "chunk", "text": greeting}) + "\n"
        latency_ms = int((time.monotonic() - start) * 1000)
        yield json.dumps({
            "type": "done", "answer": greeting, "sources": [], "cache_hit": False, "latency_ms": latency_ms, "kind": "smalltalk",
        }) + "\n"
        _log_chat(question, greeting, False, None, False, latency_ms)
        return

    # Same order as the non-streaming endpoint: a saved answer is free and comes first; anything after it costs model calls and
    # must fit the daily budget; a meeting request then short-circuits straight to the one confirmation line.
    if cache_key in _cache:
        yield json.dumps({"type": "status", "stage": "loading_saved_answer"}) + "\n"
        cached = _cache[cache_key]
        answer, sources = cached["answer"], cached["sources"]
        yield json.dumps({"type": "chunk", "text": cached["plain"]}) + "\n"
        latency_ms = int((time.monotonic() - start) * 1000)
        yield json.dumps({
            "type": "done", "answer": answer, "sources": sources, "cache_hit": True, "latency_ms": latency_ms,
            "feedback_token": feedback_tokens.issue(question, cached["plain"], bool(sources)),
        }) + "\n"
        _log_chat(question, cached["plain"], bool(sources), _top_score(sources), True, latency_ms)
        return

    verdict = budget.spend_question(ip)
    if not verdict.allowed:
        yield json.dumps({"type": "chunk", "text": verdict.message}) + "\n"
        yield json.dumps({
            "type": "done", "answer": verdict.message, "sources": [], "cache_hit": False,
            "latency_ms": int((time.monotonic() - start) * 1000), "kind": "limit",
        }) + "\n"
        return

    meeting_prefill = _detect_meeting_prefill(question)
    if meeting_prefill is not None:
        yield json.dumps({"type": "status", "stage": "opening_meeting"}) + "\n"
        latency_ms = int((time.monotonic() - start) * 1000)
        yield json.dumps({
            "type": "done", "answer": MEETING_CONFIRMATION_MESSAGE, "sources": [], "cache_hit": False,
            "latency_ms": latency_ms, "meeting_prefill": meeting_prefill.model_dump(),
        }) + "\n"
        _log_chat(question, MEETING_CONFIRMATION_MESSAGE, False, None, False, latency_ms)
        return

    try:
        yield json.dumps({"type": "status", "stage": "searching_knowledge"}) + "\n"
        matches = _retrieve(question)
        yield json.dumps({"type": "status", "stage": "preparing_answer"}) + "\n"
        context = _build_context(matches)
        sources = _sources_from_matches(matches)

        pieces: list[str] = []
        yield json.dumps({"type": "status", "stage": "writing_response"}) + "\n"
        for piece in generate_answer_stream(question, context):
            pieces.append(piece)
            yield json.dumps({"type": "chunk", "text": piece}) + "\n"

        formatted = tidy_markdown("".join(pieces).strip())
        plain = strip_markdown(formatted)  # what gets logged
        answer = highlight(formatted, _highlight_terms(matches))
        _cache[cache_key] = {"answer": answer, "plain": plain, "sources": sources}
        latency_ms = int((time.monotonic() - start) * 1000)
        yield json.dumps({
            "type": "done", "answer": answer, "sources": sources, "cache_hit": False, "latency_ms": latency_ms,
            "feedback_token": feedback_tokens.issue(question, plain, bool(sources)),
        }) + "\n"
        _log_chat(question, plain, bool(sources), _top_score(sources), False, latency_ms)
    except BusyError:
        yield json.dumps({"type": "error", "message": BUSY_MESSAGE}) + "\n"
    except Exception:
        logger.exception("Streaming chat failed")
        yield json.dumps({"type": "error", "message": "Something went wrong generating a response."}) + "\n"


@router.post("/stream", dependencies=[Depends(chat_limit)])
def chat_stream(payload: ChatRequest, request: Request) -> StreamingResponse:
    clean_question = payload.question.strip()
    return StreamingResponse(_stream_chat(clean_question, client_ip(request)), media_type="application/x-ndjson")


# A visitor rates an answer at most once, so these are far below the chat limits.
feedback_limit = limiter("feedback", (5, 60), (20, 3600), (40, 86400))


@router.post("/feedback", dependencies=[Depends(feedback_limit)])
def chat_feedback(payload: FeedbackRequest, background_tasks: BackgroundTasks) -> dict[str, str]:
    """Thumbs up/down from the widget; stored for the admin to review in /admin/chatbot.

    Only a rating that carries the one-time ticket of an answer this server gave is stored, with the server's own copy of the
    question and answer. Anything else (no ticket, an unknown, expired or reused one) is quietly ignored: the visitor has nothing
    to fix, and a caller probing the endpoint learns nothing from the reply."""
    entry = feedback_tokens.redeem(payload.token)
    if entry is None:
        return {"status": "ignored"}
    background_tasks.add_task(_log_feedback, entry["question"], entry["answer"], payload.rating, entry["matched"])
    return {"status": "ok"}
