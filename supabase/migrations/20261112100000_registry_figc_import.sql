create table if not exists public.registry_clubs (
  id uuid primary key default gen_random_uuid(),

  source text not null default 'CONI',
  source_club_id text not null,

  name text not null,
  normalized_name text,

  fiscal_code text,
  legal_type text,

  region text,
  province text,
  municipality text,

  representative_name text,

  valid_until date,
  registered_at date,

  detail_url text,

  claim_status text not null default 'not_claimed',

  claimed_by_profile_id uuid
    references public.profiles(id)
    on delete set null,

  claimed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (source, source_club_id)
);

create table if not exists public.registry_club_affiliations (
  id uuid primary key default gen_random_uuid(),

  registry_club_id uuid not null
    references public.registry_clubs(id)
    on delete cascade,

  organism text not null,

  affiliation_code text,

  sport_year_start date,
  sport_year_end date,

  created_at timestamptz not null default now(),

  unique (
    registry_club_id,
    organism,
    affiliation_code
  )
);

create table if not exists public.registry_club_disciplines (
  id uuid primary key default gen_random_uuid(),

  registry_club_id uuid not null
    references public.registry_clubs(id)
    on delete cascade,

  discipline_raw text not null,

  clubandplayer_sport text not null,

  created_at timestamptz not null default now(),

  unique (
    registry_club_id,
    discipline_raw,
    clubandplayer_sport
  )
);

create table if not exists public.registry_claims (
  id uuid primary key default gen_random_uuid(),

  registry_club_id uuid not null
    references public.registry_clubs(id)
    on delete cascade,

  profile_id uuid not null
    references public.profiles(id)
    on delete cascade,

  claim_status text not null default 'pending',

  claim_method text,
  notes text,

  submitted_at timestamptz not null default now(),

  approved_at timestamptz,
  rejected_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists registry_clubs_name_fts_idx
on public.registry_clubs
using gin (
  to_tsvector(
    'simple',
    coalesce(name, '') || ' ' ||
    coalesce(normalized_name, '')
  )
);

create index if not exists registry_clubs_location_idx
on public.registry_clubs (
  region,
  province,
  municipality
);

create index if not exists registry_clubs_fiscal_code_idx
on public.registry_clubs (
  fiscal_code
);

create index if not exists registry_affiliations_organism_idx
on public.registry_club_affiliations (
  organism
);

create index if not exists registry_disciplines_sport_idx
on public.registry_club_disciplines (
  clubandplayer_sport
);

create index if not exists registry_claims_profile_idx
on public.registry_claims (
  profile_id
);

create index if not exists registry_claims_status_idx
on public.registry_claims (
  claim_status
);

alter table public.registry_clubs
enable row level security;

alter table public.registry_club_affiliations
enable row level security;

alter table public.registry_club_disciplines
enable row level security;

alter table public.registry_claims
enable row level security;

drop policy if exists registry_clubs_read_all
on public.registry_clubs;

create policy registry_clubs_read_all
on public.registry_clubs
for select
using (true);

drop policy if exists registry_affiliations_read_all
on public.registry_club_affiliations;

create policy registry_affiliations_read_all
on public.registry_club_affiliations
for select
using (true);

drop policy if exists registry_disciplines_read_all
on public.registry_club_disciplines;

create policy registry_disciplines_read_all
on public.registry_club_disciplines
for select
using (true);

drop policy if exists registry_claims_select_own
on public.registry_claims;

create policy registry_claims_select_own
on public.registry_claims
for select
using (
  profile_id = auth.uid()
);

drop policy if exists registry_claims_insert_own
on public.registry_claims;

create policy registry_claims_insert_own
on public.registry_claims
for insert
with check (
  profile_id = auth.uid()
);