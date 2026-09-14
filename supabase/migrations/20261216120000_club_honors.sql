begin;

create table public.club_honors (
  id uuid primary key default gen_random_uuid(),
  club_profile_id uuid not null references public.profiles(id) on delete cascade,
  season text not null check (season ~ '^[0-9]{4}/[0-9]{4}$'),
  sport_id uuid not null references public.sports(id) on delete restrict,
  sport_discipline_id uuid,
  sport_variant_id uuid,
  sports_organization_id uuid not null references public.sports_organizations(id) on delete restrict,
  sports_organization_category_id uuid not null references public.sports_organization_categories(id) on delete restrict,
  placement smallint not null check (placement in (1, 2, 3)),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (sport_discipline_id, sport_id)
    references public.sport_disciplines(id, sport_id) on delete restrict,
  foreign key (sport_variant_id, sport_discipline_id)
    references public.sport_variants(id, discipline_id) on delete restrict
);

create unique index club_honors_active_competition_unique
  on public.club_honors (
    club_profile_id, season, sport_id, sport_discipline_id, sport_variant_id,
    sports_organization_id, sports_organization_category_id
  ) nulls not distinct where is_active;

create index club_honors_public_order
  on public.club_honors(club_profile_id, season desc, placement, created_at, id)
  where is_active;

create function public.validate_club_honor() returns trigger
language plpgsql set search_path = public as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = new.club_profile_id and p.account_type = 'club'
  ) then
    raise exception 'honor_requires_club_profile';
  end if;

  if not exists (
    select 1
    from public.sports_organization_categories c
    join public.sports_organizations o on o.id = c.organization_id
    where c.id = new.sports_organization_category_id
      and c.organization_id = new.sports_organization_id
      and c.sport_id = new.sport_id
      and c.discipline_id is not distinct from new.sport_discipline_id
      and c.variant_id is not distinct from new.sport_variant_id
      and c.is_active and o.is_active
  ) then
    raise exception 'incompatible_club_honor';
  end if;

  new.updated_at = now();
  return new;
end $$;

create trigger validate_club_honor
before insert or update on public.club_honors
for each row execute function public.validate_club_honor();
revoke execute on function public.validate_club_honor() from public, anon, authenticated;

alter table public.club_honors enable row level security;
create policy club_honors_public_active_read on public.club_honors
  for select using (
    is_active or exists (
      select 1 from public.profiles p
      where p.id = club_profile_id and p.user_id = auth.uid()
    )
  );
create policy club_honors_owner_insert on public.club_honors
  for insert to authenticated with check (
    exists (
      select 1 from public.profiles p
      where p.id = club_profile_id and p.user_id = auth.uid() and p.account_type = 'club'
    )
  );
create policy club_honors_owner_update on public.club_honors
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = club_profile_id and p.user_id = auth.uid() and p.account_type = 'club'))
  with check (exists (select 1 from public.profiles p where p.id = club_profile_id and p.user_id = auth.uid() and p.account_type = 'club'));

revoke all on public.club_honors from public, anon, authenticated;
grant select on public.club_honors to anon, authenticated;
grant insert, update on public.club_honors to authenticated;

commit;
