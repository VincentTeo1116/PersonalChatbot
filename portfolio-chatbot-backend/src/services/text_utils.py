"""Provider-agnostic text post-processing shared by whichever chat backend is active."""
import re

from src.config import Config


def tidy_markdown(text: str) -> str:
    """Keeps the formatting the widget can show (bold, italic, lists, inline code, links, tables) and rewrites what it cannot:
    headings become bold lines, "*" and "+" bullets become "-", and code fences and images are dropped."""
    text = re.sub(r"^```[^\n]*\n?", "", text, flags=re.MULTILINE)  # code fence lines
    text = re.sub(r"!\[([^\]]*)\]\([^)]*\)", r"\1", text)  # "![alt](src)" -> "alt"
    text = re.sub(r"^#{1,6}\s*(.+?)\s*#*\s*$", lambda m: f"**{m.group(1).strip('*')}**", text, flags=re.MULTILINE)  # "## Heading" -> "**Heading**"
    text = re.sub(r"^(\s*)[\*\+]\s+", r"\1- ", text, flags=re.MULTILINE)  # "* item" -> "- item"
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def strip_markdown(text: str) -> str:
    """Plain-text version of an answer, for the chat log and the evaluation checks."""
    text = re.sub(r"^```[^\n]*\n?", "", text, flags=re.MULTILINE)
    text = re.sub(r"!?\[([^\]]+)\]\(([^)\s]+)\)", r"\1 (\2)", text)  # "[text](url)" -> "text (url)"
    text = re.sub(r"^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$\n?", "", text, flags=re.MULTILINE)  # table separator rows
    text = re.sub(r"^#{1,6}\s*", "", text, flags=re.MULTILINE)  # "## Heading" -> "Heading"
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)  # "**bold**" -> "bold"
    text = re.sub(r"(?<!\w)\*(.+?)\*(?!\w)", r"\1", text)  # "*italic*" -> "italic"
    text = re.sub(r"`(.+?)`", r"\1", text)  # "`code`" -> "code"
    text = re.sub(r"^\s*[\*\+]\s+", "- ", text, flags=re.MULTILINE)  # "* item" -> "- item"
    return text


_PLACING = r"\b(?:placed\s+(?:1st|2nd|3rd|\d+th)|(?:1st|2nd|3rd|\d+th)\s+place)\b"
# Spans highlight() must leave alone: text the model already made bold, inline code, markdown links and bare URLs.
_URL = re.compile(r"(\*\*[^*\n]+\*\*|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\)|https?://\S+)")
MAX_HIGHLIGHTS = 10


def highlight(text: str, terms: list[str]) -> str:
    """Wraps the first mention of each known term (project names, tools) and any placing like "3rd place" in **bold**, which the widget renders. Skips URLs, links, code and anything already bold."""
    unique = sorted({t.strip() for t in terms if t and len(t.strip()) >= 3}, key=len, reverse=True)
    pattern = re.compile(
        r"(?<![\w*/@])(?:%s)(?![\w*/@])" % "|".join([re.escape(t) for t in unique] + [_PLACING]), re.IGNORECASE
    )
    seen: set[str] = set()

    def bold(m: re.Match) -> str:
        key = m.group(0).lower()
        if key in seen or len(seen) >= MAX_HIGHLIGHTS:
            return m.group(0)
        seen.add(key)
        return f"**{m.group(0)}**"

    return "".join(part if i % 2 else pattern.sub(bold, part) for i, part in enumerate(_URL.split(text)))


def clean_for_embedding(text: str) -> str:
    """Drops the owner's name ("Vincent Teo", "Vincent", "Vincent's") before embedding. Nearly every entry and question
    contains it, so it adds shared noise that pulls unrelated entries together."""
    full = Config.OWNER_NAME.strip()
    names = [full] + ([full.split()[0]] if " " in full else [])
    cleaned = text
    for name in names:
        cleaned = re.sub(r"(?<!\w)" + re.escape(name) + r"(?:['’]s)?(?!\w)", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned if len(cleaned.split()) >= 2 else text
