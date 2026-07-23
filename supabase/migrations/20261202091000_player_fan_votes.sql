-- Voti stagionali dei Fan verso i Player.
create table if not exists public.player_fan_votes (
  id uuid primary key default gen_random_uuid(),
  season_key text not null,
  fan_profile_id uuid not null references public.profiles (id) on delete cascade,
  player_profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint player_fan_votes_unique_preference unique (season_key, fan_profile_id, player_profile_id)
);

create index if not exists player_fan_votes_season_player_idx
  on public.player_fan_votes (season_key, player_profile_id);

create index if not exists player_fan_votes_season_fan_idx
  on public.player_fan_votes (season_key, fan_profile_id);

alter table public.player_fan_votes enable row level security;

create or replace function public.current_player_fan_vote_season(reference_time timestamptz default now())
returns table (
  season_key text,
  voting_open boolean,
  voting_starts_on date,
  voting_ends_on date
)
language sql
stable
set search_path = public
as $$
  with rome_today as (
    select (reference_time at time zone 'Europe/Rome')::date as today
  ), season as (
    select
      case when extract(month from today) >= 9 then extract(year from today)::int else extract(year from today)::int - 1 end as start_year,
      today
    from rome_today
  )
  select
    start_year::text || '-' || (start_year + 1)::text as season_key,
    today >= make_date(start_year, 9, 1) and today < make_date(start_year + 1, 6, 1) as voting_open,
    make_date(start_year, 9, 1) as voting_starts_on,
    make_date(start_year + 1, 5, 31) as voting_ends_on
  from season;
$$;

create or replace view public.current_player_fan_vote_counts as
select
  v.player_profile_id,
  s.season_key,
  count(*)::int as vote_count
from public.player_fan_votes v
cross join public.current_player_fan_vote_season(now()) s
where v.season_key = s.season_key
group by v.player_profile_id, s.season_key;

create or replace function public.get_player_fan_vote_state(target_player_profile_id uuid)
returns table (
  season_key text,
  voting_open boolean,
  voting_starts_on date,
  voting_ends_on date,
  vote_count int,
  voted_by_me boolean,
  used_votes int,
  remaining_votes int,
  can_vote boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_fan_profile_id uuid;
  v_target_account_type text;
  v_target_status text;
  v_season record;
begin
  select * into v_season from public.current_player_fan_vote_season(now()) limit 1;

  select p.id
    into v_fan_profile_id
  from public.profiles p
  where p.user_id = auth.uid()
    and lower(coalesce(p.account_type, p.type, '')) = 'fan'
    and lower(coalesce(p.status, 'active')) = 'active'
  limit 1;

  select lower(coalesce(p.account_type, p.type, '')), lower(coalesce(p.status, 'active'))
    into v_target_account_type, v_target_status
  from public.profiles p
  where p.id = target_player_profile_id
  limit 1;

  return query
  select
    v_season.season_key::text,
    v_season.voting_open::boolean,
    v_season.voting_starts_on::date,
    v_season.voting_ends_on::date,
    coalesce((select count(*)::int from public.player_fan_votes v where v.season_key = v_season.season_key and v.player_profile_id = target_player_profile_id), 0),
    coalesce(v_fan_profile_id is not null and exists (select 1 from public.player_fan_votes v where v.season_key = v_season.season_key and v.fan_profile_id = v_fan_profile_id and v.player_profile_id = target_player_profile_id), false),
    coalesce((select count(*)::int from public.player_fan_votes v where v.season_key = v_season.season_key and v.fan_profile_id = v_fan_profile_id), 0),
    greatest(0, 5 - coalesce((select count(*)::int from public.player_fan_votes v where v.season_key = v_season.season_key and v.fan_profile_id = v_fan_profile_id), 0)),
    coalesce(v_fan_profile_id is not null and v_target_account_type = 'athlete' and v_target_status = 'active', false);
end;
$$;

create or replace function public.cast_player_fan_vote(target_player_profile_id uuid)
returns table (
  season_key text,
  voting_open boolean,
  voting_starts_on date,
  voting_ends_on date,
  vote_count int,
  voted_by_me boolean,
  used_votes int,
  remaining_votes int,
  can_vote boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fan_profile_id uuid;
  v_target_account_type text;
  v_target_status text;
  v_season record;
  v_used int;
begin
  select * into v_season from public.current_player_fan_vote_season(now()) limit 1;
  if not v_season.voting_open then
    raise exception 'Votazioni chiuse';
  end if;

  select p.id into v_fan_profile_id
  from public.profiles p
  where p.user_id = auth.uid()
    and lower(coalesce(p.account_type, p.type, '')) = 'fan'
    and lower(coalesce(p.status, 'active')) = 'active'
  limit 1;
  if v_fan_profile_id is null then
    raise exception 'Solo i Fan possono votare';
  end if;

  select lower(coalesce(p.account_type, p.type, '')), lower(coalesce(p.status, 'active'))
    into v_target_account_type, v_target_status
  from public.profiles p
  where p.id = target_player_profile_id
  limit 1;
  if v_target_account_type is distinct from 'athlete' or v_target_status is distinct from 'active' then
    raise exception 'Puoi votare solo profili Player attivi';
  end if;
  if v_fan_profile_id = target_player_profile_id then
    raise exception 'Non puoi votare te stesso';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_fan_profile_id::text || ':' || v_season.season_key::text, 0));

  if exists (select 1 from public.player_fan_votes v where v.season_key = v_season.season_key and v.fan_profile_id = v_fan_profile_id and v.player_profile_id = target_player_profile_id) then
    return query select * from public.get_player_fan_vote_state(target_player_profile_id);
    return;
  end if;

  select count(*)::int into v_used
  from public.player_fan_votes v
  where v.season_key = v_season.season_key and v.fan_profile_id = v_fan_profile_id;

  if v_used >= 5 then
    raise exception 'Hai già usato le 5 preferenze disponibili';
  end if;

  insert into public.player_fan_votes (season_key, fan_profile_id, player_profile_id)
  values (v_season.season_key, v_fan_profile_id, target_player_profile_id);

  return query select * from public.get_player_fan_vote_state(target_player_profile_id);
