'use client';

import { useEffect, useState } from 'react';

type Post = { id: string; text: string; createdAt: string };

export default function AthletePosts({ handle }: { handle: string }) {
  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        setLoading(true);
        const r = await fetch(`/api/athletes/${encodeURIComponent(handle)}/posts`, {
          cache: 'no-store',
          credentials: 'include',
        });
        const dj = await r.json().catch(() => ({}));
        const list: Post[] = Array.isArray(dj?.items) ? dj.items : [];
        setItems(list);
      } catch (e: any) {
        setErr(e?.message || 'Errore inatteso');
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [handle]);

  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">📣 Aggiornamenti</div>

      {loading ? (
        <ul className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <li key={i} className="rounded-lg border p-3 dark:border-neutral-800">
              <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
            </li>
          ))}
        </ul>
      ) : err ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-red-600 dark:border-neutral-800">
          Errore: {err}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-neutral-500 dark:border-neutral-800">
          Nessun post ancora.
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((p) => (
            <li key={p.id} className="rounded-lg border p-3 dark:border-neutral-800">
              <div className="whitespace-pre-wrap text-sm text-neutral-800 dark:text-neutral-100">{p.text}</div>
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
