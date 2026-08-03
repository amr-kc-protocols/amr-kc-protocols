-- Monotonic-merge guarantees for academy_completions.
--
-- The property under test: a push can never lose ground. Two devices
-- running the same course must not be able to un-pass a module, lower a
-- best score, drop a learner name, or move an earned completion date.
--
-- Run via ./run.sh. RLS is covered separately in 02_rls.sql.

\set ON_ERROR_STOP on
\pset pager off

truncate public.academy_completions;

insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111')
on conflict do nothing;

\echo '### 1. Insert — counters derived server-side'
insert into public.academy_completions
  (user_id, course_id, course_version, learner_name, modules, modules_total, final_best, client_updated_at)
values
  ('11111111-1111-1111-1111-111111111111', 'hemodynamics', '2.0', 'Jane Medic, NRP',
   '{"1":{"read":true,"passed":true,"best":90},"2":{"read":true,"passed":false,"best":60}}'::jsonb,
   8, 0, now());

select modules_passed, modules_total, final_passed from public.academy_completions;
\echo '--> expect modules_passed=1 (client never sent this figure)'

\echo ''
\echo '### 2. Stale device un-passes module 1, drops best to 10, blanks the name'
update public.academy_completions
   set modules = '{"1":{"read":true,"passed":false,"best":10}}'::jsonb,
       learner_name = '', final_passed = false, final_best = 0,
       client_updated_at = now()
 where course_id = 'hemodynamics';

select modules_passed,
       modules -> '1' ->> 'passed' as mod1_passed,
       modules -> '1' ->> 'best'   as mod1_best,
       modules -> '2' ->> 'best'   as mod2_best,
       learner_name
  from public.academy_completions;
\echo '--> expect mod1_passed=true, mod1_best=90, mod2 survives at 60, name intact'

\echo ''
\echo '### 3. Genuine forward progress — final passed at 88'
update public.academy_completions
   set modules = '{"1":{"read":true,"passed":true,"best":95},"2":{"read":true,"passed":true,"best":85}}'::jsonb,
       final_passed = true, final_best = 88,
       completed_at = '2026-08-03T10:00:00Z', client_updated_at = now()
 where course_id = 'hemodynamics';

select modules_passed, final_passed, final_best, completed_at,
       modules -> '1' ->> 'best' as mod1_best
  from public.academy_completions;
\echo '--> expect modules_passed=2, final_passed=t, final_best=88, mod1_best=95'

\echo ''
\echo '### 4. Later push regresses the pass and moves the completion date'
update public.academy_completions
   set final_passed = false, final_best = 40,
       completed_at = '2026-09-01T10:00:00Z', client_updated_at = now()
 where course_id = 'hemodynamics';

select final_passed, final_best, completed_at from public.academy_completions;
\echo '--> expect final_passed=t, final_best=88, completed_at stays 2026-08-03 (earliest)'

\echo ''
\echo '### 5. Row hijack onto another user id'
update public.academy_completions
   set user_id = '22222222-2222-2222-2222-222222222222'
 where course_id = 'hemodynamics';
select user_id from public.academy_completions;
\echo '--> expect user_id unchanged — the trigger pins it'

\echo ''
\echo '### 6. course_id outside the known set'
do $$
begin
  insert into public.academy_completions (user_id, course_id, modules_total)
  values ('11111111-1111-1111-1111-111111111111', 'not-a-course', 8);
  raise notice 'FAIL — bad course_id accepted';
exception when check_violation then
  raise notice 'PASS — check constraint held';
end $$;

\echo ''
\echo '### 7. The real client path: INSERT .. ON CONFLICT DO UPDATE'
-- This is what PostgREST issues for
--   POST /rest/v1/academy_completions?on_conflict=user_id,course_id
--   Prefer: resolution=merge-duplicates
-- The merge trigger must hold on this path too, not just a plain UPDATE.
truncate public.academy_completions;
insert into public.academy_completions
  (user_id, course_id, learner_name, modules, modules_total, final_best, final_passed, completed_at)
values
  ('11111111-1111-1111-1111-111111111111', 'airway', 'Jane Medic, NRP',
   '{"1":{"read":true,"passed":true,"best":92}}'::jsonb, 8, 91, true, '2026-08-03T10:00:00Z');

-- A second device upserts a weaker record for the same user + course.
insert into public.academy_completions
  (user_id, course_id, learner_name, modules, modules_total, final_best, final_passed, completed_at)
values
  ('11111111-1111-1111-1111-111111111111', 'airway', '',
   '{"1":{"read":true,"passed":false,"best":5},"2":{"read":true,"passed":true,"best":80}}'::jsonb,
   8, 0, false, '2026-10-01T10:00:00Z')
on conflict (user_id, course_id) do update set
  learner_name  = excluded.learner_name,
  modules       = excluded.modules,
  modules_total = excluded.modules_total,
  final_best    = excluded.final_best,
  final_passed  = excluded.final_passed,
  completed_at  = excluded.completed_at;

select count(*) as rows, learner_name, final_passed, final_best, completed_at,
       modules_passed,
       modules -> '1' ->> 'best' as mod1_best,
       modules -> '2' ->> 'best' as mod2_best
  from public.academy_completions
 group by learner_name, final_passed, final_best, completed_at, modules_passed, modules;
\echo '--> expect ONE row: name kept, final_passed=t, final_best=91,'
\echo '    completed_at 2026-08-03, mod1_best=92, and module 2 merged in at 80'
