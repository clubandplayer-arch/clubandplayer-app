'use client';

import { useCallback, useEffect, useState } from 'react';
import { trackApplicationConversion } from '@/lib/analytics';

type Props = {
  oppId: string;
  initialApplied?: boolean;
  onApplied?: () => void;
  size?: 'sm' | 'md';
};

type ApplicationRow = {
  status?: string | null;
};

export default function ApplyCTA({ oppId, initialApplied, onApplied, size = 'md' }: Props) {
  const [applied, setApplied] = useState<boolean>(!!initialApplied);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const small = size === 'sm';

  useEffect(() => {
    setApplied(!!initialApplied);
  }, [initialApplied]);

  const loadExisting = useCallback(async (signal?: AbortSignal) => {
    try {
      const r = await fetch(`/api/applications/mine?opportunityId=${encodeURIComponent(oppId)}`, {
        credentials: 'include',
        cache: 'no-store',
        signal,
      });
      if (!r.ok) return;
      const j = await r.json().catch(() => ({} as any));
      const arr = Array.isArray(j?.data)
        ? j.data
        : Array.isArray(j)
          ? j
          : [];
      const first = (arr as ApplicationRow[])[0];
      if (signal?.aborted) return;
      if (first) {
        setApplied(true);
        setStatus(first.status ?? null);
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
    }
  }, [oppId]);

  useEffect(() => {
    const controller = new AbortController();
    loadExisting(controller.signal);
    return () => controller.abort();
  }, [loadExisting]);

  async function handleApply() {
    if (applied || loading) return;
    setLoading(true);
    try {
      const r = await fetch('/api/applications', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity_id: oppId }),
      });
      // idempotente: ok anche se già candidato (409)
      if (r.ok || r.status === 409) {
        setApplied(true);
        if (r.ok) {
          try {
            const j = await r.json().catch(() => ({} as any));
            const newStatus = (j as any)?.data?.status ?? null;
            if (newStatus) setStatus(String(newStatus));
          } catch {
            /* ignore */
          }
        } else {
          await loadExisting();
        }
        try {
          trackApplicationConversion({ opportunityId: oppId, source: 'cta' });
        } catch {
          /* no-op */
        }
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
    const key = (status || '').toLowerCase();
    const label =
      key === 'accepted'
        ? 'Candidatura accettata'
        : key === 'rejected'
        ? 'Candidatura rifiutata'
        : 'Candidatura inviata';
    const cls =
      key === 'accepted'
        ? 'bg-green-100 text-green-800 border-green-200'
        : key === 'rejected'
        ? 'bg-red-100 text-red-800 border-red-200'
        : 'bg-gray-100 text-gray-700 border-gray-200';

    return (
      <span
        className={[
          'inline-flex items-center rounded-lg border px-3 py-1 text-sm font-medium',
          small ? 'text-xs px-2 py-0.5' : '',
          cls,
        ].join(' ')}
      >
        {label}
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
