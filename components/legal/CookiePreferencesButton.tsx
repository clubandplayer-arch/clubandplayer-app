'use client';

import { useState } from 'react';

export default function CookiePreferencesButton() {
  const [error, setError] = useState(false);

  function reopenPreferences() {
    try {
      localStorage.removeItem('cp-consent-v1');
      // Una nuova navigazione interrompe anche eventuali script già caricati.
      window.location.reload();
    } catch {
      setError(true);
    }
  }

  return (
    <div>
      <button type="button" onClick={reopenPreferences} className="rounded-md border px-3 py-2 underline">
        Modifica preferenze cookie
      </button>
      {error && <p role="alert">Il browser non consente di modificare le preferenze salvate. Controlla le impostazioni di archiviazione del sito.</p>}
    </div>
  );
}
