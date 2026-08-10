'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type ModerationFilter = 'review' | 'approved' | 'rejected' | 'suspended';

type QualityRow = {
  id: string;
  name: string;
  sport: string | null;
  city: string | null;
  profile_visibility_status: string;
  club_name_review_status: string;
  registry_master_id: string | null;
  reasons: string[];
  duplicate_profile_ids: string[];
  registry?: { denominazione?: string | null } | null;
};

type Summary = { total_clubs: number; anomalies: number; suspicious_names: number; duplicate_groups: number; unlinked_registry: number };

export default function ProfileQualityAdminPage() {
  const [rows, setRows] = useState<QualityRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [schemaReady, setSchemaReady] = useState(true);
  const [setupMessage, setSetupMessage] = useState('');
  const [filter, setFilter] = useState<ModerationFilter>('review');

  const load = useCallback(async () => {
    const response = await fetch('/api/admin/profile-quality', { cache: 'no-store' });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.error || 'Caricamento non riuscito');
    setRows(json.data ?? []);
    setSummary(json.summary ?? null);
    setSchemaReady(json.schema_ready !== false);
    setSetupMessage(typeof json.setup_message === 'string' ? json.setup_message : '');
  }, []);

  useEffect(() => { void load().catch((err) => setError(err instanceof Error ? err.message : 'Errore inatteso')); }, [load]);

  async function act(profileId: string, action: string) {
    setSaving(`${profileId}:${action}`);
    setError('');
    const response = await fetch('/api/admin/profile-quality', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ profile_id: profileId, action }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) setError(json.error || 'Aggiornamento non riuscito');
    else await load();
    setSaving(null);
  }

  const moderationState = (row: QualityRow): ModerationFilter => {
    if (row.profile_visibility_status === 'suspended') return 'suspended';
    if (row.club_name_review_status === 'approved') return 'approved';
    if (row.club_name_review_status === 'rejected') return 'rejected';
    return 'review';
  };
  const filterOptions: Array<{ value: ModerationFilter; label: string }> = [
    { value: 'review', label: 'Da valutare' },
    { value: 'approved', label: 'Approvati' },
    { value: 'rejected', label: 'Rifiutati' },
    { value: 'suspended', label: 'Sospesi' },
  ];
  const visibleRows = rows.filter((row) => moderationState(row) === filter);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">Qualità e moderazione</p>
        <h1 className="mt-1 text-3xl font-bold text-neutral-950">Anomalie profili Club</h1>
        <p className="mt-2 text-sm text-neutral-600">Revisiona nomi sospetti, duplicati, collegamenti al Registro e sospensioni.</p>
      </div>

      {summary && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(summary).map(([key, value]) => (
            <div key={key} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-xs uppercase text-neutral-500">{key.replaceAll('_', ' ')}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 text-sm">
        <Link href="/admin/registry/claims" className="font-semibold text-cyan-700 hover:underline">Richieste Registro</Link>
        <Link href="/admin/registry" className="font-semibold text-cyan-700 hover:underline">Registro Club</Link>
      </div>
      {error && <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {!schemaReady && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" role="status">
          <p className="font-semibold">Configurazione database P2 richiesta</p>
          <p className="mt-1">{setupMessage}</p>
        </div>
      )}

      <div className="space-y-2" aria-label="Filtra per valutazione">
        <p className="text-sm font-semibold text-neutral-800">Mostra club</p>
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((option) => {
            const active = filter === option.value;
            const count = rows.filter((row) => moderationState(row) === option.value).length;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(option.value)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${active ? 'border-cyan-700 bg-cyan-700 text-white' : 'border-neutral-300 bg-white text-neutral-700 hover:border-cyan-700 hover:text-cyan-800'}`}
              >
                {option.label} <span className={active ? 'text-cyan-100' : 'text-neutral-500'}>({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full divide-y text-sm">
          <thead className="bg-neutral-50"><tr><th className="p-3 text-left">Club</th><th className="p-3 text-left">Anomalie</th><th className="p-3 text-left">Stati</th><th className="p-3 text-left">Azioni</th></tr></thead>
          <tbody className="divide-y">
            {visibleRows.map((row) => (
              <tr key={row.id}>
                <td className="p-3 align-top"><Link href={`/clubs/${row.id}`} className="font-semibold text-cyan-800 hover:underline">{row.name || 'Senza nome'}</Link><div className="text-xs text-neutral-500">{[row.sport, row.city].filter(Boolean).join(' · ') || row.id}</div></td>
                <td className="p-3 align-top"><ul className="list-disc space-y-1 pl-4 text-amber-800">{row.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>{row.registry?.denominazione && <div className="mt-2 text-xs text-emerald-700">Registro: {row.registry.denominazione}</div>}</td>
                <td className="p-3 align-top"><div>{row.profile_visibility_status}</div><div className="text-xs text-neutral-500">nome: {row.club_name_review_status}</div></td>
                <td className="p-3 align-top">
                  <div className="flex min-w-56 flex-wrap gap-2">
                    {moderationState(row) === 'review' && <><button disabled={Boolean(saving) || !schemaReady} onClick={() => void act(row.id, 'approve_name')} className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50">Approva nome</button><button disabled={Boolean(saving) || !schemaReady} onClick={() => void act(row.id, 'reject_name')} className="rounded-full bg-amber-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50">Rifiuta nome</button><button disabled={Boolean(saving)} onClick={() => void act(row.id, 'suspend')} className="rounded-full bg-red-700 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50">Sospendi</button></>}
                    {moderationState(row) === 'approved' && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Nome approvato</span>}
                    {moderationState(row) === 'rejected' && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Nome rifiutato</span>}
                    {moderationState(row) === 'suspended' && <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">Club sospeso</span>}
                  </div>
                </td>
              </tr>
            ))}
            {!visibleRows.length && <tr><td colSpan={4} className="p-6 text-center text-neutral-500">Nessun club per questo filtro.</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
}
