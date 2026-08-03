-- ============================================================
-- AMR KC Field Guide — VTA academy + Caregiver Signature Forms
-- ============================================================
-- Closes the three gaps left by the first two migrations:
--
--   1. The Ventilator Training Academy was not covered by course_id.
--   2. VTA records carry things the other four courses do not — a
--      credential level and a certificate id — with nowhere to put them.
--   3. Caregiver Signature Forms still logged to Google Apps Script.
-- ============================================================

-- ── VTA as a known course ────────────────────────────────────

alter table public.academy_completions
  drop constraint if exists academy_completions_course_id_valid;

alter table public.academy_completions
  add constraint academy_completions_course_id_valid check (
    course_id in ('airway', 'hemodynamics', 'metabolic', 'neonate', 'vta')
  );

-- ── Course-specific extras ───────────────────────────────────
-- The VTA certificate records a credential level (EMT/AEMT/Paramedic/…)
-- and a generated certificate id. Rather than bolt on columns that stay
-- null for four of the five courses, course-specific fields live here.
-- Kept small and flat on purpose: this is for a handful of scalars, not
-- a second state blob.

alter table public.academy_completions
  add column if not exists meta jsonb not null default '{}'::jsonb;

comment on column public.academy_completions.meta is
  'Course-specific extras, e.g. VTA''s {"credential":"Paramedic","certId":"VTA-2026-ABC123"}. '
  'Merged key-by-key on update; a key already set is never blanked by a later push.';

-- ── Caregiver Signature Forms ────────────────────────────────
-- Text record of a completed caregiver signature form. The PDF remains
-- the deliverable and is never uploaded — this is the log that used to
-- go to a Google Sheet.
--
-- DELIBERATELY NOT STORED: the signature images. They were not sent to
-- the Sheet either, and a signature is the one part of this form worth
-- treating as a biometric. The PDF holds them; this table does not.
--
-- The case number does tie a row to a patient care report, so this table
-- is readable only by educators, never by the crew who submitted it.

create table if not exists public.caregiver_forms (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users (id) on delete set null,

  service_date   text not null,
  case_number    text not null,
  amended        boolean not null default false,
  submitted_at   text,

  -- [{ "num":1, "name":"...", "cert":"..." }, …] — never a signature.
  crew           jsonb not null default '[]'::jsonb,

  created_at     timestamptz not null default now(),

  constraint caregiver_case_len check (char_length(case_number) between 1 and 60),
  constraint caregiver_date_len check (char_length(service_date) between 1 and 40),
  constraint caregiver_crew_is_array check (jsonb_typeof(crew) = 'array')
);

create index if not exists caregiver_forms_created_idx
  on public.caregiver_forms (created_at desc);
create index if not exists caregiver_forms_case_idx
  on public.caregiver_forms (case_number);

-- Same backstop as Ask the Educator: the anon key is public, so a
-- per-user ceiling keeps one client from filling the table. Set well
-- above a plausible shift's worth of runs.
create or replace function public.caregiver_forms_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent integer;
begin
  if new.user_id is null then
    return new;
  end if;

  select count(*)
    into recent
    from public.caregiver_forms
   where user_id = new.user_id
     and created_at > now() - interval '1 hour';

  if recent >= 40 then
    raise exception 'Too many form submissions in the last hour. Please try again later.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists caregiver_forms_rate_limit_trg on public.caregiver_forms;
create trigger caregiver_forms_rate_limit_trg
  before insert on public.caregiver_forms
  for each row execute function public.caregiver_forms_rate_limit();

alter table public.caregiver_forms enable row level security;

drop policy if exists caregiver_forms_insert_own on public.caregiver_forms;
create policy caregiver_forms_insert_own
  on public.caregiver_forms for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- Read is educator-only. A crew member cannot list the forms they filed,
-- let alone anyone else's — the case numbers in here point at patient
-- care reports.
drop policy if exists caregiver_forms_select_educator on public.caregiver_forms;
create policy caregiver_forms_select_educator
  on public.caregiver_forms for select
  to authenticated
  using ((select public.is_educator()));

grant insert, select on public.caregiver_forms to authenticated;

-- No update or delete policy: a filed form is a record.

-- ── Merge `meta` monotonically ───────────────────────────────
-- Same principle as the rest of the row: a second device that knows
-- nothing about the certificate must not wipe the credential recorded
-- when the certificate was claimed.

create or replace function public.academy_completions_merge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  mod_key   text;
  old_mod   jsonb;
  new_mod   jsonb;
  merged    jsonb := coalesce(new.modules, '{}'::jsonb);
  passed_ct integer := 0;
begin
  -- Passing is a one-way door.
  new.final_passed := old.final_passed or new.final_passed;
  new.final_best   := greatest(coalesce(old.final_best, 0), coalesce(new.final_best, 0));

  -- Keep the earliest completion — that is the date the credit was earned.
  new.completed_at := least(
    coalesce(old.completed_at, new.completed_at),
    coalesce(new.completed_at, old.completed_at)
  );

  -- Never blank out a name that was already recorded.
  if new.learner_name is null or btrim(new.learner_name) = '' then
    new.learner_name := old.learner_name;
  end if;

  if new.course_version is null then
    new.course_version := old.course_version;
  end if;

  -- Merge per-module state key by key, taking the stronger of the two.
  for mod_key in
    select jsonb_object_keys(coalesce(old.modules, '{}'::jsonb))
  loop
    old_mod := old.modules -> mod_key;
    new_mod := merged -> mod_key;

    if new_mod is null then
      merged := jsonb_set(merged, array[mod_key], old_mod, true);
    else
      merged := jsonb_set(merged, array[mod_key], jsonb_build_object(
        'read',   coalesce((old_mod ->> 'read')::boolean, false)
                    or coalesce((new_mod ->> 'read')::boolean, false),
        'passed', coalesce((old_mod ->> 'passed')::boolean, false)
                    or coalesce((new_mod ->> 'passed')::boolean, false),
        'best',   greatest(
                    coalesce((old_mod ->> 'best')::numeric, 0),
                    coalesce((new_mod ->> 'best')::numeric, 0)
                  )
      ), true);
    end if;
  end loop;

  new.modules := merged;

  -- meta: new keys win, but keys the incoming push omits are retained.
  new.meta := coalesce(old.meta, '{}'::jsonb) || coalesce(new.meta, '{}'::jsonb);

  -- Recount from the merged truth rather than trusting the client's tally.
  select count(*)
    into passed_ct
    from jsonb_each(merged) as m(key, value)
   where coalesce((value ->> 'passed')::boolean, false);

  new.modules_passed := passed_ct;
  new.modules_total  := greatest(coalesce(old.modules_total, 0), coalesce(new.modules_total, 0));

  -- A verified address, once recorded, is never dropped by a later push
  -- from a device that has not yet linked one.
  new.learner_email := coalesce(public.auth_email_of(new.user_id), old.learner_email);

  -- Immutable columns: a client push must not be able to rewrite these.
  new.user_id    := old.user_id;
  new.course_id  := old.course_id;
  new.created_at := old.created_at;
  new.updated_at := now();

  return new;
end;
$$;
