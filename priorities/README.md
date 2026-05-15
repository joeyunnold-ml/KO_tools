# Priority Vote

🗳️ The closing exercise: vote on the day's priorities, then assign owners and first actions on the projected screen. The output is a shareable read-only commitment table — the artifact that gets emailed Tuesday morning.

Fourth tool in `KO_tools`, sister to `happy-if/`, `exp-canvas/`, and `three-lanes/`. Built for Session 4 of the Avis kickoff (May 19 2026).

## How a session flows

1. **Setup** — facilitator pre-loads priorities (title + optional description + optional access-needed), toggles the optional capture phase on/off, picks votes-per-person (2-5, default 3), projects the room code + QR.
2. **Capture (optional)** — participants submit additional priorities; facilitator can dismiss duplicates.
3. **Vote** — every participant allocates their N votes across priorities. Stacking allowed (multiple votes on one priority). Blind — no one sees counts until close.
4. **Assign** — priorities re-rank by vote count (ties share rank, broken by setup order). Facilitator fills in ML Owner, Avis Counterpart, Access Needed, First Action inline. Every keystroke saves to Supabase; Realtime pushes to all participants live.
5. **Complete** — the session is marked done. The same `/votes/[code]` URL becomes a shareable read-only artifact anyone can open without joining.

No AI orchestrator. The tally is arithmetic; the assignment is human judgment.

## Setup

### 1. Supabase

Same project as the other three tools. Run [`supabase/schema.sql`](./supabase/schema.sql) — adds 4 tables prefixed `vote_*` / `priority_votes` alongside the existing tables, plus a `check_priority_vote_limit` trigger that enforces the per-person limit at the DB layer.

### 2. Env vars

```bash
cp .env.local.example .env.local
```

Just the two Supabase vars — no OpenRouter needed.

### 3. Run locally

```bash
npm install
npm run dev
```

### 4. Deploy

Fourth Vercel project from the same `KO_tools` repo. **Root Directory = `priorities`**. Same two env vars.

## Architecture

- Next.js 16 App Router (React 19, Tailwind v4, motion)
- Same Supabase project; tables prefixed `vote_*` / `priority_votes`
- One API route: `POST /api/vote-sessions` (create with collision retry)
- No LLM; tally is client-side arithmetic from the vote data

## Routes

- `/` — landing (create / join)
- `/votes/[code]` — facilitator view AND the post-workshop shareable URL. The view detects whether the visitor holds the facilitator token in sessionStorage; without it, they see the read-only commitment table.
- `/join/[code]` — participant view (responsive)
- `POST /api/vote-sessions` — create session

## What's distinctive about this tool

- **Inline assignment fields**: during the assign phase the facilitator types directly into ML Owner / Avis Counterpart / Access Needed / First Action fields. Each field commits on blur or Enter. Datalist suggestions surface the ML and Avis participant names as auto-completes.
- **Shareable URL pattern**: the same URL the facilitator uses live becomes a read-only artifact post-workshop. No separate "/preview" or "/archive" route. The URL stays clean for Slack.
- **Rank shows ties**: `1, 1, 3, 4, ...` — built into `lib/ranking.ts` so all surfaces (assign view, read-only view, Markdown export) agree on rank numbers.
- **Add-during-assign**: an "+ Add another priority (0 votes; will sit at the bottom)" button stays available during assignment for items that surface mid-discussion.
