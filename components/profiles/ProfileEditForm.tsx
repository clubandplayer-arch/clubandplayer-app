'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

type LocationLevel = 'region' | 'province' | 'municipality';

type LocationRow = {
  id: number;
  name: string;
};

type AccountType = 'club' | 'athlete' | null;

type Profile = {
  account_type: AccountType;
  interest_country: string | null;
  interest_region_id: number | null;
  interest_province_id: number | null;
  interest_municipality_id: number | null;
  foot: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  notify_email_new_message: boolean;
};

// Supabase browser client
const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- Helpers: RPC with fallback ---------------------------------------------
async function rpcChildren(level: LocationLevel, parent: number | null) {
  // 1) prova RPC
  try {
    const { data, error } = await supabase.rpc('location_children', { level, parent });
    if (!error && Array.isArray(data)) return data as LocationRow[];
    // se l'RPC risponde ma non dà dati utili, continua col fallback
    // eslint-disable-next-line no-empty
  } catch {}

  // 2) fallback query diretta
  if (level === 'region') {
    const { data } = await supabase.from('regions').select('id,name').order('name', { ascending: true });
    return (data ?? []) as LocationRow[];
  }
  if (level === 'province') {
    if (parent == null) return [];
    const { data } = await supabase
      .from('provinces')
      .select('id,name')
      .eq('region_id', parent)
      .order('name', { ascending: true });
    return (data ?? []) as LocationRow[];
  }
  // municipality
  if (parent == null) return [];
  const { data } = await supabase
    .from('municipalities')
    .select('id,name')
    .eq('province_id', parent)
    .order('name', { ascending: true });
  return (data ?? []) as LocationRow[];
}
// -----------------------------------------------------------------------------

