import json
import logging
import time
from typing import Annotated, Iterator

from cachetools import TTLCache
from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, StringConstraints

from src.config import Config
from src.services import pinecone_service
from src.services.chat_logging import log_chat
from src.services.gemini_service import embed_text
from src.services.groq_service import generate_answer, generate_answer_stream
from src.services.text_utils import strip_markdown

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["chat"])

_cache: TTLCache = TTLCache(maxsize=Config.CACHE_SIZE, ttl=Config.CACHE_TTL)


def clear_cache() -> None:
    """Drop cached answers -- called after a KB sync so visitors never get stale replies."""
    _cache.clear()


class ChatRequest(BaseModel):
    # min_length=1 so a short "Hi" isn't rejected like it used to be; strip_whitespace still catches blank input.
    question: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]


class Source(BaseModel):
    category: str
    question: str
    score: float


class ChatResponse(BaseModel):
    answer: str
    sources: list[Source]
    cache_hit: bool
    latency_ms: int


def _build_context(matches: list[dict]) -> str:
    blocks = []
    for m in matches:
        meta = m["metadata"]
        blocks.append(f"[{meta.get('category', 'General')}] Q: {meta.get('question', '')}\nA: {meta.get('answer', '')}")
    return "\n\n".join(blocks)


def _retrieve(question: str) -> list[dict]:
    """Embed the question and return the Pinecone matches that clear MIN_SCORE."""
    query_vector = embed_text(question, task_type="retrieval_query")
    return [m for m in pinecone_service.query(query_vector) if m["score"] >= Config.MIN_SCORE]


def _sources_from_matches(matches: list[dict]) -> list[dict]:
    return [
        {
            "category": m["metadata"].get("category", ""),
            "question": m["metadata"].get("question", ""),
            "score": round(m["score"], 3),
        }
        for m in matches
    ]


def _top_score(sources: list[dict]) -> float | None:
    return max((s["score"] for s in sources), default=None)


@router.post("", response_model=ChatResponse)
async def chat(payload: ChatRequest, background_tasks: BackgroundTasks) -> ChatResponse:
    start = time.monotonic()
    clean_question = payload.question.strip()
    cache_key = clean_question.lower()

    if cache_key in _cache:
        cached = _cache[cache_key]
        latency_ms = int((time.monotonic() - start) * 1000)
        background_tasks.add_task(
            log_chat, clean_question, cached["answer"], bool(cached["sources"]), _top_score(cached["sources"]), True, latency_ms
        )
        return ChatResponse(answer=cached["answer"], sources=cached["sources"], cache_hit=True, latency_ms=latency_ms)

    matches = _retrieve(clean_question)
    context = _build_context(matches)
    answer = generate_answer(clean_question, context)
    sources = _sources_from_matches(matches)

    _cache[cache_key] = {"answer": answer, "sources": sources}
    latency_ms = int((time.monotonic() - start) * 1000)
    background_tasks.add_task(log_chat, clean_question, answer, bool(sources), _top_score(sources), False, latency_ms)

    return ChatResponse(answer=answer, sources=sources, cache_hit=False, latency_ms=latency_ms)


def _stream_chat(question: str) -> Iterator[str]:
    # Yields "chunk" lines as text streams in, then one "done" (or "error") line with the final
    # markdown-stripped answer -- clients should trust that over the concatenated chunks.
    # Plain def, not async: the Gemini call blocks, so Starlette runs this in a worker thread.
    start = time.monotonic()
    cache_key = question.lower()

    if cache_key in _cache:
        cached = _cache[cache_key]
        answer, sources = cached["answer"], cached["sources"]
        yield json.dumps({"type": "chunk", "text": answer}) + "\n"
        latency_ms = int((time.monotonic() - start) * 1000)
        yield json.dumps(
            {"type": "done", "answer": answer, "sources": sources, "cache_hit": True, "latency_ms": latency_ms}
        ) + "\n"
        log_chat(question, answer, bool(sources), _top_score(sources), True, latency_ms)
        return

    try:
        matches = _retrieve(question)
        context = _build_context(matches)
        sources = _sources_from_matches(matches)

        pieces: list[str] = []
        for piece in generate_answer_stream(question, context):
            pieces.append(piece)
            yield json.dumps({"type": "chunk", "text": piece}) + "\n"

        answer = strip_markdown("".join(pieces).strip())
        _cache[cache_key] = {"answer": answer, "sources": sources}
        latency_ms = int((time.monotonic() - start) * 1000)
        yield json.dumps(
            {"type": "done", "answer": answer, "sources": sources, "cache_hit": False, "latency_ms": latency_ms}
        ) + "\n"
        log_chat(question, answer, bool(sources), _top_score(sources), False, latency_ms)
    except Exception:
        logger.exception("Streaming chat failed")
        yield json.dumps({"type": "error", "message": "Something went wrong generating a response."}) + "\n"


@router.post("/stream")
def chat_stream(payload: ChatRequest) -> StreamingResponse:
    clean_question = payload.question.strip()
    return StreamingResponse(_stream_chat(clean_question), media_type="application/x-ndjson")
