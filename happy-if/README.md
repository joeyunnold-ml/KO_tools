# We'll Be Happy If…

Workshop facilitation tool for surfacing individual goals before group dynamics homogenize them. Built for the Avis kickoff workshop, May 19 2026.

## Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a new project (free tier is fine).

From the dashboard:

- **Settings → API**: copy the **Project URL** and the **anon / public** key.
- **SQL Editor**: paste the contents of [`supabase/schema.sql`](./supabase/schema.sql) and run it. This creates the 5 tables, indexes, the 3-vote-cap trigger, and enables Realtime on all of them.
- **Database → Replication**: confirm all 5 tables (`sessions`, `participants`, `groups`, `responses`, `votes`) appear under `supabase_realtime`. The schema script should have added them, but it's worth a visual check — Realtime is the backbone of the whole tool.

### 2. Configure env vars

```bash
cp .env.local.example .env.local
```

Fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

### 3. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Deploy to Vercel

```bash
vercel --prod
```

Set the two `NEXT_PUBLIC_*` env vars in the Vercel project settings. That's it — no other infrastructure.

## How it works

- **Facilitator** opens `/`, clicks "Create session", gets a 4-digit room code and QR. The facilitator screen is what gets projected.
- **Participants** scan the QR (or go to `/join/<code>`), enter first name + team (Monstarlab / Avis), then wait.
- The facilitator advances the room through 5 phases: **lobby → submit → cluster → vote → complete**.
- All clients sync in real time via Supabase Realtime subscriptions on the 5 tables.
- After voting, the facilitator can export results to Markdown.

## Architecture

- **Next.js 16 App Router** (React 19, Tailwind v4, Turbopack)
- **Supabase Postgres** for state, **Supabase Realtime** for live sync
- One serverless API route (`/api/sessions`) — only used for room-code-collision retries on session creation; everything else goes directly from the browser to Supabase
- Facilitator auth is a lightweight `facilitator_token` UUID stored in `sessionStorage` and checked on phase / group mutations

## Routes

- `/` — facilitator landing (create session) + participant code-entry fallback
- `/session/[code]` — facilitator view (room-projected)
- `/join/[code]` — participant view (mobile-first)
- `/api/sessions` — POST creates a new session with a unique room code

## Notes

- The tool is single-use, ephemeral, and not protected by login. The room code + token is the only access control. Sessions remain reachable for at least the Supabase project's data retention window.
- Clustering supports both drag-and-drop (`@dnd-kit`) AND a per-card dropdown — the dropdown is a safety net if drag-and-drop misbehaves on a particular browser. The facilitator can use either.
- The 3-vote cap is enforced both client-side (UI) and server-side (Postgres trigger in the schema).
