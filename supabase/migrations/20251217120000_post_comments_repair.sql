-- Ensure post_comments table and policies are present for comment insertion
DO $$
BEGIN
  IF to_regclass('public.post_comments') IS NULL THEN
    CREATE TABLE public.post_comments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
      author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      body text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      parent_comment_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE
    );
  END IF;
END $$;

-- Enforce RLS and recreate policies idempotently
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments FORCE ROW LEVEL SECURITY;

-- Drop existing policies to ensure consistent rules
DROP POLICY IF EXISTS post_comments_select ON public.post_comments;
DROP POLICY IF EXISTS post_comments_insert ON public.post_comments;
DROP POLICY IF EXISTS post_comments_update ON public.post_comments;
DROP POLICY IF EXISTS post_comments_delete ON public.post_comments;

-- Anyone can read comments (feed/public pages)
CREATE POLICY post_comments_select ON public.post_comments
  FOR SELECT
  USING (true);

-- Only authenticated users can write/manage their own comments
CREATE POLICY post_comments_insert ON public.post_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY post_comments_update ON public.post_comments
  FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY post_comments_delete ON public.post_comments
  FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- Helpful index for fetching comments by post
CREATE INDEX IF NOT EXISTS idx_post_comments_post_created_at ON public.post_comments (post_id, created_at DESC);
