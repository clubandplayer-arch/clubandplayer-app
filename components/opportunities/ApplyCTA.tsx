'use client';

import { useEffect, useState } from 'react';
import { trackApplicationConversion } from '@/lib/analytics';
import { useToast } from '@/components/common/ToastProvider';

type Props = {
  oppId: string;
  initialApplied?: boolean;
  initialStatus?: string | null;
  onApplied?: () => void;
  size?: 'sm' | 'md';
};

export default function ApplyCTA({ oppId, initialApplied, initialStatus, onApplied, size = 'md' }: Props) {
  const [applied, setApplied] = useState<boolean>(!!initialApplied || !!initialStatus);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(initialStatus ?? null);
  const [loading, setLoading] = useState(false);
  const small = size === 'sm';
  const toast = useToast();

  const STATUS_LABEL: Record<string, string> = {
    pending: 'Candidatura inviata',
    submitted: 'Candidatura inviata',
    accepted: 'Candidatura accettata',
    rejected: 'Candidatura respinta',
    in_review: 'Candidatura in revisione',
  };

  const STATUS_CLASS: Record<string, string> = {
    accepted: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    submitted: 'bg-amber-100 text-amber-800 border-amber-200',
    in_review: 'bg-amber-100 text-amber-800 border-amber-200',
  };

  useEffect(() => {
    setApplied(!!initialApplied || !!initialStatus);
  }, [initialApplied, initialStatus]);

  useEffect(() => {
    setApplicationStatus(initialStatus ?? null);
  }, [initialStatus]);

  useEffect(() => {
    if (initialApplied !== undefined || initialStatus !== undefined) return;
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
        if (!cancelled) {
          setApplied(has);
          const firstStatus = has ? (j.data?.[0]?.status as string | null | undefined) : null;
          setApplicationStatus(firstStatus ?? null);
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialApplied, initialStatus, oppId]);

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
      setApplicationStatus('pending');
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

  if (applied || applicationStatus) {
    const key = (applicationStatus || 'pending').toLowerCase();
    const label = STATUS_LABEL[key] || 'Già candidato';
    const cls = STATUS_CLASS[key] || 'bg-gray-100 text-gray-700 border-gray-200';

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
