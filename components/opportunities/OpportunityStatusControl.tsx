// components/opportunities/OpportunityStatusControl.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useToast } from '@/components/common/ToastProvider';

type Props = {
  opportunityId: string;
  initialStatus?: string | null;
  isOwner?: boolean;
  onStatusChange?: (status: string) => void;
};

const LABELS: Record<string, string> = {
  open: 'Aperto',
  closed: 'Chiuso',
  draft: 'Bozza',
  archived: 'Archiviato',
};

const normalizeLocalStatus = (value: string | null | undefined) => {
  const raw = (value || '').toLowerCase();
  if (raw === 'aperto' || raw === 'open') return 'open';
  if (raw === 'chiuso' || raw === 'closed') return 'closed';
  return raw || 'open';
};

export default function OpportunityStatusControl({ opportunityId, initialStatus, isOwner = false, onStatusChange }: Props) {
  const toast = useToast();
  const router = useRouter();
  const [status, setStatus] = useState<string>(normalizeLocalStatus(initialStatus ?? 'open'));
  const [saving, setSaving] = useState(false);

  const normalized = normalizeLocalStatus(status || 'open');
  const isClosed = normalized === 'closed';
  const nextStatus = isClosed ? 'open' : 'closed';
  const label = LABELS[normalized] ?? normalized;

  const badgeClass = isClosed
    ? 'bg-red-100 text-red-800 border-red-200'
    : 'bg-green-100 text-green-800 border-green-200';

  async function toggleStatus() {
    if (!opportunityId) return;
    if (nextStatus === 'closed' && !confirm('Vuoi chiudere questo annuncio?')) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/status`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      const contentType = res.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const payload = isJson ? await res.json().catch(() => null) : null;
      const errText = isJson ? null : await res.text().catch(() => '');

      if (!res.ok) {
        const msg = (payload as any)?.error || (payload as any)?.message || errText || 'Errore imprevisto';
        throw new Error(msg);
      }

      const updatedStatus = normalizeLocalStatus(String((payload as any)?.data?.status ?? nextStatus));
      setStatus(updatedStatus);
      onStatusChange?.(updatedStatus);
      router.refresh();
      toast.success(nextStatus === 'closed' ? 'Annuncio chiuso' : 'Annuncio riaperto');
    } catch (e: any) {
      toast.error(e?.message || 'Impossibile aggiornare lo stato');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className={`rounded-full border px-2 py-1 text-xs font-semibold capitalize ${badgeClass}`}>
        {label}
      </span>
      {isOwner && (
        <button
          type="button"
          onClick={toggleStatus}
          disabled={saving}
          className="rounded-lg border px-3 py-1 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"
        >
          {isClosed ? 'Riapri' : 'Chiudi annuncio'}
        </button>
      )}
    </div>
  );
}
