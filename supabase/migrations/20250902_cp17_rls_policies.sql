-- CP17: RLS & permessi su opportunities / clubs (+ index utili)
-- ATTENZIONE: presuppone colonne:
--   opportunities(owner_id uuid, created_at timestamptz)
--   clubs(owner_id uuid, created_at timestamptz)

begin;

-- ==============
-- OPPORTUNITIES
-- ==============

-- Abilita RLS
alter table if exists public.opportunities enable row level security;
alter table if exists public.opportunities force row level security;

-- Indice per ordinamenti recenti
create index if not exists idx_opportunities_created_at on public.opportunities(created_at desc);

-- Pulisci policy pre-esistenti (se rinominate, non fa errori)
drop policy if exists "opps_select_auth" on public.opportunities;
drop policy if exists "opps_insert_own" on public.opportunities;
drop policy if exists "opps_update_own" on public.opportunities;
drop policy if exists "opps_delete_own" on public.opportunities;

-- Lettura: tutti gli utenti autenticati possono vedere le opportunità
create policy "opps_select_auth"
on public.opportunities
for select
to authenticated
using (true);

-- Inserimento: solo se owner_id = auth.uid()
create policy "opps_insert_own"
on public.opportunities
for insert
to authenticated
with check (owner_id = auth.uid());

-- Update: solo il proprietario
create policy "opps_update_own"
on public.opportunities
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

-- Delete: solo il proprietario
create policy "opps_delete_own"
on public.opportunities
for delete
to authenticated
using (owner_id = auth.uid());

-- Trigger per autoimpostare owner_id = auth.uid() se non passato
create or replace function public.set_owner_from_auth()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.owner_id is null then
    new.owner_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_opportunities_set_owner on public.opportunities;
create trigger trg_opportunities_set_owner
before insert on public.opportunities
for each row
execute function public.set_owner_from_auth();

-- =========
-- CLUBS
-- =========

alter table if exists public.clubs enable row level security;
alter table if exists public.clubs force row level security;

create index if not exists idx_clubs_created_at on public.clubs(created_at desc);

drop policy if exists "clubs_select_auth" on public.clubs;
drop policy if exists "clubs_upsert_own" on public.clubs;

-- Lettura: autenticati
create policy "clubs_select_auth"
on public.clubs
for select
to authenticated
using (true);

-- Upsert/Update: proprietario
create policy "clubs_upsert_own"
on public.clubs
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

commit;
