-- Run this in the Supabase SQL editor (Settings → SQL Editor) to create the schema.
-- After running, go to Database → Replication and confirm the 5 tables appear under supabase_realtime.

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  room_code text unique not null,
  phase text not null default 'lobby' check (phase in ('lobby', 'submit', 'cluster', 'vote', 'complete')),
  facilitator_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade not null,
  name text not null,
  team text not null check (team in ('monstarlab', 'avis')),
  is_facilitator boolean not null default false,
  connected boolean not null default true,
  joined_at timestamptz not null default now()
);

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade not null,
  label text not null,
  sort_order integer not null default 0
);

create table if not exists responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade not null,
  participant_id uuid references participants(id) on delete cascade not null,
  text text not null check (char_length(text) <= 280),
  group_id uuid references groups(id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade not null,
  participant_id uuid references participants(id) on delete cascade not null,
  group_id uuid references groups(id) on delete cascade not null
);

create index if not exists idx_sessions_room_code on sessions(room_code);
create index if not exists idx_participants_session on participants(session_id);
create index if not exists idx_responses_session on responses(session_id);
create index if not exists idx_groups_session on groups(session_id);
create index if not exists idx_votes_session on votes(session_id);

create or replace function check_vote_limit()
returns trigger as $$
begin
  if (select count(*) from votes where participant_id = NEW.participant_id and session_id = NEW.session_id) >= 3 then
    raise exception 'Participant has reached the maximum of 3 votes';
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists enforce_vote_limit on votes;
create trigger enforce_vote_limit
  before insert on votes
  for each row execute function check_vote_limit();

-- Enable Realtime on all five tables
alter publication supabase_realtime add table sessions;
alter publication supabase_realtime add table participants;
alter publication supabase_realtime add table responses;
alter publication supabase_realtime add table groups;
alter publication supabase_realtime add table votes;

-- Disable RLS for the initial build. The tool is ephemeral and the data is not
-- sensitive; the room-code + facilitator-token model is the only access control.
-- (Per PRD: "you can start with RLS disabled and add policies later".)
alter table sessions       disable row level security;
alter table participants   disable row level security;
alter table groups         disable row level security;
alter table responses      disable row level security;
alter table votes          disable row level security;
