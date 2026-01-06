begin;

alter table if exists public.profiles enable row level security;

drop policy if exists "profiles public read" on public.profiles;
create policy "profiles public read"
on public.profiles
for select
to authenticated
using (true);

commit;
