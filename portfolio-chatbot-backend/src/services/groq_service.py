"""Answer generation via Groq -- its free tier is much less likely to get rate-limited than
Gemini's for a portfolio site. Embeddings still go through Gemini since Groq has no such endpoint."""
import logging
from typing import Iterator

from groq import Groq

from src.config import Config
from src.services.prompting import build_prompt
from src.services.text_utils import strip_markdown

logger = logging.getLogger(__name__)

_client = Groq(api_key=Config.GROQ_API_KEY)


def generate_answer(question: str, context: str, owner_name: str = "Vincent") -> str:
    """Generate a grounded answer from retrieved context (non-streaming)."""
    prompt = build_prompt(question, context, owner_name)
    response = _client.chat.completions.create(
        model=Config.GROQ_CHAT_MODEL,
        messages=[{"role": "user", "content": prompt}],
    )
    text = response.choices[0].message.content or ""
    return strip_markdown(text.strip())


def generate_answer_stream(question: str, context: str, owner_name: str = "Vincent") -> Iterator[str]:
    """Yields raw text chunks as Groq produces them -- not markdown-stripped individually, since a
    marker like "**" could land split across chunks. Caller should strip_markdown() the final text."""
    prompt = build_prompt(question, context, owner_name)
    stream = _client.chat.completions.create(
        model=Config.GROQ_CHAT_MODEL,
        messages=[{"role": "user", "content": prompt}],
        stream=True,
    )
    for chunk in stream:
        delta = chunk.choices[0].delta.content if chunk.choices else None
        if delta:
            yield delta
