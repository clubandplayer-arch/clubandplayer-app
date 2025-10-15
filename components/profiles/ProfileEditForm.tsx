'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

type LocationLevel = 'region' | 'province' | 'municipality';
type LocationRow = { id: number; name: string };
type AccountType = 'club' | 'athlete' | null;

type Profile = {
  account_type: AccountType;
  // anagrafica
  full_name: string | null;
  bio: string | null;
  birth_year: number | null;
  city: string | null; // residenza testuale (se presente in schema)
  // interesse geografico
  interest_country: string | null;
  interest_region_id: number | null;
  interest_province_id: number | null;
  interest_municipality_id: number | null;
  // sport
  foot: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  // notifiche
  notify_email_new_message: boolean;
};

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- Helpers: RPC with fallback ---------------------------------------------
async function rpcChildren(level: LocationLevel, parent: number | null) {
  try {
    const { data, error } = await supabase.rpc('location_children', { level, parent });
    if (!error && Array.isArray(data)) return data as LocationRow[];
  } catch {}
  if (level === 'region') {
    const { data } = await supabase.from('regions').select('id,name').order('name', { ascending: true });
    return (data ?? []) as LocationRow[];
  }
  if (level === 'province') {
    if (parent == null) return [];
    const { data } = await supabase.from('provinces').select('id,name').eq('region_id', parent).order('name');
    return (data ?? []) as LocationRow[];
  }
  if (parent == null) return [];
  const { data } = await supabase
    .from('municipalities')
    .select('id,name')
    .eq('province_id', parent)
    .order('name');
  return (data ?? []) as LocationRow[];
}
// -----------------------------------------------------------------------------

