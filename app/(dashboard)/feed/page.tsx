'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import FeedLatest from '@/components/feed/FeedLatest';
import { toastError, toastInfo, toastSuccess } from '@/lib/toast';

type Role = 'club' | 'athlete' | 'guest';

type FeedPost = {
  id: string;
  text: string;
  createdAt: string; // ISO
  role: Exclude<Role, 'guest'>;
};

const MAX_CHARS = 500;

export default function FeedPage() {
  const [role, setRole] = useState<Role>('guest');

  // Composer state
  const [text, setText] = useState('');
  const [publishing, setPublishing] = useState(false);

  // Feed posts
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [errPosts, setErrPosts] = useState<string | null>(null);

  // whoami + carica post
  useEffect(() => {
    (async () => {
      try {
        // ruolo
        const r = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        const raw = (j?.role ?? '').toString().toLowerCase();
        setRole(raw === 'club' || raw === 'athlete' ? raw : 'guest');
      } catch {
        setRole('guest');
      }

      try {
        setLoadingPosts(true);
        setErrPosts(null);
        const r2 = await fetch('/api/feed/posts', { credentials: 'include', cache: 'no-store' });
        if (!r2.ok) throw new Error(`HTTP ${r2.status}`);
        const j2 = await r2.json().catch(() => ({}));
        const arr: FeedPost[] = Array.isArray(j2?.items) ? j2.items : [];
        setPosts(arr);
      } catch (e: any) {
        setErrPosts(e?.message || 'Errore caricamento feed');
        setPosts([]);
      } finally {
        setLoadingPosts(false);
      }
    })();
  }, []);

  const canPublish = role === 'club' || role === 'athlete';
  const remaining = MAX_CHARS - text.length;
  const tooLong = remaining < 0;
  const empty = text.trim().length === 0;

  async function publish() {
    if (!canPublish || publishing || empty || tooLong) return;
    setPublishing(true);
    try {
      const r = await fetch('/api/feed/posts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ text, role }), // ⟵ stub: API controlla comunque
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.ok !== true) {
        if (j?.error === 'rate_limited') {
          toastInfo('Rallenta un attimo prima di pubblicare di nuovo');
        } else if (j?.error === 'too_long') {
          toastError(`Testo troppo lungo (max ${j?.limit ?? MAX_CHARS} caratteri)`);
        } else if (j?.error === 'not_allowed') {
          toastError('Devi essere autenticato come club o atleta per pubblicare');
        } else {
          toastError('Pubblicazione non riuscita');
        }
        return;
      }
      const newPost: FeedPost | undefined = j?.item;
      if (newPost) {
        setPosts((prev) => [newPost, ...prev]);
      }
      setText('');
      toastSuccess('Pubblicato');
    } catch (e: any) {
      toastError(e?.message || 'Errore di rete');
    } finally {
      setPublishing(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      void publish();
    }
  }

  return (
    <main className="container mx-auto px-4 py-6">
      {/* Griglia tipo LinkedIn: 3 colonne su lg (3/6/3), singola colonna su mobile */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* SINISTRA */}
        <aside className="hidden lg:col-span-3 lg:flex lg:flex-col lg:gap-6">
          {/* Mini profilo (placeholder, niente props obbligatorie) */}
          <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-2 text-sm text-neutral-500">Il tuo profilo</div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-neutral-200" />
              <div className="min-w-0">
                <div className="truncate font-medium">Benvenuto!</div>
                <Link
                  href={role === 'club' ? '/club/profile' : '/profile'}
                  className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                >
                  Vai al profilo
                </Link>
              </div>
            </div>
          </div>

          {/* Azioni rapide per club */}
          {role === 'club' && (
            <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="mb-2 text-sm text-neutral-500">Azioni rapide</div>
              <div className="flex flex-col gap-2">
                <Link
                  href="/opportunities/new"
                  className="rounded-md border px-3 py-2 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  + Pubblica opportunità
                </Link>
                <Link
                  href="/club/applicants"
                  className="rounded-md border px-3 py-2 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  Vedi candidature
                </Link>
              </div>
            </div>
          )}
        </aside>

        {/* CENTRO */}
        <section className="flex flex-col gap-6 lg:col-span-6">
          {/* Composer abilitato */}
          <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-3 text-sm text-neutral-500">Condividi un aggiornamento</div>

            <textarea
              className="w-full rounded-xl border px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
              rows={3}
              placeholder={
                canPublish
                  ? 'Scrivi qualcosa… (Ctrl/Cmd + Invio per pubblicare)'
                  : 'Accedi come club o atleta per pubblicare'
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              maxLength={MAX_CHARS + 50}
              disabled={!canPublish || publishing}
            />
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className={tooLong ? 'text-red-600' : 'text-neutral-500'}>
                {remaining}/{MAX_CHARS}
                {tooLong ? ' — limite superato' : ''}
              </span>
              {canPublish ? (
                <button
                  className="rounded-md border px-3 py-1.5 hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  onClick={publish}
                  disabled={publishing || empty || tooLong}
                >
                  {publishing ? 'Pubblico…' : 'Pubblica'}
                </button>
              ) : (
                <a
                  href="/onboarding"
                  className="rounded-md border px-3 py-1.5 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                  Accedi per pubblicare
                </a>
              )}
            </div>
          </div>

          {/* 🔴 DATI REALI: Ultime opportunità */}
          <FeedLatest />

          {/* Post recenti (stub) */}
          <section className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                Aggiornamenti recenti
              </h3>
            </div>

            {loadingPosts ? (
              <ul className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <li key={i} className="rounded-lg border p-3 dark:border-neutral-800">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                    <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                  </li>
                ))}
              </ul>
            ) : errPosts ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-red-600 dark:border-neutral-800">
                Errore nel caricamento: {errPosts}
              </div>
            ) : posts.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-neutral-500 dark:border-neutral-800">
                Ancora nessun post.
              </div>
            ) : (
              <ul className="space-y-4">
                {posts.map((p) => (
                  <li key={p.id} className="rounded-lg border p-3 dark:border-neutral-800">
                    <div className="mb-1 text-xs text-neutral-500">
                      {p.role === 'club' ? 'Club' : 'Atleta'} ·{' '}
                      {new Date(p.createdAt).toLocaleString()}
                    </div>
                    <div className="text-sm whitespace-pre-wrap text-neutral-800 dark:text-neutral-200">
                      {p.text}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </section>

        {/* DESTRA */}
        <aside className="hidden xl:col-span-3 xl:flex xl:flex-col xl:gap-6">
          <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              🔥 Trending
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="/search/athletes?trend=mercato"
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  Calciomercato Dilettanti
                </a>
              </li>
              <li>
                <a
                  href="/opportunities?role=goalkeeper&gender=f"
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  Portieri femminili U21
                </a>
              </li>
              <li>
                <a
                  href="/feed?tag=preparazione"
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  Preparazione invernale
                </a>
              </li>
              <li>
                <a
                  href="/opportunities?league=serie-d&role=winger"
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  Serie D – Esterni veloci
                </a>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              👥 Chi seguire
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">ASD Siracusa</div>
                  <div className="truncate text-xs text-neutral-500">Eccellenza • Sicilia</div>
                </div>
                <a
                  href="/c/asd-siracusa"
                  className="rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  Vedi
                </a>
              </li>
              <li className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">SSD Virtus Rosa</div>
                  <div className="truncate text-xs text-neutral-500">Femminile • Serie C</div>
                </div>
                <a
                  href="/c/virtus-rosa"
                  className="rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  Vedi
                </a>
              </li>
              <li className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">Davide Bianchi</div>
                  <div className="truncate text-xs text-neutral-500">Punta centrale • 21 anni</div>
                </div>
                <a
                  href="/u/davide-bianchi"
                  className="rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  Vedi
                </a>
              </li>
            </ul>
            <div className="mt-4 text-right">
              <a
                href="/search/club"
                className="text-xs text-blue-600 hover:underline dark:text-blue-400"
              >
                Mostra tutto
              </a>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
