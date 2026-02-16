import Link from 'next/link';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { ReadOnlyPostCard } from '@/components/feed/ReadOnlyPostCard';
import type { FeedPost } from '@/components/feed/postShared';

export const dynamic = 'force-dynamic';

async function resolveBaseUrl() {
  const headerList = await headers();
  const host = headerList.get('host');
  const proto = headerList.get('x-forwarded-proto') ?? 'https';
  if (host) {
    return `${proto}://${host}`;
  }
  const fallback =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://www.clubandplayer.com');
  return fallback.replace(/\/+$/, '');
}

type ShareApiResponse =
  | { ok: true; post: FeedPost }
  | { ok: false; message?: string };

const FALLBACK_OG_IMAGE = '/og.jpg';
const DEFAULT_OG_TITLE = 'Club & Player';
const DEFAULT_OG_DESCRIPTION = 'Club & Player App';
const PUBLIC_SITE_URL = 'https://www.clubandplayer.com';
const SUPABASE_PUBLIC_STORAGE_PATH = '/storage/v1/object/public/';

function asAbsoluteUrl(base: string, value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return `${base}${value}`;
  return `${base}/${value}`;
}

function toFirstPartyStorageUrl(base: string, value: string) {
  const absolute = asAbsoluteUrl(base, value);
  const marker = `${SUPABASE_PUBLIC_STORAGE_PATH}`;
  const storageIndex = absolute.toLowerCase().indexOf(marker);
  if (storageIndex === -1) return absolute;

  const assetWithQuery = absolute.slice(storageIndex + marker.length);
  const [publicAssetPath, query = ''] = assetWithQuery.split('?');
  if (!publicAssetPath) return absolute;

  return `${base}/storage/${publicAssetPath}${query ? `?${query}` : ''}`;
}

function excerpt(text?: string | null, max = 180) {
  if (!text) return DEFAULT_OG_DESCRIPTION;
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return DEFAULT_OG_DESCRIPTION;
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1).trimEnd()}…`;
}


function isImageUrl(value?: string | null) {
  if (!value) return false;
  const pathname = value.split('?')[0]?.toLowerCase() ?? '';
  return /\.(jpg|jpeg|png|webp|gif|avif)$/.test(pathname);
}

function resolveOgImage(post: FeedPost, publicBaseUrl: string, fallbackImage: string) {
  const firstMedia = post.media?.[0] ?? null;
  if (!firstMedia) return fallbackImage;

  if (firstMedia.media_type === 'video') {
    const poster = firstMedia.poster_url ?? firstMedia.posterUrl;
    if (poster && isImageUrl(poster)) {
      return toFirstPartyStorageUrl(publicBaseUrl, poster);
    }

    const authorAvatar = post.author_avatar_url;
    if (authorAvatar && isImageUrl(authorAvatar)) {
      return toFirstPartyStorageUrl(publicBaseUrl, authorAvatar);
    }

    return fallbackImage;
  }

  if (firstMedia.media_type === 'image') {
    const imageCandidate = firstMedia.url ?? firstMedia.poster_url ?? firstMedia.posterUrl;
    if (imageCandidate && isImageUrl(imageCandidate)) {
      return toFirstPartyStorageUrl(publicBaseUrl, imageCandidate);
    }
  }

  return fallbackImage;
}

function metadataTitle(post: FeedPost) {
  const author = post.author_display_name?.trim();
  return author ? `Post condiviso — ${author}` : 'Post condiviso — Club & Player';
}

async function fetchSharedPost(token: string): Promise<ShareApiResponse> {
  const baseUrl = await resolveBaseUrl();
  const res = await fetch(`${baseUrl}/api/share-links/${token}`, { cache: 'no-store' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    if (res.status === 410) {
      return { ok: false, message: 'Link scaduto o revocato.' };
    }
    if (res.status === 404 || res.status === 400) {
      return { ok: false, message: 'Link non valido.' };
    }
    return { ok: false, message: 'Errore temporaneo. Riprova più tardi.' };
  }
  return json as ShareApiResponse;
}

export async function generateMetadata({ params }: { params: { token?: string } }): Promise<Metadata> {
  const { token: rawToken } = params;
  const token = rawToken?.trim();
  const publicBaseUrl = PUBLIC_SITE_URL;
  const url = token ? `${publicBaseUrl}/s/${token}` : `${publicBaseUrl}/s`;
  const fallbackImage = asAbsoluteUrl(publicBaseUrl, FALLBACK_OG_IMAGE);

  if (!token) {
    return {
      title: DEFAULT_OG_TITLE,
      description: DEFAULT_OG_DESCRIPTION,
      openGraph: {
        title: DEFAULT_OG_TITLE,
        description: DEFAULT_OG_DESCRIPTION,
        url,
        images: [{ url: fallbackImage }],
      },
      twitter: {
        card: 'summary_large_image',
        title: DEFAULT_OG_TITLE,
        description: DEFAULT_OG_DESCRIPTION,
        images: [fallbackImage],
      },
    };
  }

  const data = await fetchSharedPost(token);
  if (!data.ok) {
    return {
      title: DEFAULT_OG_TITLE,
      description: DEFAULT_OG_DESCRIPTION,
      openGraph: {
        title: DEFAULT_OG_TITLE,
        description: DEFAULT_OG_DESCRIPTION,
        url,
        images: [{ url: fallbackImage }],
      },
      twitter: {
        card: 'summary_large_image',
        title: DEFAULT_OG_TITLE,
        description: DEFAULT_OG_DESCRIPTION,
        images: [fallbackImage],
      },
    };
  }

  const post = data.post;
  const title = metadataTitle(post);
  const description = excerpt(post.content ?? post.event_payload?.description ?? null);
  const ogImage = resolveOgImage(post, publicBaseUrl, fallbackImage);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      images: [{ url: ogImage }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function SharedPostPage({ params }: { params: { token?: string } }) {
  const { token: rawToken } = params;
  const token = rawToken?.trim();
  if (!token) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <div className="glass-panel p-4 text-sm text-neutral-700">Link di condivisione non valido.</div>
      </div>
    );
  }

  const data = await fetchSharedPost(token);

  if (!data.ok) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <div className="glass-panel space-y-2 p-4 text-sm text-neutral-700">
          <p>{data.message || 'Link non valido o scaduto.'}</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/login"
              className="rounded-md border px-3 py-1.5 text-sm font-semibold text-[var(--brand)] hover:bg-neutral-50"
            >
              Accedi
            </Link>
            <Link href="/signup" className="rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50">
              Registrati
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-xl font-bold text-neutral-900">Post condiviso</h1>
      <ReadOnlyPostCard post={data.post} />
      <div className="rounded-xl border border-slate-100 bg-white p-4 text-sm text-neutral-700 shadow-sm">
        <p className="font-semibold text-neutral-900">Vuoi interagire con il post?</p>
        <p className="mt-1">Accedi o registrati per mettere like, commentare o seguire l'autore.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/login"
            className="rounded-md border px-3 py-1.5 text-sm font-semibold text-[var(--brand)] hover:bg-neutral-50"
          >
            Accedi
          </Link>
          <Link href="/signup" className="rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50">
            Registrati
          </Link>
        </div>
      </div>
    </div>
  );
}
