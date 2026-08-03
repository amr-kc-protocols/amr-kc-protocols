-- Minimal stand-in for the pieces of Supabase the migration depends on, so
-- the schema can be tested against a plain Postgres with no cloud project
-- and no network. Applied by run.sh before the migration.
--
-- This is deliberately NOT a general Supabase emulator — it provides exactly
-- auth.users, auth.uid(), and the three roles the policies reference.
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text
);

-- auth.uid() reads the request JWT claims the same way Supabase's does.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

do $$ begin
  create role anon nologin;
exception when duplicate_object then null; end $$;
do $$ begin
  create role authenticated nologin;
exception when duplicate_object then null; end $$;
do $$ begin
  create role service_role nologin bypassrls;
exception when duplicate_object then null; end $$;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
