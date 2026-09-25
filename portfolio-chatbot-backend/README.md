# Portfolio Chatbot Backend

A RAG chatbot for a software engineer portfolio website, adapted from the node-based
architecture used in the Companies Act chatbot but simplified for portfolio scale:

- **Embeddings + generation**: Google Gemini (`text-embedding-004`, `gemini-2.5-flash`)
- **Vector store**: Pinecone (single namespace, no reranker/HyDE/multi-namespace fusion needed
  at this scale)
- **Knowledge base**: a Google Sheet (FAQ-style rows: category / question / answer / tags),
  editable like Excel
- **Auto-sync**: a bound Google Apps Script pushes the sheet to a `/api/admin/sync-kb` webhook
  on every edit, which re-embeds and upserts into Pinecone. No manual export step, ever.

```
Visitor asks question
        │
        ▼
POST /api/chat ──► embed question ──► Pinecone query ──► build context ──► Gemini generate ──► answer + sources
                                                                                       ▲
                                                                                       │
Google Sheet (KB tab) ──edit──► Apps Script ──► POST /api/admin/sync-kb ──► embed rows ──► Pinecone upsert
```

## 1. Provision Pinecone

Create a Pinecone project/API key, then leave index creation to the app — `ensure_index()`
in `src/services/pinecone_service.py` creates a serverless index (dimension 768, cosine) on
first startup if it doesn't already exist.

## 2. Get a Gemini API key

https://aistudio.google.com/apikey — free tier is enough for a portfolio site's traffic.

## 3. Configure the backend

```bash
cp .env.example .env
# fill in PINECONE_API_KEY, GEMINI_API_KEY, and generate a random SYNC_WEBHOOK_SECRET
pip install -r requirements.txt
python app.py   # serves on http://localhost:8080
```

`GET /health` should return `{"status": "ok"}`.

## 4. Set up the knowledge base sheet

1. Open `kb_template/portfolio_kb_template.xlsx` and import it into Google Sheets
   (Google Sheets → File → Import → Upload). Keep the tab name **`KB`** exactly as-is — the
   Apps Script and this README both depend on it.
2. Read the **Instructions** tab in the template, then replace the `[bracketed]` placeholder
   text in the **KB** tab with your real bio, skills, projects, education, and contact info.
   Rows already include your diploma (Software Engineering) → degree (Computer Science,
   Artificial Intelligence) education path as a starting example.
3. In the Sheet: **Extensions → Apps Script**, paste in `apps_script/Code.gs`.
4. **Project Settings (⚙) → Script Properties**, add:
   - `WEBHOOK_URL` = `https://<your-deployed-backend>/api/admin/sync-kb`
   - `SYNC_SECRET` = the same value as `SYNC_WEBHOOK_SECRET` in your backend `.env`
5. Reload the Sheet tab. A **Portfolio KB** menu appears.
6. Run **Portfolio KB → Enable auto-sync on edit** once — this asks for permission to call
   your backend URL and installs the trigger.
7. Run **Portfolio KB → Sync now** to push the initial content.

From then on, every edit to the `KB` tab re-embeds and upserts automatically — the chatbot's
knowledge base is always current with the sheet.

### How the sheet → Pinecone sync actually works

**No text-chunking happens in this pipeline.** Each KB row (category + question + answer +
tags) is short, FAQ-sized content, so it's embedded whole as a single vector — there's no
document-splitting step to reason about. If you outgrow that (e.g. you want to paste in a
long free-form document instead of a Q&A row), see [Adding chunking](#adding-chunking-if-you-need-it)
below for where that logic would go.

**1. Apps Script side** (`apps_script/Code.gs`), triggered either by the installable
`onEdit` trigger (any edit to the `KB` tab) or manually via **Portfolio KB → Sync now**:
- Reads the *entire* `KB` sheet via `getDataRange().getValues()` — not just the edited
  row. Every sync sends the full current table, which is what makes this a **full resync**
  rather than an incremental diff.
- Validates the header row has all five required columns (`category`, `question`,
  `answer`, `tags`, `is_active`); alerts and aborts if any are missing.
- Converts each data row into a `{category, question, answer, tags, is_active}` object,
  keeping only rows where `category`, `question`, and `answer` are all non-empty.
- `POST`s `{"rows": [...]}` as JSON to `WEBHOOK_URL`, with the shared secret in an
  `X-Sync-Secret` header (`SYNC_SECRET` script property). On auto-sync (every keystroke's
  edit event), a `5xx` failure is only logged, not shown as an alert — otherwise you'd get
  a popup on every character typed if the backend were briefly down.

**2. Backend webhook** (`src/routes/webhook.py`, `POST /api/admin/sync-kb`):
- Rejects the request with `401` unless `X-Sync-Secret` matches `SYNC_WEBHOOK_SECRET` from
  `.env` — this is the only auth on this endpoint, so treat that secret like a password.
- Validates the payload shape via a Pydantic model, then hands the row list to
  `sync_rows()`.

**3. Row processing** (`src/services/kb_sync.py`), per sync:
- **Filtering**: drops any row missing `category`/`question`/`answer`, and any row whose
  `is_active` is `"false"`, `"0"`, `"no"`, or empty — so you can stage draft content in
  the sheet (set `is_active` to blank/false) without it reaching the chatbot yet.
- **Stable IDs**: each surviving row's Pinecone vector ID is
  `md5(f"{category}|{question}".lower().strip())`. This is what makes edits *update in
  place* rather than create duplicates — if you edit the `answer` text but leave
  `category`/`question` the same, the same vector ID gets upserted with new content. If
  you edit the `category` or `question` text itself, that's a *new* ID (the old vector
  becomes orphaned, and gets cleaned up in the next step).
