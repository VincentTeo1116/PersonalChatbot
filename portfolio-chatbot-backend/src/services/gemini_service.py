"""Thin wrapper around Gemini for embeddings and answer generation.

Uses google-genai (the `google.genai` Client-based SDK) -- the older
google-generativeai package this used to be built on has been fully
end-of-lifed upstream (no more updates or bug fixes)."""
import logging
import re
from typing import Iterator

from google import genai
from google.genai import types

from src.config import Config

logger = logging.getLogger(__name__)

_client = genai.Client(api_key=Config.GEMINI_API_KEY)

SYSTEM_PROMPT = """You are the AI assistant on {owner_name}'s software engineer portfolio website.
Answer questions about {owner_name}'s background, skills, projects, and experience using ONLY the
context provided below. Be concise, friendly, and speak in first person as if you were introducing
{owner_name} to a visitor (use "they"/their name rather than "I" unless the context is a direct quote).

If the context does not contain the answer, say you don't have that information yet and suggest the
visitor reach out directly via the contact details in the context (if available). Never make up
projects, skills, or experience that are not in the context.

Reply in plain text only -- the chat widget does not render markdown. Do not use asterisks,
underscores, backticks, or "#" headers for emphasis or formatting. For a list, put each item on
its own line starting with "- " instead of using markdown bullets or bold labels.

Context:
{context}

Question: {question}

Answer:"""


def embed_text(text: str, task_type: str = "retrieval_document") -> list[float]:
    """Embed a single string, truncated to Config.PINECONE_DIMENSION (768) so the
    output always matches the existing Pinecone index regardless of the embedding
    model's native size (gemini-embedding-001 defaults to 3072 dims)."""
    result = _client.models.embed_content(
        model=Config.GEMINI_EMBEDDING_MODEL,
        contents=text,
        config=types.EmbedContentConfig(task_type=task_type, output_dimensionality=Config.PINECONE_DIMENSION),
    )
    return result.embeddings[0].values


def strip_markdown(text: str) -> str:
    """Remove markdown syntax the widget would otherwise show literally (it renders
    plain text, not HTML). The prompt already asks Gemini not to use markdown, but
    this is a deterministic backstop for whenever it slips one in anyway."""
    text = re.sub(r"^#{1,6}\s*", "", text, flags=re.MULTILINE)  # "## Heading" -> "Heading"
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)  # "**bold**" -> "bold"
    text = re.sub(r"(?<!\w)\*(.+?)\*(?!\w)", r"\1", text)  # "*italic*" -> "italic"
    text = re.sub(r"`(.+?)`", r"\1", text)  # "`code`" -> "code"
    text = re.sub(r"^\s*[\*\+]\s+", "- ", text, flags=re.MULTILINE)  # "* item" -> "- item"
    return text


def _build_prompt(question: str, context: str, owner_name: str) -> str:
    return SYSTEM_PROMPT.format(owner_name=owner_name, context=context or "(no matching context found)", question=question)


def generate_answer(question: str, context: str, owner_name: str = "Vincent") -> str:
    """Generate a grounded answer from retrieved context (non-streaming)."""
    prompt = _build_prompt(question, context, owner_name)
    response = _client.models.generate_content(model=Config.GEMINI_CHAT_MODEL, contents=prompt)
    return strip_markdown((response.text or "").strip())


def generate_answer_stream(question: str, context: str, owner_name: str = "Vincent") -> Iterator[str]:
    """Generate a grounded answer, yielding raw text chunks as Gemini produces them.

    Chunks are NOT markdown-stripped individually -- a marker like "**" can land
    split across two chunks, and stripping each chunk independently could leave a
    stray asterisk on screen. The prompt already asks Gemini not to use markdown at
    all, so raw chunks are safe to show in real time; the caller should still run
    the final, fully-assembled text through strip_markdown() once the stream ends
    (e.g. to cache/log the canonical clean version and let the client snap to it).
    """
    prompt = _build_prompt(question, context, owner_name)
    for chunk in _client.models.generate_content_stream(model=Config.GEMINI_CHAT_MODEL, contents=prompt):
        if chunk.text:
            yield chunk.text
