'use client';

import { useEffect, useMemo, useState } from 'react';

type Props = {
  staffProfileId: string;
  visible: boolean;
};

export default function ClubStaffToggleButton({ staffProfileId, visible }: Props) {
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [inStaff, setInStaff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanId = useMemo(() => (staffProfileId || '').trim(), [staffProfileId]);

  useEffect(() => {
    if (!visible || !cleanId) return;
    let aborted = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/clubs/me/staff', { credentials: 'include', cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data as any)?.error || 'Errore nel caricare lo staff');
        const rows = Array.isArray((data as any)?.staff) ? (data as any).staff : [];
        const isIncluded = rows.some((row: any) => row?.staffProfileId === cleanId && row?.status === 'active');
        if (!aborted) setInStaff(isIncluded);
      } catch (err: any) {
        if (!aborted) setError(err?.message || 'Errore nel caricare lo staff');
      } finally {
        if (!aborted) setLoading(false);
      }
    };

    void load();
    return () => {
      aborted = true;
    };
  }, [cleanId, visible]);

  if (!visible || !cleanId) return null;

  const handleToggle = async () => {
    if (pending) return;
    const next = !inStaff;
    setPending(true);
    setError(null);
    setInStaff(next);

    try {
      const res = await fetch('/api/clubs/me/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ staffProfileId: cleanId, inStaff: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.error || 'Errore nel salvare lo staff');
      setInStaff((data as any)?.inStaff === true);
    } catch (err: any) {
      setInStaff(!next);
      setError(err?.message || 'Errore nel salvare lo staff');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading || pending}
        className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
          inStaff ? 'bg-fuchsia-100 text-fuchsia-800 hover:bg-fuchsia-200' : 'bg-fuchsia-600 text-white hover:bg-fuchsia-500'
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {loading ? 'Verifica staff…' : pending ? 'Aggiornamento…' : inStaff ? 'Nello Staff' : 'Aggiungi allo Staff'}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
