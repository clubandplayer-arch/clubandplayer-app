begin;

alter table public.profiles
  add column if not exists registry_master_id text references public.registry_clubs_master(master_id) on delete set null,
  add column if not exists club_name_review_status text not null default 'not_required',
  add column if not exists club_name_review_reason text,
  add column if not exists club_name_reviewed_at timestamptz,
  add column if not exists club_name_reviewed_by uuid references auth.users(id) on delete set null;

alter table public.profiles drop constraint if exists profiles_club_name_review_status_check;
alter table public.profiles add constraint profiles_club_name_review_status_check
  check (club_name_review_status in ('not_required', 'pending', 'approved', 'rejected'));

create unique index if not exists profiles_registry_master_id_unique
  on public.profiles (registry_master_id)
  where registry_master_id is not null;
create index if not exists profiles_club_name_review_queue_idx
  on public.profiles (club_name_review_status, updated_at desc)
  where coalesce(account_type, type) = 'club';

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
      new.club_name_review_status := 'not_required';
      new.club_name_review_reason := null;
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

create or replace function public.notify_profile_demoted_to_draft()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.profile_visibility_status = 'published'
     and new.profile_visibility_status = 'draft'
     and new.user_id is not null then
    insert into public.notifications (user_id, kind, payload)
    values (
      new.user_id,
      'profile_returned_to_draft',
      jsonb_build_object(
        'profile_id', new.id,
        'reason', coalesce(new.club_name_review_reason, 'required_fields_changed'),
        'completion_path', case when coalesce(new.account_type, new.type) = 'club' then '/club/profile' else '/player/profile' end
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_notify_draft_demotion on public.profiles;
create trigger profiles_notify_draft_demotion
after update on public.profiles
for each row execute function public.notify_profile_demoted_to_draft();

-- Link profiles already backed by approved claims and queue weak names for review.
update public.profiles p
set registry_master_id = m.master_id,
    club_name_review_status = 'approved',
    club_name_review_reason = null
from public.registry_clubs_master m
where m.claimed_profile_id = p.id and m.is_claimed = true;

update public.profiles set updated_at = updated_at
where coalesce(account_type, type) = 'club';

commit;
