# Three-Lane Framework

🔧 **Fix It** · 🧪 **Test It** · 🏗️ **Build It** — sort work into a shared decision framework, then surface where the team disagrees.

Sister tool to `happy-if/` and `exp-canvas/`. Built for Session 3B of the Avis kickoff (May 19 2026).

## How a session flows

1. **Setup** — facilitator pre-loads items (title + optional description + optional source), configures two toggles (capture phase, blind sort), and projects the room code + QR. Participants can join during setup.
2. **Capture (optional)** — participants submit additional items from their phones. The facilitator can remove duplicates or off-topic items.
3. **Sort (blind, optional)** — every participant independently classifies each item into Fix / Test / Build. Mobile: card-by-card with three tap targets. Desktop: card + sidebar showing your current sort.
4. **Analyze** — Opus 4.6 (via OpenRouter) separates consensus (≥70% agreement) from contested items, ranks the contested ones by degree of disagreement, writes a one-sentence discussion prompt for each, and surfaces pattern observations (e.g., team-level skews).
5. **Results** — facilitator works through contested items one card at a time on the projected screen, places each into a final lane after discussion. ML/Avis vote-distribution bars per lane. Consensus items appear as a compact row at the top.
6. **Export** — Markdown with final classification, vote distributions, team breakdown, AI discussion prompts, and pattern insights.

If **blind sort is disabled** the tool falls back to a Direct Discussion board: three lanes + an unsorted bin, facilitator clicks an item's lane chip to place it.

## Setup

### 1. Supabase

Same project as the other two tools. Run [`supabase/schema.sql`](./supabase/schema.sql) — adds 4 tables prefixed `lane_*` alongside the existing happy-if / exp-canvas tables.

### 2. Env vars

```bash
cp .env.local.example .env.local
```

Fill in the same Supabase project URL/anon key as the other tools, plus the same OpenRouter key.

### 3. Run locally

```bash
npm install
npm run dev
```

### 4. Deploy

Third Vercel project from the same `KO_tools` repo. **Root Directory = `three-lanes`**. Same 4 env vars as the other tools.

## Architecture

- Next.js 16 App Router (React 19, Tailwind v4, motion, @dnd-kit)
- Same Supabase project as happy-if / exp-canvas; tables prefixed `lane_*`
- Two API routes: `POST /api/lane-sessions` (create), `POST /api/lanes/[sessionId]/analyze` (Opus 4.6 conflict analysis)
- Same `OPENROUTER_API_KEY` + `OPENROUTER_MODEL` env vars as the sister tools

## Routes

- `/` — landing (create / join)
- `/lanes/[code]` — facilitator (auto-switches view by phase)
- `/join/[code]` — participant (responsive — mobile card sort + desktop card+sidebar)
- `POST /api/lane-sessions` — create a new session with unique 4-digit code
- `POST /api/lanes/[sessionId]/analyze` — kicks off Opus analysis, stores `analysis_result`, advances phase to `results`

## Brand-safe lane colors

PRD specified green/blue/purple; the Monstarlab system reserves green for status feedback. Mapped to brand tints:

| Lane | Light tint | Solid |
|---|---|---|
| 🔧 Fix It | `#E6F4FA` (Light Blue 100) | `#1FA2D1` |
| 🧪 Test It | `#FFFDE6` (Yellow 100) | `#FFFF00` |
| 🏗️ Build It | `#F2E8EC` (Burgundy 100) | `#741A3D` |

Team toggle (Monstarlab / Avis) is retained on this tool because team-level pattern analysis is one of the things the workshop is trying to surface.
