# Portfolio Frontend

Next.js (App Router, TypeScript, Tailwind CSS v4) portfolio site with an embedded AI chat
widget backed by [`../portfolio-chatbot-backend`](../portfolio-chatbot-backend).

## 1. Fill in your real content

Everything in `[brackets]` is a placeholder. Edit these files:

- `data/profile.ts` — name, tagline, bio, education, skills, contact links
- `data/projects.ts` — your project list (two entries are already filled in for you:
  this portfolio chatbot itself, and the sibling Companies Act chatbot project)
- `data/hackathons.ts` — captions for your hackathon photos

Then replace the placeholder images with real ones (same filenames, or update the `src`
paths in the data files above):
- `public/avatar-placeholder.svg` — your photo
- `public/projects/placeholder.svg` — screenshot for project #3
- `public/hackathons/placeholder-1.svg` … `placeholder-4.svg` — your hackathon photos
  (add/remove entries in `data/hackathons.ts` to match how many you have)

## 2. Connect the chat widget to your backend

```bash
cp .env.local.example .env.local
# set NEXT_PUBLIC_CHATBOT_API_URL to your deployed backend's /api/chat endpoint
```

The widget itself (`public/widget/chatbot-widget.js` + `.css`) is a copy of
`../portfolio-chatbot-backend/widget/`. If you update the widget there, re-copy both
files here.

## 3. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. The chat bubble in the bottom-right corner talks to whatever
`NEXT_PUBLIC_CHATBOT_API_URL` points at (run the backend locally too if you want to test
real answers, per its own README).

## 4. Deploy

Vercel is the path of least resistance for Next.js:

```bash
npx vercel
```

or connect the GitHub repo at vercel.com/new. Set `NEXT_PUBLIC_CHATBOT_API_URL` as an
environment variable in the Vercel project settings (pointing at your deployed backend),
not just in `.env.local` (that file isn't committed).

Netlify works too via its Next.js runtime — same environment variable requirement.

## Interactive extras

- **Command palette** (`components/CommandPalette.tsx`, via `cmdk`) — press `Cmd/Ctrl+K` or
  click "Search" in the nav. Fuzzy-navigates sections and individual projects (deep-links to
  `#project-<slug>`, which the card listens for via CSS `:target` to highlight itself), opens
  the chat assistant, opens the terminal, or jumps to email/GitHub/LinkedIn.
- **Terminal easter egg** (`components/TerminalEasterEgg.tsx`, via `@xterm/xterm`) — the `>_`
  button bottom-left. A tiny fake shell (`help`, `whoami`, `about`, `skills`, `projects`, `ls`,
  `cat <file>`, `contact`, `clear`, `exit`, plus a `sudo make me a sandwich` joke) that reads
  straight from `data/profile.ts` / `data/projects.ts`, so it never goes stale relative to the
  rest of the site. Both are opened programmatically elsewhere via `window.dispatchEvent(new
  CustomEvent("portfolio:open-palette"))` / `"portfolio:open-terminal"` — reuse that pattern if
  you wire up more triggers later.

## Design notes

- Dark theme, indigo/violet accent gradient, Geist font (matches the chat widget's default
  primary color so the embedded widget doesn't look bolted on).
- Sections fade in on scroll via a small `IntersectionObserver`-based `Reveal` wrapper
  (`components/Reveal.tsx`) — no animation library needed.
- All images are local SVGs under `public/`, so `next/image` needs no remote-pattern
  config. Swap them for real JPG/PNG photos freely — `next/image` handles both.
