import Link from 'next/link';
import { headers } from 'next/headers';
import { ReadOnlyPostCard } from '@/components/feed/ReadOnlyPostCard';
import type { FeedPost } from '@/components/feed/postShared';

export const dynamic = 'force-dynamic';

async function resolveBaseUrl() {
  const headerList = await headers();
  const host = headerList.get('host');
  const proto = headerList.get('x-forwarded-proto') ?? 'http';
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

async function fetchSharedPost(token: string): Promise<ShareApiResponse> {
  const baseUrl = await resolveBaseUrl();
  const res = await fetch(`${baseUrl}/api/share-links/${token}`, { cache: 'no-store' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    return { ok: false, message: json?.message || 'Link non valido o scaduto' };
  }
  return json as ShareApiResponse;
}

export default async function SharedPostPage({ params }: { params: Promise<{ token?: string }> }) {
  const { token: rawToken } = await params;
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
