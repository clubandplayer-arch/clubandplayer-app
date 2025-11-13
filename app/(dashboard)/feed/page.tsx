'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import FeedComposer from '@/components/feed/FeedComposer';

// carico le sidebar in modo "sicuro" (se il componente esiste lo usa, altrimenti mostra un box vuoto)
// N.B. ssr: false evita problemi coi Server Components in prod
const ProfileMiniCard = dynamic(() => import('@/components/profiles/ProfileMiniCard'), {
  ssr: false,
  loading: () => <SidebarCard title="Il tuo profilo" />,
});

const WhoToFollow = dynamic(() => import('@/components/feed/WhoToFollow'), {
  ssr: false,
  loading: () => <SidebarCard title="Chi seguire" />,
});

const FollowedClubs = dynamic(() => import('@/components/feed/FollowedClubs'), {
  ssr: false,
  loading: () => <SidebarCard title="Club che segui" />,
});

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
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* layout a 3 colonne: sx (minicard) / centro (composer + post) / dx (suggerimenti) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[27%_46%_27%]">
        {/* Colonna sinistra: mini profilo */}
        <aside className="space-y-4">
          <SidebarCard title="Il tuo profilo">
            {/* Se esiste, il componente reale rimpiazzerà questo blocco via dynamic() */}
            <ProfileMiniCard />
          </SidebarCard>
        </aside>

        {/* Colonna centrale: composer + feed */}
        <main className="space-y-4">
          <div className="rounded-2xl border bg-white p-4">
            <FeedComposer onPosted={reload} />
          </div>

          <div className="space-y-4">
            {loading && <div className="rounded-2xl border p-4">Caricamento…</div>}
            {err && <div className="rounded-2xl border p-4 text-red-600">{err}</div>}
            {!loading && !err && items.length === 0 && (
              <div className="rounded-2xl border p-4 text-sm text-gray-600">
                Nessun post ancora.
              </div>
            )}
            {!loading &&
              !err &&
              items.map((p) => <PostItem key={p.id} post={p} />)}
          </div>
        </main>

        {/* Colonna destra: suggerimenti/annunci/club seguiti */}
        <aside className="space-y-4">
          <SidebarCard title="Chi seguire">
            <WhoToFollow />
          </SidebarCard>

          <SidebarCard title="Club che segui">
            <FollowedClubs />
          </SidebarCard>

          <SidebarCard title="In evidenza">
            {/* Qui in seguito collegheremo le “opportunità più viste” da Supabase */}
            <div className="text-sm text-gray-600">Prossimamente: opportunità in evidenza</div>
          </SidebarCard>
        </aside>
      </div>
    </div>
  );
}

/* ====== UI helpers ====== */

function SidebarCard({
  title,
  children,
}: {
  title?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white">
      {title ? (
        <div className="border-b px-4 py-3 text-sm font-semibold">{title}</div>
      ) : null}
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function PostItem({ post }: { post: FeedPost }) {
  return (
    <article className="rounded-2xl border bg-white p-4">
      <div className="text-xs text-gray-500">
        {post.createdAt ? new Date(post.createdAt).toLocaleString() : '—'}
      </div>
      <div className="mt-1 whitespace-pre-wrap text-sm">
        {post.content || '—'}
      </div>
    </article>
  );
}
