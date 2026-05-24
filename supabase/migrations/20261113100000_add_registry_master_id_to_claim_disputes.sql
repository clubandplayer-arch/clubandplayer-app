alter table public.registry_claim_disputes
add column if not exists registry_master_id text;

create index if not exists registry_claim_disputes_registry_master_id_idx
on public.registry_claim_disputes (registry_master_id);
