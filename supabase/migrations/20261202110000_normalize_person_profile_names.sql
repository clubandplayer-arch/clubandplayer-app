-- Enforce consistent `Nome Cognome` casing for Player, Staff and Fan profiles.
-- Organization names are intentionally excluded from this rule.

create or replace function public.normalize_person_name(value text)
returns text
language sql
immutable
strict
as $$
  select initcap(lower(regexp_replace(btrim(value), '\s+', ' ', 'g')));
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

-- Normalize existing Player, Staff and Fan profiles. The existing name-sync
-- trigger also propagates every corrected name to the related Auth metadata.
update public.profiles
set full_name = public.normalize_person_name(coalesce(nullif(btrim(full_name), ''), display_name)),
    display_name = public.normalize_person_name(coalesce(nullif(btrim(full_name), ''), display_name)),
    updated_at = now()
where lower(coalesce(account_type, type, '')) in ('athlete', 'staff', 'fan')
  and coalesce(nullif(btrim(full_name), ''), nullif(btrim(display_name), '')) is not null;
