"""Gemini handles embeddings only -- see groq_service.py for answer generation (Groq's free tier is
more generous, but it has no embeddings endpoint). Uses the newer google-genai SDK, not the EOL'd
google-generativeai package."""
import logging

from google import genai
from google.genai import types

from src.config import Config

logger = logging.getLogger(__name__)

_client = genai.Client(api_key=Config.GEMINI_API_KEY)


def embed_text(text: str, task_type: str = "retrieval_document") -> list[float]:
    """Embeds a string, truncated to PINECONE_DIMENSION so it matches the index regardless of model size."""
    result = _client.models.embed_content(
        model=Config.GEMINI_EMBEDDING_MODEL,
        contents=text,
        config=types.EmbedContentConfig(task_type=task_type, output_dimensionality=Config.PINECONE_DIMENSION),
    )
    return result.embeddings[0].values
