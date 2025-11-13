'use client';

import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';

const MAX = 500;

export default function FeedComposer({ onPosted }: { onPosted?: () => void }) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = useMemo(() => MAX - (text?.length ?? 0), [text]);
  const disabled = submitting || !text.trim() || remaining < 0;

  async function handlePost() {
    if (disabled) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/feed/posts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) {
        const msg =
          json?.error === 'too_long'
            ? `Testo troppo lungo (max ${MAX} caratteri)`
            : json?.error === 'empty'
            ? 'Il testo è vuoto'
            : json?.error === 'rate_limited'
            ? 'Stai pubblicando troppo velocemente. Riprova tra pochi secondi.'
            : 'Impossibile pubblicare';
        throw new Error(msg);
      }

      setText('');
      onPosted?.();
      // Forza il refresh della bacheca (server components)
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Errore di pubblicazione');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border">
      <div className="p-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Condividi un aggiornamento…"
          className="w-full resize-vertical rounded-xl border px-3 py-2 outline-none focus:ring"
          rows={3}
          maxLength={MAX + 100} // permetti digitazione ma blocchiamo a MAX lato server
        />
        <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
          <span>{remaining >= 0 ? `${remaining} caratteri rimanenti` : `-${Math.abs(remaining)} oltre il limite`}</span>
          <button
            type="button"
            onClick={handlePost}
            disabled={disabled}
            className={`px-3 py-1 rounded border ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
          >
            {submitting ? 'Pubblico…' : 'Pubblica'}
          </button>
        </div>
        {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
      </div>
    </div>
  );
}
