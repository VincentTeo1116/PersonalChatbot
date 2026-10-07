"""Builds the chatbot's knowledge base straight from the portfolio's Supabase tables -- editing
content in /admin is the only step needed to update what the chatbot knows. Turns each row into
an FAQ-style {category, question, answer, tags} dict for kb_sync.sync_rows()."""
import logging
from typing import Any

import httpx

from src.config import Config

logger = logging.getLogger(__name__)


class SupabaseFetchError(RuntimeError):
    pass


def _get(client: httpx.Client, table: str, order: str | None = "sort_order") -> list[dict[str, Any]]:
    params = {"select": "*"}
    if order:
        params["order"] = order
    try:
        response = client.get(f"{Config.SUPABASE_URL}/rest/v1/{table}", params=params)
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise SupabaseFetchError(f"Could not read Supabase table '{table}': {exc}") from exc
    return response.json()


def _join(*parts: Any) -> str:
    return " ".join(str(p).strip() for p in parts if p and str(p).strip())


def _detail_text(detail: str) -> str:
    """Multi-line details are bullet points in the admin; flatten them to sentences."""
    lines = [line.strip() for line in (detail or "").splitlines() if line.strip()]
    return " ".join(line if line.endswith((".", "!", "?")) else f"{line}." for line in lines)


def _skill_names(items: list[Any]) -> list[str]:
    # items can be plain strings (old rows) or {"name", "level"} dicts (new) -- same dual shape frontend's normalizeSkillItem() handles.
    return [item if isinstance(item, str) else item.get("name", "") for item in items]


def _profile_rows(profile: dict[str, Any]) -> list[dict[str, str]]:
    name = profile["name"]
    rows = [
        {
            "category": "About",
            "question": f"Who is {name}?",
            "answer": _join(
                f"{name} — {profile['tagline']}.",
                f"Based in {profile['location']}." if profile.get("location") else "",
                profile.get("hero_summary"),
                profile.get("about"),
            ),
        }
    ]

    contact = [f"Email: {profile['contact_email']}"] if profile.get("contact_email") else []
    if profile.get("contact_github"):
        contact.append(f"GitHub: {profile['contact_github']}")
    if profile.get("contact_linkedin"):
        contact.append(f"LinkedIn: {profile['contact_linkedin']}")
    if contact:
        rows.append(
            {"category": "Contact", "question": f"How can I contact {name}?", "answer": ". ".join(contact) + "."}
        )

    if profile.get("stat_cgpa") is not None:
        rows.append(
            {
                "category": "Education",
                "question": f"What is {name}'s CGPA?",
                "answer": f"{name}'s current CGPA is {profile['stat_cgpa']}.",
            }
        )
    if profile.get("stat_hackathons") is not None:
        rows.append(
            {
                "category": "Hackathons",
                "question": f"How many hackathons has {name} taken part in?",
                "answer": f"{name} has taken part in {profile['stat_hackathons']} hackathons.",
            }
        )

    skills = sorted(profile.get("skills") or [], key=lambda s: s.get("sort_order", 0))
    for skill in skills:
        if skill.get("category") and skill.get("items"):
            names = _skill_names(skill["items"])
            rows.append(
                {
                    "category": "Skills",
                    "question": f"What {skill['category']} skills does {name} have?",
                    "answer": f"{name}'s {skill['category']} skills: {', '.join(names)}.",
                    "tags": ", ".join(names),
                }
            )
    if skills:
        overview = "; ".join(f"{s['category']}: {', '.join(_skill_names(s['items']))}" for s in skills if s.get("items"))
        rows.append(
            {"category": "Skills", "question": f"What are {name}'s technical skills?", "answer": overview + "."}
        )
    return rows


def _education_rows(entries: list[dict[str, Any]]) -> list[dict[str, str]]:
    return [
        {
            "category": "Education",
            "question": f"Tell me about {e['degree']} at {e['institution']}",
            "answer": _join(f"{e['degree']} at {e['institution']} ({e['period']}).", _detail_text(e.get("detail", ""))),
        }
        for e in entries
    ]


def _experience_rows(entries: list[dict[str, Any]], name: str) -> list[dict[str, str]]:
    return [
        {
            "category": "Work Experience",
            "question": f"What did {name} do as {e['role']} at {e['company']}?",
            "answer": _join(f"{e['role']} at {e['company']} ({e['period']}).", _detail_text(e.get("detail", ""))),
        }
        for e in entries
    ]


def _project_rows(projects: list[dict[str, Any]]) -> list[dict[str, str]]:
    rows = []
    for p in projects:
        links = [f"{link['label']}: {link['url']}" for link in (p.get("links") or []) if link.get("url")]
        tags = p.get("tags") or []
        rows.append(
            {
                "category": "Projects",
                "question": f"Tell me about the {p['title']} project",
                "answer": _join(
                    p["description"],
                    f"Award: {p['award']}." if p.get("award") else "",
                    f"Built with: {', '.join(tags)}." if tags else "",
                    f"Links — {'; '.join(links)}." if links else "",
                ),
                "tags": ", ".join(tags),
            }
        )
    return rows


def _research_rows(papers: list[dict[str, Any]]) -> list[dict[str, str]]:
    rows = []
    for r in papers:
        rows.append(
            {
                "category": "Research",
                "question": f"Tell me about the paper '{r['title']}'",
                "answer": _join(
                    f"'{r['title']}', published at {r['venue']}." if r.get("venue") else f"'{r['title']}'.",
                    f"Authors: {', '.join(r['authors'])}." if r.get("authors") else "",
                    f"Supervised by {r['supervisor']}." if r.get("supervisor") else "",
                    f"DOI: {r['doi_url'] or r['doi']}." if (r.get("doi_url") or r.get("doi")) else "",
                    r.get("description"),
                ),
            }
        )
    return rows


def build_rows() -> list[dict[str, str]]:
    """Fetch every content table and convert it into KB rows for sync_rows()."""
    headers = {
        "apikey": Config.SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {Config.SUPABASE_ANON_KEY}",
    }
    with httpx.Client(headers=headers, timeout=15) as client:
        profiles = _get(client, "profile", order=None)
        if not profiles:
            raise SupabaseFetchError("The 'profile' table has no row -- run supabase/seed.sql on the frontend first.")
        rows = _profile_rows(profiles[0])
        rows += _education_rows(_get(client, "education"))
        rows += _experience_rows(_get(client, "work_experience"), profiles[0]["name"])
        rows += _project_rows(_get(client, "projects"))
        rows += _research_rows(_get(client, "research"))

    logger.info("Built %d knowledge-base rows from Supabase", len(rows))
    return rows
