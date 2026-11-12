"""Greetings and thanks get a fixed reply instead of a search and a model call.

They have nothing to look up, so showing sources or an "Inspect answer" panel for them is noise, and answering them from a template saves model quota.
Only whole, short messages match: "hi" does, "hi, what did you build at FootfallCam?" goes through the normal pipeline.
"""
import re

_NAME = r"(?:\s+(?:there|vincent|bot|assistant|everyone|all))?"
_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (
        re.compile(rf"(?:hi+|hello+|hey+|heya|hiya|yo|hola|halo|greetings|good\s+(?:morning|afternoon|evening|day)){_NAME}"),
        "Hi! I'm the assistant for {owner}'s portfolio. Ask me about their projects, skills, experience, research or how to get in touch.",
    ),
    (
        re.compile(r"(?:how\s+are\s+you|how\s+are\s+you\s+doing|how's\s+it\s+going|what's\s+up|sup)(?:\s+today)?"),
        "I'm doing well, thanks for asking! I can tell you about {owner}'s projects, skills, experience and research. What would you like to know?",
    ),
    (
        re.compile(rf"(?:thanks|thank\s+you|thank\s+you\s+so\s+much|thanks\s+a\s+lot|thx|ty|cheers|appreciate\s+it|great\s+thanks|ok\s+thanks|okay\s+thanks){_NAME}"),
        "You're welcome! Let me know if there's anything else you'd like to know about {owner}.",
    ),
    (
        re.compile(rf"(?:bye|goodbye|bye\s+bye|see\s+you|see\s+ya|good\s+night|take\s+care){_NAME}"),
        "Thanks for stopping by! If you'd like to talk to {owner} directly, the contact section has the details.",
    ),
    (
        re.compile(r"(?:who\s+are\s+you|what\s+are\s+you|what\s+can\s+you\s+do|what\s+can\s+i\s+ask(?:\s+you)?|help)"),
        "I'm an AI assistant that answers questions about {owner} using the content of this portfolio: projects, skills, education, work experience and research. Try asking about a project or a skill.",
    ),
]


def small_talk_reply(question: str, owner: str) -> str | None:
    """The canned reply for a greeting-style message, or None when the message is a real question."""
    text = re.sub(r"[^\w\s']", " ", question.lower())
    text = re.sub(r"\s+", " ", text).strip()
    if not text or len(text.split()) > 6:
        return None
    for pattern, reply in _PATTERNS:
        if pattern.fullmatch(text):
            return reply.format(owner=owner)
    return None
