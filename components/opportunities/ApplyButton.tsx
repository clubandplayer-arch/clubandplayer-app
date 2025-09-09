'use client';

import { useState } from 'react';

type Props = {
  /** Chiamato al click, con la nota opzionale inserita dall’utente */
  onApply: (note: string) => Promise<void> | void;
  /** Disabilita input e bottone */
  disabled?: boolean;
  /** Se true, mostra il badge “Candidatura inviata” e non rende il bottone */
  applied?: boolean;
};

export default function ApplyButton({ onApply, disabled = false, applied = false }: Props) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  if (applied) {
    return (
      <span className="text-xs text-green-700 bg-green-100 border border-green-200 rounded px-2 py-1">
        Candidatura inviata
      </span>
    );
  }

  async function handleClick() {
    if (disabled || busy) return;
    try {
      setBusy(true);
      await onApply(note);
      setNote('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        className="border rounded px-2 py-1 text-sm w-56"
        placeholder="Nota (opzionale)"
        value={note}
        onChange={(e) => setNote(e.currentTarget.value)}
        disabled={disabled || busy}
      />
      <button
        onClick={handleClick}
        disabled={disabled || busy}
        className={`px-3 py-1 rounded ${
          disabled || busy ? 'bg-gray-300 text-gray-600' : 'bg-gray-900 text-white hover:opacity-90'
        }`}
      >
        Candidati
      </button>
    </div>
  );
}
