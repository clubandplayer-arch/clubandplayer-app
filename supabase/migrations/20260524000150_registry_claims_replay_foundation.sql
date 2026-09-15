begin;

-- Replay foundation: a 2026-05 migration references registry_claims before
-- the historical 2026-11 file creates the registry family. Definitions are
-- kept identical to that later idempotent migration. No rows are written.
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


commit;
