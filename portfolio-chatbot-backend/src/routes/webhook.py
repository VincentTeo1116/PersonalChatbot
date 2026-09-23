"""Receives the full KB sheet payload from the Google Apps Script trigger
(see apps_script/Code.gs) and re-syncs Pinecone.
"""
import logging

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from src.config import Config
from src.services.kb_sync import sync_rows

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["admin"])


class KBRow(BaseModel):
    category: str = ""
    question: str = ""
    answer: str = ""
    tags: str = ""
    is_active: str = "true"


class SyncPayload(BaseModel):
    rows: list[KBRow]


@router.post("/sync-kb")
async def sync_kb(payload: SyncPayload, x_sync_secret: str = Header(default="")):
    if not Config.SYNC_WEBHOOK_SECRET or x_sync_secret != Config.SYNC_WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Sync-Secret header")

    rows = [r.model_dump() for r in payload.rows]
    stats = sync_rows(rows)
    return {"status": "ok", **stats}
