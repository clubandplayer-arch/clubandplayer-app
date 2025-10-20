'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

type LocationLevel = 'region' | 'province' | 'municipality';

type LocationRow = { id: number; name: string };
type AccountType = 'club' | 'athlete' | null;

type Links = {
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  x?: string | null;
};

type Profile = {
  account_type: AccountType;

  // anagrafica
  full_name: string | null;
  bio: string | null;
  birth_year: number | null;
  birth_place: string | null; // testo libero fallback
  city: string | null;        // residenza libera fallback
  country: string | null;     // nazionalità (ISO2 o stringa)

  // residenza (nuovi)
  residence_region_id: number | null;
  residence_province_id: number | null;
  residence_municipality_id: number | null;

  // nascita (nuovi)
  birth_country: string | null;      // ISO2 o stringa
  birth_region_id: number | null;
  birth_province_id: number | null;
  birth_municipality_id: number | null;

  // interessi geo (esistenti)
  interest_country: string | null;
  interest_region_id: number | null;
  interest_province_id: number | null;
  interest_municipality_id: number | null;

  // atleta
  foot: string | null;
  height_cm: number | null;
  weight_kg: number | null;

  // club
  club_founded_year?: number | null;
  club_sport?: string | null;
  club_category?: string | null;
  club_stadium?: string | null;
  club_country?: string | null;
  club_region_id?: number | null;
  club_province_id?: number | null;
  club_municipality_id?: number | null;

  // social
  links: Links | null;

  // notifiche
  notify_email_new_message: boolean;
};

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* ---------- helpers ---------- */
function pickData<T = any>(raw: any): T {
  if (raw && typeof raw === 'object' && 'data' in raw) return (raw as any).data as T;
  return raw as T;
}
const sortByName = (arr: LocationRow[]) =>
  [...arr].sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'accent' }));

async function rpcChildren(level: LocationLevel, parent: number | null) {
  try {
    const { data, error } = await supabase.rpc('location_children', { level, parent });
    if (!error && Array.isArray(data)) return sortByName(data as LocationRow[]);
  } catch {}
  if (level === 'region') {
    const { data } = await supabase.from('regions').select('id,name').order('name', { ascending: true });
    return sortByName((data ?? []) as LocationRow[]);
  }
  if (level === 'province') {
    if (parent == null) return [];
    const { data } = await supabase
      .from('provinces').select('id,name').eq('region_id', parent).order('name', { ascending: true });
    return sortByName((data ?? []) as LocationRow[]);
  }
  if (parent == null) return [];
  const { data } = await supabase
    .from('municipalities').select('id,name').eq('province_id', parent).order('name', { ascending: true });
  return sortByName((data ?? []) as LocationRow[]);
}

// elenco paesi (per country & birth_country)
function getCountries(): { code: string; name: string }[] {
  try {
    // @ts-ignore
    const codes: string[] = (Intl as any).supportedValuesOf?.('region') ?? [];
    const two = codes.filter((c) => /^[A-Z]{2}$/.test(c));
    const dn = new Intl.DisplayNames(['it'], { type: 'region' });
    return two
      .map((code) => ({ code, name: dn.of(code) || code }))
      .sort((a, b) => a.name.localeCompare(b.name, 'it'));
  } catch {
    return [{ code: 'IT', name: 'Italia' }];
  }
}
const COUNTRIES = getCountries();

