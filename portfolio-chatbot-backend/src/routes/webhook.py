"""Sync trigger, called by the portfolio site's /admin after content changes.

The request carries no data: the backend reads the current content straight from
Supabase (see src/services/supabase_source.py) and re-syncs Pinecone from it.
"""
import logging

from fastapi import APIRouter, Header, HTTPException

from src.config import Config
from src.routes.chat import clear_cache
from src.services.kb_sync import sync_rows
from src.services.supabase_source import SupabaseFetchError, build_rows

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["admin"])


# Plain `def` (not async): the work is blocking I/O, so FastAPI runs it in a worker thread
# instead of stalling the event loop that serves /api/chat.
@router.post("/sync-kb")
def sync_kb(x_sync_secret: str = Header(default="")):
    if not Config.SYNC_WEBHOOK_SECRET or x_sync_secret != Config.SYNC_WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Sync-Secret header")

    try:
        rows = build_rows()
    except SupabaseFetchError as exc:
        logger.error("KB sync aborted: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    # sync_rows() deletes every vector not in `rows`, so never run it with nothing --
    # that would wipe the whole knowledge base if Supabase returned an empty result.
    if not rows:
        raise HTTPException(status_code=502, detail="Supabase returned no content; refusing to wipe the knowledge base")

    stats = sync_rows(rows)
    clear_cache()
    return {"status": "ok", **stats}
