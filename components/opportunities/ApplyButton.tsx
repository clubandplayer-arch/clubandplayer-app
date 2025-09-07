'use client';

import { useState } from 'react';

export default function ApplyButton({
  opportunityId,
  disabled,
}: {
  opportunityId: string;
  disabled?: boolean;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState('');
  const [applied, setApplied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onApply() {
    setErr(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/apply`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note || null }),
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : {};
      if (!res.ok) {
        if (res.status === 409) {
          setApplied(true);
          return;
        }
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setApplied(true);
    } catch (e: any) {
      setErr(e.message || 'Errore');
    } finally {
      setSubmitting(false);
    }
  }

  if (applied) {
    return (
      <span className="text-xs rounded-md px-2 py-1 bg-green-100 text-green-800">
        Candidatura inviata
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        disabled={disabled || submitting}
        className="border rounded-md px-2 py-1 text-sm"
        placeholder="Nota (opzionale)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <button
        disabled={disabled || submitting}
        onClick={onApply}
        className="rounded-md px-3 py-1.5 text-sm bg-gray-900 text-white disabled:opacity-50"
      >
        {submitting ? 'Invio…' : 'Candidati'}
      </button>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}
