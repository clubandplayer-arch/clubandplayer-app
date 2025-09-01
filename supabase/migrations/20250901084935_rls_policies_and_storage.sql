-- RLS & storage policies (owner_id / user_id) + trigger owner_id default
-- SAFE TO RUN MULTIPLE TIMES: uses IF EXISTS / drops before creates
begin;

-- ====== CLUBS (owner-only) ======
alter table if exists public.clubs enable row level security;

drop policy if exists "clubs select own" on public.clubs;
drop policy if exists "clubs insert own" on public.clubs;
drop policy if exists "clubs update own" on public.clubs;
drop policy if exists "clubs delete own" on public.clubs;

create policy "clubs select own"
on public.clubs
for select
using (owner_id = auth.uid());

create policy "clubs insert own"
on public.clubs
for insert
with check (owner_id = auth.uid());

create policy "clubs update own"
on public.clubs
for update
using (owner_id = auth.uid());

create policy "clubs delete own"
on public.clubs
for delete
using (owner_id = auth.uid());

create index if not exists clubs_owner_idx on public.clubs(owner_id);

-- ====== SAVED_VIEWS (user-only) ======
alter table if exists public.saved_views enable row level security;

drop policy if exists "views select own" on public.saved_views;
drop policy if exists "views insert own" on public.saved_views;
drop policy if exists "views update own" on public.saved_views;
drop policy if exists "views delete own" on public.saved_views;

create policy "views select own"
on public.saved_views
for select
using (user_id = auth.uid());

create policy "views insert own"
on public.saved_views
for insert
with check (user_id = auth.uid());

create policy "views update own"
on public.saved_views
for update
using (user_id = auth.uid());

create policy "views delete own"
on public.saved_views
for delete
using (user_id = auth.uid());

create index if not exists saved_views_user_idx on public.saved_views(user_id);

-- ====== OPPORTUNITIES (owner_id) ======
-- Se la tabella non esiste o non ha owner_id, questo blocco fallirà: in tal caso allineare lo schema prima.
alter table if exists public.opportunities enable row level security;

drop policy if exists "opps select own" on public.opportunities;
drop policy if exists "opps insert own" on public.opportunities;
drop policy if exists "opps update own" on public.opportunities;
drop policy if exists "opps delete own" on public.opportunities;

create policy "opps select own"
on public.opportunities
for select
using (owner_id = auth.uid());

create policy "opps insert own"
on public.opportunities
for insert
with check (owner_id = auth.uid());

create policy "opps update own"
on public.opportunities
for update
using (owner_id = auth.uid());

create policy "opps delete own"
on public.opportunities
for delete
using (owner_id = auth.uid());

create index if not exists opportunities_owner_idx on public.opportunities(owner_id);

-- Trigger: se manca owner_id in INSERT, impostalo a auth.uid()
create or replace function public.set_owner_id_default()
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

drop trigger if exists trg_set_owner_id_default on public.opportunities;
create trigger trg_set_owner_id_default
before insert on public.opportunities
for each row
execute procedure public.set_owner_id_default();

-- ====== STORAGE: bucket 'club-logos' (scrittura solo propria cartella <uid>/...) ======
-- NB: cambiare 'club-logos' se il bucket ha un altro nome
drop policy if exists "logos insert own folder" on storage.objects;
drop policy if exists "logos update own folder" on storage.objects;
drop policy if exists "logos delete own folder" on storage.objects;

create policy "logos insert own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'club-logos'
  and position(auth.uid()::text || '/' in name) = 1
);

create policy "logos update own folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'club-logos'
  and position(auth.uid()::text || '/' in name) = 1
);

create policy "logos delete own folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'club-logos'
  and position(auth.uid()::text || '/' in name) = 1
);

commit;
