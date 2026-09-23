import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import Config
from src.routes import chat, webhook
from src.services.pinecone_service import ensure_index

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Portfolio Chatbot API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(webhook.router)


@app.on_event("startup")
async def startup() -> None:
    Config.validate()
    ensure_index()
    logger.info("Portfolio chatbot API ready (index=%s, namespace=%s)", Config.PINECONE_INDEX_NAME, Config.PINECONE_NAMESPACE)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8080, reload=True)
