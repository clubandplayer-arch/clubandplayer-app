-- =========================================================
-- REGISTRY MASTER V2
-- Dataset nazionale ASD/SSD deduplicato e geo-normalizzato
-- SAFE VERSION (nessun dato sensibile esposto pubblicamente)
-- =========================================================

create table if not exists public.registry_clubs_master (
  id bigserial primary key,

  master_id text not null unique,

  codice_fiscale text,

  denominazione text not null,

  regione text,
  provincia text,
  comune text,

  sport_normalizzati text,

  organisms text,

  source_count integer default 1,

  is_claimed boolean default false,

  claimed_profile_id uuid references public.profiles(id) on delete set null,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =========================================================
-- INDICI
-- =========================================================

create index if not exists idx_registry_master_denominazione
on public.registry_clubs_master using gin (to_tsvector('simple', denominazione));

create index if not exists idx_registry_master_regione
on public.registry_clubs_master (regione);

create index if not exists idx_registry_master_provincia
on public.registry_clubs_master (provincia);

create index if not exists idx_registry_master_comune
on public.registry_clubs_master (comune);

create index if not exists idx_registry_master_sport
on public.registry_clubs_master (sport_normalizzati);

create index if not exists idx_registry_master_cf
on public.registry_clubs_master (codice_fiscale);

-- =========================================================
-- UPDATED_AT TRIGGER
-- =========================================================

create or replace function public.registry_master_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_registry_master_updated_at
on public.registry_clubs_master;

create trigger trg_registry_master_updated_at
before update on public.registry_clubs_master
for each row
execute function public.registry_master_set_updated_at();

-- =========================================================
-- RLS
-- =========================================================

alter table public.registry_clubs_master
enable row level security;

-- Lettura pubblica SAFE
drop policy if exists "registry_master_public_read"
on public.registry_clubs_master;

create policy "registry_master_public_read"
on public.registry_clubs_master
for select
using (true);

-- Scrittura SOLO service role/admin backend
drop policy if exists "registry_master_no_public_insert"
on public.registry_clubs_master;

create policy "registry_master_no_public_insert"
on public.registry_clubs_master
for insert
with check (false);

drop policy if exists "registry_master_no_public_update"
on public.registry_clubs_master;

create policy "registry_master_no_public_update"
on public.registry_clubs_master
for update
using (false);

drop policy if exists "registry_master_no_public_delete"
on public.registry_clubs_master;

create policy "registry_master_no_public_delete"
on public.registry_clubs_master
for delete
using (false);

-- =========================================================
-- COMMENTI
-- =========================================================

comment on table public.registry_clubs_master is
'Dataset master ASD/SSD nazionale deduplicato e geo-normalizzato (safe public version).';

comment on column public.registry_clubs_master.codice_fiscale is
'Campo interno per deduplica/matching. Non esporre pubblicamente.';