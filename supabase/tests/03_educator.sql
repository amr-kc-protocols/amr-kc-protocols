-- Educator access.
--
-- The properties under test: an allowlisted educator with a confirmed
-- email can read every learner's records; nobody else can read anything
-- that isn't theirs; and an unconfirmed signup on an educator's address
-- gets nothing. Ask the Educator stays unreadable to learners even
-- though the SELECT grant came back for the dashboard.
--
-- Run via ./run.sh.

\set ON_ERROR_STOP on
\pset pager off

-- Supabase's grants, mirrored (see 02_rls.sql for why this matters).
grant select, insert, update on public.academy_completions to authenticated;
grant insert, select on public.ask_educator_messages to authenticated;

truncate public.academy_completions, public.ask_educator_messages;
delete from public.educators;

-- Two learners, one real educator, one impostor who signed up using the
-- educator's address but never clicked the confirmation link.
insert into auth.users (id, email, email_confirmed_at, is_anonymous) values
  ('11111111-1111-1111-1111-111111111111', null,                 null,  true),
  ('22222222-2222-2222-2222-222222222222', null,                 null,  true),
  ('33333333-3333-3333-3333-333333333333', 'hunter@example.com', now(), false),
  ('44444444-4444-4444-4444-444444444444', 'nobody@example.com', now(), false)
on conflict (id) do update
  set email = excluded.email,
      email_confirmed_at = excluded.email_confirmed_at,
      is_anonymous = excluded.is_anonymous;

insert into public.educators (email, note) values ('Hunter@Example.com', 'clinical educator');
\echo '--> email is stored folded to lower case:'
select email from public.educators;

-- Seed a completion and a message from each learner.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  insert into public.academy_completions (user_id, course_id, learner_name, modules, modules_total)
  values ('11111111-1111-1111-1111-111111111111', 'hemodynamics', 'Jane Medic, NRP',
          '{"1":{"read":true,"passed":true,"best":90}}'::jsonb, 8);
  insert into public.ask_educator_messages (user_id, message)
  values ('11111111-1111-1111-1111-111111111111', 'A question from the first learner');
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
  insert into public.academy_completions (user_id, course_id, learner_name, modules, modules_total)
  values ('22222222-2222-2222-2222-222222222222', 'airway', 'Sam Medic, EMT',
          '{"1":{"read":true,"passed":true,"best":85}}'::jsonb, 8);
commit;

\echo ''
\echo '### 1. The educator reads every learner record'
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
  select public.is_educator() as is_educator;
  select count(*) as completions_visible from public.academy_completions;
  select count(*) as messages_visible    from public.ask_educator_messages;
commit;
\echo '--> expect is_educator=t, 2 completions, 1 message'

\echo ''
\echo '### 2. A learner still sees only their own completion'
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  select count(*) as own_completions from public.academy_completions;
commit;
\echo '--> expect 1'

\echo ''
\echo '### 3. A learner cannot read Ask messages — not even their own'
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  select count(*) as messages_visible_to_learner from public.ask_educator_messages;
commit;
\echo '--> expect 0 (the SELECT grant is back for the dashboard; RLS is what restricts)'

\echo ''
\echo '### 4. A signed-in non-educator gets nothing extra'
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
  select public.is_educator() as is_educator;
  select count(*) as completions_visible from public.academy_completions;
  select count(*) as messages_visible    from public.ask_educator_messages;
commit;
\echo '--> expect is_educator=f, 0, 0'

\echo ''
\echo '### 5. Unconfirmed signup on the educator address is NOT an educator'
update auth.users set email_confirmed_at = null
 where id = '33333333-3333-3333-3333-333333333333';
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
  select public.is_educator() as is_educator;
  select count(*) as completions_visible from public.academy_completions;
commit;
\echo '--> expect is_educator=f and 0 rows — owning the address must be proven'
update auth.users set email_confirmed_at = now()
 where id = '33333333-3333-3333-3333-333333333333';

\echo ''
\echo '### 6. An anonymous user carrying an educator email is rejected'
update auth.users set email = 'hunter@example.com', is_anonymous = true
 where id = '22222222-2222-2222-2222-222222222222';
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
  select public.is_educator() as is_educator;
commit;
\echo '--> expect f'
update auth.users set email = null, is_anonymous = true
 where id = '22222222-2222-2222-2222-222222222222';

\echo ''
\echo '### 7. The educator roster is not public'
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  select count(*) as roster_visible_to_learner from public.educators;
commit;
\echo '--> expect 0'

\echo ''
\echo '### 8. Educators cannot delete or alter learner records either'
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
  delete from public.academy_completions;
  update public.academy_completions set learner_name = 'EDITED';
commit;
select count(*) as rows_remaining,
       count(*) filter (where learner_name = 'EDITED') as rows_edited
  from public.academy_completions;
\echo '--> expect 2 remaining, 0 edited'

\echo ''
\echo '### 9. The roster is not editable from the client'
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
  do $$
  begin
    insert into public.educators (email) values ('attacker@example.com');
    raise notice 'FAIL — an educator could add another educator';
  exception
    when insufficient_privilege then raise notice 'PASS — blocked';
  end $$;
commit;
select count(*) as roster_size from public.educators;
\echo '--> expect 1'

\echo ''
\echo '### 10. learner_email is stamped server-side once an email is verified'
-- The learner links an email; the next push should carry it.
update auth.users
   set email = 'jane.medic@example.com', email_confirmed_at = now(), is_anonymous = false
 where id = '11111111-1111-1111-1111-111111111111';

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  -- A push that does not mention learner_email at all.
  update public.academy_completions
     set modules = '{"1":{"read":true,"passed":true,"best":95}}'::jsonb
   where course_id = 'hemodynamics';
commit;

select learner_name, learner_email
  from public.academy_completions where course_id = 'hemodynamics';
\echo '--> expect learner_email = jane.medic@example.com, stamped without the client sending it'

\echo ''
\echo '### 11. A client cannot spoof learner_email'
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
  update public.academy_completions
     set learner_email = 'chief@example.com'
   where course_id = 'airway';
commit;
select course_id, learner_email from public.academy_completions where course_id = 'airway';
\echo '--> expect null — this learner has no verified email, so the spoof is discarded'

\echo ''
\echo '### 12. A verified email is not dropped by a later unverified push'
-- Simulates the learner pushing from a second device that has not linked
-- an email. Done as the owner, outside the role-switched block, because
-- the authenticated role cannot touch auth.users.
update auth.users set email_confirmed_at = null
 where id = '11111111-1111-1111-1111-111111111111';

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  update public.academy_completions
     set modules = '{"1":{"read":true,"passed":true,"best":96}}'::jsonb
   where course_id = 'hemodynamics';
commit;
select learner_email from public.academy_completions where course_id = 'hemodynamics';
\echo '--> expect jane.medic@example.com still present'
