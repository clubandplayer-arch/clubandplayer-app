// app/(dashboard)/feed/page.tsx
import Link from 'next/link';
import FeedComposer from '@/components/feed/FeedComposer';
// (se questi componenti esistono già nel repo, li teniamo. Se non esistono, puoi commentarli)
// import FollowedClubs from '@/components/feed/FollowedClubs';
// import WhoToFollow from '@/components/feed/WhoToFollow';

export const dynamic = 'force-dynamic';

type FeedPost = {
  id: string;
  content: string;
  created_at: string;
  author_id: string | null;
};

async function getPosts(): Promise<FeedPost[]> {
  const res = await fetch('/api/feed/posts', { cache: 'no-store', credentials: 'include' as any });
  const json = await res.json().catch(() => ({}));
  // accetta sia {data:[...]} che {items:[...]}
  const rows = (json?.data ?? json?.items ?? []) as FeedPost[];
  return Array.isArray(rows) ? rows : [];
}

async function FeedList() {
  const posts = await getPosts();

  if (!posts.length) {
    return (
      <div className="rounded-2xl border bg-white p-4 text-sm text-gray-500">
        Nessun post ancora. Scrivi il primo aggiornamento!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((p) => (
        <article key={p.id} className="rounded-2xl border bg-white p-4">
          <div className="text-xs text-gray-500">
            {new Date(p.created_at).toLocaleString()}
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm">{p.content}</p>
        </article>
      ))}
    </div>
  );
}

export default async function FeedPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Colonna sinistra: profilo rapido (markup leggero per non rompere) */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-sm font-semibold mb-2">Il tuo profilo</div>
            <div className="text-xs text-gray-600">
              Aggiorna i tuoi dati per farti trovare dai club.
            </div>
            <Link
              href="/profile"
              className="inline-block mt-3 text-xs rounded-lg border px-3 py-1 hover:bg-gray-50"
            >
              Modifica profilo
            </Link>
          </div>
          {/* Se avevi altri widget a sinistra, rimettili qui */}
        </aside>

        {/* Colonna centrale: composer + feed */}
        <main className="lg:col-span-2 space-y-4">
          <FeedComposer />
          <FeedList />
        </main>

        {/* Colonna destra: suggerimenti / trending */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-sm font-semibold mb-2">?? Trending</div>
            <div className="text-xs text-gray-600">Contenuti in arrivo.</div>
          </div>

          {/* Se nel tuo repo esistono, puoi riattivare: */}
          {/*
          <FollowedClubs />
          <WhoToFollow />
          */}
        </aside>
      </div>
    </div>
  );
}
