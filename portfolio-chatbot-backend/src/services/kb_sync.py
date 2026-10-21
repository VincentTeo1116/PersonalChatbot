"""Turns knowledge-base rows (built from Supabase, see supabase_source.py) into Pinecone vectors.
Always a full re-embed + upsert -- the KB is small enough that this is simpler than diffing rows."""
import hashlib
import logging
from typing import Any

from src.services import pinecone_service
from src.services.gemini_service import embed_text
from src.services.text_utils import clean_for_embedding

logger = logging.getLogger(__name__)

REQUIRED_FIELDS = ("category", "question", "answer")

# Where each kind of entry lives on the portfolio site, so answers can link back to their source.
CATEGORY_URLS = {
    "About": "/#about",
    "Contact": "/#contact",
    "Education": "/#about",
    "Skills": "/#about",
    "Hackathons": "/#hackathons",
    "Work Experience": "/#experience",
    "Projects": "/#projects",
    "Research": "/#research",
    "Final Year Project": "/#fyp",
}


def source_url(category: str, url: str = "") -> str:
    return url or CATEGORY_URLS.get(category, "")


def _row_id(row: dict[str, Any]) -> str:
    """Stable id derived from category+question so edits update in place."""
    key = f"{row.get('category', '')}|{row.get('question', '')}".lower().strip()
    return hashlib.md5(key.encode("utf-8")).hexdigest()


# Words a visitor might use that the entry's own text doesn't, added to what gets embedded (never shown or stored as the answer).
CATEGORY_KEYWORDS = {
    "About": "who, introduction, background, summary, open to work, availability, hiring, job opportunities",
    "Contact": "email, phone, linkedin, github, reach out, get in touch, hire, social media",
    "Education": "university, degree, study, studied, school, college, qualification, grades, gpa, cgpa",
    "Skills": "technologies, tech stack, tools, programming languages, frameworks, expertise, proficiency",
    "Hackathons": "competitions, events, hackathon, teamwork",
    "Work Experience": "job, internship, employer, career, worked, employment history, role",
    "Projects": "portfolio, built, developed, app, application, system",
    "Research": "paper, publication, published, journal, conference, ieee, academic, doi",
    "Final Year Project": "fyp, thesis, capstone, dissertation",
}


def _embedding_text(row: dict[str, Any]) -> str:
    category = row.get("category", "")
    parts = [category, row.get("label", ""), row.get("question", ""), row.get("answer", "")]
    if row.get("tags"):
        parts.append(str(row["tags"]))
    keywords = ", ".join(k for k in (CATEGORY_KEYWORDS.get(category, ""), row.get("keywords", "")) if k)
    if keywords:
        parts.append(f"Keywords: {keywords}")
    return clean_for_embedding("\n".join(p for p in parts if p))


def sync_rows(rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Embed and upsert every active row; delete vectors for rows that are gone or marked inactive."""
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
                    "url": source_url(row.get("category", ""), row.get("url", "")),
                    "label": row.get("label", "") or row.get("category", ""),
                    "source": "portfolio-kb-sheet",
                },
            }
        )

    upserted = pinecone_service.upsert_rows(vectors)
    removed = pinecone_service.delete_missing_ids({v["id"] for v in vectors})

    logger.info("KB sync: %d upserted, %d removed, %d skipped", upserted, removed, skipped)
    return {"upserted": upserted, "removed": removed, "skipped": skipped, "total_received": len(rows)}
