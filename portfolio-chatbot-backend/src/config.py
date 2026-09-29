"""Centralized configuration for the portfolio chatbot backend.

All values are loaded from environment variables (see .env.example).
Never hardcode secrets or index names elsewhere in the codebase.
"""
import os
from dotenv import load_dotenv

load_dotenv(f".env.{os.getenv('APP_ENV', 'dev')}", override=False)
load_dotenv(".env", override=False)


class Config:
    # --- Pinecone ---
    PINECONE_API_KEY: str = os.getenv("PINECONE_API_KEY", "")
    PINECONE_INDEX_NAME: str = os.getenv("PINECONE_INDEX_NAME", "portfolio-chatbot")
    PINECONE_NAMESPACE: str = os.getenv("PINECONE_NAMESPACE", "portfolio-kb")
    PINECONE_DIMENSION: int = 768  # must match GEMINI_EMBEDDING_MODEL's output_dimensionality

    # --- Gemini (embeddings only -- see groq_service.py for answer generation) ---
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_EMBEDDING_MODEL: str = os.getenv("GEMINI_EMBEDDING_MODEL", "models/gemini-embedding-001")

    # --- Groq (answer generation -- higher free-tier limits than Gemini for this) ---
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_CHAT_MODEL: str = os.getenv("GROQ_CHAT_MODEL", "llama-3.1-8b-instant")

    # --- Retrieval ---
    TOP_K: int = int(os.getenv("TOP_K", "4"))
    MIN_SCORE: float = float(os.getenv("MIN_SCORE", "0.55"))

    # --- Supabase (the knowledge base source: the same tables the portfolio site renders) ---
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "").rstrip("/")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")

    # --- Sync webhook (called by the portfolio site's /admin after content changes) ---
    SYNC_WEBHOOK_SECRET: str = os.getenv("SYNC_WEBHOOK_SECRET", "")

    # --- Cache ---
    CACHE_TTL: int = int(os.getenv("CACHE_TTL", "1800"))
    CACHE_SIZE: int = int(os.getenv("CACHE_SIZE", "200"))

    # --- CORS: comma-separated list of allowed origins (your portfolio site) ---
    ALLOWED_ORIGINS: list[str] = [
        o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()
    ]

    @classmethod
    def validate(cls) -> None:
        missing = [
            name
            for name, val in [
                ("PINECONE_API_KEY", cls.PINECONE_API_KEY),
                ("GEMINI_API_KEY", cls.GEMINI_API_KEY),
                ("GROQ_API_KEY", cls.GROQ_API_KEY),
                ("SUPABASE_URL", cls.SUPABASE_URL),
                ("SUPABASE_ANON_KEY", cls.SUPABASE_ANON_KEY),
                ("SYNC_WEBHOOK_SECRET", cls.SYNC_WEBHOOK_SECRET),
            ]
            if not val
        ]
        if missing:
            raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")
