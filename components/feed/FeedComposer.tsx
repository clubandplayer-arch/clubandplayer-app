'use client';

import { useState } from 'react';

type Props = {
  onPosted?: () => void;
};

export default function FeedComposer({ onPosted }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSend = text.trim().length > 0 && !sending;

  async function handlePost() {
    if (!canSend) return;
    setSending(true);
    setErr(null);
    try {
      const res = await fetch('/api/feed/posts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: text.trim() }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        let msg = 'Impossibile pubblicare';
        try {
          const j = JSON.parse(t);
          msg = j?.error || msg;
        } catch {}
        throw new Error(msg);
      }
      setText('');
      onPosted?.(); // ricarica lista
    } catch (e: any) {
      setErr(e?.message ?? 'Errore inatteso');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-2xl border p-4">
      <textarea
        className="w-full resize-y rounded-xl border px-3 py-2 text-sm outline-none focus:ring"
        rows={3}
        placeholder="Condividi un aggiornamento…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={sending}
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handlePost}
          disabled={!canSend}
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          Pubblica
        </button>
      </div>
      {err && <div className="mt-2 text-xs text-red-600">{err}</div>}
    </div>
  );
}
