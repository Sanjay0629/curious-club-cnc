-- Curious Club: community learning topics and "I'm interested" votes.

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint topics_title_length check (char_length(title) between 1 and 120),
  -- Stored normalized: no leading/trailing whitespace, single spaces inside.
  constraint topics_title_normalized check (title = regexp_replace(btrim(title), '\s+', ' ', 'g'))
);

-- "Learning Rust" and "learning rust" are the same topic.
create unique index topics_title_unique on public.topics (lower(title));
create index topics_created_by_idx on public.topics (created_by);

create table public.topic_votes (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint topic_votes_one_per_user unique (topic_id, user_id)
);

-- Lookups by topic_id are covered by the unique (topic_id, user_id) index.
create index topic_votes_user_id_idx on public.topic_votes (user_id);

-- Whoever proposes a topic counts as its first interested person. Runs in the
-- same transaction as the topic insert, so a topic never exists without it.
create function public.add_creator_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.topic_votes (topic_id, user_id) values (new.id, new.created_by);
  return new;
end;
$$;

revoke execute on function public.add_creator_vote() from public, anon, authenticated;

create trigger topics_add_creator_vote
after insert on public.topics
for each row execute function public.add_creator_vote();

-- Interest counts are computed from vote rows, never stored. security_invoker
-- makes the view run with the caller's privileges, so RLS still applies.
create view public.topics_with_interest
with (security_invoker = true)
as
select
  t.id,
  t.title,
  t.created_by,
  t.created_at,
  count(v.id)::int as interest_count,
  coalesce(bool_or(v.user_id = (select auth.uid())), false) as interested
from public.topics t
left join public.topic_votes v on v.topic_id = t.id
group by t.id;

-- Row Level Security: identity always comes from the Supabase Auth JWT.
alter table public.topics enable row level security;
alter table public.topic_votes enable row level security;

create policy "Signed-in users can read topics"
  on public.topics for select to authenticated
  using (true);

create policy "Users can add topics only as themselves"
  on public.topics for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy "Signed-in users can read votes"
  on public.topic_votes for select to authenticated
  using (true);

create policy "Users can vote only as themselves"
  on public.topic_votes for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can remove only their own votes"
  on public.topic_votes for delete to authenticated
  using (user_id = (select auth.uid()));

-- Table privileges as a second layer: anon gets nothing, nobody can update,
-- topics can't be deleted, and clients can only send the columns they own
-- (id, created_by, user_id and created_at always come from the defaults).
revoke all on public.topics, public.topic_votes, public.topics_with_interest from anon, authenticated;
grant select on public.topics, public.topic_votes, public.topics_with_interest to authenticated;
grant insert (title) on public.topics to authenticated;
grant insert (topic_id), delete on public.topic_votes to authenticated;

-- Live count updates in the browser (Realtime still enforces the select policies).
alter publication supabase_realtime add table public.topics, public.topic_votes;
