"""Thin wrapper around Gemini for embeddings and answer generation."""
import logging

import google.generativeai as genai

from src.config import Config

logger = logging.getLogger(__name__)

genai.configure(api_key=Config.GEMINI_API_KEY)

SYSTEM_PROMPT = """You are the AI assistant on {owner_name}'s software engineer portfolio website.
Answer questions about {owner_name}'s background, skills, projects, and experience using ONLY the
context provided below. Be concise, friendly, and speak in first person as if you were introducing
{owner_name} to a visitor (use "they"/their name rather than "I" unless the context is a direct quote).

If the context does not contain the answer, say you don't have that information yet and suggest the
visitor reach out directly via the contact details in the context (if available). Never make up
projects, skills, or experience that are not in the context.

Context:
{context}

Question: {question}

Answer:"""


def embed_text(text: str, task_type: str = "retrieval_document") -> list[float]:
    """Embed a single string, truncated to Config.PINECONE_DIMENSION (768) so the
    output always matches the existing Pinecone index regardless of the embedding
    model's native size (gemini-embedding-001 defaults to 3072 dims)."""
    result = genai.embed_content(
        model=Config.GEMINI_EMBEDDING_MODEL,
        content=text,
        task_type=task_type,
        output_dimensionality=Config.PINECONE_DIMENSION,
    )
    return result["embedding"]


def generate_answer(question: str, context: str, owner_name: str = "Vincent") -> str:
    """Generate a grounded answer from retrieved context."""
    prompt = SYSTEM_PROMPT.format(owner_name=owner_name, context=context or "(no matching context found)", question=question)
    model = genai.GenerativeModel(Config.GEMINI_CHAT_MODEL)
    response = model.generate_content(prompt)
    return (response.text or "").strip()
