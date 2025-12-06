-- Crea tabella per endorsement sulle competenze profilo
create table if not exists public.profile_skill_endorsements (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  endorser_profile_id uuid not null references public.profiles (id) on delete cascade,
  skill_name text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint profile_skill_endorsements_pkey primary key (profile_id, endorser_profile_id, skill_name)
);

create index if not exists profile_skill_endorsements_profile_idx
  on public.profile_skill_endorsements (profile_id);

create index if not exists profile_skill_endorsements_endorser_idx
  on public.profile_skill_endorsements (endorser_profile_id);

create index if not exists profile_skill_endorsements_skill_idx
  on public.profile_skill_endorsements (skill_name);

alter table public.profile_skill_endorsements enable row level security;

-- Lettura aperta (conteggi pubblici)
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profile_skill_endorsements'
      and policyname = 'Anyone can read skill endorsements'
  ) then
    create policy "Anyone can read skill endorsements"
      on public.profile_skill_endorsements
      for select
      using ( true );
  end if;
end $$;

-- Inserimento consentito solo all'endorser stesso
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profile_skill_endorsements'
      and policyname = 'Endorser can insert their own endorsements'
  ) then
    create policy "Endorser can insert their own endorsements"
      on public.profile_skill_endorsements
      for insert
      with check ( auth.uid() = endorser_profile_id );
  end if;
end $$;

-- Cancellazione consentita solo all'endorser stesso
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profile_skill_endorsements'
      and policyname = 'Endorser can delete their own endorsements'
  ) then
    create policy "Endorser can delete their own endorsements"
      on public.profile_skill_endorsements
      for delete
      using ( auth.uid() = endorser_profile_id );
  end if;
end $$;
