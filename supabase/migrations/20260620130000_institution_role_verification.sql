begin;

insert into storage.buckets (id, name, public)
values ('institution-verification-docs', 'institution-verification-docs', false)
on conflict (id) do nothing;

create table if not exists public.institution_verification_requests (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null default 'Federazione',
  entity_name text,
  fiscal_code text,
  vat_number text,
  email text,
  pec text,
  website text,
  representative text,
  document_type text,
  document_path text,
  status text not null default 'draft',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewer_id uuid references auth.users(id) on delete set null,
  rejection_reason text,
  verified_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.institution_verification_requests drop constraint if exists institution_verification_requests_status_check;
alter table public.institution_verification_requests add constraint institution_verification_requests_status_check check (status in ('draft', 'submitted', 'approved', 'rejected'));
alter table public.institution_verification_requests drop constraint if exists institution_verification_requests_entity_type_check;
alter table public.institution_verification_requests add constraint institution_verification_requests_entity_type_check check (entity_type in ('Federazione', 'EPS', 'Comitato Regionale', 'Comitato Provinciale', 'Delegazione', 'Lega'));
alter table public.institution_verification_requests drop constraint if exists institution_verification_requests_document_type_check;
alter table public.institution_verification_requests add constraint institution_verification_requests_document_type_check check (document_type in ('visura', 'ade_certificate'));

create index if not exists idx_institution_verification_requests_institution_id on public.institution_verification_requests(institution_id);
create index if not exists idx_institution_verification_requests_status on public.institution_verification_requests(status);

alter table public.institution_verification_requests enable row level security;

drop policy if exists "institution verification select own" on public.institution_verification_requests;
create policy "institution verification select own" on public.institution_verification_requests for select using (
  exists (select 1 from public.profiles p where p.id = institution_verification_requests.institution_id and p.user_id = auth.uid())
);

drop policy if exists "institution verification admin select" on public.institution_verification_requests;
create policy "institution verification admin select" on public.institution_verification_requests for select using (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
);

drop policy if exists "institution verification admin update" on public.institution_verification_requests;
create policy "institution verification admin update" on public.institution_verification_requests for update using (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
) with check (true);

create or replace view public.institution_verification_requests_view with (security_invoker = true) as
select r.*, (r.verified_until > now() and r.status = 'approved') as is_verified
from public.institution_verification_requests r;

drop policy if exists "institution verification docs admin read" on storage.objects;
create policy "institution verification docs admin read" on storage.objects for select using (
  bucket_id = 'institution-verification-docs'
  and exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
);

commit;
