'use client';

import { useEffect, useMemo, useState } from 'react';

type Application = {
  id: string;
  oppId: string;
  oppTitle?: string;
  clubId?: string;
  clubName?: string;
  athleteId?: string;
  athleteName?: string;
  createdAt: string; // ISO
  note?: string;
};

const NOTE_MAX_CHARS = 500;

/** Modale minimale, auto-contenuta (niente dipendenze esterne) */
function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border bg-white p-4 shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md border px-2 py-1 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Chiudi
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function ClubApplicantsPage() {
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // stato modale
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        setLoading(true);
        const r = await fetch('/api/clubs/applicants', { cache: 'no-store', credentials: 'include' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json().catch(() => ({}));
        const arr: Application[] = Array.isArray(j?.items) ? j.items : [];
        // ordina lato client (difensivo)
        arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setItems(arr);
      } catch (e: any) {
        setErr(e?.message || 'Errore inatteso');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openFor = (id: string) => {
    const it = items.find((x) => x.id === id);
    setEditingId(id);
    setNote(it?.note ?? '');
    setOpen(true);
    setFlash(null);
  };

  const current = useMemo(() => items.find((x) => x.id === editingId) || null, [items, editingId]);
  const noteChars = note.length;
  const noteTooLong = noteChars > NOTE_MAX_CHARS;

  async function saveNote() {
    if (!editingId || noteTooLong) return;
    setSaving(true);
    setFlash(null);
    try {
      const r = await fetch('/api/clubs/applicants/note', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ applicationId: editingId, note }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const ok = await r.json().catch(() => ({}));
      if (ok?.ok !== true) throw new Error('Salvataggio non riuscito');

      // aggiorna stato locale
      setItems((prev) =>
        prev.map((x) => (x.id === editingId ? { ...x, note } : x)),
      );
      setFlash('Nota salvata.');
      // chiude dopo un attimo
      setTimeout(() => {
        setOpen(false);
        setEditingId(null);
        setFlash(null);
      }, 600);
    } catch (e: any) {
      setFlash(e?.message || 'Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="container mx-auto px-4 py-6">
      <h1 className="text-xl font-semibold">Candidature ricevute</h1>

      <section className="mt-4 rounded-xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm text-neutral-600 dark:text-neutral-300">
            {loading ? 'Caricamento…' : `${items.length} candidature`}
          </div>
        </div>

        {loading ? (
          <ul className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="rounded-lg border p-3 dark:border-neutral-800">
                <div className="h-4 w-1/2 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
              </li>
            ))}
          </ul>
        ) : err ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-red-600 dark:border-neutral-800">
            Errore: {err}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-neutral-500 dark:border-neutral-800">
            Non ci sono candidature al momento.
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
                  <th className="px-3 py-2">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id} className="border-b dark:border-neutral-800">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{a.oppTitle || a.oppId}</div>
                      <div className="text-xs text-neutral-500">{a.clubName ?? 'Club'}</div>
                    </td>
                    <td className="px-3 py-2">
                      {a.athleteName ? (
                        <a
                          className="text-blue-600 hover:underline dark:text-blue-400"
                          href={a.athleteId ? `/u/${a.athleteId}` : '#'}
                        >
                          {a.athleteName}
                        </a>
                      ) : (
                        <span className="text-neutral-500">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {a.note ? (
                        <span className="text-neutral-700 dark:text-neutral-200">
                          {a.note.length > 80 ? `${a.note.slice(0, 80)}…` : a.note}
                        </span>
                      ) : (
                        <span className="text-neutral-500">Nessuna nota</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => openFor(a.id)}
                        className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                      >
                        {a.note ? 'Modifica nota' : 'Aggiungi nota'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modale nota candidatura */}
      <Modal
        open={open}
        title={current ? `Nota — ${current.oppTitle || current.oppId}` : 'Nota'}
        onClose={() => {
          if (!saving) {
            setOpen(false);
            setEditingId(null);
            setFlash(null);
          }
        }}
      >
        {current ? (
          <div className="space-y-3">
            <div className="text-xs text-neutral-500">
              Candidato: <span className="font-medium text-neutral-700 dark:text-neutral-200">{current.athleteName || '—'}</span>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium">Nota (max {NOTE_MAX_CHARS} caratteri)</label>
              <textarea
                rows={6}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
                placeholder="Es. chiamare domani, ottimo profilo per la Juniores…"
                maxLength={NOTE_MAX_CHARS + 50} // consenti digit extra ma segnala rosso
              />
              <div className="flex items-center justify-between">
                <span className={`text-xs ${noteTooLong ? 'text-red-600' : 'text-neutral-500'}`}>
                  {noteChars}/{NOTE_MAX_CHARS}
                  {noteTooLong ? ' — limite superato' : ''}
                </span>
                {flash && (
                  <span className="text-xs text-neutral-600 dark:text-neutral-300">{flash}</span>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setEditingId(null);
                  setFlash(null);
                }}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                disabled={saving}
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={saveNote}
                disabled={saving || noteTooLong}
                className="rounded-lg border bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
              >
                {saving ? 'Salvo…' : 'Salva nota'}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-neutral-500">Selezione non valida.</div>
        )}
      </Modal>
    </main>
  );
}
