alter table public.registry_claims
add column if not exists registry_master_id text;

create index if not exists idx_registry_claims_registry_master_id
on public.registry_claims (registry_master_id);

create unique index if not exists idx_registry_claims_master_profile_unique
on public.registry_claims (registry_master_id, profile_id)
where registry_master_id is not null;

comment on column public.registry_claims.registry_master_id is
'Riferimento safe al registry nazionale V2 public.registry_clubs_master.master_id.';