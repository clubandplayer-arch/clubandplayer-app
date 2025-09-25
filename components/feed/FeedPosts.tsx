'use client';

import { useEffect, useState } from 'react';

type Post = {
  id: string;
  text: string;
  createdAt: string; // ISO
};

export default function FeedPosts() {
  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let unsub = () => {};

    (async () => {
      await load();
      // ascolta post creati dal Composer
      const onCreated = (e: any) => {
        const post: Post | undefined = e?.detail;
        if (post?.id) {
          setItems((prev) => [post, ...prev]);
        }
      };
      window.addEventListener('feed-post-created', onCreated as EventListener);
      unsub = () => window.removeEventListener('feed-post-created', onCreated as EventListener);
    })();

    return () => unsub();
  }, []);

  async function load() {
    try {
      setErr(null);
      setLoading(true);
      const r = await fetch('/api/feed/posts', { credentials: 'include', cache: 'no-store' });
      const data = await r.json().catch(() => ({}));
      const list: Post[] = Array.isArray(data?.items) ? data.items : [];
      setItems(list);
    } catch (e: any) {
      setErr(e?.message || 'Errore inatteso');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          📣 Post recenti
        </div>
        <ul className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <li key={i} className="rounded-lg border p-3 dark:border-neutral-800">
              <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (err) {
    return (
      <section className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          📣 Post recenti
        </div>
        <div className="rounded-lg border border-dashed p-4 text-sm text-red-600 dark:border-neutral-800">
          Errore: {err}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
        📣 Post recenti
      </div>
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-neutral-500 dark:border-neutral-800">
          Ancora nessun post. Scrivi il primo!
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((p) => (
            <li key={p.id} className="rounded-lg border p-3 dark:border-neutral-800">
              <div className="text-sm whitespace-pre-wrap text-neutral-800 dark:text-neutral-100">
                {p.text}
              </div>
              <div className="mt-2 text-xs text-neutral-500">
                {new Date(p.createdAt).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
