"""Answer generation via Groq -- its free tier is much less likely to get rate-limited than
Gemini's for a portfolio site. Embeddings still go through Gemini since Groq has no such endpoint."""
import json
import logging
from typing import Any, Iterator

from groq import Groq

from src.config import Config
from src.services.prompting import build_prompt
from src.services.text_utils import strip_markdown

logger = logging.getLogger(__name__)

_client = Groq(api_key=Config.GROQ_API_KEY)

MEETING_REQUEST_TOOL = {
    "type": "function",
    "function": {
        "name": "open_meeting_request_form",
        "description": (
            "Call this when the visitor wants to schedule a meeting, get in touch, or leave a "
            "message for the portfolio owner to follow up on by email. Fill in only what the "
            "visitor actually said in this message -- leave a field out entirely rather than "
            "guessing or inventing a name, email, phone number, or company."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Visitor's full name, if they gave one."},
                "position": {"type": "string", "description": "Visitor's job title, if mentioned."},
                "company": {"type": "string", "description": "Visitor's company, if mentioned."},
                "email": {"type": "string", "description": "Visitor's email, if they gave one."},
                "phone": {"type": "string", "description": "Visitor's phone number, if they gave one."},
                "message": {
                    "type": "string",
                    "description": (
                        "A short first-person message, in the visitor's own voice, summarizing "
                        "why they want to connect -- drafted from what they actually wrote."
                    ),
                },
            },
        },
    },
}

_MEETING_INTENT_SYSTEM_PROMPT = (
    "Decide whether the visitor's message expresses wanting to schedule a meeting, get in "
    "touch, connect, collaborate, or leave a message for the portfolio owner to follow up on "
    "-- even phrased casually or without hard details (e.g. \"I'd love to connect sometime\" "
    "counts). If yes, call open_meeting_request_form with whatever details they already gave "
    "-- never invent a name, email, phone, or company they didn't mention; it's fine to call "
    "it with no arguments at all if they gave none. If their message is just a question about "
    "the owner's background/skills/projects with no such intent, don't call any tool."
)


def detect_meeting_intent(question: str) -> dict[str, Any] | None:
    """Separate, focused tool-calling pass that checks for meeting/contact intent and drafts
    whatever contact fields the visitor already gave. Returns None if no such intent is found."""
    response = _client.chat.completions.create(
        model=Config.GROQ_CHAT_MODEL,
        messages=[
            {"role": "system", "content": _MEETING_INTENT_SYSTEM_PROMPT},
            {"role": "user", "content": question},
        ],
        tools=[MEETING_REQUEST_TOOL],
        tool_choice="auto",
    )
    tool_calls = response.choices[0].message.tool_calls
    if not tool_calls:
        return None
    try:
        return json.loads(tool_calls[0].function.arguments)
    except (json.JSONDecodeError, AttributeError):
        logger.warning("Meeting-intent tool call had unparseable arguments", exc_info=True)
        return None


def generate_answer(question: str, context: str, owner_name: str = "Vincent") -> str:
    """Generate a grounded answer from retrieved context (non-streaming)."""
    prompt = build_prompt(question, context, owner_name)
    response = _client.chat.completions.create(
        model=Config.GROQ_CHAT_MODEL,
        messages=[{"role": "user", "content": prompt}],
    )
    text = response.choices[0].message.content or ""
    return strip_markdown(text.strip())


def generate_answer_stream(question: str, context: str, owner_name: str = "Vincent") -> Iterator[str]:
    """Yields raw text chunks as Groq produces them -- not markdown-stripped individually, since a
    marker like "**" could land split across chunks. Caller should strip_markdown() the final text."""
    prompt = build_prompt(question, context, owner_name)
    stream = _client.chat.completions.create(
        model=Config.GROQ_CHAT_MODEL,
        messages=[{"role": "user", "content": prompt}],
        stream=True,
    )
    for chunk in stream:
        delta = chunk.choices[0].delta.content if chunk.choices else None
        if delta:
            yield delta
