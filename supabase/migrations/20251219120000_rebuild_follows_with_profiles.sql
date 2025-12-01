-- Normalizza la tabella follows su ID profilo e ripristina le policy

-- Crea la tabella se non esiste già
CREATE TABLE IF NOT EXISTS public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  target_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('club','player')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, target_id)
);

-- Colonne canoniche
ALTER TABLE public.follows ADD COLUMN IF NOT EXISTS follower_id uuid;
ALTER TABLE public.follows ADD COLUMN IF NOT EXISTS target_id uuid;
ALTER TABLE public.follows ADD COLUMN IF NOT EXISTS target_type text;
ALTER TABLE public.follows ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Allinea gli ID a profili.id (da user_id, club_id, profile_id se presenti)
UPDATE public.follows f
SET follower_id = p.id
FROM public.profiles p
WHERE f.follower_id = p.user_id;

UPDATE public.follows f
SET target_id = p.id
FROM public.profiles p
WHERE f.target_id = p.user_id;

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
END $$;

-- Calcola target_type dal profilo collegato
UPDATE public.follows f
SET target_type = CASE WHEN p.account_type = 'club' THEN 'club' ELSE 'player' END
FROM public.profiles p
WHERE f.target_id = p.id
  AND (f.target_type IS NULL OR f.target_type NOT IN ('club','player'));

-- Ripulisce eventuali duplicati dopo il riallineamento
DELETE FROM public.follows a
USING public.follows b
WHERE a.ctid < b.ctid
  AND a.follower_id = b.follower_id
  AND a.target_id = b.target_id;

-- Vincoli canonici
ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_target_type_check;
ALTER TABLE public.follows ADD CONSTRAINT follows_target_type_check CHECK (target_type IN ('club','player'));

ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_follower_id_fkey;
ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_target_id_fkey;
ALTER TABLE public.follows
  ADD CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.follows
  ADD CONSTRAINT follows_target_id_fkey FOREIGN KEY (target_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_follower_id_target_id_target_type_key;
ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_follower_id_target_id_key;
ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_follower_target_unique;
ALTER TABLE public.follows
  ADD CONSTRAINT follows_follower_target_unique UNIQUE (follower_id, target_id);

ALTER TABLE public.follows ALTER COLUMN follower_id SET NOT NULL;
ALTER TABLE public.follows ALTER COLUMN target_id SET NOT NULL;
ALTER TABLE public.follows ALTER COLUMN target_type SET NOT NULL;

-- Indici utili per query e filtri
CREATE INDEX IF NOT EXISTS follows_follower_idx ON public.follows (follower_id);
CREATE INDEX IF NOT EXISTS follows_target_idx ON public.follows (target_id);
CREATE INDEX IF NOT EXISTS follows_target_type_idx ON public.follows (target_type);
CREATE INDEX IF NOT EXISTS follows_created_idx ON public.follows (created_at DESC);

-- RLS: follower o target possono leggere, solo il follower può inserire/cancellare
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS follows_select_self ON public.follows;
DROP POLICY IF EXISTS follows_insert_self ON public.follows;
DROP POLICY IF EXISTS follows_delete_self ON public.follows;
DROP POLICY IF EXISTS follows_manage ON public.follows;
DROP POLICY IF EXISTS follows_select_profile ON public.follows;
DROP POLICY IF EXISTS follows_insert_profile ON public.follows;
DROP POLICY IF EXISTS follows_delete_profile ON public.follows;

CREATE POLICY follows_select_profile ON public.follows
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = follower_id AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = target_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY follows_insert_profile ON public.follows
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = follower_id AND p.user_id = auth.uid() AND p.status = 'active'
    )
  );

CREATE POLICY follows_delete_profile ON public.follows
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = follower_id AND p.user_id = auth.uid()
    )
  );
