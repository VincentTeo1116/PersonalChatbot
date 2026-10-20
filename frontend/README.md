# Portfolio Frontend

Next.js 16 (App Router, TypeScript, Tailwind CSS v4) portfolio site backed by Supabase
(Postgres + Storage + Auth), with a password-protected `/admin` CMS for editing every
section, and an embedded AI chat widget backed by
[`../portfolio-chatbot-backend`](../portfolio-chatbot-backend).

All content (profile, education, work experience, skills, projects, research, hackathon
photos, testimonials, final year project) lives in the database, not in code — a fresh clone has no content until you seed
it, and you edit it afterward through `/admin`, not by editing files.

## 1. Install dependencies

```bash
npm install
```

See [Troubleshooting](#troubleshooting) below if `npm run dev` fails right after this.

## 2. Set up Supabase

You need your own Supabase project — nothing here works without it, since every page
fetches its content from it.

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → API**: copy the `Project URL` and `anon public` key.
3. Copy `.env.local.example` to `.env.local` and paste those two values in for
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. (Never put real values
   in `.env.local.example` itself — that file is committed to git as a template;
   `.env.local` is gitignored.)
4. **Authentication → Sign-up settings**: turn **off** public sign-up.
5. **Authentication → Users → Add user**: create the one admin account you'll log into
   `/admin` with (real email + a strong password), with "Auto Confirm User" checked.
   This is the only account that should ever exist.
6. **Storage → New bucket**: name it `portfolio-content`, toggle **Public bucket** on.
7. **SQL Editor**, run these files in order (copy-paste each one's contents, Run):
   - `supabase/schema.sql` — all tables, indexes, and Row Level Security policies
     (includes the Working Experience tables already; `002_work_experience.sql` is only
     needed if you ran an older copy of `schema.sql` before that section existed)
   - `supabase/seed.sql` — your real profile/education/projects/research content (edit
     this file first if you want different starting content — it's plain SQL, safe to
     read before running)
   - `supabase/003_fix_storage_policies.sql` through `011_meeting_request_replies.sql` —
     later additions (storage policy fix, chat logs, testimonials, resume upload, meeting
     requests, the Final Year Project section, project role/impact/availability fields,
     testimonial approval status, and meeting-request replies). Run them in numeric order.
     Each file says at the top what it adds, and the admin page for each feature just
     shows an empty state until you add content.

Optional but recommended: also set `NEXT_PUBLIC_SITE_URL` in `.env.local` to your public
URL. It drives canonical links, `sitemap.xml`, `robots.txt`, Open Graph and JSON-LD.

## 3. Add images (optional, can do later via `/admin`)

`seed.sql` only inserts text content — your avatar, education photos, project
screenshots, research image, and hackathon photos start out on placeholder images (or
blank, where nothing's uploaded yet). Once you're logged into `/admin` (see the next
step for how), every section's edit page has an upload form that pushes the file into
Storage and links it to the right row automatically.

## 4. Run locally

```bash
npm run dev
```

Open http://localhost:3000 — this is the public site, reading live from your Supabase
project. To edit content, go to **http://localhost:3000/admin** (redirects to
`/admin/login`) and sign in with the admin account you created in step 2.5. From there
you can edit Profile, Education, Experience, Projects, Research, Hackathons,
Testimonials, and the Final Year Project section, plus review meeting requests and
chatbot questions (see **Chatbot** in the sidebar) — changes appear on the public site
immediately.

### Optional: GitHub stats, meeting-request emails and analytics

These work without any setup, with a graceful fallback if you skip them:

- **GitHub stats/exhibition** (`components/GithubStats.tsx`, `GithubExhibition.tsx`):
  repo/star/follower counts and the repo list work with no token via GitHub's public REST
  API. The green-square contribution calendar needs GraphQL, which requires
  `GITHUB_TOKEN` in `.env.local` (a classic token with **no scopes checked** is enough —
  it only ever reads public data). Without it, the calendar is just skipped.
- **Meeting request emails** (`components/MeetingRequestModal.tsx`, sent via
  [Resend](https://resend.com)): every submission is always saved to Supabase and visible
  in `/admin/meeting-requests` regardless of this setup. Set `RESEND_API_KEY` in
  `.env.local` to also get an email notification (sent to the address in
  `/admin/profile`'s Contact section); `RESEND_FROM_EMAIL` can stay at its default until
  you verify your own sending domain in Resend.

- **Google Analytics 4** (`components/GoogleAnalyticsLoader.tsx`): set
  `NEXT_PUBLIC_GA_ID` (the `G-…` Measurement ID) to enable it. It is skipped when unset
  and never loads on `/admin`. Vercel Analytics custom events (e.g. the contact nudge)
  are tracked separately via `@vercel/analytics`.
- **Google Search Console**: set `NEXT_PUBLIC_GSC_VERIFICATION` to the token from the
  "HTML tag" method (only the `content="…"` value), then submit `/sitemap.xml`.

Every variable is documented inline in `.env.local.example` — copy them in, restart
`npm run dev`, done.

## 5. Connect the chat widget to your backend

```bash
# already in .env.local from step 2 — just add/confirm this var too
NEXT_PUBLIC_CHATBOT_API_URL=http://localhost:8080/api/chat
```

The widget itself (`public/widget/chatbot-widget.js` + `.css`) is a copy of
`../portfolio-chatbot-backend/widget/`. If you update the widget there, re-copy both
files here.

The chatbot's knowledge base is built from these same Supabase tables (no spreadsheet). To
keep it in sync, add these **server-only** vars to `.env.local` (values explained in
`../portfolio-chatbot-backend/README.md`, section 4):

```bash
CHATBOT_SYNC_URL=http://localhost:8080/api/admin/sync-kb
CHATBOT_SYNC_SECRET=<same value as the backend's SYNC_WEBHOOK_SECRET>
```

After that, saving in `/admin` (Profile, Education, Experience, Projects, Research)
re-syncs the chatbot in the background, and **Admin → Chatbot → Sync chatbot now** runs it
manually and shows the result. Leave both vars unset and the site works as before — the
chatbot just won't learn about edits.

## 6. Deploy

Vercel is the path of least resistance for Next.js:

```bash
npx vercel
```

or connect the GitHub repo at vercel.com/new. Set every var from `.env.local` in the
Vercel project settings too — `.env.local` isn't committed, so nothing works on a deploy
without them set there: the required ones (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_CHATBOT_API_URL`, `CHATBOT_SYNC_URL`,
`CHATBOT_SYNC_SECRET`; pointing the last two at your deployed backend, and
`NEXT_PUBLIC_SITE_URL` set to your live URL) plus whichever of the optional
`GITHUB_TOKEN` / `RESEND_API_KEY` / `RESEND_FROM_EMAIL` / `NEXT_PUBLIC_GA_ID` /
`NEXT_PUBLIC_GSC_VERIFICATION` you're using locally — skip a var and its feature just falls back the same way it does locally.

Netlify works too via its Next.js runtime — same environment variable requirement.

## Testimonials

Visitors can leave a testimonial from the site (`TestimonialSubmitForm`, shared by the
modal and the standalone `/testimonial` page). Submissions are saved as `pending` and only
appear publicly after you approve them in `/admin/testimonials`. That admin page also has
an invite-link card (copy link, WhatsApp, email) pointing to `/testimonial`, which is
`noindex` and left out of the sitemap.

## SEO

`lib/seo.ts` holds the site URL helpers. The home page emits Person + WebSite JSON-LD,
each `/projects/[slug]` page emits CreativeWork/SoftwareSourceCode + BreadcrumbList
JSON-LD, and `sitemap.xml` uses `updated_at` for `lastmod` (revalidated hourly). Open
Graph images are generated by `app/opengraph-image.tsx` and
`app/projects/[slug]/opengraph-image.tsx`.

## Admin

Saving, creating, deleting and replying in `/admin` show a confirmation (or error) modal
via `components/admin/AdminFeedback.tsx`; server actions return `{ ok | error | redirectTo }`
instead of throwing. `proxy.ts` guards `/admin` routes.

## Interactive extras

- **Command palette** (`components/CommandPalette.tsx`, via `cmdk`) — press `Cmd/Ctrl+K`
  or click "Search" in the nav. Fuzzy-navigates sections and individual projects
  (deep-links to `#project-<slug>`, which the card listens for via CSS `:target` to
  highlight itself), opens the chat assistant, opens the terminal, or jumps to
  email/GitHub/LinkedIn.
- **Contact nudge** (`components/ContactNudge.tsx`) — a small corner card offering a
  meeting request or LinkedIn, shown after 45 s of visible time and 60% scroll. It stays
  hidden while another dialog is open or the Contact section is in view, and a dismissal
  snoozes it for 14 days (localStorage).
- **Terminal easter egg** (`components/TerminalEasterEgg.tsx`, via `@xterm/xterm`) — the
  `>_` button bottom-left. A tiny fake shell (`help`, `whoami`, `about`, `skills`,
  `education`, `projects`, `hackathons`, `ls`, `cat <file>`, `contact`, `clear`, `exit`,
  plus a `sudo make me a sandwich` joke) reading from the same Supabase-backed data as
  the rest of the site, so it never goes stale. Both are opened programmatically
  elsewhere via `window.dispatchEvent(new CustomEvent("portfolio:open-palette"))` /
  `"portfolio:open-terminal"` — reuse that pattern if you wire up more triggers later.

## Design notes

- Dark/light theme toggle, indigo/violet accent gradient, Geist font (matches the chat
  widget's default primary color so the embedded widget doesn't look bolted on).
- Animations run on [Motion](https://motion.dev) (`motion/react`, formerly Framer
  Motion) — scroll-triggered reveals (`components/Reveal.tsx`), a shared-element nav
  hover pill, magnetic buttons (`components/MagneticButton.tsx`), and spring-based card
  hovers. Respects `prefers-reduced-motion` via `MotionConfig` in
  `components/MotionProvider.tsx`.
- Hero and nav entrance animations are CSS (`.enter-*` classes in `globals.css`) so they
  render without waiting for JavaScript; heavier modals and the command palette are
  lazy-loaded with `next/dynamic`.
- `next/image` is configured (`next.config.ts`) to accept Supabase Storage URLs
  (`*.supabase.co`) as a remote image pattern, alongside local files under `public/`.

## Troubleshooting

**`Module not found: Can't resolve 'motion/react'`** (or any other dependency) when
running `npm run dev` — your local `node_modules` is out of date relative to
`package.json`, usually from pulling changes without reinstalling. Run `npm install`
again; it's always safe to re-run and picks up any new dependency without needing a
fresh clone or a `node_modules` wipe.

**`Turbopack is not supported on this platform (win32/x64) because native bindings are
not available`** when running `npm run dev` or `npm run build` — despite what the
message implies, Windows x64 *is* a supported Turbopack platform; this means the
platform-specific native package (`@next/swc-win32-x64-msvc`) didn't actually get
installed. This usually happens when `node_modules` was copied from another machine/OS
instead of installed fresh, or when `npm install` was run with optional dependencies
skipped (check for `omit=optional` or `optional=false` in any `.npmrc`, or an
`--omit=optional`/`--no-optional` flag). Fix, in order of likelihood to work:
1. Delete `node_modules` and `package-lock.json`'s lock (keep the file itself), then
   `npm install` fresh on the actual Windows machine you're running on:
   ```bash
   rm -rf node_modules
   npm install
   ```
2. If that doesn't fix it (e.g. a corporate proxy/firewall blocks the binary download),
   fall back to Webpack instead of Turbopack for this one run:
   ```bash
   npx next dev --webpack
   ```
   or make it permanent by changing `"dev": "next dev"` to `"dev": "next dev --webpack"`
   in `package.json` (same for the `"build"` script).
