'use client';

import { useEffect, useRef, useState } from 'react';

const MAX_LEN = 500;

export default function Composer() {
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  async function onPublish() {
    if (!text.trim()) return;
    if (text.length > MAX_LEN) return;

    setPosting(true);
    setError(null);

    try {
      const res = await fetch('/api/feed/posts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.ok === false) {
        const msg =
          data?.error ||
          (res.status === 429
            ? 'Stai andando troppo veloce, riprova tra poco.'
            : 'Errore durante la pubblicazione.');
        setError(msg);
        return;
      }

      // reset textarea
      setText('');

      // notifica locale
      setToast('Pubblicato ✓');
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 4000);

      // evento globale per aggiornare la lista post
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('feed-post-created', { detail: data.post }));
      }
    } catch {
      setError('Errore di rete. Riprova.');
    } finally {
      setPosting(false);
    }
  }

  const remaining = MAX_LEN - text.length;
  const disabled = posting || !text.trim() || remaining < 0;

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-3 text-sm text-neutral-500">Condividi un aggiornamento</div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="mb-3 rounded-lg border bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300"
        >
          {toast}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-3 rounded-lg border bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300"
        >
          {error}
        </div>
      )}

      <textarea
        className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900"
        rows={3}
        placeholder="Scrivi qualcosa…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX_LEN + 200} // permetti oltre per mostrare contatore negativo, ma blocchiamo col bottone
      />

      <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
        <span>
          {remaining >= 0
            ? `${remaining} caratteri rimanenti`
            : `-${Math.abs(remaining)} oltre il limite`}
        </span>
        <button
          onClick={onPublish}
          disabled={disabled}
          className="rounded-md border px-3 py-1.5 text-sm font-semibold hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          {posting ? 'Pubblico…' : 'Pubblica'}
        </button>
      </div>
    </div>
  );
}
