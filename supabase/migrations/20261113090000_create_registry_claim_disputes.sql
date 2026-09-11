begin;

-- Completes the versioned registry schema before the following additive ALTER.
create table if not exists public.registry_claim_disputes (
  id uuid primary key default gen_random_uuid(),
  registry_club_id uuid references public.registry_clubs(id) on delete set null,
  claimant_profile_id uuid not null references public.profiles(id) on delete cascade,
  current_claimed_by_profile_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  status text not null default 'pending',
  admin_notes text,
  reviewed_at timestamptz,
  reviewed_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint registry_claim_disputes_status_check
    check (status in ('pending', 'approved', 'rejected'))
);

create index if not exists registry_claim_disputes_claimant_status_idx
  on public.registry_claim_disputes (claimant_profile_id, status);

commit;
