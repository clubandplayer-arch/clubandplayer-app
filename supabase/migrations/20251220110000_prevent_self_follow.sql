-- Impedisci il self-follow e ripulisci righe esistenti
DO $$
BEGIN
  IF to_regclass('public.follows') IS NULL THEN
    RETURN;
  END IF;

  -- 1) Ripulisce eventuali self-follow esistenti
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'follows' AND column_name = 'follower_profile_id'
  ) THEN
    DELETE FROM public.follows WHERE follower_profile_id = target_profile_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'follows' AND column_name = 'follower_id'
  ) THEN
    DELETE FROM public.follows WHERE follower_id = target_id;
  END IF;

  -- 2) Vincoli CHECK contro il self-follow
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'follows' AND column_name = 'follower_profile_id'
  ) THEN
    ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_no_self_follow;
    ALTER TABLE public.follows ADD CONSTRAINT follows_no_self_follow CHECK (follower_profile_id <> target_profile_id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'follows' AND column_name = 'follower_id'
  ) THEN
    ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_no_self_follow_profiles;
    ALTER TABLE public.follows ADD CONSTRAINT follows_no_self_follow_profiles CHECK (follower_id <> target_id);
  END IF;

  -- 3) Policy di INSERT aggiornate con il vincolo anti self-follow
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'follows' AND column_name = 'follower_profile_id'
  ) THEN
    DROP POLICY IF EXISTS follows_insert ON public.follows;
    CREATE POLICY follows_insert ON public.follows
      FOR INSERT TO authenticated
      WITH CHECK (
        follower_profile_id <> target_profile_id
        AND EXISTS (
          SELECT 1 FROM public.profiles p WHERE p.id = follows.follower_profile_id AND p.user_id = auth.uid()
        )
      );
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'follows' AND column_name = 'follower_id'
  ) THEN
    DROP POLICY IF EXISTS follows_insert_profile ON public.follows;
    CREATE POLICY follows_insert_profile ON public.follows
      FOR INSERT TO authenticated
      WITH CHECK (
        follower_id <> target_id
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = follows.follower_id AND p.user_id = auth.uid() AND p.status = 'active'
        )
      );
  END IF;
END $$;
