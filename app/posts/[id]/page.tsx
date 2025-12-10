import Link from 'next/link';
import { PostClient } from './PostClient';
import { normalizePost, type FeedPost } from '@/components/feed/postShared';
import { getUserAndRole } from '@/lib/auth/role';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';

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
    const admin = getSupabaseAdminClientOrNull();
    const { data: adminData } = admin
      ? await admin.from('posts').select('id').eq('id', params.id).maybeSingle()
      : { data: null };
    const exists = Boolean(adminData);

    const message = !exists ? (
      <div className="glass-panel p-4 text-sm text-neutral-700">Post non trovato.</div>
    ) : !currentUserId ? (
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
      <div className="glass-panel space-y-2 p-4 text-sm text-neutral-700">
        <p>Il post esiste ma non puoi visualizzarlo.</p>
        {error ? <div className="text-xs text-neutral-500">Dettagli: {(error as any)?.message || 'Accesso negato'}</div> : null}
      </div>
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

  let postMeta = data ?? null;

  if (!postMeta) {
    const admin = getSupabaseAdminClientOrNull();
    const { data: adminData } = admin
      ? await admin
          .from('posts')
          .select('content, event_payload, media_url, media_type, link_image')
          .eq('id', params.id)
          .maybeSingle()
      : { data: null };
    postMeta = adminData ?? null;
  }

  const title = postMeta?.event_payload?.title || postMeta?.content || 'Post';
  const description = postMeta?.content ? postMeta.content.slice(0, 140) : undefined;
  const image = postMeta?.link_image || postMeta?.media_url || undefined;

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
