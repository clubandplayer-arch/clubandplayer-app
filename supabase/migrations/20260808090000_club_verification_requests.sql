begin;

insert into storage.buckets (id, name, public)
values ('club-verification-certs', 'club-verification-certs', false)
on conflict (id) do nothing;

create table if not exists public.club_verification_requests (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  status text not null default 'draft',
  certificate_path text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewer_id uuid references auth.users(id) on delete set null,
  rejection_reason text,
  verified_until timestamptz,
  payment_status text not null default 'unpaid',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.club_verification_requests
  drop constraint if exists club_verification_requests_status_check;

alter table if exists public.club_verification_requests
  add constraint club_verification_requests_status_check
  check (status in ('draft', 'submitted', 'approved', 'rejected'));

alter table if exists public.club_verification_requests
  drop constraint if exists club_verification_requests_payment_status_check;

alter table if exists public.club_verification_requests
  add constraint club_verification_requests_payment_status_check
  check (payment_status in ('unpaid', 'paid', 'waived'));

create index if not exists idx_club_verification_requests_club_id
  on public.club_verification_requests(club_id);

create index if not exists idx_club_verification_requests_status
  on public.club_verification_requests(status);

alter table if exists public.club_verification_requests enable row level security;

drop policy if exists "club verification select own" on public.club_verification_requests;
create policy "club verification select own"
on public.club_verification_requests
for select
using (
  exists (
    select 1
    from public.clubs c
    where c.id = club_verification_requests.club_id
      and c.owner_id = auth.uid()
  )
);

drop policy if exists "club verification insert own" on public.club_verification_requests;
create policy "club verification insert own"
on public.club_verification_requests
for insert
with check (
  exists (
    select 1
    from public.clubs c
    where c.id = club_verification_requests.club_id
      and c.owner_id = auth.uid()
  )
);

drop policy if exists "club verification update own" on public.club_verification_requests;
create policy "club verification update own"
on public.club_verification_requests
for update
using (
  status in ('draft', 'submitted')
  and exists (
    select 1
    from public.clubs c
    where c.id = club_verification_requests.club_id
      and c.owner_id = auth.uid()
  )
)
with check (
  status in ('draft', 'submitted')
  and payment_status = 'unpaid'
  and reviewer_id is null
  and reviewed_at is null
  and verified_until is null
  and exists (
    select 1
    from public.clubs c
    where c.id = club_verification_requests.club_id
      and c.owner_id = auth.uid()
  )
);

drop policy if exists "club verification admin select" on public.club_verification_requests;
create policy "club verification admin select"
on public.club_verification_requests
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.is_admin = true
  )
);

drop policy if exists "club verification admin update" on public.club_verification_requests;
create policy "club verification admin update"
on public.club_verification_requests
for update
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.is_admin = true
  )
)
with check (true);

create or replace view public.club_verification_requests_view
with (security_invoker = true) as
select
  r.*, 
  (r.verified_until > now()
    and r.status = 'approved'
    and r.payment_status in ('paid', 'waived')) as is_verified
from public.club_verification_requests r;

-- Storage policies

drop policy if exists "club verification certs insert" on storage.objects;
create policy "club verification certs insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'club-verification-certs'
  and exists (
    select 1
    from public.clubs c
    where c.id::text = split_part(name, '/', 1)
      and c.owner_id = auth.uid()
  )
);

drop policy if exists "club verification certs update" on storage.objects;
create policy "club verification certs update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'club-verification-certs'
  and exists (
    select 1
    from public.clubs c
    where c.id::text = split_part(name, '/', 1)
      and c.owner_id = auth.uid()
  )
);

drop policy if exists "club verification certs delete" on storage.objects;
create policy "club verification certs delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'club-verification-certs'
  and exists (
    select 1
    from public.clubs c
    where c.id::text = split_part(name, '/', 1)
      and c.owner_id = auth.uid()
  )
);

drop policy if exists "club verification certs admin read" on storage.objects;
create policy "club verification certs admin read"
on storage.objects
for select
using (
  bucket_id = 'club-verification-certs'
  and exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.is_admin = true
  )
);

commit;
