-- Content snapshot of the live site (text only; images are uploaded through /admin). Run after schema.sql.

insert into public.profile (
  id, name, tagline, location, hero_summary, about, skills,
  stat_cgpa, stat_hackathons, contact_email, contact_github, contact_linkedin, contact_resume_url
) values (
  1,
  'Vincent Teo',
  'Aspiring Software Engineer, specializing in AI/ML',
  'Kuala Lumpur, Malaysia',
  'I build full-stack products with a focus on practical AI - from a real-time LMS serving APU students to hackathon platforms that turn CVE data, medical reports, and fake news into plain-English insights using RAG and LLM integrations (Gemini, AWS PartyRock, Z.AI GLM).',
  'I''m a Computer Science (Artificial Intelligence) undergraduate at Asia Pacific University, having moved from a Software Engineering diploma into a deeper focus on AI/ML — currently holding a 3.98 CGPA. Outside class, I''ve trained people-counting models as a Software Intern at FootfallCam, built APMoodle (a full-stack LMS with real-time chat and live progress tracking) with a team of five, and shipped four hackathon projects in under a year — including an AI CVE-summarising assistant that won 3rd place at the GTD x APU Hackathon. I also tutor kids aged 8–17 in programming, which keeps me honest about explaining things simply.',
  '[
    {"items": [{"name": "Python", "level": 4}, {"name": "Java", "level": 4}, {"name": "TypeScript", "level": 3}, {"name": "JavaScript", "level": 3}, {"name": "C#", "level": 4}, {"name": "PHP", "level": 4}, {"name": "HTML", "level": 4}, {"name": "CSS", "level": 4}], "category": "Languages", "sort_order": 0},
    {"items": [{"name": "PyTorch", "level": 4}, {"name": "TensorFlow", "level": 3}, {"name": "scikit-learn", "level": 3}, {"name": "Hugging Face", "level": 2}, {"name": "OpenCV", "level": 4}, {"name": "YOLO", "level": 4}, {"name": "RAG pipelines", "level": 3}, {"name": "Random Forest", "level": 3}, {"name": "XGBoost", "level": 4}, {"name": "Gemini & OpenAI APIs", "level": 4}], "category": "AI / ML", "sort_order": 1},
    {"items": [{"name": "React", "level": 3}, {"name": "Next.js", "level": 4}, {"name": "Node.js", "level": 3}, {"name": "FastAPI", "level": 4}, {"name": "ASP.NET", "level": 4}], "category": "Frameworks", "sort_order": 2},
    {"items": [{"name": "Docker", "level": 3}, {"name": "Git", "level": 4}, {"name": "Supabase (PostgreSQL)", "level": 5}, {"name": "MongoDB", "level": 3}, {"name": "SQL / MariaDB", "level": 4}, {"name": "CI/CD", "level": 3}], "category": "Tools & Infra", "sort_order": 3}
  ]'::jsonb,
  3.98,
  8,
  'teovincentkq1611@gmail.com',
  'https://github.com/VincentTeo1116/',
  'https://linkedin.com/in/kai-qi-vincent-teo-1596ab286',
  '/resume.pdf'
);

insert into public.education (degree, institution, period, detail, sort_order) values
('Bachelor''s Degree, Computer Science (Artificial Intelligence)', 'Asia Pacific University of Technology & Innovation (APU)', 'Nov 2025 – Present', 'CGPA: 3.98. Coursework: EduConnect Learning Centre (ReactJS, CSS).', 0),
('Diploma in Information & Communication Technology (Software Engineering)', 'Asia Pacific University of Technology & Innovation (APU)', 'Jul 2023 – Jun 2025', 'CGPA: 3.74. Coursework: ResearchSnake (Python), CodeMaster (HTML, CSS).', 1);

