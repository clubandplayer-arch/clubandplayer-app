-- Migration da eseguire manualmente su Supabase (aggiusta notifiche/seguiti/reazioni)
-- Usa questa come unica migrazione ufficiale; quella del 20251007 è da considerarsi storica/obsoleta.

-- 1) Colonna kind per le notifiche
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS kind text DEFAULT 'system';

-- Colonna payload per allegare informazioni contestuali (JSON)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS payload jsonb;

-- Colonna read_at per gestire lo stato di lettura
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- Backfill opzionale per le notifiche esistenti prive di kind
UPDATE public.notifications
SET kind = COALESCE(kind, 'system')
WHERE kind IS NULL;

-- Indice utile per filtri per utente+tipo
CREATE INDEX IF NOT EXISTS notifications_user_kind_idx
  ON public.notifications (user_id, kind);

CREATE INDEX IF NOT EXISTS notifications_read_at_idx
  ON public.notifications (read_at);

-- 2) Colonna target_id per i follows (profilo seguito)
ALTER TABLE public.follows
  ADD COLUMN IF NOT EXISTS target_id uuid;

-- Colonna target_type per indicare se il target è club o player
ALTER TABLE public.follows
  ADD COLUMN IF NOT EXISTS target_type text;

-- Backfill opzionale dai campi legacy se presenti
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
  -- Backfill basilare per target_type se ci sono colonne legacy
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'follows' AND column_name = 'club_id'
  ) THEN
    UPDATE public.follows
    SET target_type = COALESCE(target_type, 'club')
    WHERE target_type IS NULL AND club_id IS NOT NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'follows' AND column_name = 'profile_id'
  ) THEN
    UPDATE public.follows
    SET target_type = COALESCE(target_type, 'player')
    WHERE target_type IS NULL AND profile_id IS NOT NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS follows_user_target_idx
  ON public.follows (follower_id, target_id);

CREATE INDEX IF NOT EXISTS follows_user_target_type_idx
  ON public.follows (follower_id, target_type);

CREATE TABLE IF NOT EXISTS public.post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- usa la tabella "posts" del feed esistente
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction text NOT NULL CHECK (reaction IN ('like','love','care','angry')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS post_reactions_post_user_uidx
  ON public.post_reactions (post_id, user_id);

CREATE INDEX IF NOT EXISTS post_reactions_post_reaction_idx
  ON public.post_reactions (post_id, reaction);

-- Trigger per updated_at
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

-- Abilita RLS e policy per consentire solo ai proprietari di gestire le loro reazioni
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'post_reactions' AND policyname = 'post_reactions_select_auth'
  ) THEN
    CREATE POLICY post_reactions_select_auth ON public.post_reactions
      FOR SELECT TO authenticated
      USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'post_reactions' AND policyname = 'post_reactions_manage_own'
  ) THEN
    CREATE POLICY post_reactions_manage_own ON public.post_reactions
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END$$;
