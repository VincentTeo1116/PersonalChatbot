"""Provider-agnostic text post-processing shared by whichever chat backend is active."""
import re


def strip_markdown(text: str) -> str:
    """Remove markdown syntax the widget would otherwise show literally (it renders
    plain text, not HTML). The prompt already asks the model not to use markdown, but
    this is a deterministic backstop for whenever it slips one in anyway."""
    text = re.sub(r"^#{1,6}\s*", "", text, flags=re.MULTILINE)  # "## Heading" -> "Heading"
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)  # "**bold**" -> "bold"
    text = re.sub(r"(?<!\w)\*(.+?)\*(?!\w)", r"\1", text)  # "*italic*" -> "italic"
    text = re.sub(r"`(.+?)`", r"\1", text)  # "`code`" -> "code"
    text = re.sub(r"^\s*[\*\+]\s+", "- ", text, flags=re.MULTILINE)  # "* item" -> "- item"
    return text