insert into public.work_experience (role, company, period, detail, sort_order) values
('AI Intern, CEO Office', 'YYC Holdings Sdn. Bhd. ', 'Aug 2026 - Now', 'AI RAG Chatbot
', 0),
('Part-Time Tutor', 'CodeKids by EDUWEL', 'March 2026 - Now', 'Teach students aged 8–17 programming concepts through interactive and project-based learning.
Conduct classes in Python, Web Development, AI fundamentals, Minecraft coding, and Roblox scripting.
Guide students in building beginner-friendly games (Tkinter, Pygame) and websites. ', 1),
('Software Intern', 'FootfallCam (Meta Research Sdn. Bhd. )', 'Jun 2025 - Oct 2025', 'Trained and evaluated people-counting models for FootfallCam''s in-store analytics platform, working with computer vision pipelines to improve detection accuracy across varied camera angles and lighting conditions. 
Worked with SQL/MariaDB for data verification and system diagnostics. 
Enhanced front-end features using HTML, JavaScript, and API-based multilingual support. 
Developed a C# backend function to synchronize data between servers efficiently.', 3);

insert into public.projects (slug, title, description, tags, links, demo_video_url, featured, award, sort_order) values
('portfolio-chatbot', 'Portfolio AI Chatbot', 'A retrieval-augmented generation (RAG) backend designed for a software engineer portfolio website. It features an automated sync mechanism that pushes updates from Supabase content tables straight to a Pinecone vector index using Gemini embeddings, while leveraging Groq for fast, scalable answer generation. ', array['FastAPI','Gemini','Pinecone','RAG','Next.js','Python'], '[]'::jsonb, null, true, null, 0),
('apmoodle-lms', 'APMoodle', 'A full-stack learning management system built with a team of five — modules, materials, quizzes, and real-time progress in one calm, fast platform. Students get a live dashboard (average/best scores, quiz history, trends), auto-graded multiple-choice quizzes, one-code module enrolment, and real-time announcements/chat with lecturers, complete with unread notification dots. I designed the Supabase (PostgreSQL) schema, built the ASP.NET backend and React frontend, implemented the real-time student–lecturer chat (polling every 5s), and wired up SMTP email for registration and password resets. Scored a 4.0.', array['ASP.NET','Supabase','PostgreSQL','React','Tailwind CSS','SMTP'], '[{"url": "https://apmoodle.onrender.com/", "label": "Live site"}]'::jsonb, null, true, null, 1),
('abang-karipap', 'ABANG KARIPAP', 'An AI-powered fake news detector built at KitaHack. Users paste text or upload an image and get a misinformation verdict with a confidence score and a plain-English explanation, powered by Google Gemini and the Google Vision API. React frontend, FastAPI backend, with optional sign-in and Firebase-backed history so you can revisit past checks.', array['React','FastAPI','Gemini','Google Vision API','Firebase'], '[{"url": "https://karipapfakenews.netlify.app/", "label": "Live demo"}]'::jsonb, null, false, null, 2),
('secinsight-ai', 'SecInsight AI', 'Built at the GTD x APU Hackathon (by Maybank), where it placed 3rd. SecInsight AI analyzes CVE CSV data and automatically generates plain-English vulnerability summaries, risk scores, priority levels, and remediation guidance using Google Gemini AI — turning raw vulnerability dumps into something a non-security team can act on.', array['Google Gemini','CVE Data Analysis'], '[]'::jsonb, null, false, '3rd Place — GTD x APU Hackathon', 3),
('foodloop', 'FoodLoop', 'Built at UM Hackathon. An AI-powered food redistribution platform using Z.AI GLM for intelligent donation matching — parsing unstructured donation descriptions, orchestrating a multi-step workflow, and automatically ranking NGOs by food type and distance. Session-based conversation handling on PostgreSQL, containerized with Docker, complete donation tracking from listing to pickup confirmation.', array['Z.AI GLM','PostgreSQL','Docker','HTML/CSS'], '[]'::jsonb, null, false, null, 4),
('care-ai', 'Care AI', 'Built at the AWS CendekiAwan Hackathon. An AI-powered medical report interpretation platform that analyzes medical documents and transforms complex clinical terminology into plain-language explanations, risk insights, and personalized health recommendations using AWS PartyRock and LLM integration.', array['AWS PartyRock','LLM Integration','Medical NLP'], '[]'::jsonb, null, false, null, 5),
('automated-onboarding', 'ModelXGit', 'Bob 2.0 Skill Orchestrator — a FastAPI backend that turns IBM Bob 2.0 SKILL.md files into an agentic repo-onboarding pipeline. Clone a GitHub repo, and it auto-runs architecture diagrams, secret audits, tech-stack detection, and dependency setup, then exposes on-demand skills like codebase Q&A and README generation.', array['IBM Bob 2.0','Python','FastAPI','Pydantic v2','Mermaid JS','HTML/CSS'], '[{"url": "https://modelxgit-h9lc.onrender.com/", "label": "Live site"}]'::jsonb, 'https://youtu.be/q-l9BO3dgt8?si=MAKUmL744rNHqxvv', false, null, 6);

insert into public.research (slug, title, venue, authors, supervisor, doi, doi_url, description, sort_order) values
('xgboost-shap-passenger-flow', 'XGBoost with SHAP-based Explainable AI for Cross-Border Passenger Flow Forecasting in Hong Kong', 'IEEE ICOSAAS 2026', array['Vincent Teo','Jayden Foo','Elvan Sea','Lai Xiao Chun','Wong Yu En'], 'Ts. Dr. Maythem Kamal Abbas Al-Adilee', '10.1109/ICOSAAS68663.2026.11648824', 'https://doi.org/10.1109/ICOSAAS68663.2026.11648824', 'A published paper on forecasting cross-border passenger flow with XGBoost, with SHAP values layered on top to explain which features actually drive each prediction — turning a black-box gradient-boosted model into something transport planners can audit and trust.', 0);

-- Not included: images (upload via /admin; the site shows placeholders until then), hackathon photos, testimonials (submitted by visitors) and the Final Year Project section.
