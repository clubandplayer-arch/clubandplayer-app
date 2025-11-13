'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import FeedLatest from '@/components/feed/FeedLatest';
import WhoToFollow from '@/components/feed/WhoToFollow';
import FeedPosts from '@/components/feed/FeedPosts';
import ProfileMiniCard from '@/components/profiles/ProfileMiniCard';
import FeedComposer from '@/components/feed/FeedComposer';

type FeedPost = {
  id: string;
  content?: string;
  text?: string;
  created_at?: string | null;
  createdAt?: string | null;
  author_id?: string | null;
  authorId?: string | null;
};

async function fetchPosts(): Promise<FeedPost[]> {
  const res = await fetch('/api/feed/posts?limit=20', {
    credentials: 'include',
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const j = await res.json().catch(() => ({} as any));
  const arr = Array.isArray(j?.items ?? j?.data) ? (j.items ?? j.data) : [];
  return arr.map((p: any) => ({
    id: p.id,
    content: p.content ?? p.text ?? '',
    createdAt: p.created_at ?? p.createdAt ?? null,
    authorId: p.author_id ?? p.authorId ?? null,
  }));
}

export default function FeedPage() {
  const [items, setItems] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setErr(null);
    try {
      const data = await fetchPosts();
      setItems(data);
    } catch (e: any) {
      setErr(e?.message ?? 'Errore caricamento bacheca');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-4">
      <section className="mb-6">
        {/* Quando pubblico, ricarico la lista */}
        <FeedComposer onPosted={reload} />
      </section>

      {loading && <div>Caricamento…</div>}
      {err && <div className="text-red-600">{err}</div>}

      {!loading && !err && (
        <ul className="space-y-4">
          {items.map((p) => (
            <li key={p.id} className="rounded-xl border p-4">
              <div className="text-xs text-gray-500">
                {p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}
              </div>
              <div className="mt-1 whitespace-pre-wrap">{p.content || '—'}</div>
            </li>
          ))}
          {items.length === 0 && (
            <li className="text-sm text-gray-600">Nessun post ancora.</li>
          )}
        </ul>
      )}
    </div>
  );
}
