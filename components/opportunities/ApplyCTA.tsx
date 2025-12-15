'use client';

import { useEffect, useState } from 'react';
import { trackApplicationConversion } from '@/lib/analytics';
import { useToast } from '@/components/common/ToastProvider';

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
  const toast = useToast();

  useEffect(() => {
    setApplied(!!initialApplied);
  }, [initialApplied]);

  useEffect(() => {
    if (initialApplied !== undefined) return;
    let cancelled = false;

    (async () => {
      try {
        const r = await fetch(`/api/applications/mine?opportunityId=${encodeURIComponent(oppId)}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!r.ok || cancelled) return;
        const j = await r.json().catch(() => ({}));
        const has = Array.isArray(j?.data) && j.data.length > 0;
        if (!cancelled) setApplied(has);
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialApplied, oppId]);

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

      const contentType = r.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const payload = isJson ? await r.json().catch(() => null) : null;
      const text = isJson ? null : await r.text();

      if (r.status === 409) {
        setApplied(true);
        toast.info('Ti sei già candidato');
        onApplied?.();
        return;
      }

      if (!r.ok) {
        const msg = (payload as any)?.error || (payload as any)?.message || text || `HTTP ${r.status}`;
        toast.error(msg || 'Candidatura non riuscita');
        console.error('[apply] error', { status: r.status, text: text ?? payload });
        return;
      }

      setApplied(true);
      toast.success('Candidatura inviata');
      try {
        trackApplicationConversion({ opportunityId: oppId, source: 'cta' });
      } catch {
        /* no-op */
      }
      onApplied?.();
    } catch (e: any) {
      toast.error(e?.message || 'Candidatura non riuscita');
      console.error('[apply] unexpected', e);
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
