-- =====================================================================
-- TaskNest — Migration 001: accounts, invites, roles, Row Level Security
--
-- Run once in: Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to read top to bottom; every table has Row Level Security enabled.
--
-- Access model
--   * Sign-up is invite-only: an admin adds an email to "invites"; a database
--     trigger rejects any sign-up whose email is not on that list.
--   * Roles: 'admin' and 'member'. Reviewer is a per-task field (added later).
--   * Removing someone = deactivating them: they are blocked from signing in
--     (banned_until) and every data policy ignores them (is_active = false).
-- =====================================================================

-- ---------- Types ----------------------------------------------------
create type public.app_role as enum ('admin', 'member');

-- ---------- Tables ---------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text not null default '',
  avatar_url  text,
  role        public.app_role not null default 'member',
  is_active   boolean not null default true,
  push_token  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.invites (
  id          uuid primary key default gen_random_uuid(),
  email       text not null check (position('@' in email) > 1),
  role        public.app_role not null default 'member',
  invited_by  uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  accepted_at timestamptz
);

create unique index invites_email_key on public.invites (lower(email));

-- ---------- Generic triggers -----------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create function public.normalize_invite_email()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.email := lower(btrim(new.email));
  return new;
end;
$$;

create trigger invites_normalize_email
  before insert or update of email on public.invites
  for each row execute function public.normalize_invite_email();

-- ---------- Permission helpers (used inside RLS policies) ------------
create function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active
  );
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active and p.role = 'admin'
  );
$$;

revoke all on function public.is_active_member() from public, anon;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_active_member() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- ---------- Invite-only sign-up --------------------------------------
-- Fires after every new auth user. No matching invite => the whole sign-up
-- is rolled back. Otherwise it creates the profile with the invited role.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.invites%rowtype;
  display_name text;
begin
  select * into inv
  from public.invites
  where lower(email) = lower(btrim(new.email))
  limit 1;

  if not found then
    raise exception 'not_invited: this email has not been invited';
  end if;

  display_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, email, full_name, role)
  values (new.id, lower(btrim(new.email)), left(display_name, 60), inv.role);

  update public.invites set accepted_at = now() where id = inv.id;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Row Level Security: profiles -----------------------------
alter table public.profiles enable row level security;

-- Start from nothing, then grant exactly what the app needs.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, avatar_url, push_token) on public.profiles to authenticated;

-- Everyone active can see the team (needed to pick assignees/reviewers).
-- A removed user can still read their OWN row so the app can tell them why.
create policy profiles_select
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_active_member());

-- You can edit only your own name / avatar / push token, and only while active.
-- role and is_active are not updatable here (no column privilege) — use the
-- admin functions below.
create policy profiles_update_self
  on public.profiles for update to authenticated
  using (id = auth.uid() and is_active)
  with check (id = auth.uid());

-- ---------- Row Level Security: invites ------------------------------
alter table public.invites enable row level security;

revoke all on public.invites from anon, authenticated;
grant select, delete on public.invites to authenticated;
grant insert (email, role) on public.invites to authenticated;

create policy invites_select
  on public.invites for select to authenticated
  using (public.is_admin());

create policy invites_insert
  on public.invites for insert to authenticated
  with check (public.is_admin());

-- Only pending invites can be cancelled.
create policy invites_delete
  on public.invites for delete to authenticated
  using (public.is_admin() and accepted_at is null);

-- ---------- Admin actions --------------------------------------------
create function public.admin_set_role(target uuid, new_role public.app_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not admin' using errcode = '42501';
  end if;
  if target = auth.uid() then
    raise exception 'You cannot change your own role.' using errcode = '42501';
  end if;

  update public.profiles set role = new_role where id = target;
  if not found then
    raise exception 'User not found.' using errcode = 'P0002';
  end if;
end;
$$;

-- Deactivate (remove access) or reactivate a member. Deactivating also blocks
-- sign-in and token refresh by setting banned_until far in the future.
create function public.admin_set_member_access(target uuid, make_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not admin' using errcode = '42501';
  end if;
  if target = auth.uid() then
    raise exception 'You cannot change your own access.' using errcode = '42501';
  end if;

  update public.profiles set is_active = make_active where id = target;
  if not found then
    raise exception 'User not found.' using errcode = 'P0002';
  end if;

  update auth.users
  set banned_until = case
    when make_active then null
    else timestamptz '2999-12-31 00:00:00+00'
  end
  where id = target;
end;
$$;

revoke all on function public.admin_set_role(uuid, public.app_role) from public, anon;
revoke all on function public.admin_set_member_access(uuid, boolean) from public, anon;
grant execute on function public.admin_set_role(uuid, public.app_role) to authenticated;
grant execute on function public.admin_set_member_access(uuid, boolean) to authenticated;
