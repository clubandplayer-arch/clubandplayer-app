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
  const small = size === 'sm';

  useEffect(() => {
    setApplied(!!initialApplied);
  }, [initialApplied]);

  async function handleApply() {
    if (applied || loading) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/opportunities/${oppId}/apply`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      // idempotente: ok anche se già candidato (409)
      if (r.ok || r.status === 409) {
        setApplied(true);
        onApplied?.();
      } else {
        const t = await r.text();
        throw new Error(t || `HTTP ${r.status}`);
      }
    } catch (e: any) {
      alert(e?.message || 'Errore durante la candidatura');
    } finally {
      setLoading(false);
    }
  }

  if (applied) {
    return (
      <span
        className={[
          'inline-flex items-center rounded-lg border px-3 py-1 text-sm font-medium',
          small ? 'text-xs px-2 py-0.5' : '',
          'bg-gray-100 text-gray-700 border-gray-200',
        ].join(' ')}
      >
        Già candidato
      </span>
    );
  }

  return (
    <button
      onClick={handleApply}
      disabled={loading}
      className={[
        'inline-flex items-center rounded-lg px-4 py-2 font-medium',
        small ? 'text-sm px-3 py-1.5' : '',
        'bg-gray-900 text-white hover:bg-black/90 disabled:opacity-60',
      ].join(' ')}
    >
      {loading ? 'Invio…' : 'Candidati'}
    </button>
  );
}
