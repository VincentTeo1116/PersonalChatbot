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
