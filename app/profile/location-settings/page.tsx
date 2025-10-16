'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import LocationPicker, { LocationValue } from '@/components/forms/LocationPicker';

export default function LocationSettingsPage() {
  const supabase = supabaseBrowser();

  const [value, setValue] = useState<LocationValue>({
    region_id: null,
    province_id: null,
    municipality_id: null,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // carica i valori esistenti dal profilo
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('region_id, province_id, municipality_id')
        .eq('id', user.id)
        .maybeSingle();

      if (data) {
        setValue({
          region_id: data.region_id ?? null,
          province_id: data.province_id ?? null,
          municipality_id: data.municipality_id ?? null,
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); return; }

    const { error } = await supabase
      .from('profiles')
      .update({
        region_id: value.region_id,
        province_id: value.province_id,
        municipality_id: value.municipality_id,
      })
      .eq('id', user.id);

    setBusy(false);
    setMsg(error ? `Errore: ${error.message}` : 'Salvato!');
  };

  return (
    <main className="container mx-auto py-8 max-w-2xl">
      <h1>Località</h1>
      <p className="lead">Imposta regione, provincia e comune del tuo profilo.</p>

      <div className="card p-4 mt-4">
        <LocationPicker value={value} onChange={setValue} required />
        <div className="mt-4 flex gap-2">
          <button className="btn btn-brand" disabled={busy} onClick={save}>
            {busy ? 'Salvataggio…' : 'Salva'}
          </button>
          {msg && <span className="muted">{msg}</span>}
        </div>
      </div>
    </main>
  );
}
