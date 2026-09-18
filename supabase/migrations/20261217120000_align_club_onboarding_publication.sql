begin;

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
    session_user in ('postgres', 'supabase_admin')
    or coalesce(auth.jwt() ->> 'role', '') = 'service_role'
    or exists (
      select 1 from public.profiles admin_profile
      where admin_profile.user_id = auth.uid() and admin_profile.is_admin = true
    );
  is_complete boolean := false;
  has_club_signal boolean := false;
  has_active_registration boolean := false;
  has_canonical_location boolean := false;
  suspicious_reason text := null;
begin
  -- Residence text participates in Club completeness, but B4 is limited to
  -- athlete/staff, whose completeness does not read region/province/city.
  if tg_op = 'UPDATE'
     and account_kind in ('athlete', 'staff')
     and new.account_type is not distinct from old.account_type
     and new.type is not distinct from old.type
     and new.full_name is not distinct from old.full_name
     and new.display_name is not distinct from old.display_name
     and new.status is not distinct from old.status
     and new.birth_year is not distinct from old.birth_year
     and new.country is not distinct from old.country
     and new.sport is not distinct from old.sport
     and new.role is not distinct from old.role
     and new.profile_visibility_status is not distinct from old.profile_visibility_status
     and new.registry_master_id is not distinct from old.registry_master_id
     and new.club_name_review_status is not distinct from old.club_name_review_status
     and new.club_name_review_reason is not distinct from old.club_name_review_reason
     and new.club_name_reviewed_at is not distinct from old.club_name_reviewed_at
     and new.club_name_reviewed_by is not distinct from old.club_name_reviewed_by then
    return new;
  end if;
  if not is_admin_request then
    if tg_op = 'INSERT' then
      new.registry_master_id := null;
      new.club_name_review_status := 'not_required';
      new.club_name_review_reason := null;
      new.club_name_reviewed_at := null;
      new.club_name_reviewed_by := null;
    else
      new.registry_master_id := old.registry_master_id;
      new.club_name_review_status := old.club_name_review_status;
      new.club_name_review_reason := old.club_name_review_reason;
      new.club_name_reviewed_at := old.club_name_reviewed_at;
      new.club_name_reviewed_by := old.club_name_reviewed_by;
    end if;
  end if;

  if tg_op = 'UPDATE' and old.profile_visibility_status = 'suspended' and not is_admin_request then
    new.profile_visibility_status := 'suspended';
    return new;
  end if;
  if new.profile_visibility_status = 'suspended' and is_admin_request then return new; end if;

  if account_kind = 'club' then
    select exists (
      select 1
      from public.club_sport_registrations registration
      where registration.club_profile_id = new.id
        and registration.is_active = true
    ) into has_active_registration;

    select exists (
      select 1
      from public.profile_preferences preference
      where preference.profile_id = new.id
        and preference.residence_country_id is not null
        and preference.residence_geo_area_id is not null
    ) into has_canonical_location;

    has_club_signal :=
      public_name ~ '[0-9.,]'
      or lower(public_name) ~ '(^|[[:space:]])(academy|accademia|ac|asd|associazione|atletico|athletic|basket|calcio|club|fc|polisportiva|real|rugby|sc|societa|società|sport|sporting|ssd|ss|team|tennis|uc|unione|united|us|volley)([[:space:].,]|$)';

    suspicious_reason := case
      when public_name = '' then 'Nome Club mancante'
      when not has_club_signal then 'Denominazione priva di un riferimento societario riconoscibile'
      else null
    end;

    if new.registry_master_id is not null then
      new.club_name_review_status := 'approved';
      new.club_name_review_reason := null;
    elsif suspicious_reason is not null then
      if tg_op = 'UPDATE'
         and public_name = btrim(coalesce(old.full_name, old.display_name, ''))
         and old.club_name_review_status in ('approved', 'rejected') then
        new.club_name_review_status := old.club_name_review_status;
      elsif not (is_admin_request and new.club_name_review_status in ('approved', 'rejected')) then
        new.club_name_review_status := 'pending';
      end if;
      new.club_name_review_reason := case
        when new.club_name_review_status = 'approved' then null
        else suspicious_reason
      end;
    else
      -- A valid-looking name normally needs no review, but an explicit admin
      -- decision must survive this trigger. Without this guard, approving (or
      -- rejecting) names such as "ASD Kairos Domini 2026" is immediately
      -- rewritten to not_required by the same UPDATE.
      if is_admin_request and new.club_name_review_status in ('approved', 'rejected') then
        new.club_name_review_reason := case
          when new.club_name_review_status = 'approved' then null
          else new.club_name_review_reason
        end;
      elsif tg_op = 'UPDATE'
         and public_name = btrim(coalesce(old.full_name, old.display_name, ''))
         and old.club_name_review_status in ('approved', 'rejected') then
        new.club_name_review_status := old.club_name_review_status;
        new.club_name_review_reason := old.club_name_review_reason;
      else
        new.club_name_review_status := 'not_required';
        new.club_name_review_reason := null;
      end if;
    end if;
  else
    new.club_name_review_status := 'not_required';
    new.club_name_review_reason := null;
  end if;

  is_complete := case
    when new.status <> 'active' then false
    when account_kind = 'club' then
      public_name <> ''
      and (has_club_signal or new.registry_master_id is not null or new.club_name_review_status = 'approved')
      and new.club_name_review_status <> 'rejected'
      and has_active_registration
      and (
        has_canonical_location
        or (
          nullif(btrim(coalesce(new.country, '')), '') is not null
          and (nullif(btrim(coalesce(new.region, '')), '') is not null or new.interest_region_id is not null)
          and (nullif(btrim(coalesce(new.province, '')), '') is not null or new.interest_province_id is not null)
          and (nullif(btrim(coalesce(new.city, '')), '') is not null or new.interest_municipality_id is not null)
        )
      )
    when account_kind in ('athlete', 'staff') then
      public_name <> '' and new.birth_year between 1900 and extract(year from current_date)::integer
      and nullif(btrim(coalesce(new.country, '')), '') is not null
      and nullif(btrim(coalesce(new.sport, '')), '') is not null
      and nullif(btrim(coalesce(new.role, '')), '') is not null
    when account_kind in ('fan', 'institution') then public_name <> ''
    else false
  end;

  new.profile_visibility_status := case when is_complete then 'published' else 'draft' end;
  return new;
end;
$$;


create or replace function public.refresh_club_profile_publication()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_profile_id uuid;
begin
  target_profile_id := case
    when tg_table_name = 'club_sport_registrations' then coalesce(new.club_profile_id, old.club_profile_id)
    else coalesce(new.profile_id, old.profile_id)
  end;

  update public.profiles
  set updated_at = now()
  where id = target_profile_id
    and lower(coalesce(account_type, type, '')) = 'club';

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists club_registrations_refresh_profile_publication on public.club_sport_registrations;
create trigger club_registrations_refresh_profile_publication
after insert or update or delete on public.club_sport_registrations
for each row execute function public.refresh_club_profile_publication();

drop trigger if exists profile_preferences_refresh_club_publication on public.profile_preferences;
create trigger profile_preferences_refresh_club_publication
after insert or update of residence_country_id, residence_geo_area_id or delete on public.profile_preferences
for each row execute function public.refresh_club_profile_publication();

-- Reconcile profiles created while the application and database used different
-- completeness rules.
update public.profiles
set updated_at = now()
where lower(coalesce(account_type, type, '')) = 'club';

commit;
