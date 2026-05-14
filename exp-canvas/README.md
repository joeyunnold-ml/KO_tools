# Experiment Lifecycle Canvas

Workshop facilitation tool for mapping how experiments move through an organization — from idea to production. Sister tool to `happy-if/`, built for Session 2C of the Avis kickoff (May 19 2026).

## How the session flows

1. **Lobby** — facilitator creates a canvas, projects the 4-digit code + QR, participants join with just a first name.
2. **Beat 1 — Elicit (blind):** each participant lists what they think the lifecycle stages are on their phone, in order. The facilitator only sees a submission counter.
3. **Beat 2 — Synthesize (AI):** Opus 4.6 (via OpenRouter) merges the individual lists into a proposed 5-9 stage lifecycle with confidence indicators and a narrative noting agreement/divergence. The reveal screen shows individual chains on the left, the AI proposal on the right.
4. **Beat 3 — Structure:** facilitator accepts, edits, or starts from scratch. Defaults (Activities / People / Tools / Pain Points / Hopes) are added as rows.
5. **Contribute:** the full grid opens. Everyone adds stickies simultaneously, the facilitator can pin / move / delete stickies, focus a single column, and export to Markdown.

## Setup

### 1. Supabase

Uses the same Supabase project as `happy-if/`. Run [`supabase/schema.sql`](./supabase/schema.sql) in the SQL editor — it adds 6 tables prefixed for this tool (`canvases`, `canvas_participants`, `lifecycle_submissions`, `canvas_columns`, `canvas_rows`, `stickies`). No conflicts with the happy-if tables.

After running, confirm under **Database → Replication** that all 6 tables appear in `supabase_realtime`.

### 2. Env vars

```bash
cp .env.local.example .env.local
```

Fill in the same Supabase project URL/anon key as happy-if, plus the same OpenRouter key:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=anthropic/claude-opus-4.6
```

### 3. Run locally

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) (or 3001 if happy-if is already on 3000).

### 4. Deploy

Create a **second Vercel project** from the `KO_tools` repo, set its **Root Directory** to `exp-canvas`. Add the same four env vars in **Settings → Environment Variables**.

## Architecture

- **Next.js 16 App Router** (React 19, Tailwind v4, Turbopack, `motion` for layout transitions)
- **Same Supabase project as happy-if**, separate tables prefixed with `canvas_*` / `stickies` / `lifecycle_submissions`
- Two API routes: `POST /api/canvases` (create with room code retry) and `POST /api/canvas/[canvasId]/synthesize` (LLM call)
- Synthesis uses the same OpenRouter key + model env vars as happy-if's `/api/cluster`

## Routes

- `/` — landing (create canvas / enter code)
- `/canvas/[code]` — facilitator (projected); auto-switches view based on the canvas's `phase`
- `/join/[code]` — participant (mobile)
- `/api/canvases` — POST creates a canvas with a unique 4-digit room code
- `/api/canvas/[canvasId]/synthesize` — POST triggers the AI synthesis (server-side, uses `OPENROUTER_API_KEY`)

## Reused from happy-if

Visual identity + several modules duplicated rather than shared (no monorepo):

- DM Sans + Monstarlab design tokens (`app/globals.css`)
- `lib/palette.ts` — pill colors (hash-by-participant-id) and row colors (brand-safe row tints for Activities / People / Tools / Pain Points / Hopes)
- `lib/supabase.ts`, `lib/storage.ts`
- `components/ResponsePill.tsx` (lightly retyped to the canvas types)

`useCanvas` is the canvas-specific equivalent of happy-if's `useSession` — same Realtime-subscription pattern, different tables.
