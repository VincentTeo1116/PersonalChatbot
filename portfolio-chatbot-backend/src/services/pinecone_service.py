"""Pinecone index access for the portfolio knowledge base."""
import logging
from typing import Any

from pinecone import Pinecone, ServerlessSpec

from src.config import Config

logger = logging.getLogger(__name__)

_pc = Pinecone(api_key=Config.PINECONE_API_KEY)


def ensure_index() -> None:
    """Create the index if it doesn't exist yet (safe to call on every startup)."""
    existing = {idx["name"] for idx in _pc.list_indexes()}
    if Config.PINECONE_INDEX_NAME not in existing:
        logger.info("Creating Pinecone index %s", Config.PINECONE_INDEX_NAME)
        _pc.create_index(
            name=Config.PINECONE_INDEX_NAME,
            dimension=Config.PINECONE_DIMENSION,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1"),
        )


def get_index():
    return _pc.Index(Config.PINECONE_INDEX_NAME)


def upsert_rows(vectors: list[dict[str, Any]]) -> int:
    """vectors: [{"id": str, "values": [float], "metadata": {...}}, ...]"""
    if not vectors:
        return 0
    index = get_index()
    index.upsert(vectors=vectors, namespace=Config.PINECONE_NAMESPACE)
    return len(vectors)


def delete_missing_ids(keep_ids: set[str]) -> int:
    """Remove any vectors in the namespace whose id is no longer in the sheet.

    Keeps Pinecone in sync when a row is deleted from the spreadsheet.
    """
    index = get_index()
    existing_ids: set[str] = set()
    for batch in index.list(namespace=Config.PINECONE_NAMESPACE):
        existing_ids.update(batch)
    stale = existing_ids - keep_ids
    if stale:
        index.delete(ids=list(stale), namespace=Config.PINECONE_NAMESPACE)
    return len(stale)


def query(vector: list[float], top_k: int = Config.TOP_K) -> list[dict[str, Any]]:
    index = get_index()
    result = index.query(
        vector=vector,
        top_k=top_k,
        namespace=Config.PINECONE_NAMESPACE,
        include_metadata=True,
    )
    return [
        {"id": m["id"], "score": m["score"], "metadata": m.get("metadata", {})}
        for m in result.get("matches", [])
    ]
