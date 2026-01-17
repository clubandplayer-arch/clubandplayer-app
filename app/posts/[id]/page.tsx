import Link from 'next/link';
import { PostClient } from './PostClient';
import { normalizePost, type FeedPost } from '@/components/feed/postShared';
import { getUserAndRole } from '@/lib/auth/role';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function baseUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://www.clubandplayer.com');
  return raw.replace(/\/+$/, '');
}

export default async function PostPage({ params }: { params: { id: string } }) {
  const { supabase, user } = await getUserAndRole();
  const currentUserId = user?.id ?? null;

  const admin = getSupabaseAdminClientOrNull();
  const { data: adminData, error: adminError } = admin
    ? await admin.from('posts').select('id, author_id').eq('id', params.id).maybeSingle()
    : { data: null, error: null };

  if (adminError) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <div className="glass-panel space-y-2 p-4 text-sm text-neutral-700">
          <p>Si è verificato un errore nel caricamento del post. Riprova più tardi.</p>
        </div>
      </div>
    );
  }

  if (!adminData) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <div className="glass-panel p-4 text-sm text-neutral-700">Post non trovato.</div>
      </div>
    );
  }

  const { data, error } = await supabase
    .from('posts')
    .select(
      `id, content, created_at, author_id, media_url, media_type, media_aspect, link_url, link_title, link_description, link_image, kind, event_payload, quoted_post_id`,
    )
    .eq('id', params.id)
    .maybeSingle();

  if (error) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <div className="glass-panel space-y-2 p-4 text-sm text-neutral-700">
          <p>Si è verificato un errore nel caricamento del post. Riprova più tardi.</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <div className="glass-panel space-y-2 p-4 text-sm text-neutral-700">
          {!currentUserId ? (
            <>
              <p>Per vedere questo post devi accedere.</p>
              <div className="flex flex-wrap gap-2">
                <Link href="/login" className="rounded-md border px-3 py-1.5 text-sm font-semibold text-[var(--brand)] hover:bg-neutral-50">
                  Accedi
                </Link>
                <Link href="/signup" className="rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50">
                  Registrati
                </Link>
              </div>
            </>
          ) : (
            <p>Non hai i permessi per visualizzare questo post.</p>
          )}
        </div>
      </div>
    );
  }

  const { data: authorProfile } = admin
    ? await admin
        .from('profiles')
        .select('full_name, avatar_url, account_type, type')
        .eq('id', data.author_id ?? adminData.author_id ?? '')
        .maybeSingle()
    : { data: null };

  let quotedPost: FeedPost | null = null;
  if (data.quoted_post_id) {
    const { data: quoted } = await supabase
      .from('posts')
      .select(
        'id, content, created_at, author_id, media_url, media_type, media_aspect, link_url, link_title, link_description, link_image, kind, event_payload',
      )
      .eq('id', data.quoted_post_id)
      .maybeSingle();
    quotedPost = quoted ? normalizePost(quoted) : null;
  }

  const normalized = {
    ...data,
    quoted_post: quotedPost,
    author_name: authorProfile?.full_name ?? null,
    author_display_name: authorProfile?.full_name ?? null,
    author_avatar_url: authorProfile?.avatar_url ?? null,
  };

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
  const ogImageUrl = image ? `${baseUrl()}/api/posts/${params.id}/og-image` : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ogImageUrl ? [{ url: ogImageUrl }] : undefined,
    },
    twitter: {
      card: ogImageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      images: ogImageUrl ? [ogImageUrl] : undefined,
    },
  };
}
