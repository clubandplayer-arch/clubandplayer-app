import Link from 'next/link';
import { PostClient } from './PostClient';
import { normalizePost, type FeedPost } from '@/components/feed/postShared';
import { getUserAndRole } from '@/lib/auth/role';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function PostPage({ params }: { params: { id: string } }) {
  const { supabase, user } = await getUserAndRole();
  const currentUserId = user?.id ?? null;

  const { data, error } = await supabase
    .from('posts')
    .select(
      `id, content, created_at, author_id, media_url, media_type, media_aspect, link_url, link_title, link_description, link_image, kind, event_payload, quoted_post:quoted_post_id (id, content, created_at, author_id, media_url, media_type, media_aspect, link_url, link_title, link_description, link_image, kind, event_payload), profiles:profiles!posts_author_id_fkey (full_name, avatar_url, account_type, type)`,
    )
    .eq('id', params.id)
    .maybeSingle();

  const author = (data as any)?.profiles ?? null;
  const normalized = data
    ? {
        ...data,
        author_name: author?.full_name ?? null,
        author_display_name: author?.full_name ?? null,
        author_avatar_url: author?.avatar_url ?? null,
      }
    : null;

  if (!data || !normalized) {
    const message = error && !currentUserId ? (
      <div className="glass-panel space-y-2 p-4 text-sm text-neutral-700">
        <p>Per vedere questo post devi accedere.</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/login" className="rounded-md border px-3 py-1.5 text-sm font-semibold text-[var(--brand)] hover:bg-neutral-50">
            Accedi
          </Link>
          <Link href="/signup" className="rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50">
            Registrati
          </Link>
        </div>
      </div>
    ) : (
      <div className="glass-panel p-4 text-sm text-neutral-700">Post non trovato.</div>
    );

    return (
      <div className="mx-auto max-w-3xl p-4">
        {message}
      </div>
    );
  }

  if (error && currentUserId) {
    const details = (error as any)?.message || 'Accesso negato';
    return (
      <div className="mx-auto max-w-3xl p-4">
        <div className="glass-panel space-y-2 p-4 text-sm text-neutral-700">
          <p>Il post esiste ma non puoi visualizzarlo.</p>
          <div className="text-xs text-neutral-500">Dettagli: {details}</div>
        </div>
      </div>
    );
  }

  const post = normalizePost(normalized) as FeedPost;

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
    .select('content, event_payload, media_url, media_type, link_image')
    .eq('id', params.id)
    .maybeSingle();

  const title = data?.event_payload?.title || data?.content || 'Post';
  const description = data?.content ? data.content.slice(0, 140) : undefined;
  const image = data?.link_image || data?.media_url || undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [{ url: image }] : undefined,
    },
  };
}
