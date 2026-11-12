"""End-to-end evaluation of the portfolio assistant: retrieval ranking, the live similarity cutoff, greeting handling and answer quality.

Run from portfolio-chatbot-backend/:
    python -m scripts.eval_chatbot                 # everything (answer checks take several minutes on the free model tier)
    python -m scripts.eval_chatbot --no-answers    # retrieval and cutoff checks only (embeddings, no chat model calls)
    python -m scripts.eval_chatbot --save          # also append the run to frontend/lib/evaluation-history.json

What the answer checks are, and are not: they are deterministic string checks (expected facts present, a decline phrase present,
forbidden phrases absent, numbers traceable to the retrieved text). They are cheap and repeatable, but they are not a human or
model judgement of fluency or of every claim in the answer.
"""
import argparse
import datetime
import json
import re
import statistics
import subprocess
import time
from pathlib import Path

from src.config import Config
from src.routes import chat as chat_route
from src.services import retrieval
from src.services.groq_service import BusyError, generate_answer

from scripts.eval_cases import CASES, SMALL_TALK

DEPTH = 6
PAUSE_SECONDS = 12  # keeps answer generation under the free tier's output-tokens-per-minute limit
HISTORY = Path(__file__).resolve().parents[2] / "frontend" / "lib" / "evaluation-history.json"
DETAIL = Path(__file__).resolve().parents[1] / "eval-results" / "latest.json"

DECLINE = re.compile(
    r"don't have|do not have|doesn't have|not have (?:that|any|this)|no (?:information|record|mention)|not (?:mentioned|available|included|listed|specified|provided)"
    r"|can't|cannot|can not|unable|won't|not able|only (?:here|able|answer|help)|i'm here to|outside|not something|isn't (?:something|mentioned|available)|sorry",
    re.IGNORECASE,
)
NUMBER = re.compile(r"\d+(?:\.\d+)?")


def rank_of(matches: list[dict], field: str, needle: str) -> int | None:
    return next((i + 1 for i, m in enumerate(matches) if needle.lower() in str(m["metadata"].get(field, "")).lower()), None)


def ask(question: str, matches: list[dict]) -> tuple[str, float]:
    """Generates an answer the way the chat route does (same cutoff, context and prompt), minus the meeting-intent pre-check."""
    live = [m for m in matches[: Config.TOP_K] if m["score"] >= Config.MIN_SCORE]
    context = chat_route._build_context(live)
    for attempt in range(3):
        start = time.monotonic()
        try:
            return generate_answer(question, context), time.monotonic() - start
        except BusyError:
            time.sleep(30 * (attempt + 1))
    raise BusyError("Still rate limited after three attempts")


