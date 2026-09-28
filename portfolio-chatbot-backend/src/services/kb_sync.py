"""Turns knowledge-base rows into Pinecone vectors.

This is the "auto-update" half of the pipeline: the rows are built from the
portfolio's Supabase tables (see supabase_source.py) every time the site's
/admin triggers a sync. We re-embed and upsert everything — the knowledge base
is small enough that a full resync is simpler and more reliable than diffing
individual rows.
"""
import hashlib
import logging
from typing import Any

from src.services import pinecone_service
from src.services.gemini_service import embed_text

logger = logging.getLogger(__name__)

REQUIRED_FIELDS = ("category", "question", "answer")


def _row_id(row: dict[str, Any]) -> str:
    """Stable id derived from category+question so edits update in place."""
    key = f"{row.get('category', '')}|{row.get('question', '')}".lower().strip()
    return hashlib.md5(key.encode("utf-8")).hexdigest()


def _embedding_text(row: dict[str, Any]) -> str:
    parts = [row.get("category", ""), row.get("question", ""), row.get("answer", "")]
    tags = row.get("tags")
    if tags:
        parts.append(str(tags))
    return "\n".join(p for p in parts if p)


def sync_rows(rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Embed and upsert every active row; delete vectors for removed rows.

    Rows with is_active explicitly set to false/0/"" are skipped (and their
    vector removed), so you can stage content in the sheet before publishing.
    """
    valid_rows = []
    skipped = 0
    for row in rows:
        if not all(str(row.get(f, "")).strip() for f in REQUIRED_FIELDS):
            skipped += 1
            continue
        is_active = str(row.get("is_active", "true")).strip().lower()
        if is_active in ("false", "0", "no", ""):
            skipped += 1
            continue
        valid_rows.append(row)

    vectors = []
    for row in valid_rows:
        row_id = _row_id(row)
        embedding = embed_text(_embedding_text(row), task_type="retrieval_document")
        vectors.append(
            {
                "id": row_id,
                "values": embedding,
                "metadata": {
                    "category": row.get("category", ""),
                    "question": row.get("question", ""),
                    "answer": row.get("answer", ""),
                    "tags": row.get("tags", ""),
                    "source": "portfolio-kb-sheet",
                },
            }
        )

    upserted = pinecone_service.upsert_rows(vectors)
    removed = pinecone_service.delete_missing_ids({v["id"] for v in vectors})

    logger.info("KB sync: %d upserted, %d removed, %d skipped", upserted, removed, skipped)
    return {"upserted": upserted, "removed": removed, "skipped": skipped, "total_received": len(rows)}
