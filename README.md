# Portfolio + AI Chatbot

[Deployed Website](https://vincent16-portfolio.vercel.app)

A software engineer's portfolio website with a database-backed CMS and an embedded AI
assistant that answers visitor questions about the owner's background, skills, and
projects — grounded only in real content, no hallucinated experience.

The repo is two independently deployable projects that share one Supabase database as
their source of truth:

```
┌─────────────────────────┐        reads/writes         ┌──────────────┐
│  frontend/              │ ───────────────────────────►│   Supabase   │
│  Next.js site + /admin  │                             │ (Postgres,   │
│                         │◄─────────────────────────── │  Storage,    │
└───────────┬─────────────┘        content              │  Auth)       │
            │ embeds widget                             └──────┬───────┘
            │ POST /api/chat                                   │ reads on sync
            ▼                                                  ▼
┌─────────────────────────┐   embed (Gemini) + retrieve   ┌──────────────┐
│portfolio-chatbot-backend│ ─────────────────────────────►│   Pinecone   │
│ FastAPI RAG chatbot     │◄──────────────────────────────│ (vector DB)  │
└─────────────────────────┘   generate answer (Groq)      └──────────────┘
```

- **[`frontend/`](frontend)** — the public site and its `/admin` CMS. Next.js 16 (App
  Router, TypeScript, Tailwind v4), reading and writing every section (profile,
  education, experience, projects, research, Final Year Project, hackathons,
  testimonials, meeting requests) straight from Supabase — there's no hardcoded content
  to edit, it's all done by logging into `/admin`.
- **[`portfolio-chatbot-backend/`](portfolio-chatbot-backend)** — a standalone
  retrieval-augmented chatbot (FastAPI) that reads the same Supabase tables the site
  renders, embeds them with Gemini, stores them in Pinecone, and answers visitor
  questions with Groq — grounded in that content, nothing made up. Saving in `/admin`
  automatically re-syncs it. Deployed separately (currently on Render); the frontend
  just calls its `/api/chat` endpoint.

Each has its own full setup guide — **start there**, not here, to actually run anything:

- [`frontend/README.md`](frontend/README.md)
- [`portfolio-chatbot-backend/README.md`](portfolio-chatbot-backend/README.md)

## Quick start

Both projects need their own `.env` file and a shared Supabase project. In short:

1. Create a Supabase project, run the SQL migrations in `frontend/supabase/` (see the
   frontend README, step 2).
2. `cd frontend && npm install && npm run dev` — the site at `localhost:3000`.
3. `cd portfolio-chatbot-backend && pip install -r requirements.txt && python app.py` —
   the chatbot API at `localhost:8080`.
4. Point the frontend's `NEXT_PUBLIC_CHATBOT_API_URL` / `CHATBOT_SYNC_URL` at the
   backend, and you have a fully working site + chatbot locally.

## Highlights

- **Content lives in the database, not in code.** Every section is editable through
  `/admin` (single admin account, Supabase Auth) and renders immediately on the public
  site — no redeploy needed to change text, swap a photo, or add a project.
- **The chatbot never goes stale.** It reads the exact same Supabase tables the site
  renders; there's no separate spreadsheet or manual re-upload step to forget.
- **Multi-language input, English output.** Visitors can ask in any language; the
  chatbot always replies in English.
- **No made-up answers.** The system prompt restricts the chatbot to only the retrieved
  context — if it doesn't know, it says so and points to the contact details instead.

## Repo layout

```
frontend/  # Next.js site + /admin CMS
  app/   # routes (public pages + /admin)
  components/  # UI (Hero, Projects, GithubExhibition, FYP, chat widget loader, ...)
  lib/  # Supabase clients, data-fetching, validation, storage helpers
  supabase/ #  SQL migrations + seed data

portfolio-chatbot-backend/ # FastAPI RAG chatbot
  src/routes/   # /api/chat, /api/admin/sync-kb
  src/services/  #Gemini, Groq, Pinecone, Supabase-reading, prompt building
  widget/  # framework-agnostic drop-in chat widget (vanilla JS/CSS)
```