export default function ProfileEditForm() {
  const router = useRouter();

  // Profile state
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cascata local state
  const [regionId, setRegionId] = useState<number | null>(null);
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [municipalityId, setMunicipalityId] = useState<number | null>(null);

  const [regions, setRegions] = useState<LocationRow[]>([]);
  const [provinces, setProvinces] = useState<LocationRow[]>([]);
  const [municipalities, setMunicipalities] = useState<LocationRow[]>([]);

  // Altri campi profilo
  const [foot, setFoot] = useState<string>('');
  const [heightCm, setHeightCm] = useState<number | ''>('');
  const [weightKg, setWeightKg] = useState<number | ''>('');
  const [notifyEmail, setNotifyEmail] = useState<boolean>(true);

  // Prima load: profilo + regioni
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // 1) profilo attuale
        const r = await fetch('/api/profiles/me', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!r.ok) throw new Error('Impossibile leggere il profilo');
        const j = await r.json();

        const p: Profile = {
          account_type: (j?.account_type ?? null) as AccountType,
          interest_country: j?.interest_country ?? 'IT',
          interest_region_id: j?.interest_region_id ?? null,
          interest_province_id: j?.interest_province_id ?? null,
          interest_municipality_id: j?.interest_municipality_id ?? null,
          foot: j?.foot ?? '',
          height_cm: j?.height_cm ?? null,
          weight_kg: j?.weight_kg ?? null,
          notify_email_new_message: Boolean(j?.notify_email_new_message ?? true),
        };

        setProfile(p);

        setRegionId(p.interest_region_id);
        setProvinceId(p.interest_province_id);
        setMunicipalityId(p.interest_municipality_id);

        setFoot(p.foot || '');
        setHeightCm(p.height_cm ?? '');
        setWeightKg(p.weight_kg ?? '');
        setNotifyEmail(Boolean(p.notify_email_new_message));

        // 2) carica regioni
        const rs = await rpcChildren('region', null);
        setRegions(rs);

        // 3) cascata pre-selezionata
        if (p.interest_region_id) {
          const ps = await rpcChildren('province', p.interest_region_id);
          setProvinces(ps);
        } else {
          setProvinces([]);
        }

        if (p.interest_province_id) {
          const ms = await rpcChildren('municipality', p.interest_province_id);
          setMunicipalities(ms);
        } else {
          setMunicipalities([]);
        }
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? 'Errore caricamento profilo');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Quando cambia regionId, ricarica province e resetta municipality
  useEffect(() => {
    (async () => {
      if (regionId == null) {
        setProvinces([]);
        setProvinceId(null);
        setMunicipalities([]);
        setMunicipalityId(null);
        return;
      }
      try {
        const ps = await rpcChildren('province', regionId);
        setProvinces(ps);
        setProvinceId((prev) => (ps.some((p) => p.id === prev) ? prev : null));
        setMunicipalities([]);
        setMunicipalityId(null);
      } catch (e) {
        console.error(e);
        setProvinces([]);
        setProvinceId(null);
      }
    })();
  }, [regionId]);

  // Quando cambia provinceId, ricarica municipalities
  useEffect(() => {
    (async () => {
      if (provinceId == null) {
        setMunicipalities([]);
        setMunicipalityId(null);
        return;
      }
      try {
        const ms = await rpcChildren('municipality', provinceId);
        setMunicipalities(ms);
        setMunicipalityId((prev) => (ms.some((m) => m.id === prev) ? prev : null));
      } catch (e) {
        console.error(e);
        setMunicipalities([]);
        setMunicipalityId(null);
      }
    })();
  }, [provinceId]);

  const canSave = useMemo(() => !saving && profile != null, [saving, profile]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        interest_country: 'IT',
        interest_region_id: regionId,
        interest_province_id: provinceId,
        interest_municipality_id: municipalityId,
        foot: (foot || '').trim() || null,
        height_cm: heightCm === '' ? null : Number(heightCm),
        weight_kg: weightKg === '' ? null : Number(weightKg),
        notify_email_new_message: !!notifyEmail,
      };

      const r = await fetch('/api/profiles/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error ?? 'Salvataggio non riuscito');
      }

      setMessage('Profilo aggiornato correttamente.');
      router.refresh();
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  }

  if (loading) {
    return <div className="rounded-xl border p-4 text-sm text-gray-600">Caricamento profilo…</div>;
  }
  if (error) {
    return <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error}</div>;
  }
  if (!profile) return null;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Interest area (DB-driven) */}
      <section className="rounded-2xl border p-4 md:p-5">
        <h2 className="mb-3 text-lg font-semibold">Zona di interesse</h2>
        <div className="grid gap-4 md:grid-cols-4">
          {/* Paese (fisso IT) */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Paese</label>
            <select className="rounded-lg border p-2" value="IT" disabled>
              <option value="IT">Italia</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Regione</label>
            <select
              className="rounded-lg border p-2"
              value={regionId ?? ''}
              onChange={(e) => setRegionId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— Seleziona regione —</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Provincia</label>
            <select
              className="rounded-lg border p-2 disabled:bg-gray-50"
              value={provinceId ?? ''}
              onChange={(e) => setProvinceId(e.target.value ? Number(e.target.value) : null)}
              disabled={!regionId}
            >
              <option value="">— Seleziona provincia —</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Città</label>
            <select
              className="rounded-lg border p-2 disabled:bg-gray-50"
              value={municipalityId ?? ''}
              onChange={(e) => setMunicipalityId(e.target.value ? Number(e.target.value) : null)}
              disabled={!provinceId}
            >
              <option value="">— Seleziona città —</option>
              {municipalities.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          I menu sono alimentati dal DB (RPC <code>location_children</code> con fallback su tabelle).
        </p>
      </section>

      {/* Dettagli atleta */}
      <section className="rounded-2xl border p-4 md:p-5">
        <h2 className="mb-3 text-lg font-semibold">Dettagli atleta</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Piede preferito</label>
            <select className="rounded-lg border p-2" value={foot} onChange={(e) => setFoot(e.target.value)}>
              <option value="">— Seleziona —</option>
              <option value="Destro">Destro</option>
              <option value="Sinistro">Sinistro</option>
              <option value="Ambidestro">Ambidestro</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Altezza (cm)</label>
            <input
              type="number"
              inputMode="numeric"
              className="rounded-lg border p-2"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value === '' ? '' : Number(e.target.value))}
              min={100}
              max={230}
              placeholder="es. 183"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Peso (kg)</label>
            <input
              type="number"
              inputMode="numeric"
              className="rounded-lg border p-2"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value === '' ? '' : Number(e.target.value))}
              min={40}
              max={150}
              placeholder="es. 85"
            />
          </div>
        </div>
      </section>

      {/* Notifiche */}
      <section className="rounded-2xl border p-4 md:p-5">
        <h2 className="mb-3 text-lg font-semibold">Notifiche</h2>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={notifyEmail}
            onChange={(e) => setNotifyEmail(e.target.checked)}
          />
          <span className="text-sm">Email per nuovi messaggi</span>
        </label>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!canSave}
          className="rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? 'Salvataggio…' : 'Salva profilo'}
        </button>
        {message && <span className="text-sm text-green-700">{message}</span>}
        {error && <span className="text-sm text-red-700">{error}</span>}
      </div>
    </form>
  );
}
