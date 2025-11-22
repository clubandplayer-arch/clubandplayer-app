-- Migration manuale da eseguire su Supabase
-- Allinea le tabelle notifications e follows e introduce le reazioni ai post

-- 1) Colonna kind per le notifiche (usata per distinguere follow/dm/new_post...)
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS kind text;

-- Imposta un default neutro per le nuove notifiche
ALTER TABLE public.notifications
ALTER COLUMN kind SET DEFAULT 'system';

-- Opzionale: backfill per le notifiche esistenti senza kind
-- UPDATE public.notifications SET kind = 'system' WHERE kind IS NULL;

CREATE INDEX IF NOT EXISTS notifications_kind_recipient_idx
ON public.notifications (user_id, kind);


-- 2) Colonna target_id per follows (identifica il profilo seguito)
ALTER TABLE public.follows
ADD COLUMN IF NOT EXISTS target_id uuid;

-- Opzionale: se esiste una colonna club_id o profile_id usata storicamente, copiarla
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'follows' AND column_name = 'club_id'
  ) THEN
    UPDATE public.follows
    SET target_id = COALESCE(target_id, club_id)
    WHERE target_id IS NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'follows' AND column_name = 'profile_id'
  ) THEN
    UPDATE public.follows
    SET target_id = COALESCE(target_id, profile_id, target_id)
    WHERE target_id IS NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS follows_target_idx
ON public.follows (follower_id, target_id);


CREATE TABLE IF NOT EXISTS public.post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- attenzione: la tabella dei post si chiama "posts" nel progetto
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction text NOT NULL CHECK (reaction IN ('like', 'love', 'care', 'angry')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS post_reactions_post_user_uidx
ON public.post_reactions (post_id, user_id);

CREATE INDEX IF NOT EXISTS post_reactions_post_reaction_idx
ON public.post_reactions (post_id, reaction);

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_on_post_reactions ON public.post_reactions;
CREATE TRIGGER set_timestamp_on_post_reactions
BEFORE UPDATE ON public.post_reactions
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- RLS suggerite (da applicare manualmente se necessario):
-- enable row level security on public.post_reactions;
-- create policy "Allow authenticated read reactions" on public.post_reactions
--   for select using (auth.uid() IS NOT NULL);
-- create policy "Users manage their reactions" on public.post_reactions
--   for all using (user_id = auth.uid()) with check (user_id = auth.uid());
