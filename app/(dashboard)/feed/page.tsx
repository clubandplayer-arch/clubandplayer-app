'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import FeedComposer from '@/components/feed/FeedComposer';
import TrackRetention from '@/components/analytics/TrackRetention';

// carico le sidebar in modo "sicuro" (se il componente esiste lo usa, altrimenti mostra un box vuoto)
// N.B. ssr: false evita problemi coi Server Components in prod
const ProfileMiniCard = dynamic(() => import('@/components/profiles/ProfileMiniCard'), {
  ssr: false,
  loading: () => <ProfileCardFallback />,
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
  media_url?: string | null;
  media_type?: 'image' | 'video' | null;
  media_aspect?: '16-9' | '9-16' | null;
};

async function fetchPosts(signal?: AbortSignal): Promise<FeedPost[]> {
  const res = await fetch('/api/feed/posts?limit=20', {
    credentials: 'include',
    cache: 'no-store',
    signal,
  });
  if (!res.ok) return [];
  const j = await res.json().catch(() => ({} as any));
  const arr = Array.isArray(j?.items ?? j?.data) ? (j.items ?? j.data) : [];
  return arr.map(normalizePost);
}

function normalizePost(p: any): FeedPost {
  const aspect = aspectFromUrl(p?.media_url);
  return {
    id: p.id,
    content: p.content ?? p.text ?? '',
    createdAt: p.created_at ?? p.createdAt ?? null,
    authorId: p.author_id ?? p.authorId ?? null,
    media_url: p.media_url ?? null,
    media_type: p.media_type ?? null,
    media_aspect: p.media_aspect ?? aspect ?? null,
  };
}

function aspectFromUrl(url?: string | null): '16-9' | '9-16' | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const raw = u.searchParams.get('aspect');
    if (raw === '16-9' || raw === '9-16') return raw;
    return null;
  } catch {
    return null;
  }
}

