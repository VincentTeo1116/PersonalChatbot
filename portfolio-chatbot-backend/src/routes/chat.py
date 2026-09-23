import logging
import time

from cachetools import TTLCache
from fastapi import APIRouter
from pydantic import BaseModel, Field

from src.config import Config
from src.services import pinecone_service
from src.services.gemini_service import embed_text, generate_answer

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["chat"])

_cache: TTLCache = TTLCache(maxsize=Config.CACHE_SIZE, ttl=Config.CACHE_TTL)


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=500)


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


@router.post("", response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
    start = time.monotonic()
    clean_question = payload.question.strip()

    cache_key = clean_question.lower()
    if cache_key in _cache:
        cached = _cache[cache_key]
        return ChatResponse(**cached, cache_hit=True, latency_ms=int((time.monotonic() - start) * 1000))

    query_vector = embed_text(clean_question, task_type="retrieval_query")
    matches = [m for m in pinecone_service.query(query_vector) if m["score"] >= Config.MIN_SCORE]

    context = _build_context(matches)
    answer = generate_answer(clean_question, context)

    sources = [
        Source(category=m["metadata"].get("category", ""), question=m["metadata"].get("question", ""), score=round(m["score"], 3))
        for m in matches
    ]

    result = {"answer": answer, "sources": sources}
    _cache[cache_key] = result

    return ChatResponse(**result, cache_hit=False, latency_ms=int((time.monotonic() - start) * 1000))
