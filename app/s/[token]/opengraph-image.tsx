import { ImageResponse } from 'next/og';
import { headers } from 'next/headers';
import type { FeedPost } from '@/components/feed/postShared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const alt = 'Anteprima post condiviso Club & Player';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

type ShareApiResponse =
  | { ok: true; post: FeedPost }
  | { ok: false; message?: string };

const DEFAULT_DESCRIPTION = 'Club & Player App';

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

function excerpt(text?: string | null, max = 220) {
  if (!text) return DEFAULT_DESCRIPTION;
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return DEFAULT_DESCRIPTION;
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1).trimEnd()}…`;
}

async function fetchSharedPost(token: string): Promise<ShareApiResponse> {
  const baseUrl = await resolveBaseUrl();
  const res = await fetch(`${baseUrl}/api/share-links/${token}`, { cache: 'no-store' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    return { ok: false, message: 'Link non valido.' };
  }
  return json as ShareApiResponse;
}

export default async function OpengraphImage({ params }: { params: { token?: string } }) {
  const token = params.token?.trim();
  const postData = token ? await fetchSharedPost(token) : { ok: false as const };

  const author = postData.ok
    ? postData.post.author_display_name?.trim() || 'Autore Club & Player'
    : 'Club & Player';
  const text = postData.ok
    ? excerpt(postData.post.content ?? postData.post.event_payload?.description ?? null)
    : DEFAULT_DESCRIPTION;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px',
          background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 55%, #334155 100%)',
          color: '#f8fafc',
          fontFamily: 'Inter, ui-sans-serif, system-ui',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.12)',
              padding: '8px 16px',
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: '-0.02em',
            }}
          >
            Club&Player
          </div>
          <div
            style={{
              fontSize: 44,
              lineHeight: 1.22,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              display: '-webkit-box',
              WebkitLineClamp: 5,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {text}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: 22, opacity: 0.8 }}>Post condiviso da</div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {author}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
