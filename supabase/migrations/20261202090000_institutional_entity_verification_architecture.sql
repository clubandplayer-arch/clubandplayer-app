begin;

-- Allow the dedicated institutional entity role without rewriting existing profile rows.
alter table if exists public.profiles
  drop constraint if exists profiles_account_type_check;

alter table if exists public.profiles
  add constraint profiles_account_type_check
  check (
    account_type is null
    or account_type in ('athlete', 'club', 'fan', 'staff', 'institutional_entity')
  ) not valid;

alter table if exists public.profiles
  drop constraint if exists profiles_type_check;

alter table if exists public.profiles
  add constraint profiles_type_check
  check (
    type is null
    or type in ('athlete', 'club', 'fan', 'staff', 'institutional_entity')
  ) not valid;

create table if not exists public.institutional_entity_verifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  verification_status text not null default 'draft',
  institutional_email text,
  official_website_domain text,
  verification_document_path text,
  requested_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  rejected_at timestamptz,
  rejected_by uuid references auth.users(id) on delete set null,
  rejection_reason text,
  institutional_data_last_modified_at timestamptz,
  public_visibility_enabled boolean not null default false,
  search_visibility_enabled boolean not null default false,
  suggestions_visibility_enabled boolean not null default false,
  publishing_enabled boolean not null default false,
  official_badge_enabled boolean not null default false,
  capability_flags jsonb not null default '{
    "official_announcements": false,
    "circulars": false,
    "institutional_events": false,
    "training_courses": false,
    "affiliations": false,
    "club_credentials": false,
    "referee_credentials": false,
    "athlete_digital_recognition": false,
    "match_rosters": false
  }'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint institutional_entity_verifications_status_check
    check (verification_status in ('draft', 'pending', 'approved', 'rejected', 'expired', 'revoked'))
);

create unique index if not exists institutional_entity_verifications_one_current_per_profile_idx
  on public.institutional_entity_verifications(profile_id)
  where verification_status in ('draft', 'pending', 'approved');

create index if not exists institutional_entity_verifications_profile_status_idx
  on public.institutional_entity_verifications(profile_id, verification_status);

create index if not exists institutional_entity_verifications_status_requested_idx
  on public.institutional_entity_verifications(verification_status, requested_at desc);

