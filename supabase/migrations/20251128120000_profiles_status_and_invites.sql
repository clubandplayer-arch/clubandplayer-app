-- Gestione stato profili (pending/active/rejected) + tabella email pre-approvate
begin;

-- Colonna di stato sui profili
alter table if exists public.profiles
  add column if not exists status text not null default 'pending';

-- vincolo sugli stati ammessi
alter table if exists public.profiles
  drop constraint if exists profiles_status_check;
alter table if exists public.profiles
  add constraint profiles_status_check check (status in ('pending','active','rejected'));

-- Tabella email pre-approvate per attivare direttamente l'account
create table if not exists public.preapproved_emails (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role_hint text,
  created_at timestamptz not null default now()
);
comment on column public.preapproved_emails.role_hint is 'Suggerimento ruolo (athlete/club) opzionale per auto-onboarding';

-- RLS per la tabella preapproved_emails: lettura solo per la stessa email (case-insensitive)
alter table if exists public.preapproved_emails enable row level security;
drop policy if exists "preapproved_emails select own" on public.preapproved_emails;
create policy "preapproved_emails select own"
on public.preapproved_emails
for select
using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- RLS profili: impedisce ai normali utenti di cambiare lo status; policy dedicata per admin
alter table if exists public.profiles enable row level security;
drop policy if exists "profiles update self" on public.profiles;
create policy "profiles update self"
on public.profiles
for update
using (
  user_id = auth.uid()
  and (
    status = old.status
    or (
      old.status = 'pending'
      and status = 'active'
      and exists(
        select 1 from public.preapproved_emails p
        where lower(p.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
    )
  )
)
with check (
  user_id = auth.uid()
  and (
    status = old.status
    or (
      old.status = 'pending'
      and status = 'active'
      and exists(
        select 1 from public.preapproved_emails p
        where lower(p.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
    )
  )
);

drop policy if exists "profiles update admin" on public.profiles;
create policy "profiles update admin"
on public.profiles
for update
using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true))
with check (true);

commit;
