begin;

alter table public.profiles
  add column if not exists profile_visibility_status text not null default 'draft';

alter table public.profiles
  drop constraint if exists profiles_visibility_status_check;
alter table public.profiles
  add constraint profiles_visibility_status_check
  check (profile_visibility_status in ('draft', 'published', 'suspended'));

comment on column public.profiles.profile_visibility_status is
  'Public profile lifecycle: draft until complete, published when eligible, suspended only by an administrator.';

create or replace function public.set_profile_visibility_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  account_kind text := lower(coalesce(new.account_type, new.type, ''));
  public_name text := btrim(coalesce(new.full_name, new.display_name, ''));
  is_admin_request boolean :=
    coalesce(auth.jwt() ->> 'role', '') = 'service_role'
    or exists (
      select 1
      from public.profiles admin_profile
      where admin_profile.user_id = auth.uid()
        and admin_profile.is_admin = true
    );
  is_complete boolean := false;
  has_club_signal boolean := false;
begin
  if tg_op = 'UPDATE' and old.profile_visibility_status = 'suspended' and not is_admin_request then
    new.profile_visibility_status := 'suspended';
    return new;
  end if;

  if new.profile_visibility_status = 'suspended' and is_admin_request then
    return new;
  end if;

  has_club_signal :=
    public_name ~ '[0-9.,]'
    or lower(public_name) ~ '(^|[[:space:]])(academy|accademia|ac|asd|associazione|atletico|athletic|basket|calcio|club|fc|polisportiva|real|rugby|sc|societa|società|sport|sporting|ssd|ss|team|tennis|uc|unione|united|us|volley)([[:space:].,]|$)'
    or public_name !~* '^[[:alpha:]À-ÖØ-öø-ÿ''’-]+([[:space:]]+[[:alpha:]À-ÖØ-öø-ÿ''’-]+){0,2}$';

  is_complete := case
    when new.status <> 'active' then false
    when account_kind = 'club' then
      public_name <> ''
      and has_club_signal
      and nullif(btrim(coalesce(new.sport, '')), '') is not null
      and nullif(btrim(coalesce(new.country, '')), '') is not null
      and (nullif(btrim(coalesce(new.region, '')), '') is not null or new.interest_region_id is not null)
      and (nullif(btrim(coalesce(new.province, '')), '') is not null or new.interest_province_id is not null)
      and (nullif(btrim(coalesce(new.city, '')), '') is not null or new.interest_municipality_id is not null)
    when account_kind in ('athlete', 'staff') then
      public_name <> ''
      and new.birth_year between 1900 and extract(year from current_date)::integer
      and nullif(btrim(coalesce(new.country, '')), '') is not null
      and nullif(btrim(coalesce(new.sport, '')), '') is not null
      and nullif(btrim(coalesce(new.role, '')), '') is not null
    when account_kind = 'fan' then public_name <> ''
    when account_kind = 'institution' then public_name <> ''
    else false
  end;

  new.profile_visibility_status := case when is_complete then 'published' else 'draft' end;
  return new;
end;
$$;

drop trigger if exists profiles_set_visibility_status on public.profiles;
create trigger profiles_set_visibility_status
before insert or update on public.profiles
for each row execute function public.set_profile_visibility_status();

-- Re-evaluate all existing profiles with the same rules used for future writes.
update public.profiles
set updated_at = updated_at;

create index if not exists profiles_public_visibility_idx
  on public.profiles (account_type, profile_visibility_status)
  where status = 'active' and profile_visibility_status = 'published';

-- Keep the public player views compatible with the centralized visibility scope.
create or replace view public.players_view with (security_invoker = true) as
select
  p.id,
  p.user_id,
  coalesce(nullif(p.full_name, ''), p.full_name) as full_name,
  coalesce(
    nullif(p.full_name, ''),
    case
      when coalesce(p.display_name, '') = '' then null
      when position('@' in p.display_name) > 0 then null
      else p.display_name
    end,
    'Player'
  ) as display_name,
  p.headline,
  p.bio,
  p.sport,
  p.role,
  coalesce(nullif(p.interest_country, ''), nullif(p.country, '')) as country,
  coalesce(nullif(r.name, ''), nullif(p.interest_region, ''), nullif(p.region, '')) as region,
  coalesce(nullif(pr.name, ''), nullif(p.interest_province, ''), nullif(p.province, '')) as province,
  coalesce(nullif(m.name, ''), nullif(p.interest_city, ''), nullif(p.city, '')) as city,
  p.avatar_url,
  p.links,
  p.account_type,
  p.status,
  p.created_at,
  p.updated_at,
  p.matches_played,
  p.goals_scored,
  p.assists,
  p.open_to_opportunities,
  p.preferred_roles,
  p.preferred_locations,
  p.profile_visibility_status
from public.profiles p
left join public.regions r on r.id = p.interest_region_id
left join public.provinces pr on pr.id = p.interest_province_id
left join public.municipalities m on m.id = p.interest_municipality_id
where p.account_type = 'athlete';

create or replace view public.athletes_view with (security_invoker = true) as
select * from public.players_view;

commit;
