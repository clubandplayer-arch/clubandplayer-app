'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  className?: string;
};

const MAX = 500;

export default function FeedComposer({ className }: Props) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const len = text.trim().length;
  const tooLong = len > MAX;
  const canPost = !submitting && !tooLong && len > 0;

  async function onSubmit() {
    if (!canPost) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/feed/posts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: text.trim() }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        let msg = t;
        try { msg = JSON.parse(t)?.error ?? t; } catch {}
        throw new Error(msg || 'Errore pubblicazione');
      }
      setText('');
      router.refresh(); // ricarica la /feed
    } catch (e: any) {
      setError(e?.message || 'Errore pubblicazione');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={className}>
      <div className="rounded-2xl border p-4 bg-white">
        <label className="block text-sm font-medium mb-2">Condividi un aggiornamento</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Scrivi qualcosa…"
          className="w-full resize-none rounded-xl border px-3 py-2 outline-none focus:ring-2"
        />
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>{len}/{MAX}</span>
          <div className="flex items-center gap-2">
            {tooLong && <span className="text-red-600">Testo troppo lungo</span>}
            <button
              type="button"
              onClick={onSubmit}
              disabled={!canPost}
              className="px-3 py-1 rounded-lg border disabled:opacity-50"
            >
              {submitting ? 'Pubblico…' : 'Pubblica'}
            </button>
          </div>
        </div>
        {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
      </div>
    </div>
  );
}
