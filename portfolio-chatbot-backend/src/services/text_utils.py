"""Provider-agnostic text post-processing shared by whichever chat backend is active."""
import re


def strip_markdown(text: str) -> str:
    """Strips markdown the widget would otherwise show literally -- a backstop for whenever the model slips some in."""
    text = re.sub(r"^#{1,6}\s*", "", text, flags=re.MULTILINE)  # "## Heading" -> "Heading"
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)  # "**bold**" -> "bold"
    text = re.sub(r"(?<!\w)\*(.+?)\*(?!\w)", r"\1", text)  # "*italic*" -> "italic"
    text = re.sub(r"`(.+?)`", r"\1", text)  # "`code`" -> "code"
    text = re.sub(r"^\s*[\*\+]\s+", "- ", text, flags=re.MULTILINE)  # "* item" -> "- item"
    return text


_PLACING = r"\b(?:1st|2nd|3rd|\d+th)\s+place\b"
_URL = re.compile(r"(https?://\S+)")
MAX_HIGHLIGHTS = 10


def highlight(text: str, terms: list[str]) -> str:
    """Wraps the first mention of each known term (project names, tools) and any placing like "3rd place" in **bold**, which the widget renders. Skips URLs."""
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
