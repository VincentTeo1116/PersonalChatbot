# Portfolio Chatbot Backend

A RAG chatbot for a software engineer portfolio website, adapted from the node-based
architecture used in the Companies Act chatbot but simplified for portfolio scale:

- **Embeddings**: Google Gemini (`gemini-embedding-001`, truncated to 768 dims)
- **Answer generation**: Groq (`qwen/qwen3.8-27b` by default) — split out from Gemini for
  its free tier's throughput (observed ~8,000 tokens/min, refilling in well under a second,
  plenty for a portfolio site's traffic even if it's not dramatically higher in absolute
  numbers than Gemini's). Groq has no embeddings endpoint, so that half of the pipeline
  stays on Gemini. **Groq's model lineup changes often** — if `GROQ_CHAT_MODEL` ever 404s,
  check what your key currently has access to with `client.models.list()` (see
  `.env.example`) rather than assuming the configured name still exists.
- **Vector store**: Pinecone (single namespace, no reranker/HyDE/multi-namespace fusion needed
  at this scale)
- **Knowledge base**: the portfolio's own Supabase tables (profile, education, experience,
  projects, research) — the same content the site renders, so there is one place to edit
- **Auto-sync**: saving content in the site's `/admin` pings a `/api/admin/sync-kb` webhook,
  which reads Supabase, re-embeds, and upserts into Pinecone. No spreadsheet, no manual export.

```
Visitor asks question
        │
        ▼
POST /api/chat ──► embed question (Gemini) ──► Pinecone query ──► build context ──► generate (Groq) ──► answer + sources
                                                                                              ▲
                                                                                              │
Site /admin ──save──► POST /api/admin/sync-kb ──► read Supabase ──► embed entries (Gemini) ──► Pinecone upsert
```

## 1. Provision Pinecone

Create a Pinecone project/API key, then leave index creation to the app — `ensure_index()`
in `src/services/pinecone_service.py` creates a serverless index (dimension 768, cosine) on
first startup if it doesn't already exist.

## 2. Get a Gemini API key and a Groq API key

- Gemini (embeddings only): https://aistudio.google.com/apikey — free tier is enough for a
  portfolio site's embedding traffic.
- Groq (answer generation): https://console.groq.com/keys — no credit card required for the
  free tier.

## 3. Configure the backend

```bash
cp .env.example .env
# fill in PINECONE_API_KEY, GEMINI_API_KEY, GROQ_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY,
# and a random SYNC_WEBHOOK_SECRET
pip install -r requirements.txt
python app.py   # serves on http://localhost:8080
```

`GET /health` should return `{"status": "ok"}`.

## 4. Connect the knowledge base (Supabase)

There is no spreadsheet or Apps Script any more. The chatbot's knowledge base is built from
the same Supabase tables the portfolio site renders (profile, education, work experience,
projects, research), so editing content in the site's `/admin` is the only step needed to
update what the chatbot knows.

1. Set up the frontend's Supabase project first (see `../frontend/README.md`: schema + seed
   SQL). The chatbot reads what's in it.
2. In this backend's `.env`, set `SUPABASE_URL` and `SUPABASE_ANON_KEY` to the same values
   as the frontend's `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Only the
   public anon key is needed — the content tables allow public reads via Row Level Security.
3. Set `SYNC_WEBHOOK_SECRET` to any long random string.
4. In the frontend's `.env.local`, set (then restart `npm run dev`):
   ```
   CHATBOT_SYNC_URL=http://localhost:8080/api/admin/sync-kb   # your deployed backend URL in production
   CHATBOT_SYNC_SECRET=<the same value as SYNC_WEBHOOK_SECRET>
   ```
5. Run the first sync: log into the site's `/admin` → **Chatbot** → **Sync chatbot now**
   (or `curl -X POST -H "X-Sync-Secret: <secret>" http://localhost:8080/api/admin/sync-kb`).

From then on, saving (create / edit / delete) in the Profile, Education, Experience,
Projects, or Research sections of `/admin` re-syncs the chatbot automatically in the
background. Reordering and image uploads don't change what the chatbot knows, so they don't
trigger a sync. If a background sync ever fails (backend offline, for example), the save
itself still succeeds — use **Chatbot → Sync chatbot now** to catch up; it shows the result.

