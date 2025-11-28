import { PostClient } from './PostClient';
import { normalizePost, type FeedPost } from '@/components/feed/postShared';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function PostPage({ params }: { params: { id: string } }) {
  const supabase = await getSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const currentUserId = auth?.user?.id ?? null;

  const { data, error } = await supabase
    .from('posts')
    .select(
      `id, content, created_at, author_id, media_url, media_type, media_aspect, link_url, link_title, link_description, link_image, kind, event_payload`,
    )
    .eq('id', params.id)
    .maybeSingle();

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <div className="glass-panel p-4 text-sm text-neutral-700">Post non trovato.</div>
      </div>
    );
  }

  const post = normalizePost(data) as FeedPost;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="text-xl font-bold text-neutral-900">Post</h1>
      <PostClient post={post} currentUserId={currentUserId} />
    </div>
  );
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from('posts')
    .select('content, event_payload')
    .eq('id', params.id)
    .maybeSingle();

  const title = data?.event_payload?.title || data?.content || 'Post';

  return {
    title,
    openGraph: { title },
  };
}
