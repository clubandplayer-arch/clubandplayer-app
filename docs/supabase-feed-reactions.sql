-- Schema proposto per le reazioni ai post del feed (da eseguire manualmente in Supabase)
-- Versione emoji stile Facebook: like, love, care, angry

-- Crea la tabella delle reazioni
create table if not exists public.post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('like', 'love', 'care', 'angry')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Evita più reazioni per utente/post
create unique index if not exists post_reactions_post_user_uidx on public.post_reactions (post_id, user_id);
create index if not exists post_reactions_post_reaction_idx on public.post_reactions (post_id, reaction);

-- Trigger per aggiornare updated_at
create or replace function public.trigger_set_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_timestamp_on_post_reactions on public.post_reactions;
create trigger set_timestamp_on_post_reactions
before update on public.post_reactions
for each row
execute function public.trigger_set_timestamp();

-- Policy RLS suggerite (abilitare RLS sulla tabella prima di applicarle)
-- alter table public.post_reactions enable row level security;
-- create policy "reactions_select" on public.post_reactions
--   for select using (auth.uid() is not null);
-- create policy "reactions_manage_self" on public.post_reactions
--   for all using (user_id = auth.uid()) with check (user_id = auth.uid());
