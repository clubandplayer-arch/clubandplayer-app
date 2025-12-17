'use client'

export const dynamic = 'force-dynamic';
export const fetchCache = 'default-no-store';

;

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { LocationFields, LocationValue } from '@/components/profiles/LocationFields';

export default function LocationSettingsPage() {
  const supabase = supabaseBrowser();

  const [value, setValue] = useState<LocationValue>({
    country: 'IT',
    region: null,
    province: null,
    city: null,
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
        .select('country, region, province, city')
        .eq('id', user.id)
        .maybeSingle();

      if (data) {
        setValue({
          country: data.country ?? 'IT',
          region: data.region ?? null,
          province: data.province ?? null,
          city: data.city ?? null,
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
        country: (value as any).country || null,
        region: (value as any).region || null,
        province: (value as any).province || null,
        city: (value as any).city || null,
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
        <LocationFields
          supabase={supabase}
          mode="base"
          value={value}
          onChange={setValue as (v: LocationValue) => void}
          label="Sede/Residenza"
        />
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
