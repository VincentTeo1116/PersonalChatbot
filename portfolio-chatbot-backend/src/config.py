"""Centralized configuration for the portfolio chatbot backend.

All values are loaded from environment variables (see .env.example).
Never hardcode secrets or index names elsewhere in the codebase.
"""
import logging
import os
from dotenv import load_dotenv

load_dotenv(f".env.{os.getenv('APP_ENV', 'dev')}", override=False)
load_dotenv(".env", override=False)


def _limit_env(name: str, default: int) -> int:
    """A whole number of 0 or more from the environment. A missing, blank, negative or non-numeric value falls back to the
    default with a warning, so a typo in a limit can never stop the service from starting or silently remove the limit."""
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    try:
        value = int(raw.strip())
    except ValueError:
        value = -1
    if value < 0:
        logging.getLogger(__name__).warning("%s=%r is not a whole number of 0 or more; using the default %d", name, raw, default)
        return default
    return value


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
    GROQ_CHAT_MODEL: str = os.getenv("GROQ_CHAT_MODEL", "qwen/qwen3.8-27b")
    # Groq reserves the requested output budget against the per-minute token limit, so an uncapped request can be rejected on its own.
    GROQ_MAX_ANSWER_TOKENS: int = int(os.getenv("GROQ_MAX_ANSWER_TOKENS", "500"))

    # --- Owner (their name is stripped from text before embedding, since every entry mentions it and it blurs the matches) ---
    OWNER_NAME: str = os.getenv("OWNER_NAME", "Vincent Teo")

    # --- Retrieval ---
    TOP_K: int = int(os.getenv("TOP_K", "4"))
    MIN_SCORE: float = float(os.getenv("MIN_SCORE", "0.58"))

    # --- Supabase (the knowledge base source: the same tables the portfolio site renders) ---
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "").rstrip("/")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    # Optional and private (it bypasses Row Level Security): used only to write chat_logs and chat_feedback, so those tables
    # need no public insert rule. Set it in the host's environment only. Blank means those writes use the public key.
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

    # --- Sync webhook (called by the portfolio site's /admin after content changes) ---
    SYNC_WEBHOOK_SECRET: str = os.getenv("SYNC_WEBHOOK_SECRET", "")

    # --- Cache ---
    CACHE_TTL: int = int(os.getenv("CACHE_TTL", "1800"))
    CACHE_SIZE: int = int(os.getenv("CACHE_SIZE", "200"))

    # --- Abuse limits (see src/services/rate_limit.py and budget.py). All are kept in memory and start again on a restart. ---
    # Per caller, every request to the chat endpoints counts (cached answers and greetings too):
    CHAT_PER_MINUTE: int = _limit_env("CHAT_PER_MINUTE", 15)
    CHAT_PER_HOUR: int = _limit_env("CHAT_PER_HOUR", 30)
    # Per caller, questions that need the model (not greetings, not cached answers) in any 24 hours:
    CALLER_DAILY_QUESTIONS: int = _limit_env("CALLER_DAILY_QUESTIONS", 60)
    # All callers together, questions that need the model in any 24 hours. Each can cost up to two Groq calls and one embedding,
    # so keep this below half of the smallest daily request quota on your Groq and Gemini plans. 0 switches the budget off.
    DAILY_QUESTION_BUDGET: int = _limit_env("DAILY_QUESTION_BUDGET", 600)
    # All callers together, rows written to chat_logs and chat_feedback in any 24 hours; beyond it nothing more is logged.
    DAILY_LOG_ROWS: int = _limit_env("DAILY_LOG_ROWS", 3000)

    # --- CORS: comma-separated list of allowed origins (your portfolio site). Empty means no browser origin is allowed. ---
    ALLOWED_ORIGINS: list[str] = [
        o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()
    ]

    # --- Interactive API docs (/docs, /redoc, /openapi.json) are for local development only ---
    ENABLE_DOCS: bool = os.getenv("ENABLE_DOCS", "false").strip().lower() in ("1", "true", "yes")

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
