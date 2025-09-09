'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Role = 'athlete' | 'club' | null;

export default function ApplyCell({ opportunityId }: { opportunityId: string }) {
  const [role, setRole] = useState<Role>(null);
  const [applied, setApplied] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // 1) Ruolo utente
        const r1 = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        if (r1.ok) {
          const j = await r1.json();
          if (!cancelled) setRole(j?.data?.type ?? null);
        } else {
          if (!cancelled) setRole(null);
        }

        // 2) Ha già candidato?
        const r2 = await fetch(`/api/applications/exists?opportunityId=${encodeURIComponent(opportunityId)}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        if (r2.ok) {
          const j2 = await r2.json();
          if (!cancelled) setApplied(!!j2?.applied);
        } else {
          if (!cancelled) setApplied(false);
        }
      } catch {
        if (!cancelled) {
          setRole(null);
          setApplied(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [opportunityId]);

  async function onApply() {
    if (role !== 'athlete' || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/apply`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note || undefined }),
      });
      const txt = await res.text();
      if (!res.ok) {
        try { const j = JSON.parse(txt); throw new Error(j.error || `HTTP ${res.status}`); }
        catch { throw new Error(txt || `HTTP ${res.status}`); }
      }
      setApplied(true);
    } catch (e: any) {
      alert(e.message || 'Errore durante la candidatura');
    } finally {
      setSubmitting(false);
    }
  }

  // UI states
  if (loading) {
    return <span className="text-gray-400 text-sm">…</span>;
  }

  if (role === 'club') {
    return <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600">Solo atleti</span>;
  }

  if (role === null) {
    return (
      <Link href="/auth/login" className="px-2 py-1 text-sm rounded-lg border hover:bg-gray-50">
        Accedi per candidarti
      </Link>
    );
  }

  if (applied) {
    return <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">Candidatura inviata</span>;
  }

  // ruolo = athlete & non ancora applicato
  return (
    <div className="flex items-center gap-2">
      <input
        placeholder="Nota (opzionale)"
        value={note}
        onChange={(e) => setNote(e.currentTarget.value)}
        className="w-48 rounded-lg border px-2 py-1 text-sm"
      />
      <button
        onClick={onApply}
        disabled={submitting}
        className="px-3 py-1 text-sm rounded-lg bg-gray-900 text-white disabled:opacity-60"
      >
        {submitting ? 'Invio…' : 'Candidati'}
      </button>
    </div>
  );
}
