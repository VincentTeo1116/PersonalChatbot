-- Run once in the Supabase SQL Editor, AFTER schema.sql.
-- This fills in text content only (profile, education, projects, research, and
-- hackathon captions are NOT included here -- see the note at the bottom for why).

insert into public.profile (
  id, name, tagline, location, hero_summary, about, skills,
  stat_cgpa, stat_hackathons, contact_email, contact_github, contact_linkedin, contact_resume_url
) values (
  1,
  'Vincent Teo',
  'Aspiring Software Engineer, specializing in AI/ML',
  'Kuala Lumpur, Malaysia',
  'I build full-stack products with a focus on practical AI - from a real-time LMS serving APU students to hackathon platforms that turn CVE data, medical reports, and fake news into plain-English insights using RAG and LLM integrations (Gemini, AWS PartyRock, Z.AI GLM).',
  'I''m a Computer Science (Artificial Intelligence) undergraduate at Asia Pacific University, having moved from a Software Engineering diploma into a deeper focus on AI/ML — currently holding a 4.00 CGPA. Outside class, I''ve trained people-counting models as a Software Intern at FootfallCam, built APMoodle (a full-stack LMS with real-time chat and live progress tracking) with a team of five, and shipped four hackathon projects in under a year — including an AI CVE-summarising assistant that won 3rd place at the GTD x APU Hackathon. I also tutor kids aged 8–17 in programming, which keeps me honest about explaining things simply.',
  '[
    {"category": "Languages", "sort_order": 0, "items": ["Python", "Java", "TypeScript", "JavaScript", "C#", "PHP"]},
    {"category": "AI / ML", "sort_order": 1, "items": ["PyTorch", "TensorFlow", "scikit-learn", "Hugging Face", "OpenCV", "YOLO", "RAG pipelines", "Random Forest", "XGBoost", "Gemini & OpenAI APIs"]},
    {"category": "Frameworks", "sort_order": 2, "items": ["React", "Next.js", "Node.js", "FastAPI", "ASP.NET"]},
    {"category": "Tools & Infra", "sort_order": 3, "items": ["Docker", "Git", "Supabase (PostgreSQL)", "MongoDB", "SQL / MariaDB", "CI/CD"]}
  ]'::jsonb,
  4.00,
  4,
  'tkqvincent2@gmail.com',
  '',
  'https://linkedin.com/in/kai-qi-vincent-teo-1596ab286',
  '/resume.pdf'
);

insert into public.education (degree, institution, period, detail, sort_order) values
('Bachelor''s Degree, Computer Science (Artificial Intelligence)', 'Asia Pacific University of Technology & Innovation (APU)', 'Nov 2025 – Present', 'CGPA: 4.00. Coursework: EduConnect Learning Centre (ReactJS, CSS).', 0),
('Diploma in Information & Communication Technology (Software Engineering)', 'Asia Pacific University of Technology & Innovation (APU)', 'Jul 2023 – Jun 2025', 'CGPA: 3.74. Coursework: ResearchSnake (Python), CodeMaster (HTML, CSS).', 1);