function flagEmoji(iso2?: string | null) {
  const code = (iso2 || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return '';
  const A = 0x1f1e6, a = 'A'.charCodeAt(0);
  return String.fromCodePoint(A + code.charCodeAt(0) - a) + String.fromCodePoint(A + code.charCodeAt(1) - a);
}
function countryName(codeOrText?: string | null) {
  if (!codeOrText) return '';
  const v = codeOrText.trim();
  if (/^[A-Za-z]{2}$/.test(v)) {
    try {
      const dn = new Intl.DisplayNames(['it'], { type: 'region' });
      return dn.of(v.toUpperCase()) || v.toUpperCase();
    } catch {
      return v.toUpperCase();
    }
  }
  return v;
}

// categorie per sport (estendibile)
const SPORT_CATEGORIES: Record<string, string[]> = {
  Calcio: ['Serie D', 'Eccellenza', 'Promozione', 'Prima Categoria', 'Seconda Categoria', 'Terza Categoria', 'Giovanili'],
  Basket: ['Serie A', 'Serie A2', 'Serie B Nazionale', 'Serie B Interregionale', 'Serie C Unica', 'Serie D Regionale', 'Giovanili'],
  Pallavolo: ['SuperLega', 'Serie A2', 'Serie A3', 'Serie B', 'Serie C', 'Serie D', 'Prima Divisione', 'Seconda Divisione', 'Terza Divisione', 'Giovanili'],
  Rugby: ['Serie A Élite', 'Serie A', 'Serie B', 'Serie C', 'Giovanili'],
};
// ------------------------------

export default function ProfileEditForm() {
  const router = useRouter();

  // Profile state
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Anagrafica base
  const [fullName, setFullName] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [birthYear, setBirthYear] = useState<number | ''>('');
  const [birthPlace, setBirthPlace] = useState<string>(''); // fallback solo se birth_country != IT
  const [residenceCity, setResidenceCity] = useState<string>(''); // fallback per estero
  const [country, setCountry] = useState<string>('IT'); // nazionalità

  // Residenza (Italia)
  const [resRegionId, setResRegionId] = useState<number | null>(null);
  const [resProvinceId, setResProvinceId] = useState<number | null>(null);
  const [resMunicipalityId, setResMunicipalityId] = useState<number | null>(null);

  const [regionsRes, setRegionsRes] = useState<LocationRow[]>([]);
  const [provincesRes, setProvincesRes] = useState<LocationRow[]>([]);
  const [municipalitiesRes, setMunicipalitiesRes] = useState<LocationRow[]>([]);

  // Nascita
  const [birthCountry, setBirthCountry] = useState<string>('IT');
  const [birthRegionId, setBirthRegionId] = useState<number | null>(null);
  const [birthProvinceId, setBirthProvinceId] = useState<number | null>(null);
  const [birthMunicipalityId, setBirthMunicipalityId] = useState<number | null>(null);

  const [regionsBirth, setRegionsBirth] = useState<LocationRow[]>([]);
  const [provincesBirth, setProvincesBirth] = useState<LocationRow[]>([]);
  const [municipalitiesBirth, setMunicipalitiesBirth] = useState<LocationRow[]>([]);

  // Zona di interesse (come prima)
  const [regionId, setRegionId] = useState<number | null>(null);
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [municipalityId, setMunicipalityId] = useState<number | null>(null);
  const [regions, setRegions] = useState<LocationRow[]>([]);
  const [provinces, setProvinces] = useState<LocationRow[]>([]);
  const [municipalities, setMunicipalities] = useState<LocationRow[]>([]);

  // Atleta + notifiche
  const [foot, setFoot] = useState<string>('');
  const [heightCm, setHeightCm] = useState<number | ''>('');
  const [weightKg, setWeightKg] = useState<number | ''>('');
  const [notifyEmail, setNotifyEmail] = useState<boolean>(true);

  // Social
  const [instagram, setInstagram] = useState<string>('');
  const [facebook, setFacebook] = useState<string>('');
  const [tiktok, setTiktok] = useState<string>('');
  const [x, setX] = useState<string>('');

  // -------- Club --------
  const [clubSport, setClubSport] = useState('Calcio');
  const [clubCategory, setClubCategory] = useState('');
  const [clubFounded, setClubFounded] = useState<number | ''>('');
  const [clubStadium, setClubStadium] = useState('');
  const [clubCountry, setClubCountry] = useState('IT');
  const [clubRegionId, setClubRegionId] = useState<number | null>(null);
  const [clubProvinceId, setClubProvinceId] = useState<number | null>(null);
  const [clubMunicipalityId, setClubMunicipalityId] = useState<number | null>(null);
  const [clubRegions, setClubRegions] = useState<LocationRow[]>([]);
  const [clubProvinces, setClubProvinces] = useState<LocationRow[]>([]);
  const [clubMunicipalities, setClubMunicipalities] = useState<LocationRow[]>([]);

  async function loadProfile() {
    const r = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
    if (!r.ok) throw new Error('Impossibile leggere il profilo');
    const raw = await r.json().catch(() => ({}));
    const j = pickData<Partial<Profile>>(raw) || {};

    const p: Profile = {
      account_type: (j?.account_type ?? null) as AccountType,

      full_name: (j as any)?.full_name ?? null,
      bio: (j as any)?.bio ?? null,
      birth_year: (j as any)?.birth_year ?? null,
      birth_place: (j as any)?.birth_place ?? null,
      city: (j as any)?.city ?? null,
      country: (j as any)?.country ?? 'IT',

      residence_region_id: (j as any)?.residence_region_id ?? null,
      residence_province_id: (j as any)?.residence_province_id ?? null,
      residence_municipality_id: (j as any)?.residence_municipality_id ?? null,

      birth_country: (j as any)?.birth_country ?? 'IT',
      birth_region_id: (j as any)?.birth_region_id ?? null,
      birth_province_id: (j as any)?.birth_province_id ?? null,
      birth_municipality_id: (j as any)?.birth_municipality_id ?? null,

      interest_country: j?.interest_country ?? 'IT',
      interest_region_id: j?.interest_region_id ?? null,
      interest_province_id: j?.interest_province_id ?? null,
      interest_municipality_id: j?.interest_municipality_id ?? null,

      foot: j?.foot ?? '',
      height_cm: j?.height_cm ?? null,
      weight_kg: j?.weight_kg ?? null,

      // club
      club_founded_year: (j as any)?.club_founded_year ?? null,
      club_sport: (j as any)?.club_sport ?? null,
      club_category: (j as any)?.club_category ?? null,
      club_stadium: (j as any)?.club_stadium ?? null,
      club_country: (j as any)?.club_country ?? 'IT',
      club_region_id: (j as any)?.club_region_id ?? null,
      club_province_id: (j as any)?.club_province_id ?? null,
      club_municipality_id: (j as any)?.club_municipality_id ?? null,

      links: (j as any)?.links ?? null,

      notify_email_new_message: Boolean(j?.notify_email_new_message ?? true),
    };

    setProfile(p);

    // init form fields
    setFullName(p.full_name || '');
    setBio(p.bio || '');
    setBirthYear(p.birth_year ?? '');
    setBirthPlace(p.birth_place || '');
    setResidenceCity(p.city || '');
    setCountry(p.country || 'IT');

    // residenza
    setResRegionId(p.residence_region_id);
    setResProvinceId(p.residence_province_id);
    setResMunicipalityId(p.residence_municipality_id);

    // nascita
    setBirthCountry(p.birth_country || 'IT');
    setBirthRegionId(p.birth_region_id);
    setBirthProvinceId(p.birth_province_id);
    setBirthMunicipalityId(p.birth_municipality_id);

    // interesse (come prima)
    setRegionId(p.interest_region_id);
    setProvinceId(p.interest_province_id);
    setMunicipalityId(p.interest_municipality_id);

    setFoot(p.foot || '');
    setHeightCm(p.height_cm ?? '');
    setWeightKg(p.weight_kg ?? '');
    setNotifyEmail(Boolean(p.notify_email_new_message));

    setInstagram(p.links?.instagram || '');
    setFacebook(p.links?.facebook || '');
    setTiktok(p.links?.tiktok || '');
    setX(p.links?.x || '');

    // club
    setClubSport(p.club_sport || 'Calcio');
    setClubCategory(p.club_category || '');
    setClubFounded(p.club_founded_year ?? '');
    setClubStadium(p.club_stadium || '');
    setClubCountry(p.club_country || 'IT');
    setClubRegionId(p.club_region_id ?? null);
    setClubProvinceId(p.club_province_id ?? null);
    setClubMunicipalityId(p.club_municipality_id ?? null);
  }

  // prima load
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await loadProfile();

        // liste iniziali
        const regs = await rpcChildren('region', null);
        setRegions(sortByName(regs));
        setRegionsRes(sortByName(regs));
        setRegionsBirth(sortByName(regs));
        setClubRegions(sortByName(regs));

        if (regionId != null) setProvinces(sortByName(await rpcChildren('province', regionId)));
        if (provinceId != null) setMunicipalities(sortByName(await rpcChildren('municipality', provinceId)));

        if (resRegionId != null) setProvincesRes(sortByName(await rpcChildren('province', resRegionId)));
        if (resProvinceId != null) setMunicipalitiesRes(sortByName(await rpcChildren('municipality', resProvinceId)));

        if (birthRegionId != null) setProvincesBirth(sortByName(await rpcChildren('province', birthRegionId)));
        if (birthProvinceId != null) setMunicipalitiesBirth(sortByName(await rpcChildren('municipality', birthProvinceId)));

        if (clubRegionId != null) setClubProvinces(sortByName(await rpcChildren('province', clubRegionId)));
        if (clubProvinceId != null) setClubMunicipalities(sortByName(await rpcChildren('municipality', clubProvinceId)));
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? 'Errore caricamento profilo');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // residenza cascade
  useEffect(() => {
    (async () => {
      if (resRegionId == null) {
        setProvincesRes([]); setResProvinceId(null);
        setMunicipalitiesRes([]); setResMunicipalityId(null);
        return;
      }
      const ps = await rpcChildren('province', resRegionId);
      setProvincesRes(ps);
      setResProvinceId((prev) => (ps.some((p) => p.id === prev) ? prev : null));
      setMunicipalitiesRes([]); setResMunicipalityId(null);
    })();
  }, [resRegionId]);
  useEffect(() => {
    (async () => {
      if (resProvinceId == null) { setMunicipalitiesRes([]); setResMunicipalityId(null); return; }
      const ms = await rpcChildren('municipality', resProvinceId);
      setMunicipalitiesRes(ms);
      setResMunicipalityId((prev) => (ms.some((m) => m.id === prev) ? prev : null));
    })();
  }, [resProvinceId]);

  // nascita cascade (solo se IT)
  useEffect(() => {
    (async () => {
      if (birthCountry !== 'IT') { setBirthRegionId(null); setBirthProvinceId(null); setBirthMunicipalityId(null); return; }
      if (birthRegionId == null) { setProvincesBirth([]); setBirthProvinceId(null); setMunicipalitiesBirth([]); setBirthMunicipalityId(null); return; }
      const ps = await rpcChildren('province', birthRegionId);
      setProvincesBirth(ps);
      setBirthProvinceId((prev) => (ps.some((p) => p.id === prev) ? prev : null));
      setMunicipalitiesBirth([]); setBirthMunicipalityId(null);
    })();
  }, [birthCountry, birthRegionId]);
  useEffect(() => {
    (async () => {
      if (birthCountry !== 'IT' || birthProvinceId == null) { setMunicipalitiesBirth([]); setBirthMunicipalityId(null); return; }
      const ms = await rpcChildren('municipality', birthProvinceId);
      setMunicipalitiesBirth(ms);
      setBirthMunicipalityId((prev) => (ms.some((m) => m.id === prev) ? prev : null));
    })();
  }, [birthCountry, birthProvinceId]);

  // interesse cascade (come prima)
  useEffect(() => {
    (async () => {
      if (regionId == null) { setProvinces([]); setProvinceId(null); setMunicipalities([]); setMunicipalityId(null); return; }
      const ps = await rpcChildren('province', regionId);
      setProvinces(ps);
      setProvinceId((prev) => (ps.some((p) => p.id === prev) ? prev : null));
      setMunicipalities([]); setMunicipalityId(null);
    })();
  }, [regionId]);
  useEffect(() => {
    (async () => {
      if (provinceId == null) { setMunicipalities([]); setMunicipalityId(null); return; }
      const ms = await rpcChildren('municipality', provinceId);
      setMunicipalities(ms);
      setMunicipalityId((prev) => (ms.some((m) => m.id === prev) ? prev : null));
    })();
  }, [provinceId]);

  // club cascade
  useEffect(() => {
    (async () => {
      if (clubRegionId == null) {
        setClubProvinces([]); setClubProvinceId(null);
        setClubMunicipalities([]); setClubMunicipalityId(null);
        return;
      }
      const ps = await rpcChildren('province', clubRegionId);
      setClubProvinces(ps);
      setClubProvinceId((prev) => (ps.some((p) => p.id === prev) ? prev : null));
      setClubMunicipalities([]); setClubMunicipalityId(null);
    })();
  }, [clubRegionId]);
  useEffect(() => {
    (async () => {
      if (clubProvinceId == null) { setClubMunicipalities([]); setClubMunicipalityId(null); return; }
      const ms = await rpcChildren('municipality', clubProvinceId);
      setClubMunicipalities(ms);
      setClubMunicipalityId((prev) => (ms.some((m) => m.id === prev) ? prev : null));
    })();
  }, [clubProvinceId]);

  const canSave = useMemo(() => !saving && profile != null, [saving, profile]);
  const currentYear = new Date().getFullYear();
  const isClub = profile?.account_type === 'club';

  function normalizeSocial(kind: keyof Links, value: string): string | null {
    const v = (value || '').trim();
    if (!v) return null;
    const isUrl = /^https?:\/\//i.test(v);
    const map: Record<keyof Links, (h: string) => string> = {
      instagram: (h) => `https://instagram.com/${h.replace(/^@/, '')}`,
      facebook: (h) => (isUrl ? h : `https://facebook.com/${h.replace(/^@/, '')}`),
      tiktok: (h) => `https://tiktok.com/@${h.replace(/^@/, '')}`,
      x: (h) => `https://twitter.com/${h.replace(/^@/, '')}`,
    };
    if (isUrl) return v;
    return map[kind](v);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const links: Links = {
        instagram: normalizeSocial('instagram', instagram) ?? undefined,
        facebook: normalizeSocial('facebook', facebook) ?? undefined,
        tiktok: normalizeSocial('tiktok', tiktok) ?? undefined,
        x: normalizeSocial('x', x) ?? undefined,
      };
      Object.keys(links).forEach((k) => (links as any)[k] === undefined && delete (links as any)[k]);

      const payload: any = {
        // anagrafica
        full_name: (fullName || '').trim() || null,
        bio: (bio || '').trim() || null,
        birth_year: birthYear === '' ? null : Number(birthYear),

        // residenza
        residence_region_id: resRegionId,
        residence_province_id: resProvinceId,
        residence_municipality_id: resMunicipalityId,
        city: (residenceCity || '').trim() || null, // usata solo se residenza ESTERA

        // nascita
        birth_country: birthCountry || null,
        birth_region_id: birthCountry === 'IT' ? birthRegionId : null,
        birth_province_id: birthCountry === 'IT' ? birthProvinceId : null,
        birth_municipality_id: birthCountry === 'IT' ? birthMunicipalityId : null,
        birth_place: birthCountry !== 'IT' ? (birthPlace || '').trim() || null : null,

        // nazionalità
        country: (country || '').trim() || null,

        // interesse geo (come prima)
        interest_country: 'IT',
        interest_region_id: regionId,
        interest_province_id: provinceId,
        interest_municipality_id: municipalityId,

        // atleta
        foot: (foot || '').trim() || null,
        height_cm: heightCm === '' ? null : Number(heightCm),
        weight_kg: weightKg === '' ? null : Number(weightKg),

        // social
        links,

        // notifiche
        notify_email_new_message: !!notifyEmail,
      };

      // se è un club: aggiungi campi club e disattiva atleta
      if (isClub) {
        Object.assign(payload, {
          club_founded_year: clubFounded === '' ? null : Number(clubFounded),
          club_sport: (clubSport || '').trim() || null,
          club_category: (clubCategory || '').trim() || null,
          club_stadium: (clubStadium || '').trim() || null,
          club_country: (clubCountry || '').trim() || 'IT',
          club_region_id: clubRegionId,
          club_province_id: clubProvinceId,
          club_municipality_id: clubMunicipalityId,

          foot: null,
          height_cm: null,
          weight_kg: null,
        });
      }

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

      await loadProfile();
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

  const countryPreview = country ? `${flagEmoji(country)} ${countryName(country)}` : '';

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Dati personali */}
      <section className="rounded-2xl border p-4 md:p-5">
        <h2 className="mb-3 text-lg font-semibold">Dati personali</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">{isClub ? 'Nome del club' : 'Nome e cognome'}</label>
            <input className="rounded-lg border p-2" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={isClub ? 'Es. ASD Carlentini Calcio' : 'Es. Mario Rossi'}/>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Anno di nascita</label>
            <input type="number" inputMode="numeric" className="rounded-lg border p-2" value={birthYear}
              onChange={(e) => setBirthYear(e.target.value === '' ? '' : Number(e.target.value))}
              min={1950} max={currentYear - 5} placeholder="Es. 2002"/>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Nazionalità</label>
            <select className="rounded-lg border p-2" value={country} onChange={(e) => setCountry(e.target.value)}>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
            {country && <span className="text-xs text-gray-500">{countryPreview}</span>}
          </div>
          <div className="md:col-span-2 flex flex-col gap-1">
            <label className="text-sm text-gray-600">Biografia</label>
            <textarea className="rounded-lg border p-2" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder={isClub ? "Storia, valori, palmarès…" : "Ruolo, caratteristiche, esperienze…"} />
          </div>
        </div>
      </section>

      {/* Residenza (Italia) */}
      <section className="rounded-2xl border p-4 md:p-5">
        <h2 className="mb-3 text-lg font-semibold">Luogo di residenza</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Regione</label>
            <select className="rounded-lg border p-2" value={resRegionId ?? ''} onChange={(e) => setResRegionId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">— Seleziona regione —</option>
              {regionsRes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Provincia</label>
            <select className="rounded-lg border p-2 disabled:bg-gray-50" value={resProvinceId ?? ''} onChange={(e) => setResProvinceId(e.target.value ? Number(e.target.value) : null)} disabled={!resRegionId}>
              <option value="">— Seleziona provincia —</option>
              {provincesRes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Città</label>
            <select className="rounded-lg border p-2 disabled:bg-gray-50" value={resMunicipalityId ?? ''} onChange={(e) => setResMunicipalityId(e.target.value ? Number(e.target.value) : null)} disabled={!resProvinceId}>
              <option value="">— Seleziona città —</option>
              {municipalitiesRes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">Se vivi all’estero, lascia vuoto e indica la città nel campo “Residenza (estero)” sotto.</p>
        <div className="mt-2 flex flex-col gap-1">
          <label className="text-sm text-gray-600">Residenza (estero) – città (solo se NON Italia)</label>
          <input className="rounded-lg border p-2" value={residenceCity} onChange={(e) => setResidenceCity(e.target.value)} placeholder="Es. Madrid"/>
        </div>
      </section>

      {/* Nascita */}
      <section className="rounded-2xl border p-4 md:p-5">
        <h2 className="mb-3 text-lg font-semibold">Luogo di nascita</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Paese di nascita</label>
            <select className="rounded-lg border p-2" value={birthCountry} onChange={(e) => setBirthCountry(e.target.value)}>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>

          {birthCountry === 'IT' ? (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-600">Regione</label>
                <select className="rounded-lg border p-2" value={birthRegionId ?? ''} onChange={(e) => setBirthRegionId(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">— Seleziona regione —</option>
                  {regionsBirth.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-600">Provincia</label>
                <select className="rounded-lg border p-2 disabled:bg-gray-50" value={birthProvinceId ?? ''} onChange={(e) => setBirthProvinceId(e.target.value ? Number(e.target.value) : null)} disabled={!birthRegionId}>
                  <option value="">— Seleziona provincia —</option>
                  {provincesBirth.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-600">Città</label>
                <select className="rounded-lg border p-2 disabled:bg-gray-50" value={birthMunicipalityId ?? ''} onChange={(e) => setBirthMunicipalityId(e.target.value ? Number(e.target.value) : null)} disabled={!birthProvinceId}>
                  <option value="">— Seleziona città —</option>
                  {municipalitiesBirth.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </>
          ) : (
            <div className="md:col-span-3 flex flex-col gap-1">
              <label className="text-sm text-gray-600">Città di nascita (estero)</label>
              <input className="rounded-lg border p-2" value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} placeholder="Es. Paris"/>
            </div>
          )}
        </div>
      </section>

      {/* Zona di interesse (come prima) */}
      <section className="rounded-2xl border p-4 md:p-5">
        <h2 className="mb-3 text-lg font-semibold">Zona di interesse</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Paese</label>
            <select className="rounded-lg border p-2" value="IT" disabled><option value="IT">Italia</option></select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Regione</label>
            <select className="rounded-lg border p-2" value={regionId ?? ''} onChange={(e) => setRegionId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">— Seleziona regione —</option>
              {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Provincia</label>
            <select className="rounded-lg border p-2 disabled:bg-gray-50" value={provinceId ?? ''} onChange={(e) => setProvinceId(e.target.value ? Number(e.target.value) : null)} disabled={!regionId}>
              <option value="">— Seleziona provincia —</option>
              {provinces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Città</label>
            <select className="rounded-lg border p-2 disabled:bg-gray-50" value={municipalityId ?? ''} onChange={(e) => setMunicipalityId(e.target.value ? Number(e.target.value) : null)} disabled={!provinceId}>
              <option value="">— Seleziona città —</option>
              {municipalities.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* Dettagli atleta (solo se NON club) */}
      {!isClub && (
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
              <input type="number" inputMode="numeric" className="rounded-lg border p-2" value={heightCm}
                onChange={(e) => setHeightCm(e.target.value === '' ? '' : Number(e.target.value))}
                min={100} max={230} placeholder="es. 183"/>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600">Peso (kg)</label>
              <input type="number" inputMode="numeric" className="rounded-lg border p-2" value={weightKg}
                onChange={(e) => setWeightKg(e.target.value === '' ? '' : Number(e.target.value))}
                min={40} max={150} placeholder="es. 85"/>
            </div>
          </div>
        </section>
      )}

      {/* CLUB — Dettagli (solo se club) */}
      {isClub && (
        <>
          <section className="rounded-2xl border p-4 md:p-5">
            <h2 className="mb-3 text-lg font-semibold">Dettagli club</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-600">Sport</label>
                <select className="rounded-lg border p-2" value={clubSport} onChange={(e) => { setClubSport(e.target.value); setClubCategory(''); }}>
                  {Object.keys(SPORT_CATEGORIES).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-600">Categoria / Campionato</label>
                <select className="rounded-lg border p-2" value={clubCategory} onChange={(e) => setClubCategory(e.target.value)}>
                  <option value="">— Seleziona —</option>
                  {(SPORT_CATEGORIES[clubSport] ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-600">Anno di fondazione</label>
                <input type="number" inputMode="numeric" className="rounded-lg border p-2" value={clubFounded}
                  onChange={(e) => setClubFounded(e.target.value === '' ? '' : Number(e.target.value))}
                  min={1850} max={currentYear} placeholder="Es. 1970" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-600">Stadio / Impianto</label>
                <input className="rounded-lg border p-2" value={clubStadium} onChange={(e) => setClubStadium(e.target.value)} placeholder="Es. Stadio Comunale" />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border p-4 md:p-5">
            <h2 className="mb-3 text-lg font-semibold">Sede del club</h2>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-600">Paese</label>
                <select className="rounded-lg border p-2" value={clubCountry} onChange={(e) => setClubCountry(e.target.value)}>
                  <option value="IT">Italia</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-600">Regione</label>
                <select className="rounded-lg border p-2" value={clubRegionId ?? ''} onChange={(e) => setClubRegionId(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">— Seleziona regione —</option>
                  {clubRegions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-600">Provincia</label>
                <select className="rounded-lg border p-2 disabled:bg-gray-50" value={clubProvinceId ?? ''} onChange={(e) => setClubProvinceId(e.target.value ? Number(e.target.value) : null)} disabled={!clubRegionId}>
                  <option value="">— Seleziona provincia —</option>
                  {clubProvinces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-600">Città</label>
                <select className="rounded-lg border p-2 disabled:bg-gray-50" value={clubMunicipalityId ?? ''} onChange={(e) => setClubMunicipalityId(e.target.value ? Number(e.target.value) : null)} disabled={!clubProvinceId}>
                  <option value="">— Seleziona città —</option>
                  {clubMunicipalities.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Social */}
      <section className="rounded-2xl border p-4 md:p-5">
        <h2 className="mb-3 text-lg font-semibold">Profili social</h2>
        <p className="mb-3 text-xs text-gray-500">Inserisci URL completi o semplici @handle.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Instagram</label>
            <input className="rounded-lg border p-2" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@tuonome oppure https://instagram.com/tuonome"/>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Facebook</label>
            <input className="rounded-lg border p-2" value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="pagina o profilo"/>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">TikTok</label>
            <input className="rounded-lg border p-2" value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="@tuonome"/>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">X (Twitter)</label>
            <input className="rounded-lg border p-2" value={x} onChange={(e) => setX(e.target.value)} placeholder="@tuonome"/>
          </div>
        </div>
      </section>

      {/* Notifiche */}
      <section className="rounded-2xl border p-4 md:p-5">
        <h2 className="mb-3 text-lg font-semibold">Notifiche</h2>
        <label className="flex items-center gap-3">
          <input type="checkbox" className="h-4 w-4" checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)}/>
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
