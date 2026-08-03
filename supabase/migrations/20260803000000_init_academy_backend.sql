-- ============================================================
-- AMR KC Field Guide — Academy backend, initial schema
-- ============================================================
-- Covers two features:
--   1. Academy module completions (airway, hemodynamics, metabolic,
--      neonate) — a durable record of who completed what, so a CE
--      record survives a lost or wiped phone.
--   2. Ask the Educator submissions.
--
-- IDENTITY MODEL
--   Learners are Supabase *anonymous* users. The app signs in silently
--   on first load, so there is no sign-in wall in front of the training.
--   A learner may later attach an email (auth.updateUser) to merge
--   devices; the user id is stable across that upgrade, so history is
--   preserved automatically.
--
--   Requires: Authentication → Sign In / Providers → "Allow anonymous
--   sign-ins" enabled on the project. See ../README.md.
--
-- DURABILITY NOTE
--   localStorage in the browser stays the source of truth for the live
--   UI; these tables are the durable mirror. The client only ever
--   *pushes* progress, and the merge trigger below guarantees a push
--   can never lose ground.
-- ============================================================

-- ── Academy completions ──────────────────────────────────────
-- One row per learner per course. Updated as the learner advances
-- rather than only at completion, so partial progress survives too.

create table if not exists public.academy_completions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,

  course_id         text not null,
  course_version    text,

  -- Typed by the learner; appears on the printed certificate. Not an
  -- identity claim — it is whatever they entered.
  learner_name      text,

  -- Per-module detail: { "1": {"read":true,"passed":true,"best":90}, ... }
  modules           jsonb  not null default '{}'::jsonb,
  modules_passed    integer not null default 0,
  modules_total     integer not null default 0,

  final_passed      boolean not null default false,
  final_best        integer not null default 0,
  completed_at      timestamptz,

  -- Clock of the device that produced this push. Used for observability
  -- and tie-breaking; never trusted for ordering on its own, since a
  -- field tablet's clock can be wrong.
  client_updated_at timestamptz,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint academy_completions_user_course_key unique (user_id, course_id),
  constraint academy_completions_course_id_valid check (
    course_id in ('airway', 'hemodynamics', 'metabolic', 'neonate')
  ),
  constraint academy_completions_final_best_range check (final_best between 0 and 100),
  constraint academy_completions_learner_name_len check (
    learner_name is null or char_length(learner_name) <= 120
  )
);

create index if not exists academy_completions_user_idx
  on public.academy_completions (user_id);
create index if not exists academy_completions_course_idx
  on public.academy_completions (course_id, final_passed);

-- ── Monotonic merge ──────────────────────────────────────────
-- A learner can have the same course open on a phone and a tablet. A
-- naive upsert lets whichever device writes last win, which means a
-- stale tab can un-pass a module that was genuinely passed. For a CE
-- record that is unacceptable, so progress here only ever moves
-- forward: passes stick, best scores take the max, and the original
-- completion timestamp is never overwritten by a later one.

create or replace function public.academy_completions_merge()
returns trigger
language plpgsql
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

  -- Recount from the merged truth rather than trusting the client's tally.
  select count(*)
    into passed_ct
    from jsonb_each(merged) as m(key, value)
   where coalesce((value ->> 'passed')::boolean, false);

  new.modules_passed := passed_ct;
  new.modules_total  := greatest(coalesce(old.modules_total, 0), coalesce(new.modules_total, 0));

  -- Immutable columns: a client push must not be able to rewrite these.
  new.user_id    := old.user_id;
  new.course_id  := old.course_id;
  new.created_at := old.created_at;
  new.updated_at := now();

  return new;
end;
$$;

drop trigger if exists academy_completions_merge_trg on public.academy_completions;
create trigger academy_completions_merge_trg
  before update on public.academy_completions
  for each row execute function public.academy_completions_merge();

-- On insert, derive the counters server-side too, so the two paths agree.
create or replace function public.academy_completions_count()
returns trigger
language plpgsql
as $$
declare
  passed_ct integer := 0;
begin
  select count(*)
    into passed_ct
    from jsonb_each(coalesce(new.modules, '{}'::jsonb)) as m(key, value)
   where coalesce((value ->> 'passed')::boolean, false);

  new.modules_passed := passed_ct;
  return new;
end;
$$;

drop trigger if exists academy_completions_count_trg on public.academy_completions;
create trigger academy_completions_count_trg
  before insert on public.academy_completions
  for each row execute function public.academy_completions_count();

-- ── Ask the Educator ─────────────────────────────────────────
-- Submissions carry the submitter's user id. This is a deliberate
-- change from the previous Google Apps Script version, which stored
-- nothing identifying; the app's "100% Anonymous" badge was removed in
-- the same change so the UI does not overstate the privacy on offer.

create table if not exists public.ask_educator_messages (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users (id) on delete set null,
  message      text not null,
  reply_email  text,
  -- Which screen the question came from, for context when answering.
  source       text,
  created_at   timestamptz not null default now(),

  constraint ask_educator_message_len check (char_length(message) between 10 and 1000),
  constraint ask_educator_email_len check (
    reply_email is null or char_length(reply_email) <= 254
  ),
  constraint ask_educator_source_len check (
    source is null or char_length(source) <= 60
  )
);

create index if not exists ask_educator_created_idx
  on public.ask_educator_messages (created_at desc);

-- Light rate limit. The anon key is public by definition, so this is the
-- backstop that keeps one client from filling the table.
create or replace function public.ask_educator_rate_limit()
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
    from public.ask_educator_messages
   where user_id = new.user_id
     and created_at > now() - interval '1 hour';

  if recent >= 10 then
    raise exception 'Too many messages sent in the last hour. Please try again later.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists ask_educator_rate_limit_trg on public.ask_educator_messages;
create trigger ask_educator_rate_limit_trg
  before insert on public.ask_educator_messages
  for each row execute function public.ask_educator_rate_limit();

-- ── Row level security ───────────────────────────────────────

alter table public.academy_completions   enable row level security;
alter table public.ask_educator_messages enable row level security;

-- Completions: a learner sees and writes only their own row. No delete
-- policy exists, so records cannot be destroyed from the client.
drop policy if exists academy_completions_select_own on public.academy_completions;
create policy academy_completions_select_own
  on public.academy_completions for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists academy_completions_insert_own on public.academy_completions;
create policy academy_completions_insert_own
  on public.academy_completions for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists academy_completions_update_own on public.academy_completions;
create policy academy_completions_update_own
  on public.academy_completions for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Ask the Educator: write-only from the client. Nobody reads these
-- through the anon key — the educator reads them in the Supabase
-- dashboard, or through a service-role view added later.
drop policy if exists ask_educator_insert_own on public.ask_educator_messages;
create policy ask_educator_insert_own
  on public.ask_educator_messages for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- Belt and braces: PostgREST should not expose a read path at all.
revoke select on public.ask_educator_messages from anon, authenticated;
