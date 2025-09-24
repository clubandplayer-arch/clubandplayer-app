'use client';

import { useEffect, useState } from 'react';

type Application = {
  id: string;
  oppId: string;
  oppTitle?: string;
  clubId?: string;
  clubName?: string;
  athleteId?: string;
  athleteName?: string;
  createdAt: string;
  note?: string;
};

export default function ClubApplicantsPage() {
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  async function load() {
    try {
      setErr(null);
      setLoading(true);
      const r = await fetch('/api/club/applicants', { cache: 'no-store', credentials: 'include' });
      const dj = await r.json().catch(() => ({}));
      const list: Application[] = Array.isArray(dj?.items) ? dj.items : [];
      setItems(list);
    } catch (e: any) {
      setErr(e?.message || 'Errore inatteso');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(app: Application) {
    setEditingId(app.id);
    setNoteDraft(app.note || '');
  }

  function cancelEdit() {
    setEditingId(null);
    setNoteDraft('');
  }

  async function saveNote() {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/club/applicants/note', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: editingId, note: noteDraft }),
      });
      if (!res.ok) throw new Error('Salvataggio nota fallito');
      // aggiorna localmente
      setItems((prev) => prev.map((a) => (a.id === editingId ? { ...a, note: noteDraft } : a)));
      cancelEdit();
    } catch (e: any) {
      setErr(e?.message || 'Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Candidature ricevute</h1>
          <a
            href="/opportunities/new"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            + Pubblica opportunità
          </a>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 w-full animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800" />
            ))}
          </div>
        ) : err ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-red-600 dark:border-neutral-800">
            Errore: {err}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-neutral-500 dark:border-neutral-800">
            Nessuna candidatura trovata. Chiedi agli atleti di candidarsi dalle opportunità.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left dark:border-neutral-800">
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Opportunità</th>
                  <th className="px-3 py-2">Candidato</th>
                  <th className="px-3 py-2">Nota</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {items.map((a) => {
                  const isEditing = editingId === a.id;
                  return (
                    <tr key={a.id} className="border-b align-top dark:border-neutral-800">
                      <td className="px-3 py-2 whitespace-nowrap text-neutral-500">
                        {new Date(a.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{a.oppTitle || a.oppId}</div>
                        <div className="text-xs text-neutral-500">{a.clubName || 'Club'}</div>
                      </td>
                      <td className="px-3 py-2">
                        {a.athleteName || a.athleteId || 'Atleta'}
                      </td>
                      <td className="px-3 py-2 w-1/3">
                        {isEditing ? (
                          <textarea
                            className="w-full rounded-md border px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                            rows={3}
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            placeholder="Aggiungi una nota sulla candidatura…"
                          />
                        ) : (
                          <div className="text-neutral-700 dark:text-neutral-300">
                            {a.note ? a.note : <span className="text-neutral-400">—</span>}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={saveNote}
                              disabled={saving}
                              className="rounded-md border px-3 py-1.5 hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-800"
                            >
                              {saving ? 'Salvo…' : 'Salva'}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="rounded-md border px-3 py-1.5 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                            >
                              Annulla
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEdit(a)}
                            className="rounded-md border px-3 py-1.5 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                          >
                            {a.note ? 'Modifica nota' : 'Aggiungi nota'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
