import { PostClient } from './PostClient';
import { normalizePost, type FeedPost } from '@/components/feed/postShared';
import { getUserAndRole } from '@/lib/auth/role';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const POST_SELECT_FULL =
  'id, content, created_at, author_id, media_url, media_type, media_aspect, link_url, kind, event_payload, quoted_post_id';
const POST_SELECT_FALLBACK =
  'id, content, created_at, author_id, media_url, media_type, link_url, kind, event_payload, quoted_post_id';

const IS_PRODUCTION = process.env.VERCEL_ENV === 'production';

type SupabaseLikeError = {
  message?: string;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
} | null;

function logSupabaseError(params: { id: string; step: string; error: SupabaseLikeError }) {
  const { id, step, error } = params;
  if (!error) return;
  console.error('[posts/:id] supabase error', {
    id,
    step,
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
  });
}

function debugLine(error: SupabaseLikeError) {
  if (IS_PRODUCTION || !error) return null;
  const code = error.code ?? '';
  const message = error.message ?? '';
  const line = `${code} ${message}`.trim();
  return line || null;
}

function ErrorPanel({ debug }: { debug?: string | null }) {
  return (
    <div className="mx-auto max-w-3xl p-4">
      <div className="glass-panel space-y-2 p-4 text-sm text-neutral-700">
        <p>Si è verificato un errore nel caricamento del post. Riprova più tardi.</p>
        {debug ? <p className="text-xs text-neutral-500">{debug}</p> : null}
      </div>
    </div>
  );
}

async function fetchPostWithFallback(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  id: string,
  stepPrefix: 'main' | 'quoted',
) {
  const full = await supabase.from('posts').select(POST_SELECT_FULL).eq('id', id).maybeSingle();
  if (full.error) {
    logSupabaseError({ id, step: `${stepPrefix}:select_full`, error: full.error as SupabaseLikeError });
  } else {
    return full;
  }

  const fallback = await supabase.from('posts').select(POST_SELECT_FALLBACK).eq('id', id).maybeSingle();
  if (fallback.error) {
    logSupabaseError({ id, step: `${stepPrefix}:select_fallback`, error: fallback.error as SupabaseLikeError });
    return full;
  }

  return fallback;
}

async function fetchPostWithFallbackAdmin(
  admin: NonNullable<ReturnType<typeof getSupabaseAdminClientOrNull>>,
  id: string,
  stepPrefix: 'main' | 'quoted',
) {
  const full = await admin.from('posts').select(POST_SELECT_FULL).eq('id', id).maybeSingle();
  if (full.error) {
    logSupabaseError({ id, step: `${stepPrefix}:admin_select_full`, error: full.error as SupabaseLikeError });
  } else {
    return full;
  }

  const fallback = await admin.from('posts').select(POST_SELECT_FALLBACK).eq('id', id).maybeSingle();
  if (fallback.error) {
    logSupabaseError({ id, step: `${stepPrefix}:admin_select_fallback`, error: fallback.error as SupabaseLikeError });
    return full;
  }

  return fallback;
}

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
    logSupabaseError({ id: params.id, step: 'admin:post_exists', error: adminError as SupabaseLikeError });
    return <ErrorPanel debug={debugLine(adminError as SupabaseLikeError)} />;
  }

  if (!adminData) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <div className="glass-panel p-4 text-sm text-neutral-700">Post non trovato.</div>
      </div>
    );
  }

  const { data, error } = !currentUserId && admin
    ? await fetchPostWithFallbackAdmin(admin, params.id, 'main')
    : await fetchPostWithFallback(supabase, params.id, 'main');

  if (error) {
    return <ErrorPanel debug={debugLine(error as SupabaseLikeError)} />;
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <div className="glass-panel space-y-2 p-4 text-sm text-neutral-700">
          <p>Non hai i permessi per visualizzare questo post.</p>
        </div>
      </div>
    );
  }

  const { data: authorProfile, error: authorError } = admin
    ? await admin
        .from('profiles')
        .select('id, full_name, avatar_url, account_type, type')
        .eq('user_id', data.author_id ?? adminData.author_id ?? '')
        .maybeSingle()
    : { data: null, error: null };

  if (authorError) {
    logSupabaseError({ id: params.id, step: 'author:profile_by_id', error: authorError as SupabaseLikeError });
  }

  let quotedPost: FeedPost | null = null;
  if (data.quoted_post_id) {
    const { data: quoted, error: quotedError } = !currentUserId && admin
      ? await fetchPostWithFallbackAdmin(admin, String(data.quoted_post_id), 'quoted')
      : await fetchPostWithFallback(supabase, String(data.quoted_post_id), 'quoted');
    if (quotedError) {
      logSupabaseError({ id: params.id, step: 'quoted:optional', error: quotedError as SupabaseLikeError });
    } else {
      quotedPost = quoted ? normalizePost(quoted) : null;
    }
  }

  const normalized = {
    ...data,
    quoted_post: quotedPost,
    author_profile_id: authorProfile?.id ?? null,
    author_account_type: authorProfile?.account_type ?? null,
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
  const { data, error } = await supabase
    .from('posts')
    .select('content, event_payload, media_url, media_type, link_url')
    .eq('id', params.id)
    .maybeSingle();

  if (error) {
    logSupabaseError({ id: params.id, step: 'metadata:main', error: error as SupabaseLikeError });
  }

  let postMeta = data ?? null;

  if (!postMeta) {
    const admin = getSupabaseAdminClientOrNull();
    const { data: adminData, error: adminMetaError } = admin
      ? await admin
          .from('posts')
          .select('content, event_payload, media_url, media_type, link_url')
          .eq('id', params.id)
          .maybeSingle()
      : { data: null, error: null };

    if (adminMetaError) {
      logSupabaseError({ id: params.id, step: 'metadata:admin', error: adminMetaError as SupabaseLikeError });
    }

    postMeta = adminData ?? null;
  }

  const title = postMeta?.event_payload?.title || postMeta?.content || 'Post';
  const description = postMeta?.content ? postMeta.content.slice(0, 140) : undefined;
  const image = postMeta?.media_url || undefined;
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