export default function ProfileEditForm() {
  const router = useRouter();

  // state profilo
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // campi anagrafica
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [birthYear, setBirthYear] = useState<number | ''>('');
  const [residenceCity, setResidenceCity] = useState<string>(''); // se usi profiles.city

  // cascata interesse
  const [regionId, setRegionId] = useState<number | null>(null);
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [municipalityId, setMunicipalityId] = useState<number | null>(null);
  const [regions, setRegions] = useState<LocationRow[]>([]);
  const [provinces, setProvinces] = useState<LocationRow[]>([]);
  const [municipalities, setMunicipalities] = useState<LocationRow[]>([]);

  // sport
  const [foot, setFoot] = useState<string>('');
  const [heightCm, setHeightCm] = useState<number | ''>('');
  const [weightKg, setWeightKg] = useState<number | ''>('');
  const [notifyEmail, setNotifyEmail] = useState<boolean>(true);

  // prima load
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const r = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        if (!r.ok) throw new Error('Impossibile leggere il profilo');
        const j = await r.json();

        const p: Profile = {
          account_type: (j?.account_type ?? null) as AccountType,
          full_name: j?.full_name ?? null,
          bio: j?.bio ?? null,
          birth_year: j?.birth_year ?? null,
          city: j?.city ?? null,
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

        // init form
        setFullName(p.full_name || '');
        setBio(p.bio || '');
        setBirthYear(p.birth_year ?? '');
        setResidenceCity(p.city || '');

        setRegionId(p.interest_region_id);
        setProvinceId(p.interest_province_id);
        setMunicipalityId(p.interest_municipality_id);

        setFoot(p.foot || '');
        setHeightCm(p.height_cm ?? '');
        setWeightKg(p.weight_kg ?? '');
        setNotifyEmail(Boolean(p.notify_email_new_message));

        // geo
        const rs = await rpcChildren('region', null);
        setRegions(rs);
        if (p.interest_region_id) setProvinces(await rpcChildren('province', p.interest_region_id));
        if (p.interest_province_id) setMunicipalities(await rpcChildren('municipality', p.interest_province_id));
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? 'Errore caricamento profilo');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // cascata
  useEffect(() => {
    (async () => {
      if (regionId == null) {
        setProvinces([]); setProvinceId(null);
        setMunicipalities([]); setMunicipalityId(null);
        return;
      }
      const ps = await rpcChildren('province', regionId);
      setProvinces(ps);
      setProvinceId(prev => (ps.some(p => p.id === prev) ? prev : null));
      setMunicipalities([]); setMunicipalityId(null);
    })();
  }, [regionId]);

  useEffect(() => {
    (async () => {
      if (provinceId == null) { setMunicipalities([]); setMunicipalityId(null); return; }
      const ms = await rpcChildren('municipality', provinceId);
      setMunicipalities(ms);
      setMunicipalityId(prev => (ms.some(m => m.id === prev) ? prev : null));
    })();
  }, [provinceId]);

  const canSave = useMemo(() => !saving && profile != null, [saving, profile]);
  const currentYear = new Date().getFullYear();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true); setError(null); setMessage(null);

    try {
      const payload = {
        // anagrafica
        full_name: (fullName || '').trim() || null,
        bio: (bio || '').trim() || null,
        birth_year: birthYear === '' ? null : Number(birthYear),
        city: (residenceCity || '').trim() || null, // se la colonna esiste
        // interesse
        interest_country: 'IT',
        interest_region_id: regionId,
        interest_province_id: provinceId,
        interest_municipality_id: municipalityId,
        // sport
        foot: (foot || '').trim() || null,
        height_cm: heightCm === '' ? null : Number(heightCm),
        weight_kg: weightKg === '' ? null : Number(weightKg),
        // notifiche
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

  if (loading) return <div className="rounded-xl border p-4 text-sm text-gray-600">Caricamento profilo…</div>;
  if (error)   return <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error}</div>;
  if (!profile) return null;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Anagrafica */}
      <section className="rounded-2xl border p-4 md:p-5">
        <h2 className="mb-3 text-lg font-semibold">Dati personali</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Nome e cognome</label>
            <input
              className="rounded-lg border p-2"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Es. Mario Rossi"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Anno di nascita</label>
            <input
              type="number"
              inputMode="numeric"
              className="rounded-lg border p-2"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value === '' ? '' : Number(e.target.value))}
              min={1950}
              max={currentYear - 5}
              placeholder="Es. 2002"
            />
          </div>
          <div className="md:col-span-2 flex flex-col gap-1">
            <label className="text-sm text-gray-600">Città di residenza</label>
            <input
              className="rounded-lg border p-2"
              value={residenceCity}
              onChange={(e) => setResidenceCity(e.target.value)}
              placeholder="Es. Carlentini (SR)"
            />
          </div>
          <div className="md:col-span-2 flex flex-col gap-1">
            <label className="text-sm text-gray-600">Biografia</label>
            <textarea
              className="rounded-lg border p-2"
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Racconta in breve ruolo, caratteristiche, esperienze…"
            />
          </div>
        </div>
      </section>

      {/* Zona di interesse */}
      <section className="rounded-2xl border p-4 md:p-5">
        <h2 className="mb-3 text-lg font-semibold">Zona di interesse</h2>
        <div className="grid gap-4 md:grid-cols-4">
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
              {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
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
              {provinces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
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
              {municipalities.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
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
              type="number" inputMode="numeric" className="rounded-lg border p-2"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value === '' ? '' : Number(e.target.value))}
              min={100} max={230} placeholder="es. 183"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Peso (kg)</label>
            <input
              type="number" inputMode="numeric" className="rounded-lg border p-2"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value === '' ? '' : Number(e.target.value))}
              min={40} max={150} placeholder="es. 85"
            />
          </div>
        </div>
      </section>

      {/* Notifiche */}
      <section className="rounded-2xl border p-4 md:p-5">
        <h2 className="mb-3 text-lg font-semibold">Notifiche</h2>
        <label className="flex items-center gap-3">
          <input type="checkbox" className="h-4 w-4" checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} />
          <span className="text-sm">Email per nuovi messaggi</span>
        </label>
      </section>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={!canSave} className="rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60">
          {saving ? 'Salvataggio…' : 'Salva profilo'}
        </button>
        {message && <span className="text-sm text-green-700">{message}</span>}
        {error && <span className="text-sm text-red-700">{error}</span>}
      </div>
    </form>
  );
}
