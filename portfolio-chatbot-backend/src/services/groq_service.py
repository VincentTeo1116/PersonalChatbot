"""Answer generation via Groq (OpenAI-compatible chat completions on Groq's LPU
hardware). Chosen over Gemini for this half of the pipeline because Groq's free tier
is far less likely to be rate-limited for a low-to-moderate-traffic portfolio site.

Embeddings still go through Gemini (see gemini_service.py) -- Groq doesn't offer an
embeddings endpoint, so that half of the pipeline can't move here."""
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
    """Generate a grounded answer, yielding raw text chunks as Groq produces them.

    Chunks are NOT markdown-stripped individually -- a marker like "**" can land split
    across two chunks, and stripping each chunk independently could leave a stray
    asterisk on screen. The prompt already asks the model not to use markdown at all,
    so raw chunks are safe to show in real time; the caller should still run the final,
    fully-assembled text through strip_markdown() once the stream ends (e.g. to
    cache/log the canonical clean version and let the client snap to it).
    """
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