def ungrounded_numbers(answer: str, question: str, matches: list[dict]) -> list[str]:
    """Numbers in the answer that appear neither in the retrieved entries nor in the question."""
    live = [m for m in matches[: Config.TOP_K] if m["score"] >= Config.MIN_SCORE]
    source = question + " " + " ".join(f"{m['metadata'].get('question', '')} {m['metadata'].get('answer', '')}" for m in live)
    known = set(NUMBER.findall(source))
    return [n for n in NUMBER.findall(answer) if n not in known]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-answers", action="store_true")
    parser.add_argument("--save", action="store_true")
    args = parser.parse_args()

    rows = []
    for case in CASES:
        matches = retrieval.search(case["question"], top_k=DEPTH)
        row = {"kind": case["kind"], "question": case["question"], "top_score": round(matches[0]["score"], 3) if matches else None}
        row["top_label"] = (matches[0]["metadata"].get("label") or matches[0]["metadata"].get("category")) if matches else None
        if "needle" in case:
            rank = rank_of(matches, case["field"], case["needle"])
            row["expected"] = case["needle"]
            row["rank"] = rank
            # "Live": the expected entry is among the results the chat route would actually pass to the model.
            row["live"] = bool(rank and rank <= Config.TOP_K and matches[rank - 1]["score"] >= Config.MIN_SCORE)
        else:
            # For questions the portfolio can't answer, a top score under the cutoff means the model receives no context at all.
            row["blocked_by_cutoff"] = not matches or matches[0]["score"] < Config.MIN_SCORE
        row["small_talk_false_positive"] = chat_route._small_talk(case["question"]) is not None
        row["_matches"] = matches
        row["_case"] = case
        rows.append(row)

    in_scope = [r for r in rows if "rank" in r]
    out_scope = [r for r in rows if "rank" not in r]
    n = len(in_scope)
    summary = {
        "date": datetime.date.today().isoformat(),
        "commit": subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip() or None,
        "namespace": Config.PINECONE_NAMESPACE,
        "cutoff": Config.MIN_SCORE,
        "topK": Config.TOP_K,
        "depth": DEPTH,
        "questions": len(CASES),
        "retrieval": {
            "questions": n,
            "hitAtOne": sum(r["rank"] == 1 for r in in_scope),
            "hitAtThree": sum(bool(r["rank"]) and r["rank"] <= 3 for r in in_scope),
            "mrr": round(sum(1 / r["rank"] for r in in_scope if r["rank"]) / n, 3),
            "live": sum(r["live"] for r in in_scope),
            "byKind": {
                kind: {
                    "questions": len(group),
                    "hitAtOne": sum(r["rank"] == 1 for r in group),
                    "hitAtThree": sum(bool(r["rank"]) and r["rank"] <= 3 for r in group),
                }
                for kind in ("direct", "paraphrase", "multi")
                if (group := [r for r in in_scope if r["kind"] == kind])
            },
        },
        "outOfScope": {
            "questions": len(out_scope),
            "blockedByCutoff": sum(r["blocked_by_cutoff"] for r in out_scope),
        },
        "smallTalk": {
            "greetings": len(SMALL_TALK),
            "recognised": sum(chat_route._small_talk(text) is not None for text in SMALL_TALK),
            "falsePositives": sum(r["small_talk_false_positive"] for r in rows),
        },
        "answers": None,
    }

    for r in in_scope:
        if r["rank"] != 1:
            print(f"rank={r['rank'] or '-'}  [{r['kind']}] {r['question']}  expected: {r['expected']}  got: {r['top_label']} ({r['top_score']})")
    for r in out_scope:
        if not r["blocked_by_cutoff"]:
            print(f"passes cutoff  [{r['kind']}] {r['question']}  -> {r['top_label']} ({r['top_score']})")

    if not args.no_answers:
        factual = [r for r in in_scope if r["_case"].get("facts")]
        declines = [r for r in out_scope if r["_case"].get("answer")]
        latencies = []
        for i, r in enumerate(factual + declines):
            if i:
                time.sleep(PAUSE_SECONDS)
            answer, seconds = ask(r["question"], r["_matches"])
            latencies.append(seconds)
            r["answer"] = answer
            r["ungrounded_numbers"] = ungrounded_numbers(answer, r["question"], r["_matches"])
            if r in factual:
                missing = [group for group in r["_case"]["facts"] if not any(term.lower() in answer.lower() for term in group)]
                r["passed"] = not missing
                r["missing"] = missing
            else:
                leaked = [term for term in r["_case"]["forbidden"] if term.lower() in answer.lower()]
                r["passed"] = bool(DECLINE.search(answer)) and not leaked
                r["leaked"] = leaked
            print(f"{'PASS' if r['passed'] else 'FAIL'}  [{r['kind']}] {r['question']}\n      {answer[:220]!r}")

        ordered = sorted(latencies)
        summary["answers"] = {
            "factual": {"questions": len(factual), "passed": sum(r["passed"] for r in factual)},
            "declines": {
                "questions": len(declines),
                "passed": sum(r["passed"] for r in declines),
                "byKind": {
                    kind: {"questions": len(group), "passed": sum(r["passed"] for r in group)}
                    for kind in ("unanswerable", "off_topic", "adversarial")
                    if (group := [r for r in declines if r["kind"] == kind])
                },
            },
            "numbersTraceable": sum(not r["ungrounded_numbers"] for r in factual + declines),
            "answered": len(factual + declines),
            "medianSeconds": round(statistics.median(latencies), 2),
            "p95Seconds": round(ordered[min(len(ordered) - 1, int(len(ordered) * 0.95))], 2),
            "model": Config.GROQ_CHAT_MODEL,
        }

    print("\n" + json.dumps(summary, indent=2))

    DETAIL.parent.mkdir(exist_ok=True)
    DETAIL.write_text(
        json.dumps({"summary": summary, "cases": [{k: v for k, v in r.items() if not k.startswith("_")} for r in rows]}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    if args.save:
        history = json.loads(HISTORY.read_text(encoding="utf-8")) if HISTORY.exists() else []
        history.append(summary)
        HISTORY.write_text(json.dumps(history, indent=2) + "\n", encoding="utf-8")
        print(f"\nAppended to {HISTORY}")


if __name__ == "__main__":
    main()
