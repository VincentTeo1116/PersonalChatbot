"""Gemini is used for embeddings only -- see groq_service.py for answer generation
(moved there because Groq's free tier is far less likely to be rate-limited; Groq has
no embeddings endpoint, so this half of the pipeline stays on Gemini).

Uses google-genai (the `google.genai` Client-based SDK) -- the older
google-generativeai package this used to be built on has been fully
end-of-lifed upstream (no more updates or bug fixes)."""
import logging

from google import genai
from google.genai import types

from src.config import Config

logger = logging.getLogger(__name__)

_client = genai.Client(api_key=Config.GEMINI_API_KEY)


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