### How the Supabase → Pinecone sync actually works

**No text-chunking happens in this pipeline.** Each entry (a project, a degree, a job, a
skill category…) is short, so it's embedded whole as a single vector — there's no
document-splitting step to reason about. If you outgrow that, see
[Adding chunking](#adding-chunking-if-you-need-it) below.

**1. Trigger** — the site's admin server actions (`frontend/lib/chatbot-sync.ts`) `POST` to
`/api/admin/sync-kb` with the shared secret in an `X-Sync-Secret` header. The request has no
body: it's only a "resync now" signal. It runs via Next.js `after()`, i.e. after the save's
response has already gone out, so a slow or offline backend never delays or breaks a save.

**2. Webhook** (`src/routes/webhook.py`) — rejects anything without the right secret (`401`;
treat the secret like a password), then reads Supabase and syncs.

**3. Reading Supabase** (`src/services/supabase_source.py`) — one `GET` per table through
Supabase's REST API with `httpx`, then each row is turned into a FAQ-style entry:

| Source | Entries produced |
|---|---|
| `profile` | "Who is …?" (tagline, location, hero summary, about), "How can I contact …?", CGPA, hackathon count, one per skill category, plus an overall skills entry |
| `education` | one per degree: "Tell me about <degree> at <institution>" |
| `work_experience` | one per job: "What did … do as <role> at <company>?" (bullet lines flattened to sentences) |
| `projects` | one per project: description, award, tech tags, links |
| `research` | one per paper: venue, authors, supervisor, DOI, description |

Hackathon photos are not included (captions only, no substantive content).

**4. Embedding and upsert** (`src/services/kb_sync.py`, unchanged from the Sheet era):
- **Stable IDs**: `md5(f"{category}|{question}".lower().strip())`. Editing an entry's
  *content* updates its vector in place; renaming what it's about (a project's title, a
  degree name) changes the question and therefore the ID, so the old vector is cleaned up in
  the next step.
- **Embedding text**: `category + question + answer + tags`, embedded as one string with
  Gemini `gemini-embedding-001` (768 dims, `task_type="retrieval_document"`), one vector each.
- **Upsert** into the `PINECONE_NAMESPACE` of the `PINECONE_INDEX_NAME` index, in one batch.
- **Cleanup** (`pinecone_service.delete_missing_ids`): every vector in the namespace that
  isn't in this sync is deleted — so removing a project from `/admin` genuinely removes it
  from the chatbot's knowledge, not just from the page.

**5. Safety and freshness**
- If Supabase can't be read, or returns no content at all, the sync aborts with `502` and
  leaves Pinecone untouched — because the cleanup step would otherwise delete *everything*.
- After a successful sync the in-memory answer cache is cleared, so visitors never receive a
  cached answer built from the old content.
- The response is `{status, upserted, removed, skipped, total_received}`, which the admin's
  **Chatbot** page displays.

