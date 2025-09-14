'use client';

import { useEffect, useState } from 'react';

type Props = {
  oppId: string;
  initialApplied?: boolean;
  onApplied?: () => void;
  size?: 'sm' | 'md';
};

export default function ApplyCTA({ oppId, initialApplied, onApplied, size = 'md' }: Props) {
  const [applied, setApplied] = useState<boolean>(!!initialApplied);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setApplied(!!initialApplied);
  }, [initialApplied]);

  async function handleApply() {
    if (applied || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/opportunities/${oppId}/apply`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      // idempotente: ok anche se 409 (già candidato)
      if (res.ok || res.status === 409) {
        setApplied(true);
        onApplied?.();
      } else {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
    } catch (err) {
      console.error(err);
      alert('Errore durante la candidatura');
    } finally {
      setLoading(false);
    }
  }

  if (applied) {
    return (
      <span
        className={`inline-flex items-center rounded-md border px-2 py-1 ${
          size === 'sm' ? 'text-xs' : 'text-sm'
        }`}
        title="Hai già inviato la candidatura"
      >
        ✅ Già candidato
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleApply}
      disabled={loading}
      className={`inline-flex items-center rounded-lg bg-gray-900 text-white ${
        size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'
      } disabled:opacity-60`}
    >
      {loading ? 'Invio…' : 'Candidati'}
    </button>
  );
}