create table if not exists public.institutional_entity_verification_audit_events (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null references public.institutional_entity_verifications(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  previous_status text,
  next_status text,
  changed_fields text[] not null default '{}'::text[],
  rejection_reason text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists institutional_entity_verification_audit_profile_created_idx
  on public.institutional_entity_verification_audit_events(profile_id, created_at desc);

create or replace function public.institutional_entity_protected_fields_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  changed text[] := '{}'::text[];
  next_requested_at timestamptz;
begin
  if old.institutional_email is distinct from new.institutional_email then
    changed := array_append(changed, 'institutional_email');
  end if;

  if old.official_website_domain is distinct from new.official_website_domain then
    changed := array_append(changed, 'official_website_domain');
  end if;

  if old.verification_document_path is distinct from new.verification_document_path then
    changed := array_append(changed, 'verification_document_path');
  end if;

  new.updated_at := now();

  if array_length(changed, 1) is not null then
    new.institutional_data_last_modified_at := now();

    if old.verification_status = 'approved' then
      next_requested_at := coalesce(new.requested_at, now());
      new.verification_status := 'pending';
      new.requested_at := next_requested_at;
      new.approved_at := null;
      new.approved_by := null;
      new.rejected_at := null;
      new.rejected_by := null;
      new.rejection_reason := null;
      new.public_visibility_enabled := false;
      new.search_visibility_enabled := false;
      new.suggestions_visibility_enabled := false;
      new.publishing_enabled := false;
      new.official_badge_enabled := false;

      update public.profiles
      set status = 'pending', updated_at = now()
      where id = old.profile_id;

      insert into public.institutional_entity_verification_audit_events (
        verification_id,
        profile_id,
        event_type,
        actor_user_id,
        previous_status,
        next_status,
        changed_fields
      ) values (
        old.id,
        old.profile_id,
        'protected_fields_changed_requires_reverification',
        auth.uid(),
        old.verification_status,
        'pending',
        changed
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists institutional_entity_protected_fields_guard on public.institutional_entity_verifications;
create trigger institutional_entity_protected_fields_guard
before update on public.institutional_entity_verifications
for each row
execute function public.institutional_entity_protected_fields_changed();

create or replace function public.is_institutional_entity_verified(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.institutional_entity_verifications v
    join public.profiles p on p.id = v.profile_id
    where v.profile_id = target_profile_id
      and coalesce(p.account_type, p.type) = 'institutional_entity'
      and v.verification_status = 'approved'
      and v.official_badge_enabled = true
      and v.public_visibility_enabled = true
      and v.search_visibility_enabled = true
      and v.suggestions_visibility_enabled = true
      and v.publishing_enabled = true
  );
$$;

create or replace function public.can_profile_publish_as_institutional_entity(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.profiles p
    where p.id = target_profile_id
      and coalesce(p.account_type, p.type) = 'institutional_entity'
  )
  or exists (
    select 1
    from public.institutional_entity_verifications v
    where v.profile_id = target_profile_id
      and v.verification_status = 'approved'
      and v.publishing_enabled = true
  );
$$;

create or replace function public.can_user_publish_as_institutional_entity(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.profiles p
    where p.user_id = target_user_id
      and coalesce(p.account_type, p.type) = 'institutional_entity'
  )
  or exists (
    select 1
    from public.profiles p
    join public.institutional_entity_verifications v on v.profile_id = p.id
    where p.user_id = target_user_id
      and coalesce(p.account_type, p.type) = 'institutional_entity'
      and v.verification_status = 'approved'
      and v.publishing_enabled = true
  );
$$;

create or replace view public.public_institutional_entities
with (security_invoker = true) as
select p.*,
       v.official_badge_enabled as is_verified_institutional_entity,
       v.approved_at as institutional_entity_approved_at
from public.profiles p
join public.institutional_entity_verifications v on v.profile_id = p.id
where coalesce(p.account_type, p.type) = 'institutional_entity'
  and v.verification_status = 'approved'
  and v.public_visibility_enabled = true
  and v.search_visibility_enabled = true;

alter table if exists public.institutional_entity_verifications enable row level security;
alter table if exists public.institutional_entity_verification_audit_events enable row level security;

drop policy if exists "institutional verification select own" on public.institutional_entity_verifications;
create policy "institutional verification select own"
on public.institutional_entity_verifications
for select
to authenticated
using (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));

drop policy if exists "institutional verification admin all" on public.institutional_entity_verifications;
create policy "institutional verification admin all"
on public.institutional_entity_verifications
for all
to authenticated
using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true))
with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true));

drop policy if exists "institutional verification audit admin select" on public.institutional_entity_verification_audit_events;
create policy "institutional verification audit admin select"
on public.institutional_entity_verification_audit_events
for select
to authenticated
using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true));

-- Restrictive guards: institutional entities can publish only while their verification remains approved.
do $$
begin
  if to_regclass('public.posts') is not null then
    execute 'drop policy if exists "institutional entities publish only when approved" on public.posts';
    execute 'create policy "institutional entities publish only when approved" on public.posts as restrictive for insert to authenticated with check (public.can_user_publish_as_institutional_entity(author_id))';
  end if;

  if to_regclass('public.feed_posts') is not null then
    execute 'drop policy if exists "institutional entities feed publish only when approved" on public.feed_posts';

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'feed_posts'
        and column_name = 'author_id'
    ) then
      execute 'create policy "institutional entities feed publish only when approved" on public.feed_posts as restrictive for insert to authenticated with check (public.can_user_publish_as_institutional_entity(author_id))';
    end if;
  end if;
end $$;

comment on table public.institutional_entity_verifications is
  'Verification state and protected institutional data for official institutional_entity profiles. Changes to protected fields automatically return approved entities to pending.';

comment on column public.institutional_entity_verifications.capability_flags is
  'Forward-compatible capability map for official announcements, circulars, events, training, affiliations, credentials, athlete recognition, and match rosters.';

commit;