insert into public.projects (slug, title, description, tags, links, demo_video_url, featured, award, sort_order) values
('portfolio-chatbot', 'Portfolio AI Chatbot', 'The assistant on this very site. A retrieval-augmented chatbot that answers questions about my background, skills, and projects — backed by Gemini embeddings + generation and a Pinecone vector index. The knowledge base is a Google Sheet that auto-syncs to Pinecone on every edit via an Apps Script webhook, so updating my info is a spreadsheet edit, not a redeploy.', array['FastAPI','Gemini','Pinecone','RAG','Next.js'], '[{"label":"GitHub","url":"https://github.com/[yourusername]/portfolio-chatbot-backend"}]'::jsonb, null, true, null, 0),
('apmoodle-lms', 'APMoodle', 'A full-stack learning management system built with a team of five — modules, materials, quizzes, and real-time progress in one calm, fast platform. Students get a live dashboard (average/best scores, quiz history, trends), auto-graded multiple-choice quizzes, one-code module enrolment, and real-time announcements/chat with lecturers, complete with unread notification dots. I designed the Supabase (PostgreSQL) schema, built the ASP.NET backend and React frontend, implemented the real-time student–lecturer chat (polling every 5s), and wired up SMTP email for registration and password resets. Scored a 4.0.', array['ASP.NET','Supabase','PostgreSQL','React','Tailwind CSS','SMTP'], '[{"label":"Live site","url":"https://apmoodle.onrender.com/"}]'::jsonb, null, true, null, 1),
('abang-karipap', 'ABANG KARIPAP', 'An AI-powered fake news detector built at KitaHack. Users paste text or upload an image and get a misinformation verdict with a confidence score and a plain-English explanation, powered by Google Gemini and the Google Vision API. React frontend, FastAPI backend, with optional sign-in and Firebase-backed history so you can revisit past checks.', array['React','FastAPI','Gemini','Google Vision API','Firebase'], '[{"label":"Live demo","url":"https://karipapfakenews.netlify.app/"}]'::jsonb, null, false, null, 2),
('secinsight-ai', 'SecInsight AI', 'Built at the GTD x APU Hackathon (by Maybank), where it placed 3rd. SecInsight AI analyzes CVE CSV data and automatically generates plain-English vulnerability summaries, risk scores, priority levels, and remediation guidance using Google Gemini AI — turning raw vulnerability dumps into something a non-security team can act on.', array['Google Gemini','CVE Data Analysis'], '[]'::jsonb, null, false, '3rd Place — GTD x APU Hackathon', 3),
('foodloop', 'FoodLoop', 'Built at UM Hackathon. An AI-powered food redistribution platform using Z.AI GLM for intelligent donation matching — parsing unstructured donation descriptions, orchestrating a multi-step workflow, and automatically ranking NGOs by food type and distance. Session-based conversation handling on PostgreSQL, containerized with Docker, complete donation tracking from listing to pickup confirmation.', array['Z.AI GLM','PostgreSQL','Docker','HTML/CSS'], '[]'::jsonb, null, false, null, 4),
('care-ai', 'Care AI', 'Built at the AWS CendekiAwan Hackathon. An AI-powered medical report interpretation platform that analyzes medical documents and transforms complex clinical terminology into plain-language explanations, risk insights, and personalized health recommendations using AWS PartyRock and LLM integration.', array['AWS PartyRock','LLM Integration','Medical NLP'], '[]'::jsonb, null, false, null, 5);

insert into public.research (slug, title, venue, authors, supervisor, doi, doi_url, description, sort_order) values
('xgboost-shap-passenger-flow', 'XGBoost with SHAP-based Explainable AI for Cross-Border Passenger Flow Forecasting in Hong Kong', 'IEEE ICOSAAS 2026', array['Vincent Teo','Jayden Foo','Elvan Sea','Lai Xiao Chun','Wong Yu En'], 'Ts. Dr. Maythem Kamal Abbas Al-Adilee', '10.1109/ICOSAAS68663.2026.11648824', 'https://doi.org/10.1109/ICOSAAS68663.2026.11648824', 'A published paper on forecasting cross-border passenger flow with XGBoost, with SHAP values layered on top to explain which features actually drive each prediction — turning a black-box gradient-boosted model into something transport planners can audit and trust.', 0);

-- NOTE on images:
-- profile.avatar_path, research.image_path are nullable and left unset here --
-- the site falls back to the local placeholder images automatically until you
-- upload real ones. education_images, project_images, and hackathon_photos
-- are NOT included: their storage_path column is required (NOT NULL) and has
-- to point at a real file already sitting in the "portfolio-content" Storage
-- bucket, which plain SQL can't upload for you. Add those through the admin
-- panel instead (/admin -> Education / Projects / Hackathons) once you're
-- logged in -- the upload forms there create the file AND the matching row
-- together, using the image-1/image-2/... naming convention automatically.
--
-- Do NOT also run `npm run seed` after this file -- it would insert a second,
-- duplicate copy of education/projects/research (only the profile row is
-- guarded against double-seeding). Use one method or the other, not both.
