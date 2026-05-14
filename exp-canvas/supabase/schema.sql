-- Experiment Lifecycle Canvas — schema additions.
-- Run this in the same Supabase project that the happy-if tool uses. These
-- tables sit alongside happy-if's (sessions, participants, responses, …)
-- without conflicting; they're prefixed/named for the canvas tool.

create table if not exists canvases (
  id uuid primary key default gen_random_uuid(),
  room_code text unique not null,
  phase text not null default 'lobby' check (phase in ('lobby', 'elicit', 'synthesize', 'structure', 'contribute')),
  focused_column_id uuid,
  synthesis_result jsonb,
  facilitator_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists canvas_participants (
  id uuid primary key default gen_random_uuid(),
  canvas_id uuid references canvases(id) on delete cascade not null,
  name text not null,
  is_facilitator boolean not null default false,
  joined_at timestamptz not null default now()
);

create table if not exists lifecycle_submissions (
  id uuid primary key default gen_random_uuid(),
  canvas_id uuid references canvases(id) on delete cascade not null,
  participant_id uuid references canvas_participants(id) on delete cascade not null,
  stages jsonb not null,
  submitted_at timestamptz not null default now(),
  unique(canvas_id, participant_id)
);

create table if not exists canvas_columns (
  id uuid primary key default gen_random_uuid(),
  canvas_id uuid references canvases(id) on delete cascade not null,
  label text not null,
  sort_order integer not null default 0
);

create table if not exists canvas_rows (
  id uuid primary key default gen_random_uuid(),
  canvas_id uuid references canvases(id) on delete cascade not null,
  label text not null,
  color text not null default 'gray',
  sort_order integer not null default 0
);

create table if not exists stickies (
  id uuid primary key default gen_random_uuid(),
  canvas_id uuid references canvases(id) on delete cascade not null,
  column_id uuid references canvas_columns(id) on delete cascade not null,
  row_id uuid references canvas_rows(id) on delete cascade not null,
  participant_id uuid references canvas_participants(id) on delete cascade not null,
  text text not null check (char_length(text) <= 200),
  highlighted boolean not null default false,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_canvases_room_code on canvases(room_code);
create index if not exists idx_canvas_participants_canvas on canvas_participants(canvas_id);
create index if not exists idx_lifecycle_submissions_canvas on lifecycle_submissions(canvas_id);
create index if not exists idx_canvas_columns_canvas on canvas_columns(canvas_id);
create index if not exists idx_canvas_rows_canvas on canvas_rows(canvas_id);
create index if not exists idx_stickies_canvas on stickies(canvas_id);
create index if not exists idx_stickies_cell on stickies(column_id, row_id);

-- Enable Realtime on all six tables (idempotent — safe to re-run).
do $$
declare
  t text;
begin
  foreach t in array array['canvases','canvas_participants','lifecycle_submissions','canvas_columns','canvas_rows','stickies'] loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception
      when duplicate_object then null;  -- already in the publication
    end;
  end loop;
end $$;

-- REPLICA IDENTITY FULL so DELETE events propagate through session-scoped
-- filters (same gotcha we hit in happy-if).
alter table canvases             replica identity full;
alter table canvas_participants  replica identity full;
alter table lifecycle_submissions replica identity full;
alter table canvas_columns       replica identity full;
alter table canvas_rows          replica identity full;
alter table stickies             replica identity full;

-- Disable RLS for the ephemeral workshop use case. The room code +
-- facilitator-token model is the only access control.
alter table canvases             disable row level security;
alter table canvas_participants  disable row level security;
alter table lifecycle_submissions disable row level security;
alter table canvas_columns       disable row level security;
alter table canvas_rows          disable row level security;
alter table stickies             disable row level security;
