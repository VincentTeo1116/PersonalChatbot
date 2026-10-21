"""Scores retrieval against a fixed question set: does the right knowledge-base entry come back, and how high?

Run from portfolio-chatbot-backend/:  python -m scripts.eval_retrieval
Set PINECONE_NAMESPACE to evaluate a different namespace, and EVAL_RAW_QUERIES=1 to skip the name-stripping on queries.
Each case is (question, field, substring): a result counts as a hit when that metadata field contains the substring.
"""
import os

from src.services import retrieval

CASES = [
    ("What awards has Vincent won?", "label", "SecInsight"),
    ("Has Vincent published any research?", "category", "Research"),
    ("What did Vincent do at FootfallCam?", "question", "FootfallCam"),
    ("What is Vincent's CGPA?", "question", "CGPA"),
    ("Does Vincent know Docker?", "category", "Skills"),
    ("What is his tech stack?", "category", "Skills"),
    ("What is Snoopy Treasury?", "label", "Snoopy"),
    ("Tell me about his hackathons", "category", "Hackathons"),
    ("Where did he study?", "category", "Education"),
    ("How can I contact Vincent?", "category", "Contact"),
    ("Tell me about the AWS hackathon project", "label", "Care AI"),
    ("What did he build for UM Hackathon?", "label", "FoodLoop"),
    ("Has he worked as a tutor?", "question", "Tutor"),
    ("What does ModelXGit do?", "label", "ModelXGit"),
    ("Who is Vincent?", "category", "About"),
    ("Which project won a prize?", "label", "SecInsight"),
    ("What is his work experience?", "category", "Work Experience"),
    ("Does he have a published paper?", "category", "Research"),
    ("What programming languages does he use?", "category", "Skills"),
    ("Tell me about APMoodle", "label", "APMoodle"),
]


def main() -> None:
    strip = os.getenv("EVAL_RAW_QUERIES") != "1"
    hits1 = hits3 = 0
    reciprocal = 0.0
    for question, field, needle in CASES:
        matches = retrieval.search(question, top_k=6, strip_name=strip)
        rank = next(
            (i + 1 for i, m in enumerate(matches) if needle.lower() in str(m["metadata"].get(field, "")).lower()), None
        )
        hits1 += rank == 1
        hits3 += rank is not None and rank <= 3
        reciprocal += 1 / rank if rank else 0
        top = matches[0] if matches else None
        shown = f"{top['score']:.3f} {top['metadata'].get('label') or top['metadata'].get('category')}" if top else "-"
        print(f"{'OK ' if rank == 1 else ('~3 ' if rank and rank <= 3 else 'MISS')} rank={rank or '-'}  {question}  -> top: {shown}")
    n = len(CASES)
    print(f"\nnamespace={os.getenv('PINECONE_NAMESPACE', 'default')}  hit@1={hits1}/{n}  hit@3={hits3}/{n}  MRR={reciprocal / n:.2f}")


if __name__ == "__main__":
    main()
