'use client';

import { useEffect, useState } from 'react';

type ApiItem = {
  id: string;
  text?: string;
  content?: string;
  createdAt?: string;
  created_at?: string;
  authorId?: string | null;
  author_id?: string | null;
};

export default function FeedPosts() {
  const [items, setItems] = useState<ApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/feed/posts?limit=50', { cache: 'no-store' });
        const json = await res.json();
        if (!active) return;

        if (!res.ok || json?.ok === false) {
          throw new Error(json?.error || 'api_error');
        }

        const arr: ApiItem[] = Array.isArray(json?.items) ? json.items : [];
        setItems(arr);
        setErr(null);
      } catch (e: any) {
        setErr(e?.message ?? 'api_error');
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  if (loading) return <div>Caricamento…</div>;
  if (err) return <div>Errore: {err}</div>;
  if (!items.length) return <div>Nessun post al momento.</div>;

  return (
    <ul className="space-y-4">
      {items.map((it) => {
        const text = it.text ?? it.content ?? '';
        const when = it.createdAt ?? it.created_at ?? '';
        return (
          <li key={it.id} className="rounded-xl border p-4">
            <div className="text-sm opacity-60">
              {when ? new Date(when).toLocaleString() : '—'}
            </div>
            <div className="mt-1 whitespace-pre-wrap">{text}</div>
          </li>
        );
      })}
    </ul>
  );
}
