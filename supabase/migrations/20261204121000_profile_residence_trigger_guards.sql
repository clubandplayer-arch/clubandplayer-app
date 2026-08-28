begin;

-- B4.4 trigger-aware guards. No trigger is disabled or recreated.
create or replace function public.profile_location_coerce()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
declare
  p_row public.provinces%rowtype;
  m_row public.municipalities%rowtype;
begin
  if tg_op = 'UPDATE'
     and new.municipality_id is not distinct from old.municipality_id
     and new.province_id is not distinct from old.province_id
     and new.region_id is not distinct from old.region_id then
    return new;
  end if;

  if new.municipality_id is not null then
    select * into m_row from public.municipalities where id = new.municipality_id;
    if m_row.id is null then raise exception 'Municipality % not found', new.municipality_id; end if;
    new.province_id := m_row.province_id;
    new.region_id := m_row.region_id;
    return new;
  end if;
  if new.province_id is not null then
    select * into p_row from public.provinces where id = new.province_id;
    if p_row.id is null then raise exception 'Province % not found', new.province_id; end if;
    new.region_id := p_row.region_id;
  end if;
  return new;
end;
$$;

create or replace function public.sync_profile_names()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  normalized_name text;
  normalized_account_type text := lower(coalesce(new.account_type, new.type, ''));
begin
  if tg_op = 'UPDATE'
     and new.full_name is not distinct from old.full_name
     and new.display_name is not distinct from old.display_name
     and new.account_type is not distinct from old.account_type
     and new.type is not distinct from old.type
     and new.user_id is not distinct from old.user_id then
    return new;
  end if;
  if new.full_name is not null and btrim(new.full_name) = '' then
    new.full_name := null;
  end if;
  if new.display_name is not null and btrim(new.display_name) = '' then
    new.display_name := null;
  end if;

  if tg_op = 'INSERT' then
    if new.full_name is null and new.display_name is not null then
      new.full_name := new.display_name;
    elsif new.display_name is null and new.full_name is not null then
      new.display_name := new.full_name;
    end if;
  else
    if new.full_name is distinct from old.full_name
       and new.display_name is not distinct from old.display_name then
      new.display_name := new.full_name;
    elsif new.display_name is distinct from old.display_name
          and new.full_name is not distinct from old.full_name then
      new.full_name := new.display_name;
    end if;

    if new.full_name is null and new.display_name is not null then
      new.full_name := new.display_name;
    elsif new.display_name is null and new.full_name is not null then
      new.display_name := new.full_name;
    end if;
  end if;

  if normalized_account_type in ('athlete', 'staff', 'fan') then
    normalized_name := public.normalize_person_name(coalesce(new.full_name, new.display_name));
    new.full_name := normalized_name;
    new.display_name := normalized_name;

    if new.user_id is not null and normalized_name is not null then
      update auth.users
      set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object(
          'first_name', split_part(normalized_name, ' ', 1),
          'last_name', nullif(substring(normalized_name from position(' ' in normalized_name) + 1), normalized_name),
          'full_name', normalized_name,
          'display_name', normalized_name,
          'name', normalized_name
        ),
        updated_at = now()
      where id = new.user_id;
    end if;
  end if;

  return new;
end;
$$;

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
      and nullif(btrim(coalesce(new.sport, '')), '') is not null
      and nullif(btrim(coalesce(new.country, '')), '') is not null
      and (nullif(btrim(coalesce(new.region, '')), '') is not null or new.interest_region_id is not null)
      and (nullif(btrim(coalesce(new.province, '')), '') is not null or new.interest_province_id is not null)
      and (nullif(btrim(coalesce(new.city, '')), '') is not null or new.interest_municipality_id is not null)
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

comment on function public.profile_location_coerce() is 'Coerce legacy location IDs only when its input IDs change.';
comment on function public.sync_profile_names() is 'Synchronize names only when name identity inputs change.';
comment on function public.set_profile_visibility_status() is 'Preserve visibility rules while skipping residence-only athlete/staff updates.';

commit;
