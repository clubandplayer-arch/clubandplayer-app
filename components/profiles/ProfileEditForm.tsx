'use client';

import { useEffect, useMemo, useState } from 'react';
import { COUNTRIES, ITALY_REGIONS, PROVINCES_BY_REGION, CITIES_BY_PROVINCE } from '@/lib/opps/geo';
import { SPORTS, SPORTS_ROLES } from '@/lib/opps/constants';

type Foot = 'Destro' | 'Sinistro' | 'Ambidestro' | '';
type Visibility = 'public' | 'private' | '';

type ServerProfile = {
  id?: string;
  display_name?: string;
  bio?: string;
  height_cm?: number | null;
  weight_kg?: number | null;
  foot?: string | null;
  sport?: string | null;
  role?: string | null;
  interest_country?: string | null;
  interest_region?: string | null;
  interest_province?: string | null;
  interest_city?: string | null;
  visibility?: Visibility | null;
  // fallback shapes
  profile?: any;
};

export default function ProfileEditForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [pid, setPid] = useState<string | null>(null);

  // Campi base
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');

  // Fisico/tecnico
  const [height, setHeight] = useState<string>(''); // mantengo come string per input number
  const [weight, setWeight] = useState<string>('');
  const [foot, setFoot] = useState<Foot>('');

  // Sport & ruolo
  const [sport, setSport] = useState<string>('');
  const roleOptions = useMemo(() => SPORTS_ROLES[sport] ?? [], [sport]);
  const [role, setRole] = useState<string>('');

  // Zona di interesse (usiamo LABEL paese — “Italia” abilita select region/provincia/città)
  const [interestCountry, setInterestCountry] = useState<string>('Italia');
  const [interestRegion, setInterestRegion] = useState<string>('');
  const [interestProvince, setInterestProvince] = useState<string>('');
  const [interestCity, setInterestCity] = useState<string>('');

  const provinces = useMemo(
    () => (interestCountry === 'Italia' ? PROVINCES_BY_REGION[interestRegion] ?? [] : []),
    [interestCountry, interestRegion]
  );
  const cities = useMemo(
    () => (interestCountry === 'Italia' ? CITIES_BY_PROVINCE[interestProvince] ?? [] : []),
    [interestCountry, interestProvince]
  );

  const [visibility, setVisibility] = useState<Visibility>('public');

  // Carica profilo
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      setOkMsg(null);
      try {
        const r = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        const t = await r.text();
        if (!r.ok) throw new Error(t || `HTTP ${r.status}`);
        const j = t ? JSON.parse(t) : {};
        // il payload può essere {data}, {profile} o piatto
        const p: ServerProfile = j?.data ?? j?.profile ?? j ?? {};

        if (cancelled) return;

        setPid(p?.id ?? p?.profile?.id ?? null);
        setDisplayName(p?.display_name ?? p?.profile?.display_name ?? '');
        setBio(p?.bio ?? p?.profile?.bio ?? '');

        setHeight((p?.height_cm ?? p?.profile?.height_cm ?? '')?.toString() || '');
        setWeight((p?.weight_kg ?? p?.profile?.weight_kg ?? '')?.toString() || '');
        setFoot(((p?.foot ?? p?.profile?.foot) as Foot) ?? '');

        const initSport = (p?.sport ?? p?.profile?.sport ?? '') as string;
        setSport(initSport);
        setRole((p?.role ?? p?.profile?.role ?? '') as string);

        setInterestCountry((p?.interest_country ?? p?.profile?.interest_country ?? 'Italia') as string);
        setInterestRegion((p?.interest_region ?? p?.profile?.interest_region ?? '') as string);
        setInterestProvince((p?.interest_province ?? p?.profile?.interest_province ?? '') as string);
        setInterestCity((p?.interest_city ?? p?.profile?.interest_city ?? '') as string);

        setVisibility((p?.visibility ?? p?.profile?.visibility ?? 'public') as Visibility);
      } catch (e: any) {
        if (!cancelled) setErr(e.message || 'Errore nel caricamento profilo');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function resetLocationCascade(countryLabel: string) {
    setInterestCountry(countryLabel);
    if (countryLabel !== 'Italia') {
      setInterestRegion('');
      setInterestProvince('');
      setInterestCity('');
    }
  }
  function onChangeRegion(r: string) {
    setInterestRegion(r);
    setInterestProvince('');
    setInterestCity('');
  }
  function onChangeProvince(p: string) {
    setInterestProvince(p);
    setInterestCity('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOkMsg(null);

    const h = height.trim() ? Number(height) : null;
    const w = weight.trim() ? Number(weight) : null;
    if (h != null && (isNaN(h) || h < 100 || h > 230)) {
      setErr('Altezza non valida (100–230 cm).');
      return;
    }
    if (w != null && (isNaN(w) || w < 30 || w > 180)) {
      setErr('Peso non valido (30–180 kg).');
      return;
    }

    const payload = {
      display_name: displayName.trim() || null,
      bio: bio.trim() || null,
      height_cm: h,
      weight_kg: w,
      foot: foot || null,
      sport: sport || null,
      role: role || null,
      interest_country: interestCountry || null,
      interest_region: interestRegion || null,
      interest_province: interestCountry === 'Italia' ? interestProvince || null : null,
      interest_city: interestCity || null,
      visibility: visibility || 'public',
      type: 'athlete',
    };

    setSaving(true);
    try {
      // PATCH su /api/profiles/{id} se lo abbiamo, altrimenti /api/profiles/me
      const url = pid ? `/api/profiles/${pid}` : '/api/profiles/me';
      const r = await fetch(url, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const t = await r.text();
      const j = t ? JSON.parse(t) : {};
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setOkMsg('Profilo aggiornato ✅');
    } catch (e: any) {
      setErr(e.message || 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-4">Caricamento profilo…</div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {err && <div className="border rounded-lg p-3 bg-red-50 text-red-700">{err}</div>}
      {okMsg && <div className="border rounded-lg p-3 bg-green-50 text-green-700">{okMsg}</div>}

      {/* Dati base */}
      <section className="bg-white rounded-xl border p-4 space-y-3">
        <h2 className="text-sm font-semibold">Dati base</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Nome mostrato</label>
            <input
              className="w-full rounded-xl border px-3 py-2"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Es. Gabriele Basso"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Visibilità</label>
            <select
              className="w-full rounded-xl border px-3 py-2"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as Visibility)}
            >
              <option value="public">Pubblico</option>
              <option value="private">Privato</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Bio</label>
          <textarea
            className="w-full rounded-xl border px-3 py-2 min-h-24"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Breve descrizione del tuo profilo, esperienze, obiettivi…"
          />
        </div>
      </section>

      {/* Fisico & Tecnico */}
      <section className="bg-white rounded-xl border p-4 space-y-3">
        <h2 className="text-sm font-semibold">Dati fisici & tecnici</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Altezza (cm)</label>
            <input
              inputMode="numeric"
              className="w-full rounded-xl border px-3 py-2"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="182"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Peso (kg)</label>
            <input
              inputMode="numeric"
              className="w-full rounded-xl border px-3 py-2"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="78"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Piede</label>
            <select
              className="w-full rounded-xl border px-3 py-2"
              value={foot}
              onChange={(e) => setFoot(e.target.value as Foot)}
            >
              <option value="">—</option>
              <option value="Destro">Destro</option>
              <option value="Sinistro">Sinistro</option>
              <option value="Ambidestro">Ambidestro</option>
            </select>
          </div>
        </div>
      </section>

      {/* Sport & Ruolo */}
      <section className="bg-white rounded-xl border p-4 space-y-3">
        <h2 className="text-sm font-semibold">Sport & ruolo</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Sport</label>
            <select
              className="w-full rounded-xl border px-3 py-2"
              value={sport}
              onChange={(e) => { setSport(e.target.value); setRole(''); }}
            >
              <option value="">—</option>
              {SPORTS.map((s: string) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ruolo</label>
            <select
              className="w-full rounded-xl border px-3 py-2"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="">—</option>
              {roleOptions.map((r: string) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Zona di interesse (per matching feed/opportunità) */}
      <section className="bg-white rounded-xl border p-4 space-y-3">
        <h2 className="text-sm font-semibold">Zona di interesse</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Paese</label>
            <select
              className="w-full rounded-xl border px-3 py-2"
              value={interestCountry}
              onChange={(e) => resetLocationCascade(e.target.value)}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.label}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Regione</label>
            {interestCountry === 'Italia' ? (
              <select
                className="w-full rounded-xl border px-3 py-2"
                value={interestRegion}
                onChange={(e) => onChangeRegion(e.target.value)}
              >
                <option value="">—</option>
                {ITALY_REGIONS.map((r: string) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            ) : (
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={interestRegion}
                onChange={(e) => setInterestRegion(e.target.value)}
                placeholder="Regione/Area"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Provincia</label>
            {interestCountry === 'Italia' && provinces.length > 0 ? (
              <select
                className="w-full rounded-xl border px-3 py-2"
                value={interestProvince}
                onChange={(e) => onChangeProvince(e.target.value)}
              >
                <option value="">—</option>
                {provinces.map((p: string) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            ) : (
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={interestProvince}
                onChange={(e) => setInterestProvince(e.target.value)}
                placeholder="Provincia/Contea"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Città</label>
            {interestCountry === 'Italia' && cities.length > 0 ? (
              <select
                className="w-full rounded-xl border px-3 py-2"
                value={interestCity}
                onChange={(e) => setInterestCity(e.target.value)}
              >
                <option value="">—</option>
                {cities.map((c: string) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            ) : (
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={interestCity}
                onChange={(e) => setInterestCity(e.target.value)}
                placeholder="Città"
              />
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500">
          La zona di interesse personalizza il feed e le opportunità suggerite.
        </p>
      </section>

      <div className="flex items-center justify-end gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-gray-900 text-white"
        >
          {saving ? 'Salvataggio…' : 'Salva profilo'}
        </button>
      </div>
    </form>
  );
}