export default function FeedPage() {
  const [items, setItems] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const fetchCtrl = useRef<AbortController | null>(null);
  const headingId = 'feed-heading';

  async function reload() {
    if (fetchCtrl.current) fetchCtrl.current.abort();
    const controller = new AbortController();
    fetchCtrl.current = controller;
    setLoading(true);
    setErr(null);
    try {
      const data = await fetchPosts(controller.signal);
      setItems(data);
    } catch (e: any) {
      if (controller.signal.aborted) return;
      setErr(e?.message ?? 'Errore caricamento bacheca');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const idle =
      typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? (window as any).requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 120);
    const cancelIdle =
      typeof window !== 'undefined' && 'cancelIdleCallback' in window
        ? (window as any).cancelIdleCallback
        : clearTimeout;
    const handle = idle(() => void reload());
    return () => {
      cancelIdle(handle);
      fetchCtrl.current?.abort();
    };
  }, []);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const j = await res.json().catch(() => null);
        const id = j?.user?.id ?? null;
        setCurrentUserId(id);
      } catch {
        setCurrentUserId(null);
      }
    }
    void loadUser();
  }, []);

  function onPostUpdated(next: FeedPost) {
    setItems((prev) => prev.map((p) => (p.id === next.id ? { ...p, ...next } : p)));
  }

  function onPostDeleted(id: string) {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6" aria-labelledby={headingId}>
      {/* layout a 3 colonne: sx (minicard) / centro (composer + post) / dx (suggerimenti) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[20%_55%_25%]">
        {/* Colonna sinistra: mini profilo */}
        <aside className="space-y-4">
          <div className="space-y-3">
            {/* Se esiste, il componente reale rimpiazzerà questo blocco via dynamic() */}
            <ProfileMiniCard />
          </div>
          <MyMediaHub currentUserId={currentUserId} posts={items} />
        </aside>

        {/* Colonna centrale: composer + feed */}
        <main className="space-y-4" aria-labelledby={headingId}>
          <TrackRetention scope="feed" />
          <div>
            <h1 id={headingId} className="feed-title text-3xl md:text-4xl">
              BACHECA
            </h1>
            <p className="text-sm text-gray-600">
              Condividi aggiornamenti con club e atleti. Tutti i campi sono accessibili anche da tastiera.
            </p>
          </div>
          <FeedComposer onPosted={reload} />

          <div className="space-y-4" aria-live="polite" aria-busy={loading}>
            {loading && (
              <div className="glass-panel p-4" role="status">
                Caricamento…
              </div>
            )}
            {err && (
              <div className="glass-panel p-4 text-red-600" role="alert">
                {err}
              </div>
            )}
            {!loading && !err && items.length === 0 && (
              <div className="glass-panel p-4 text-sm text-gray-600" role="status">
                Nessun post ancora.
              </div>
            )}
            {!loading &&
              !err &&
              items.map((p) => (
                <PostItem
                  key={p.id}
                  post={p}
                  currentUserId={currentUserId}
                  onUpdated={onPostUpdated}
                  onDeleted={onPostDeleted}
                />
              ))}
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
    <div className="glass-panel">
      {title ? (
        <div className="px-4 py-3 text-sm font-semibold">{title}</div>
      ) : null}
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function ProfileCardFallback() {
  return (
    <div className="glass-panel p-4">
      <div className="flex items-start gap-3">
        <div className="h-24 w-[4.8rem] flex-shrink-0 animate-pulse rounded-xl bg-gray-200" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

function MyMediaHub({
  currentUserId,
  posts,
}: {
  currentUserId: string | null;
  posts: FeedPost[];
}) {
  const [tab, setTab] = useState<'video' | 'image'>('video');

  const { videos, photos } = useMemo(() => {
    const mine = posts.filter((p) => p.authorId && p.authorId === currentUserId);
    const vids = mine.filter((p) => p.media_type === 'video' && p.media_url).slice(0, 3);
    const imgs = mine.filter((p) => p.media_type === 'image' && p.media_url).slice(0, 3);
    return { videos: vids, photos: imgs };
  }, [posts, currentUserId]);

  if (!currentUserId) return null;

  return (
    <div className="glass-panel">
      <div className="flex items-center justify-between px-4 py-3 text-sm font-semibold">
        <span>MyMedia</span>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            className={`rounded-full px-3 py-1 ${tab === 'video' ? 'bg-gray-900 text-white' : 'bg-white/60'}`}
            onClick={() => setTab('video')}
          >
            MyVideo
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 ${tab === 'image' ? 'bg-gray-900 text-white' : 'bg-white/60'}`}
            onClick={() => setTab('image')}
          >
            MyPhoto
          </button>
        </div>
      </div>
      <div className="px-4 pb-4">
        {tab === 'video' ? (
          <MediaPreviewGrid
            emptyLabel="Non hai ancora video"
            items={videos}
            linkHref="/feed?section=my-videos"
          />
        ) : (
          <MediaPreviewGrid
            emptyLabel="Non hai ancora foto"
            items={photos}
            linkHref="/feed?section=my-photos"
          />
        )}
      </div>
    </div>
  );
}

function MediaPreviewGrid({
  items,
  emptyLabel,
  linkHref,
}: {
  items: FeedPost[];
  emptyLabel: string;
  linkHref: string;
}) {
  if (!items || items.length === 0) {
    return <div className="text-xs text-gray-600">{emptyLabel}</div>;
  }

  return (
    <div className="space-y-2 text-xs text-gray-700">
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => (
          <Link key={item.id} href={linkHref} className="group block overflow-hidden rounded-lg border bg-white/70">
            {item.media_type === 'video' ? (
              <div className={`w-full ${item.media_aspect === '9-16' ? 'aspect-[9/16]' : 'aspect-[16/9]'}`}>
                <video
                  src={item.media_url ?? undefined}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                  controls={false}
                />
              </div>
            ) : (
              <img
                src={item.media_url ?? ''}
                alt="Anteprima"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            )}
          </Link>
        ))}
      </div>
      <Link href={linkHref} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
        Vedi tutti
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}

function PostItem({
  post,
  currentUserId,
  onUpdated,
  onDeleted,
}: {
  post: FeedPost;
  currentUserId: string | null;
  onUpdated?: (next: FeedPost) => void;
  onDeleted?: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(post.content ?? post.text ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOwner = currentUserId != null && post.authorId === currentUserId;
  const editAreaId = `post-edit-${post.id}`;
  const errorId = error ? `post-error-${post.id}` : undefined;

  useEffect(() => {
    if (!editing) setText(post.content ?? post.text ?? '');
  }, [post, editing]);

  async function saveEdit() {
    const payload = text.trim();
    if (!payload) {
      setError('Il testo è obbligatorio');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/feed/posts/${post.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: payload }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.item) throw new Error(json?.error || 'Salvataggio fallito');
      onUpdated?.(normalizePost(json.item));
      setEditing(false);
    } catch (e: any) {
      setError(e?.message || 'Errore');
    } finally {
      setSaving(false);
    }
  }

  async function deletePost() {
    if (!confirm('Eliminare il post?')) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/feed/posts/${post.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Eliminazione fallita');
      onDeleted?.(post.id);
    } catch (e: any) {
      setError(e?.message || 'Errore');
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="glass-panel p-4">
      <div className="text-xs text-gray-500">
        {post.createdAt ? new Date(post.createdAt).toLocaleString() : '—'}
      </div>
      {editing ? (
        <div className="mt-2 space-y-2">
          <label htmlFor={editAreaId} className="sr-only">
            Modifica il contenuto del post
          </label>
          <textarea
            id={editAreaId}
            className="w-full resize-y rounded-lg border px-3 py-2 text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            disabled={saving}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={saveEdit}
              disabled={saving}
              className="rounded-lg bg-gray-900 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Salvataggio…' : 'Salva'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
                setText(post.content ?? post.text ?? '');
              }}
              className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
              disabled={saving}
            >
              Annulla
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-1 whitespace-pre-wrap text-sm">
          {post.content || '—'}
        </div>
      )}
      {post.media_url ? (
        <div
          className={`mt-3 overflow-hidden rounded-xl border bg-neutral-50 ${
            post.media_type === 'video'
              ? post.media_aspect === '9-16'
                ? 'aspect-[9/16]'
                : 'aspect-[16/9]'
              : ''
          }`}
        >
          {post.media_type === 'video' ? (
            <video src={post.media_url} controls className="h-full w-full object-cover" />
          ) : (
            <img src={post.media_url} alt="Allegato" className="max-h-96 w-full object-cover" />
          )}
        </div>
      ) : null}
      {isOwner ? (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg border px-2 py-1 hover:bg-gray-50"
              disabled={saving}
            >
              Modifica
            </button>
          )}
          <button
            type="button"
            onClick={deletePost}
            className="rounded-lg border px-2 py-1 text-red-600 hover:bg-red-50"
            disabled={saving}
          >
            Elimina
          </button>
        </div>
      ) : null}
      {error ? (
        <div id={errorId} className="mt-2 text-xs text-red-600" role="status">
          {error}
        </div>
      ) : null}
    </article>
  );
}
