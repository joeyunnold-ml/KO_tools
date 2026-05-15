-- Three-Lane Framework (Fix It / Test It / Build It) — schema additions.
-- Run this in the same Supabase project that the happy-if and exp-canvas
-- tools use. These tables are prefixed `lane_` to avoid name collisions.

create table if not exists lane_sessions (
  id uuid primary key default gen_random_uuid(),
  room_code text unique not null,
  phase text not null default 'setup' check (phase in ('setup', 'lobby', 'capture', 'sort', 'analyze', 'results', 'complete')),
  capture_enabled boolean not null default true,
  blind_sort_enabled boolean not null default true,
  analysis_result jsonb,
  facilitator_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists lane_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references lane_sessions(id) on delete cascade not null,
  name text not null,
  team text not null check (team in ('monstarlab', 'avis')),
  is_facilitator boolean not null default false,
  joined_at timestamptz not null default now()
);

create table if not exists lane_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references lane_sessions(id) on delete cascade not null,
  title text not null check (char_length(title) <= 100),
  description text check (char_length(description) <= 200),
  source text,
  is_preloaded boolean not null default false,
  submitted_by uuid references lane_participants(id) on delete set null,
  final_lane text check (final_lane in ('fix', 'test', 'build')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists lane_classifications (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references lane_sessions(id) on delete cascade not null,
  item_id uuid references lane_items(id) on delete cascade not null,
  participant_id uuid references lane_participants(id) on delete cascade not null,
  lane text not null check (lane in ('fix', 'test', 'build')),
  unique(item_id, participant_id)
);

-- Indexes
create index if not exists idx_lane_sessions_room_code on lane_sessions(room_code);
create index if not exists idx_lane_items_session on lane_items(session_id);
create index if not exists idx_lane_classifications_session on lane_classifications(session_id);
create index if not exists idx_lane_classifications_item on lane_classifications(item_id);
create index if not exists idx_lane_participants_session on lane_participants(session_id);

-- Enable Realtime (idempotent)
do $$
declare
  t text;
begin
  foreach t in array array['lane_sessions','lane_participants','lane_items','lane_classifications'] loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception
      when duplicate_object then null;
    end;
  end loop;
end $$;

-- REPLICA IDENTITY FULL so DELETE events propagate through session filters
alter table lane_sessions         replica identity full;
alter table lane_participants     replica identity full;
alter table lane_items            replica identity full;
alter table lane_classifications  replica identity full;

-- Disable RLS for ephemeral workshop use; room code + facilitator token is the only access control
alter table lane_sessions         disable row level security;
alter table lane_participants     disable row level security;
alter table lane_items            disable row level security;
alter table lane_classifications  disable row level security;
