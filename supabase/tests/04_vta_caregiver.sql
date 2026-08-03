-- VTA course support, the `meta` merge, and caregiver_forms.
--
-- Run via ./run.sh.

\set ON_ERROR_STOP on
\pset pager off

grant select, insert, update on public.academy_completions to authenticated;
grant insert, select on public.caregiver_forms to authenticated;

truncate public.academy_completions, public.caregiver_forms;
delete from public.educators;

insert into auth.users (id, email, email_confirmed_at, is_anonymous) values
  ('11111111-1111-1111-1111-111111111111', null,                 null,  true),
  ('33333333-3333-3333-3333-333333333333', 'hunter@example.com', now(), false)
on conflict (id) do update
  set email = excluded.email,
      email_confirmed_at = excluded.email_confirmed_at,
      is_anonymous = excluded.is_anonymous;
insert into public.educators (email) values ('hunter@example.com');

\echo '### 1. vta is an accepted course_id'
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  insert into public.academy_completions
    (user_id, course_id, learner_name, modules, modules_total, meta)
  values ('11111111-1111-1111-1111-111111111111', 'vta', 'Jane Medic',
          '{"1":{"read":true,"passed":true,"best":88}}'::jsonb, 9,
          '{"credential":"Paramedic","certId":"VTA-2026-ABC123"}'::jsonb);
commit;
select course_id, modules_passed, modules_total, meta from public.academy_completions;
\echo '--> expect one vta row with credential and certId'

\echo ''
\echo '### 2. An unknown course is still rejected'
do $$
begin
  insert into public.academy_completions (user_id, course_id, modules_total)
  values ('11111111-1111-1111-1111-111111111111', 'ventilator', 9);
  raise notice 'FAIL — unknown course accepted';
exception when check_violation then
  raise notice 'PASS — check constraint still holds';
end $$;

\echo ''
\echo '### 3. meta merge: a push that omits keys must not erase them'
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  -- A second device knows nothing about the certificate.
  update public.academy_completions
     set meta = '{}'::jsonb,
         modules = '{"2":{"read":true,"passed":true,"best":90}}'::jsonb
   where course_id = 'vta';
commit;
select meta ->> 'credential' as credential,
       meta ->> 'certId'     as cert_id,
       modules_passed
  from public.academy_completions where course_id = 'vta';
\echo '--> expect credential and certId intact, modules_passed=2'

\echo ''
\echo '### 4. meta merge: a new key is added, an existing one updated'
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  update public.academy_completions
     set meta = '{"credential":"RN","cohort":"2026-Q3"}'::jsonb
   where course_id = 'vta';
commit;
select meta ->> 'credential' as credential,
       meta ->> 'certId'     as cert_id,
       meta ->> 'cohort'     as cohort
  from public.academy_completions where course_id = 'vta';
\echo '--> expect credential=RN (updated), certId kept, cohort added'

\echo ''
\echo '### 5. Caregiver form insert'
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  insert into public.caregiver_forms
    (user_id, service_date, case_number, amended, submitted_at, crew)
  values ('11111111-1111-1111-1111-111111111111', '2026-08-03', 'KC-99812', false,
          '8/3/2026 09:14 AM',
          '[{"num":1,"name":"Jane Medic","cert":"NRP"}]'::jsonb);
commit;
\echo '--> insert OK'

\echo ''
\echo '### 6. The crew who filed it cannot read it back'
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  select count(*) as visible_to_submitter from public.caregiver_forms;
commit;
\echo '--> expect 0 — case numbers point at patient care reports'

\echo ''
\echo '### 7. The educator can read it'
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
  select case_number, service_date, crew -> 0 ->> 'name' as crew1
    from public.caregiver_forms;
commit;
\echo '--> expect the KC-99812 row'

\echo ''
\echo '### 8. A form cannot be spoofed onto another user'
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  do $$
  begin
    insert into public.caregiver_forms (user_id, service_date, case_number)
    values ('33333333-3333-3333-3333-333333333333', '2026-08-03', 'KC-00000');
    raise notice 'FAIL — spoofed user_id accepted';
  exception when insufficient_privilege then
    raise notice 'PASS — blocked by RLS';
  end $$;
commit;

\echo ''
\echo '### 9. Filed forms cannot be edited or deleted from the client'
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
  do $$
  begin
    delete from public.caregiver_forms;
    update public.caregiver_forms set case_number = 'EDITED';
    raise notice 'delete/update affected 0 rows (no policy grants either)';
  exception when insufficient_privilege then
    raise notice 'PASS — privilege not granted';
  end $$;
commit;
select count(*) as remaining,
       count(*) filter (where case_number = 'EDITED') as edited
  from public.caregiver_forms;
\echo '--> expect 1 remaining, 0 edited'

\echo ''
\echo '### 10. crew must be an array, and a case number is required'
do $$
begin
  insert into public.caregiver_forms (user_id, service_date, case_number, crew)
  values ('11111111-1111-1111-1111-111111111111', '2026-08-03', 'KC-1',
          '{"not":"an array"}'::jsonb);
  raise notice 'FAIL — object accepted for crew';
exception when check_violation then
  raise notice 'PASS — crew must be an array';
end $$;

do $$
begin
  insert into public.caregiver_forms (user_id, service_date, case_number)
  values ('11111111-1111-1111-1111-111111111111', '2026-08-03', '');
  raise notice 'FAIL — empty case number accepted';
exception when check_violation then
  raise notice 'PASS — case number required';
end $$;
