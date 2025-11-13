'use client';

import { useState, KeyboardEvent } from 'react';

type Props = {
  /** chiamata dopo un post andato a buon fine (es. per ricaricare la lista) */
  onPosted?: () => void;
  className?: string;
  autoFocus?: boolean;
};

export default function FeedComposer({ onPosted, className, autoFocus = false }: Props) {
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canPost = text.trim().length > 0 && !posting;

  async function submit() {
    if (!canPost) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch('/api/feed/posts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => '');
        let msg = t;
        try {
          const j = JSON.parse(t);
          msg = j?.error ?? t;
        } catch {}
        throw new Error(msg || 'Impossibile pubblicare il post');
      }

      // reset e callback di refresh
      setText('');
      onPosted?.();
    } catch (e: any) {
      setError(e?.message || 'Errore durante la pubblicazione');
    } finally {
      setPosting(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Invio + Ctrl/Cmd per postare rapidamente
    if ((e.key === 'Enter' || e.keyCode === 13) && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void submit();
    }
  }

  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        {/* avatar placeholder */}
        <div className="h-10 w-10 rounded-full bg-gray-200 shrink-0" />

        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Condividi un aggiornamento…"
            className="w-full resize-y rounded-xl border px-3 py-2 text-sm outline-none focus:ring"
            rows={3}
            autoFocus={autoFocus}
            disabled={posting}
          />
          <div className="mt-2 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {posting ? 'Pubblicazione in corso…' : 'Suggerimento: Ctrl/Cmd + Enter per pubblicare'}
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={!canPost}
              className="px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-50 disabled:opacity-50"
            >
              {posting ? 'Post…' : 'Post'}
            </button>
          </div>
          {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
        </div>
      </div>
    </div>
  );
}