end;
$$;

create or replace function public.remove_player_fan_vote(target_player_profile_id uuid)
returns table (
  season_key text,
  voting_open boolean,
  voting_starts_on date,
  voting_ends_on date,
  vote_count int,
  voted_by_me boolean,
  used_votes int,
  remaining_votes int,
  can_vote boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fan_profile_id uuid;
  v_season record;
begin
  select * into v_season from public.current_player_fan_vote_season(now()) limit 1;
  if not v_season.voting_open then
    raise exception 'Votazioni chiuse';
  end if;

  select p.id into v_fan_profile_id
  from public.profiles p
  where p.user_id = auth.uid()
    and lower(coalesce(p.account_type, p.type, '')) = 'fan'
    and lower(coalesce(p.status, 'active')) = 'active'
  limit 1;
  if v_fan_profile_id is null then
    raise exception 'Solo i Fan possono rimuovere un voto';
  end if;

  delete from public.player_fan_votes v
  where v.season_key = v_season.season_key
    and v.fan_profile_id = v_fan_profile_id
    and v.player_profile_id = target_player_profile_id;

  return query select * from public.get_player_fan_vote_state(target_player_profile_id);
end;
$$;

drop policy if exists "player_fan_votes_select_counts" on public.player_fan_votes;
create policy "player_fan_votes_select_counts"
  on public.player_fan_votes
  for select
  using (true);

drop policy if exists "player_fan_votes_insert_rpc_only" on public.player_fan_votes;

drop policy if exists "player_fan_votes_delete_own" on public.player_fan_votes;
create policy "player_fan_votes_delete_own"
  on public.player_fan_votes
  for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = fan_profile_id
        and p.user_id = auth.uid()
        and lower(coalesce(p.account_type, p.type, '')) = 'fan'
    )
  );

grant select on public.current_player_fan_vote_counts to anon, authenticated;
grant execute on function public.current_player_fan_vote_season(timestamptz) to anon, authenticated;
grant execute on function public.get_player_fan_vote_state(uuid) to authenticated;
grant execute on function public.cast_player_fan_vote(uuid) to authenticated;
grant execute on function public.remove_player_fan_vote(uuid) to authenticated;
