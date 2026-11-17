import unittest

from src.services.supabase_source import _education_summary_rows


class EducationSummaryTests(unittest.TestCase):
    def entry(self, **changes):
        return {
            "degree": "Bachelor's Degree, Computer Science (Artificial Intelligence)",
            "institution": "Asia Pacific University",
            "period": "Nov 2025 – Dec 2027 (expected)",
            **changes,
        }

    def test_no_education_means_no_entry(self):
        self.assertEqual(_education_summary_rows([], "Vincent Teo"), [])

    def test_summary_answers_the_graduation_question(self):
        rows = _education_summary_rows(
            [self.entry(), self.entry(degree="Diploma in ICT", period="Jul 2023 – Jun 2025")], "Vincent Teo"
        )
        self.assertEqual(len(rows), 1)
        row = rows[0]
        self.assertEqual(row["category"], "Education")
        self.assertIn("graduate", row["question"])
        self.assertIn("Dec 2027 (expected)", row["answer"])
        self.assertIn("Jul 2023 – Jun 2025", row["answer"])
        self.assertIn("graduation", row["tags"])


if __name__ == "__main__":
    unittest.main()
