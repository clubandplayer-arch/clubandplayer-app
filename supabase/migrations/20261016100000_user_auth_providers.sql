-- Track social providers linked to each auth user (safe account-linking support)
create table if not exists public.user_auth_providers (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google', 'apple')),
  provider_user_id text,
  email text,
  email_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_sign_in_at timestamptz,
  constraint user_auth_providers_pkey primary key (user_id, provider)
);

create unique index if not exists user_auth_providers_provider_user_uidx
  on public.user_auth_providers(provider, provider_user_id)
  where provider_user_id is not null;

create index if not exists user_auth_providers_email_idx
  on public.user_auth_providers(lower(email))
  where email is not null;

alter table public.user_auth_providers enable row level security;

drop policy if exists "user_auth_providers_select_self" on public.user_auth_providers;
create policy "user_auth_providers_select_self"
on public.user_auth_providers
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "user_auth_providers_write_self" on public.user_auth_providers;
create policy "user_auth_providers_write_self"
on public.user_auth_providers
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.set_user_auth_providers_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_auth_providers_updated_at on public.user_auth_providers;
create trigger trg_user_auth_providers_updated_at
before update on public.user_auth_providers
for each row
execute function public.set_user_auth_providers_updated_at();