**Retrieval side** (for context — this doesn't run during sync): `POST /api/chat` embeds the
visitor's question with Gemini (`task_type="retrieval_query"`), queries Pinecone for the
`TOP_K` (default 4) nearest vectors above `MIN_SCORE` (default 0.55) cosine similarity,
concatenates their `answer` metadata into a context block, and feeds that to Groq's
`GROQ_CHAT_MODEL` (default `qwen/qwen3.8-27b`) to generate the final grounded answer.
`POST /api/chat/stream` does the same retrieval, but
streams the answer back as newline-delimited JSON (`{"type":"chunk","text":...}` lines, then
one terminal `{"type":"done", answer, sources, cache_hit, latency_ms}` or `{"type":"error",
message}`) so the widget can render it word-by-word; the widget falls back to the plain
`/api/chat` call automatically if streaming isn't available.

Every answered question (on either endpoint) is also logged to Supabase's `chat_logs` table
in the background — see `src/services/chat_logging.py` and
`frontend/supabase/004_chat_logs.sql` — so `/admin/chatbot` can show what visitors actually
ask. This is best-effort: if the migration hasn't been run yet, logging silently no-ops and
the chat itself is unaffected.

#### Adding chunking (if you need it)

If an entry ever grows into a long free-form document (say a multi-page `description`), you'd
add chunking in `kb_sync.py`, roughly:
1. Split the long text into overlapping chunks (by paragraph, or a fixed-token splitter with
   ~10–20% overlap so context isn't cut mid-sentence).
2. Give each chunk its own Pinecone ID derived from the entry ID plus a chunk index, e.g.
   `f"{row_id}-{i}"`, and compute the full current ID set (entries × chunks) before calling
   `delete_missing_ids`, so cleanup stays correct when an entry's chunk count changes.
3. Embed and upsert each chunk as its own vector, all carrying the same `question`/`category`
   metadata plus a `chunk_index`, so retrieved chunks can be grouped back to their entry.

This isn't implemented today because each entry is already small enough for one embedding to
capture it well — chunking solves a problem that doesn't exist at this content size.

## 5. Test the chatbot

```bash
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What is your educational background?"}'
```

## 6. Deploy

Any container host works (Cloud Run, Fly.io, Render, a small VM). Requirements:
- Expose port `8080` (or set `$PORT` and adjust `app.py`)
- Set the same env vars as `.env`
- Set the frontend's `CHATBOT_SYNC_URL` (`https://<deployed-backend>/api/admin/sync-kb`) and
  `CHATBOT_SYNC_SECRET` so `/admin` saves reach the deployed backend
- Set `ALLOWED_ORIGINS` to your actual portfolio domain (not `*`) once deployed

## 7. Embed the chat widget on your portfolio site

`widget/` has a framework-agnostic drop-in widget (vanilla JS + CSS, no build step, no
dependencies) that calls `/api/chat` and renders a floating chat bubble.

**Try it locally first:** with the backend running (`python app.py`), open
`widget/demo.html` directly in a browser (double-click it, or `start widget/demo.html`
on Windows). Click the chat bubble bottom-right and ask a question about your portfolio.

**To embed on the real site**, copy one `<script>` tag onto any page — plain HTML, React,
Next.js, whatever the portfolio ends up being built with:

```html
<script
  src="https://your-cdn-or-site.com/chatbot-widget.js"
  data-api-url="https://your-deployed-backend.com/api/chat"
  data-owner-name="Vincent"
  data-primary-color="#4f46e5"
  data-greeting="Hi! Ask me anything about Vincent's background, skills, or projects."
  data-starter-questions="What projects have you built?|What's your tech stack?|How can I get in touch?"
></script>
```

`data-starter-questions` is optional and pipe-delimited (not comma, since a question can
contain one) — clickable suggestion chips shown before the visitor's first message, removed
once they send anything. Omit it to use the built-in defaults, or pass `starterQuestions: []`
via `PortfolioChatbotConfig` below to turn them off entirely.

Host `chatbot-widget.js` and `chatbot-widget.css` alongside your site's static assets (the
script auto-loads the CSS from the same folder it was served from). The widget has no
build step — copy both files as-is.

For a React/Next.js site, you can instead configure it via a global object before loading
the script (equivalent to the data-attributes above):

```jsx
<script dangerouslySetInnerHTML={{ __html: `window.PortfolioChatbotConfig = {
  apiUrl: "https://your-deployed-backend.com/api/chat",
  ownerName: "Vincent",
}; ` }} />
<script src="/chatbot-widget.js" />
```

## Design notes vs. the Companies Act chatbot

Kept:
- FAQ-style row → embed (Gemini) → Pinecone → retrieve → generate (Groq) pipeline
- TTL response cache
- Config centralized in `src/config.py`, never hardcoded

Deliberately dropped (portfolio scale doesn't need the complexity):
- Multi-namespace retrieval / Reciprocal Rank Fusion — one namespace is enough for one person's KB
- Cross-encoder reranking, HyDE query expansion, BM25 hybrid search
- Firebase auth / conversation history — a portfolio chatbot is stateless and anonymous
- Circuit breaker — traffic volume doesn't warrant it; add back if this gets hammered

Added (not in the original):
- The portfolio's Supabase tables as the knowledge base, with a push-on-save webhook from the
  site's `/admin`, since the original project's knowledge base is updated via a manual CLI
  upload script (`knowledge_upload.py`) rather than auto-synced from the content source.
  (An earlier version of this project used a Google Sheet + Apps Script for this; it was
  dropped so the site and the chatbot share one source of truth.)
