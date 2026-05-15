-- Priority Voting & Assignment — schema additions for the 4th tool.
-- Runs alongside happy-if / exp-canvas / three-lanes in the same Supabase
-- project. All tables are prefixed `vote_*` / `priority_*` to avoid
-- collisions.

create table if not exists vote_sessions (
  id uuid primary key default gen_random_uuid(),
  room_code text unique not null,
  phase text not null default 'setup' check (phase in ('setup', 'lobby', 'capture', 'vote', 'assign', 'complete')),
  capture_enabled boolean not null default false,
  votes_per_person integer not null default 3 check (votes_per_person between 2 and 5),
  facilitator_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists vote_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references vote_sessions(id) on delete cascade not null,
  name text not null,
  team text not null check (team in ('monstarlab', 'avis')),
  is_facilitator boolean not null default false,
  joined_at timestamptz not null default now()
);

create table if not exists vote_priorities (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references vote_sessions(id) on delete cascade not null,
  title text not null check (char_length(title) <= 100),
  description text check (char_length(description) <= 200),
  is_preloaded boolean not null default false,
  submitted_by uuid references vote_participants(id) on delete set null,
  accepted boolean not null default true,
  access_needed text,
  ml_owner text,
  avis_counterpart text,
  first_action text,
  final_rank integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists priority_votes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references vote_sessions(id) on delete cascade not null,
  priority_id uuid references vote_priorities(id) on delete cascade not null,
  participant_id uuid references vote_participants(id) on delete cascade not null
);

-- Enforce votes_per_person via trigger (matches happy-if's pattern)
create or replace function check_priority_vote_limit()
returns trigger as $$
declare
  max_votes integer;
  used integer;
begin
  select votes_per_person into max_votes from vote_sessions where id = NEW.session_id;
  if max_votes is null then max_votes := 3; end if;
  select count(*) into used from priority_votes
    where participant_id = NEW.participant_id
      and session_id = NEW.session_id;
  if used >= max_votes then
    raise exception 'Participant has reached the vote limit (%)', max_votes;
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists enforce_priority_vote_limit on priority_votes;
create trigger enforce_priority_vote_limit
  before insert on priority_votes
  for each row execute function check_priority_vote_limit();

-- Indexes
create index if not exists idx_vote_sessions_room_code on vote_sessions(room_code);
create index if not exists idx_vote_priorities_session on vote_priorities(session_id);
create index if not exists idx_priority_votes_session  on priority_votes(session_id);
create index if not exists idx_priority_votes_priority on priority_votes(priority_id);
create index if not exists idx_vote_participants_session on vote_participants(session_id);

-- Realtime (idempotent)
do $$
declare t text;
begin
  foreach t in array array['vote_sessions','vote_participants','vote_priorities','priority_votes'] loop
    begin execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- REPLICA IDENTITY FULL so DELETE events propagate through session filters
alter table vote_sessions     replica identity full;
alter table vote_participants replica identity full;
alter table vote_priorities   replica identity full;
alter table priority_votes    replica identity full;

-- Disable RLS for ephemeral workshop use
alter table vote_sessions     disable row level security;
alter table vote_participants disable row level security;
alter table vote_priorities   disable row level security;
alter table priority_votes    disable row level security;
