-- Checks constraints, RLS policies and grants from the topics migration.
-- Run against a database with the migration applied (e.g. local `supabase start`):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/policies.sql
-- Everything happens in one transaction that is rolled back, so no data is left behind.

begin;

create schema tests;
grant usage on schema tests to anon, authenticated;

create function tests.expect_error(stmt text, expected_sqlstate text) returns void
language plpgsql as $$
begin
  execute stmt;
  raise exception 'expected SQLSTATE % but succeeded: %', expected_sqlstate, stmt;
exception when others then
  if sqlstate <> expected_sqlstate then raise; end if;
end $$;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'alice@example.test'),
  ('00000000-0000-4000-8000-00000000000b', 'bob@example.test');

-- Alice signs in (this is what PostgREST does for a request carrying her JWT).
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);

insert into public.topics (title) values ('Learning Rust');

do $$
declare r public.topics_with_interest;
begin
  select * into strict r from public.topics_with_interest where title = 'Learning Rust';
  assert r.created_by = '00000000-0000-4000-8000-00000000000a', 'created_by must come from the JWT';
  assert r.interest_count = 1 and r.interested, 'creator must be counted as interested';
end $$;

-- Validation and duplicates.
select tests.expect_error($$insert into public.topics (title) values ('LEARNING RUST')$$, '23505');
select tests.expect_error($$insert into public.topics (title) values ('')$$, '23514');
select tests.expect_error($$insert into public.topics (title) values ('   ')$$, '23514');
select tests.expect_error($$insert into public.topics (title) values (' Learning Go')$$, '23514');
select tests.expect_error($$insert into public.topics (title) values ('Learning  Go')$$, '23514');
select tests.expect_error(format('insert into public.topics (title) values (%L)', repeat('x', 121)), '23514');

-- No impersonation, no duplicate vote.
select tests.expect_error($$insert into public.topics (title, created_by) values ('Spoof', '00000000-0000-4000-8000-00000000000b')$$, '42501');
select tests.expect_error($$insert into public.topic_votes (topic_id) select id from public.topics where title = 'Learning Rust'$$, '23505');

-- Even if column grants were loosened by mistake, RLS still blocks impersonation.
reset role;
grant insert (title, created_by) on public.topics to authenticated;
grant insert (topic_id, user_id) on public.topic_votes to authenticated;
set local role authenticated;
select tests.expect_error($$insert into public.topics (title, created_by) values ('Spoof', '00000000-0000-4000-8000-00000000000b')$$, '42501');
select tests.expect_error($$insert into public.topic_votes (topic_id, user_id) select id, '00000000-0000-4000-8000-00000000000b' from public.topics where title = 'Learning Rust'$$, '42501');

-- Bob signs in and sees Alice's topic, not yet marked as his interest.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);

do $$
declare r public.topics_with_interest;
begin
  select * into strict r from public.topics_with_interest where title = 'Learning Rust';
  assert r.interest_count = 1 and not r.interested, 'Bob should see 1 interested, not him';
end $$;

insert into public.topic_votes (topic_id) select id from public.topics where title = 'Learning Rust';

-- Bob cannot touch Alice's records: updates and topic deletes are not granted,
-- and deleting her vote silently matches nothing under RLS.
select tests.expect_error($$update public.topics set title = 'Hijacked'$$, '42501');
select tests.expect_error($$delete from public.topics$$, '42501');
select tests.expect_error($$update public.topic_votes set user_id = '00000000-0000-4000-8000-00000000000b'$$, '42501');
delete from public.topic_votes where user_id = '00000000-0000-4000-8000-00000000000a';

do $$
declare r public.topics_with_interest;
begin
  select * into strict r from public.topics_with_interest where title = 'Learning Rust';
  assert r.interest_count = 2 and r.interested, 'count must be 2 after Bob votes and fails to delete Alice''s vote';
end $$;

-- Bob can remove his own vote.
delete from public.topic_votes where user_id = '00000000-0000-4000-8000-00000000000b';

do $$
begin
  assert (select interest_count from public.topics_with_interest where title = 'Learning Rust') = 1,
    'count must drop back to 1 after Bob removes his vote';
end $$;

-- Signed-out visitors (anon key, no JWT) can't read or write anything.
set local role anon;
select tests.expect_error($$select * from public.topics$$, '42501');
select tests.expect_error($$select * from public.topic_votes$$, '42501');
select tests.expect_error($$select * from public.topics_with_interest$$, '42501');
select tests.expect_error($$insert into public.topics (title) values ('Anon topic')$$, '42501');

select 'all policy checks passed' as result;

rollback;
