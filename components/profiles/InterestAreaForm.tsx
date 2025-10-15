// components/profile/InterestAreaForm.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import LocationPicker, { type LocationValue } from '@/components/forms/LocationPicker';

export default function InterestAreaForm() {
  const supabase = supabaseBrowser();

  const [value, setValue] = useState<LocationValue>({
    region_id: null,
    province_id: null,
    municipality_id: null,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // carica il valore già salvato sul profilo
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        const { data, error } = await supabase
          .from('profiles')
          .select('region_id, province_id, municipality_id')
          .eq('id', user.id)
          .single();
        if (!error && data) {
          setValue({
            region_id: data.region_id ?? null,
            province_id: data.province_id ?? null,
            municipality_id: data.municipality_id ?? null,
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Devi effettuare l’accesso');

      // Salviamo gli ID normalizzati sul profilo
      const { error } = await supabase
        .from('profiles')
        .update({
          region_id: value.region_id,
          province_id: value.province_id,
          municipality_id: value.municipality_id,
        })
        .eq('id', user.id);

      if (error) throw error;
      setMsg({ type: 'ok', text: 'Zona di interesse salvata ✅' });
    } catch (e: any) {
      setMsg({ type: 'err', text: e?.message ?? 'Errore durante il salvataggio' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card p-4">
        <div className="animate-pulse h-6 w-40 bg-neutral-200 rounded mb-4" />
        <div className="animate-pulse h-10 w-full bg-neutral-200 rounded" />
      </div>
    );
  }

  return (
    <form onSubmit={onSave} className="card p-4 space-y-4">
      <h3 className="text-lg font-semibold">Zona di interesse</h3>

      <LocationPicker value={value} onChange={setValue} required />

      <p className="text-sm text-neutral-500">
        La zona di interesse personalizza il feed e le opportunità suggerite.
      </p>

      {msg && (
        <p
          className={
            msg.type === 'ok'
              ? 'text-sm text-green-700'
              : 'text-sm text-red-700'
          }
        >
          {msg.text}
        </p>
      )}

      <div className="flex gap-2">
        <button className="btn btn-brand" disabled={saving}>
          {saving ? 'Salvataggio…' : 'Salva'}
        </button>
      </div>
    </form>
  );
}
