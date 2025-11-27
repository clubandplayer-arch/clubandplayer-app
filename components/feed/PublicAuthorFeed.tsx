// components/feed/PublicAuthorFeed.tsx
'use client';

import { useEffect, useState } from 'react';

type FeedPost = {
  id: string;
  content?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  media_url?: string | null;
  media_type?: 'image' | 'video' | null;
  link_url?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

type Props = {
  authorId: string;
};

export default function PublicAuthorFeed({ authorId }: Props) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authorId) return;

    const abort = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/feed/posts?authorId=${encodeURIComponent(authorId)}`, {
          cache: 'no-store',
          credentials: 'include',
          signal: abort.signal,
        });
        if (!res.ok) throw new Error('Errore caricamento post');
        const json = await res.json().catch(() => ({}));
        const arr = Array.isArray(json?.items ?? json?.data) ? json.items ?? json.data : [];
        setPosts(arr as FeedPost[]);
      } catch (err: any) {
        if (!abort.signal.aborted) setError(err?.message || 'Errore caricamento bacheca');
      } finally {
        if (!abort.signal.aborted) setLoading(false);
      }
    }

    void load();

    return () => abort.abort();
  }, [authorId]);

  return (
    <div className="space-y-3">
      {loading && <div className="text-sm text-gray-600">Caricamento feed…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
      {!loading && !error && posts.length === 0 && (
        <div className="text-sm text-gray-600">Nessun contenuto pubblicato finora.</div>
      )}

      {posts.map((post) => {
        const createdAt = post.created_at || post.createdAt;
        return (
          <article
            key={post.id}
            className="space-y-2 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
          >
            <div className="text-xs text-neutral-500">{formatDate(createdAt)}</div>
            {post.content ? (
              <p className="whitespace-pre-wrap text-sm text-neutral-800">{post.content}</p>
            ) : null}
            {post.media_url && post.media_type === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.media_url}
                alt="Media del post"
                className="max-h-[320px] w-full rounded-lg object-cover"
              />
            ) : null}
            {post.media_url && post.media_type === 'video' ? (
              <video
                src={post.media_url}
                className="w-full rounded-lg"
                controls
                preload="metadata"
              />
            ) : null}
            {post.link_url ? (
              <a
                href={post.link_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 underline-offset-4 hover:underline"
              >
                {post.link_url}
              </a>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
