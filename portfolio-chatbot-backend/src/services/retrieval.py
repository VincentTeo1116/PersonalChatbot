"""Question -> knowledge-base matches. Shared by the chat routes and scripts/eval_retrieval.py so both measure the same thing."""
from typing import Any

from src.config import Config
from src.services import pinecone_service
from src.services.gemini_service import embed_text
from src.services.text_utils import clean_for_embedding


def search(question: str, top_k: int = Config.TOP_K, strip_name: bool = True) -> list[dict[str, Any]]:
    """Returns the top_k Pinecone matches, best first, with no score cutoff applied."""
    text = clean_for_embedding(question) if strip_name else question
    vector = embed_text(text, task_type="retrieval_query")
    return pinecone_service.query(vector, top_k=top_k)
