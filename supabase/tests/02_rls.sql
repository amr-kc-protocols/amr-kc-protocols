-- Row-level security: one learner must not be able to read, alter, or delete
-- another's records, and Ask the Educator submissions must be write-only from
-- the client.
--
-- Every block below runs inside an explicit transaction. That is not
-- decoration: `SET LOCAL ROLE` outside a transaction is a no-op, which would
-- leave these statements running as the superuser — who bypasses RLS entirely
-- and makes every one of these checks pass for the wrong reason.
--
-- Run via ./run.sh.

\set ON_ERROR_STOP on
\pset pager off

-- Supabase grants these to the authenticated role; the harness must match,
-- and `authenticated` must NOT own the tables or it would bypass RLS.
grant select, insert, update on public.academy_completions to authenticated;
grant insert on public.ask_educator_messages to authenticated;
revoke select on public.ask_educator_messages from anon, authenticated;

truncate public.academy_completions, public.ask_educator_messages;

insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222')
on conflict do nothing;

-- Seed A's row as A.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  insert into public.academy_completions
    (user_id, course_id, learner_name, modules, modules_total)
  values ('11111111-1111-1111-1111-111111111111', 'hemodynamics', 'Jane Medic, NRP',
          '{"1":{"read":true,"passed":true,"best":90}}'::jsonb, 8);
commit;

\echo '### 6. Learner B reads A''s row'
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
  select count(*) as rows_visible_to_B from public.academy_completions;
commit;
\echo '--> expect 0'

\echo ''
\echo '### 6b. Learner B updates A''s row'
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
  update public.academy_completions set learner_name = 'HACKED';
commit;
select learner_name as name_after_B_update from public.academy_completions;
\echo '--> expect UPDATE 0 and name still Jane Medic, NRP'

\echo ''
\echo '### 6c. Learner B deletes A''s row (no delete policy exists)'
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
  do $$
  begin
    delete from public.academy_completions;
    raise notice 'delete affected % row(s)', (select count(*) from public.academy_completions);
  exception when insufficient_privilege then
    raise notice 'PASS — delete privilege not granted';
  end $$;
commit;
select count(*) as rows_remaining from public.academy_completions;
\echo '--> expect 1 row remaining'

\echo ''
\echo '### 7. B inserts a row owned by A'
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
  do $$
  begin
    insert into public.academy_completions (user_id, course_id, modules_total)
    values ('11111111-1111-1111-1111-111111111111', 'airway', 8);
    raise notice 'FAIL — insert for another user succeeded';
  exception when insufficient_privilege then
    raise notice 'PASS — blocked by RLS';
  end $$;
commit;

\echo ''
\echo '### 9. Ask the Educator read-back'
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
  insert into public.ask_educator_messages (user_id, message)
  values ('22222222-2222-2222-2222-222222222222', 'What is the MAP target post-arrest?');
  do $$
  begin
    perform count(*) from public.ask_educator_messages;
    raise notice 'FAIL — client could read messages';
  exception when insufficient_privilege then
    raise notice 'PASS — read blocked';
  end $$;
commit;

\echo ''
\echo '### 9b. Insert stamped with someone else''s user_id'
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
  do $$
  begin
    insert into public.ask_educator_messages (user_id, message)
    values ('11111111-1111-1111-1111-111111111111', 'Impersonated message attempt here');
    raise notice 'FAIL — spoofed user_id accepted';
  exception when insufficient_privilege then
    raise notice 'PASS — blocked by RLS';
  end $$;
commit;

\echo ''
\echo '### 11. Rate limit at 10/hour'
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
  do $$
  declare i integer; accepted integer := 0;
  begin
    for i in 1..20 loop
      begin
        insert into public.ask_educator_messages (user_id, message)
        values ('22222222-2222-2222-2222-222222222222', 'Legitimate question number ' || i);
        accepted := accepted + 1;
      exception when check_violation then
        raise notice 'PASS — rate limit fired after % additional inserts (total %)',
          accepted, accepted + 1;
        exit;
      end;
    end loop;
    if accepted = 20 then
      raise notice 'FAIL — no rate limit';
    end if;
  end $$;
commit;

\echo ''
\echo '### Final'
select count(*) as ask_total from public.ask_educator_messages;
\echo '--> expect 10 (the hourly cap)'