- **Embedding text**: `category + "\n" + question + "\n" + answer + "\n" + tags`
  (whichever of those are non-empty), passed to Gemini's `text-embedding-004`
  (`src/services/gemini_service.py:embed_text`, `task_type="retrieval_document"`, 768
  dimensions) as one string, producing one vector per row.
- **Upsert**: all vectors for the surviving rows go to Pinecone in one batch
  (`pinecone_service.upsert_rows`), into the `portfolio-kb` namespace (or whatever
  `PINECONE_NAMESPACE` is set to) of the `portfolio-chatbot` index (`PINECONE_INDEX_NAME`).
- **Deletion / cleanup** (`pinecone_service.delete_missing_ids`): lists every vector ID
  currently in that namespace, and deletes any that *aren't* in this sync's surviving-row
  ID set. This is what makes it a true **sync** and not just an insert — deleting a row
  from the sheet (or setting `is_active` to false, or editing its category/question so its
  ID changes) actually removes the corresponding vector from Pinecone, so stale content
  never lingers in what the chatbot can retrieve.
- Returns `{upserted, removed, skipped, total_received}` counts, which the Apps Script
  logs (`Logger.log`) — check **Apps Script → Executions** in the script editor if a sync
  seems to have not taken effect.

**Retrieval side** (for context — this doesn't run during sync): `POST /api/chat` embeds
the visitor's question with `task_type="retrieval_query"`, queries Pinecone for the
`TOP_K` (default 4) nearest vectors above `MIN_SCORE` (default 0.55) cosine similarity,
concatenates their `answer` metadata into a context block, and feeds that to
`gemini-2.5-flash` to generate the final grounded answer.

#### Adding chunking (if you need it)

If you ever move beyond short Q&A rows — say, a `KB` tab with a `content` column holding
a multi-paragraph document per row — you'd add chunking in `kb_sync.py`, roughly:
1. Split each row's long text into overlapping chunks (e.g. by paragraph, or a
   fixed-token-count splitter with ~10-20% overlap so context isn't cut mid-sentence).
2. Give each chunk its own Pinecone ID derived from the row ID plus a chunk index, e.g.
   `f"{row_id}-{i}"`, so `delete_missing_ids` can still clean up correctly when a row's
   chunk count changes between syncs (compute the full current ID set from all
   rows × chunks before calling it, not just the row-level IDs).
3. Embed and upsert each chunk as its own vector, all carrying the same `question`/
   `category` metadata (plus a `chunk_index`) so retrieved chunks can be grouped or
   deduplicated back to their source row when building the answer context.

This isn't implemented today because the FAQ-row format keeps each unit of content
naturally small enough that a single embedding already captures it well — chunking solves
a problem (losing relevant context inside a too-large embedding) that doesn't exist yet
at this content shape.

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
- Point the Apps Script `WEBHOOK_URL` at the deployed URL
- Set `ALLOWED_ORIGINS` to your actual portfolio domain (not `*`) once deployed

## 7. Embed the chat widget on your portfolio site

`widget/` has a framework-agnostic drop-in widget (vanilla JS + CSS, no build step, no
dependencies) that calls `/api/chat` and renders a floating chat bubble.

**Try it locally first:** with the backend running (`python app.py`), open
`widget/demo.html` directly in a browser (double-click it, or `start widget/demo.html`
on Windows). Click the chat bubble bottom-right and ask a question synced from your KB
sheet.

**To embed on the real site**, copy one `<script>` tag onto any page — plain HTML, React,
Next.js, whatever the portfolio ends up being built with:

```html
<script
  src="https://your-cdn-or-site.com/chatbot-widget.js"
  data-api-url="https://your-deployed-backend.com/api/chat"
  data-owner-name="Vincent"
  data-primary-color="#4f46e5"
  data-greeting="Hi! Ask me anything about Vincent's background, skills, or projects."
></script>
```

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
- FAQ-style row → embed → Pinecone → retrieve → Gemini-generate pipeline
- TTL response cache
- Config centralized in `src/config.py`, never hardcoded

Deliberately dropped (portfolio scale doesn't need the complexity):
- Multi-namespace retrieval / Reciprocal Rank Fusion — one namespace is enough for one person's KB
- Cross-encoder reranking, HyDE query expansion, BM25 hybrid search
- Firebase auth / conversation history — a portfolio chatbot is stateless and anonymous
- Circuit breaker — traffic volume doesn't warrant it; add back if this gets hammered

Added (not in the original):
- Google Sheets + Apps Script as the "Excel" knowledge base with a push-on-edit webhook,
  since the original project's knowledge base is updated via a manual CLI upload script
  (`knowledge_upload.py`) rather than auto-synced from a spreadsheet.
