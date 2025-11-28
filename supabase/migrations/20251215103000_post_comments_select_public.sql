-- Ensure post_comments select is available to authenticated and anon users for feed readability
DO $$
BEGIN
  IF to_regclass('public.post_comments') IS NOT NULL THEN
    ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.post_comments FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS post_comments_select ON public.post_comments;

    CREATE POLICY post_comments_select ON public.post_comments
      FOR SELECT
      TO PUBLIC
      USING (true);
  END IF;
END $$;
