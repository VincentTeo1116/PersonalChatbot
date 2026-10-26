import unittest

from src.services.supabase_source import _project_rows, _research_rows


class CaseStudySourceTests(unittest.TestCase):
    def project(self, **changes):
        return {
            "title": "Portfolio AI Chatbot",
            "slug": "portfolio-chatbot",
            "description": "An assistant grounded in portfolio content.",
            "tags": ["FastAPI", "RAG"],
            **changes,
        }

    def test_existing_projects_keep_their_overview_without_migration(self):
        rows = _project_rows([self.project()])
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["url"], "/projects/portfolio-chatbot")
        self.assertIn("An assistant grounded", rows[0]["answer"])

    def test_sections_are_separate_sources_with_direct_links(self):
        rows = _project_rows([self.project(case_study={
            "approach": "Query vectors before generating an answer.",
            "validation": "No answer-quality score has been published.",
        })])
        self.assertEqual(len(rows), 3)
        approach, validation = rows[1:]
        self.assertEqual(approach["url"], "/projects/portfolio-chatbot#approach")
        self.assertEqual(validation["url"], "/projects/portfolio-chatbot#validation")
        self.assertNotIn("No answer-quality", approach["answer"])
        self.assertIn("No answer-quality", validation["answer"])
        self.assertEqual(approach["tags"], "FastAPI, RAG")
        self.assertEqual(len({row["question"] for row in rows}), 3)

    def test_unknown_empty_and_nontext_sections_are_not_indexed(self):
        rows = _project_rows([self.project(case_study={
            "problem": "   ", "decisions": ["not text"],
            "private_notes": "Do not index this unknown field.",
            "limitations": "  Evaluation is still pending.  ",
        })])
        self.assertEqual(len(rows), 2)
        self.assertTrue(rows[1]["answer"].endswith("Evaluation is still pending."))
        self.assertNotIn("private_notes", str(rows))

    def test_malformed_legacy_values_do_not_break_sync(self):
        for value in (None, [], "draft", 42):
            with self.subTest(value=value):
                self.assertEqual(len(_project_rows([self.project(case_study=value)])), 1)

    def test_research_sources_link_to_the_paper_and_specific_section(self):
        rows = _research_rows([{
            "slug": "forecasting", "title": "Forecasting research", "description": "Research summary.",
            "case_study": {"approach": "XGBoost with SHAP.", "private_notes": "Ignore this."},
        }])
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["url"], "/research/forecasting")
        self.assertEqual(rows[1]["url"], "/research/forecasting#approach")
        self.assertNotIn("Ignore this.", str(rows))


if __name__ == "__main__":
    unittest.main()
