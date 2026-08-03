-- ============================================================
-- AMR KC Field Guide — educator read access + learner email
-- ============================================================
-- Adds two things the first migration deliberately left out:
--
--   1. A way for a named educator to read every learner's records,
--      which is what the educator dashboard runs on.
--   2. A verified email against each completion, so a record is tied
--      to a person rather than to a self-typed name.
--
-- Educators are ordinary Supabase users who sign in with an email and
-- password. Authorisation is an allowlist, not a flag on the user, so
-- granting or revoking access is one row here and never a code change.
-- ============================================================

-- ── Educator allowlist ───────────────────────────────────────

create table if not exists public.educators (
  email      text primary key,
  note       text,
  added_at   timestamptz not null default now(),

  constraint educators_email_shape check (position('@' in email) > 1)
);

comment on table public.educators is
  'Allowlist of educator email addresses. Managed here or in the SQL editor '
  '— never from the client. Adding a row grants read access to every '
  'learner record; deleting one revokes it immediately.';

-- Emails are compared case-insensitively everywhere, so store them folded
-- and let the constraint keep that true.
create or replace function public.educators_normalise()
returns trigger language plpgsql as $$
begin
  new.email := lower(btrim(new.email));
  return new;
end;
$$;

drop trigger if exists educators_normalise_trg on public.educators;
create trigger educators_normalise_trg
  before insert or update on public.educators
  for each row execute function public.educators_normalise();

-- ── is_educator() ────────────────────────────────────────────
-- Resolves the *current* user to the allowlist.
--
-- Two details carry the security here:
--
--   * It matches on auth.users.id = auth.uid() and reads the email from
--     the users table, rather than trusting an email claim in the JWT.
--   * It requires email_confirmed_at to be set. Without that check,
--     anyone could sign up using an educator's address and read every
--     learner record before ever proving they own the mailbox.
--
-- security definer because the client roles cannot read auth.users.

create or replace function public.is_educator()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
      from auth.users u
      join public.educators e
        on lower(u.email) = e.email
     where u.id = auth.uid()
       and u.email_confirmed_at is not null
       and coalesce(u.is_anonymous, false) = false
  );
$$;

revoke all on function public.is_educator() from public;
grant execute on function public.is_educator() to authenticated;

-- The allowlist itself is readable only by people already on it, so the
-- roster of educators is not public. No insert/update/delete policy
-- exists, so it cannot be edited from the client at all.
alter table public.educators enable row level security;

drop policy if exists educators_select_educators on public.educators;
create policy educators_select_educators
  on public.educators for select
  to authenticated
  using ((select public.is_educator()));

grant select on public.educators to authenticated;

-- ── Verified learner email on completions ────────────────────
-- learner_name is typed by the learner and proves nothing. Once someone
-- links an email to their anonymous account, this column carries the
-- address the auth system actually verified, so the dashboard can show
-- a real identity instead of a claim.
--
-- Stamped server-side on every write. The client never sends it and
-- cannot influence it.

alter table public.academy_completions
  add column if not exists learner_email text;

create or replace function public.auth_email_of(uid uuid)
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.email
    from auth.users u
   where u.id = uid
     and u.email_confirmed_at is not null;
$$;

revoke all on function public.auth_email_of(uuid) from public;

-- Fold the stamp into the existing insert and update triggers rather
-- than adding new ones, so ordering between them can never drift.

create or replace function public.academy_completions_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  passed_ct integer := 0;
begin
  select count(*)
    into passed_ct
    from jsonb_each(coalesce(new.modules, '{}'::jsonb)) as m(key, value)
   where coalesce((value ->> 'passed')::boolean, false);

  new.modules_passed := passed_ct;
  new.learner_email  := public.auth_email_of(new.user_id);
  return new;
end;
$$;

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

-- ── Educator read policies ───────────────────────────────────

drop policy if exists academy_completions_select_educator on public.academy_completions;
create policy academy_completions_select_educator
  on public.academy_completions for select
  to authenticated
  using ((select public.is_educator()));

-- Ask the Educator was write-only in the first migration, enforced by a
-- blanket REVOKE SELECT. The dashboard inbox needs reads, so the grant
-- comes back and RLS becomes the thing that restricts it: educators can
-- read, and a learner still cannot read anyone's messages including
-- their own.
grant select on public.ask_educator_messages to authenticated;

drop policy if exists ask_educator_select_educator on public.ask_educator_messages;
create policy ask_educator_select_educator
  on public.ask_educator_messages for select
  to authenticated
  using ((select public.is_educator()));

-- Records stay undeletable and unmodifiable from the client for
-- everyone, educators included: there is still no delete or update
-- policy on either table beyond a learner's own completion row.

-- ── Dashboard indexes ────────────────────────────────────────
create index if not exists academy_completions_updated_idx
  on public.academy_completions (updated_at desc);
create index if not exists academy_completions_email_idx
  on public.academy_completions (learner_email)
  where learner_email is not null;
