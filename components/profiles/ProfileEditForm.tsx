// components/profiles/ProfileEditForm.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

type LocationLevel = 'region' | 'province' | 'municipality';
type LocationRow   = { id: number; name: string };
type AccountType   = 'club' | 'athlete' | null;

type Links = {
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  x?: string | null;
};

type Profile = {
  account_type: AccountType;

  // anagrafica comune
  full_name: string | null;
  bio: string | null;
  country: string | null; // ISO2 o testo

  // atleta
  birth_year: number | null;
  birth_place: string | null; // fallback (estero)
  city: string | null;        // residenza (estero)

  // residenza IT (atleta)
  residence_region_id: number | null;
  residence_province_id: number | null;
  residence_municipality_id: number | null;

  // nascita IT (atleta)
  birth_country: string | null; // ISO2 o testo
  birth_region_id: number | null;
  birth_province_id: number | null;
  birth_municipality_id: number | null;

  // interessi geo (comune)
  interest_country: string | null;
  interest_region_id: number | null;
  interest_province_id: number | null;
  interest_municipality_id: number | null;

  // atleta
  foot: string | null;
  height_cm: number | null;
  weight_kg: number | null;

  // club (nuovi)
  sport: string | null;
  club_foundation_year: number | null;
  club_stadium: string | null;
  club_league_category: string | null;

  // social / notifiche
  links: Links | null;
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

// elenco paesi
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

/** Normalizza una nazione in formato ISO2, se possibile */
function normalizeCountryCode(v?: string | null) {
  const s = (v || '').trim();
  if (!s) return null;
  if (/^[A-Za-z]{2}$/.test(s)) return s.toUpperCase();

  const aliases: Record<string, string> = {
    it: 'IT', italia: 'IT', italy: 'IT',
    francia: 'FR', france: 'FR',
    spagna: 'ES', spain: 'ES',
    germania: 'DE', germany: 'DE',
    portogallo: 'PT', portugal: 'PT',
    uk: 'GB', 'united kingdom': 'GB', 'regno unito': 'GB',
    usa: 'US', 'stati uniti': 'US', 'united states': 'US',
  };
  const key = s.toLowerCase();
  if (aliases[key]) return aliases[key];

  try {
    // @ts-ignore
    const codes: string[] = (Intl as any).supportedValuesOf?.('region') ?? [];
    const dnIt = new Intl.DisplayNames(['it'], { type: 'region' });
    const dnEn = new Intl.DisplayNames(['en'], { type: 'region' });
    for (const code of codes) {
      if (
        (dnIt.of(code) || '').toLowerCase() === key ||
        (dnEn.of(code) || '').toLowerCase() === key
      ) {
        return code.toUpperCase();
      }
    }
  } catch {}
  return s.toUpperCase();
}

/** categorie/campionati per sport (estendibile) */
const CATEGORIES_BY_SPORT: Record<string, string[]> = {
  Calcio: [
    'Serie D',
    'Eccellenza',
    'Promozione',
    'Prima Categoria',
    'Seconda Categoria',
    'Terza Categoria',
    'Giovanili',
    'Altro',
  ],
  Basket: ['Serie A', 'A2', 'B', 'C Gold', 'C Silver', 'D', 'Giovanili', 'Altro'],
  Pallavolo: ['SuperLega', 'A2', 'A3', 'B', 'C', 'D', 'Giovanili', 'Altro'],
  Rugby: ['Top10', 'Serie A', 'Serie B', 'Serie C', 'Giovanili', 'Altro'],
};

/* ------------------------------ */

export default function ProfileEditForm() {
  const router = useRouter();

  // Profile
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isClub = profile?.account_type === 'club';

  // Anagrafica base
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('IT');

  // Atleta only
  const [birthYear, setBirthYear] = useState<number | ''>('');
  const [birthPlace, setBirthPlace] = useState('');
  const [residenceCity, setResidenceCity] = useState('');

  // Residenza IT (atleta)
  const [resRegionId, setResRegionId] = useState<number | null>(null);
  const [resProvinceId, setResProvinceId] = useState<number | null>(null);
  const [resMunicipalityId, setResMunicipalityId] = useState<number | null>(null);
  const [regionsRes, setRegionsRes] = useState<LocationRow[]>([]);
  const [provincesRes, setProvincesRes] = useState<LocationRow[]>([]);
  const [municipalitiesRes, setMunicipalitiesRes] = useState<LocationRow[]>([]);

  // Nascita (atleta)
  const [birthCountry, setBirthCountry] = useState('IT');
  const [birthRegionId, setBirthRegionId] = useState<number | null>(null);
  const [birthProvinceId, setBirthProvinceId] = useState<number | null>(null);
  const [birthMunicipalityId, setBirthMunicipalityId] = useState<number | null>(null);
  const [regionsBirth, setRegionsBirth] = useState<LocationRow[]>([]);
  const [provincesBirth, setProvincesBirth] = useState<LocationRow[]>([]);
  const [municipalitiesBirth, setMunicipalitiesBirth] = useState<LocationRow[]>([]);

  // Zona interesse (comune)
  const [regionId, setRegionId] = useState<number | null>(null);
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [municipalityId, setMunicipalityId] = useState<number | null>(null);
  const [regions, setRegions] = useState<LocationRow[]>([]);
  const [provinces, setProvinces] = useState<LocationRow[]>([]);
  const [municipalities, setMunicipalities] = useState<LocationRow[]>([]);

  // Atleta + notifiche
  const [foot, setFoot] = useState('');
  const [heightCm, setHeightCm] = useState<number | ''>('');
  const [weightKg, setWeightKg] = useState<number | ''>('');
  const [notifyEmail, setNotifyEmail] = useState(true);

  // Social
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook]   = useState('');
  const [tiktok, setTiktok]       = useState('');
  const [x, setX]                 = useState('');

  // Club only
  const [sport, setSport] = useState('Calcio');
  const [clubCategory, setClubCategory] = useState('Altro');
  const [foundationYear, setFoundationYear] = useState<number | ''>('');
  const [stadium, setStadium] = useState('');

  // categorie dinamiche per sport
  const sportCategories = CATEGORIES_BY_SPORT[sport] ?? ['Altro'];

  async function loadProfile() {
    const r = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
    if (!r.ok) throw new Error('Impossibile leggere il profilo');
    const raw = await r.json().catch(() => ({}));
    const j = pickData<Partial<Profile>>(raw) || {};

    const p: Profile = {
      account_type: (j?.account_type ?? null) as AccountType,

      full_name: (j as any)?.full_name ?? null,
      bio: (j as any)?.bio ?? null,
      country: (j as any)?.country ?? 'IT',

      // atleta
      birth_year: (j as any)?.birth_year ?? null,
      birth_place: (j as any)?.birth_place ?? null,
      city: (j as any)?.city ?? null,

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
      sport: (j as any)?.sport ?? 'Calcio',
      club_foundation_year: (j as any)?.club_foundation_year ?? null,
      club_stadium: (j as any)?.club_stadium ?? null,
      club_league_category: (j as any)?.club_league_category ?? null,

      links: (j as any)?.links ?? null,
      notify_email_new_message: Boolean(j?.notify_email_new_message ?? true),
    };

    setProfile(p);

    // init form fields (normalizzo a ISO2 per sicurezza)
    setFullName(p.full_name || '');
    setBio(p.bio || '');
    setCountry(normalizeCountryCode(p.country) || 'IT');

    // atleta
    setBirthYear(p.birth_year ?? '');
    setBirthPlace(p.birth_place || '');
    setResidenceCity(p.city || '');

    setResRegionId(p.residence_region_id);
    setResProvinceId(p.residence_province_id);
    setResMunicipalityId(p.residence_municipality_id);

    setBirthCountry(normalizeCountryCode(p.birth_country) || 'IT');
    setBirthRegionId(p.birth_region_id);
    setBirthProvinceId(p.birth_province_id);
    setBirthMunicipalityId(p.birth_municipality_id);

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
    setSport(p.sport || 'Calcio');
    setClubCategory(p.club_league_category || 'Altro');
    setFoundationYear(p.club_foundation_year ?? '');
    setStadium(p.club_stadium || '');
  }

  // prima load
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await loadProfile();

        // liste iniziali
        setRegions(sortByName(await rpcChildren('region', null)));
        setRegionsRes(sortByName(await rpcChildren('region', null)));
        setRegionsBirth(sortByName(await rpcChildren('region', null)));

        if (regionId != null) setProvinces(sortByName(await rpcChildren('province', regionId)));
        if (provinceId != null) setMunicipalities(sortByName(await rpcChildren('municipality', provinceId)));

        if (resRegionId != null) setProvincesRes(sortByName(await rpcChildren('province', resRegionId)));
        if (resProvinceId != null) setMunicipalitiesRes(sortByName(await rpcChildren('municipality', resProvinceId)));

        if (birthRegionId != null) setProvincesBirth(sortByName(await rpcChildren('province', birthRegionId)));
        if (birthProvinceId != null) setMunicipalitiesBirth(sortByName(await rpcChildren('municipality', birthProvinceId)));
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? 'Errore caricamento profilo');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // residenza cascade (atleta)
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

  // nascita cascade (atleta)
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

  // interesse cascade (comune)
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

  const canSave = useMemo(() => !saving && profile != null, [saving, profile]);
  const currentYear = new Date().getFullYear();

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
        facebook:  normalizeSocial('facebook',  facebook)  ?? undefined,
        tiktok:    normalizeSocial('tiktok',    tiktok)    ?? undefined,
        x:         normalizeSocial('x',         x)         ?? undefined,
      };
      Object.keys(links).forEach((k) => (links as any)[k] === undefined && delete (links as any)[k]);

      const basePayload: any = {
        full_name: (fullName || '').trim() || null,
        bio:       (bio || '').trim() || null,
        country:   normalizeCountryCode(country),   // ISO2 sempre

        // interesse
        interest_country: 'IT',
        interest_region_id: regionId,
        interest_province_id: provinceId,
        interest_municipality_id: municipalityId,

        // social & notifiche
        links,
        notify_email_new_message: !!notifyEmail,
      };

      if (isClub) {
        Object.assign(basePayload, {
          sport: (sport || '').trim() || null,
          club_league_category: (clubCategory || '').trim() || null,
          club_foundation_year: foundationYear === '' ? null : Number(foundationYear),
          club_stadium: (stadium || '').trim() || null,

          // pulizia campi atleta
          birth_year: null,
          birth_place: null,
          residence_region_id: null,
          residence_province_id: null,
          residence_municipality_id: null,
          birth_country: null,
          birth_region_id: null,
          birth_province_id: null,
          birth_municipality_id: null,
          foot: null,
          height_cm: null,
          weight_kg: null,
        });
      } else {
        // ATLETA
        Object.assign(basePayload, {
          birth_year: birthYear === '' ? null : Number(birthYear),

          // residenza
          residence_region_id: resRegionId,
          residence_province_id: resProvinceId,
          residence_municipality_id: resMunicipalityId,
          city: (residenceCity || '').trim() || null, // solo estero

          // nascita
          birth_country: normalizeCountryCode(birthCountry), // <<< ISO2
          birth_region_id:      birthCountry === 'IT' ? birthRegionId      : null,
          birth_province_id:    birthCountry === 'IT' ? birthProvinceId    : null,
          birth_municipality_id:birthCountry === 'IT' ? birthMunicipalityId: null,
          birth_place:          birthCountry !== 'IT' ? (birthPlace || '').trim() || null : null,

          // atleta
          foot: (foot || '').trim() || null,
          height_cm: heightCm === '' ? null : Number(heightCm),
          weight_kg: weightKg === '' ? null : Number(weightKg),

          // pulizia campi club
          sport: null,
          club_league_category: null,
          club_foundation_year: null,
          club_stadium: null,
        });
      }

      const r = await fetch('/api/profiles/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(basePayload),
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
    <>
      {/* Titolo sintetico per la pagina */}
      <h1 className="mb-1 text-2xl font-bold">{isClub ? 'CLUB' : 'ATLETA'}</h1>
      <p className="mb-4 text-sm text-gray-500">
        Aggiorna i tuoi dati per migliorare il matching con club e opportunità.
      </p>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Dati personali / club */}
        <section className="rounded-2xl border p-4 md:p-5">
          <h2 className="mb-3 text-lg font-semibold">
            {isClub ? 'Dati club' : 'Dati personali'}
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-sm text-gray-600">
                {isClub ? 'Nome del club' : 'Nome e cognome'}
              </label>
              <input
                className="rounded-lg border p-2"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={isClub ? 'Es. ASD Carlentini' : 'Es. Mario Rossi'}
              />
            </div>

            {!isClub && (
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-600">Anno di nascita</label>
                <input
                  type="number"
                  inputMode="numeric"
                  className="rounded-lg border p-2"
                  value={birthYear}
                  onChange={(e) =>
                    setBirthYear(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  min={1950}
                  max={new Date().getFullYear() - 5}
                  placeholder="Es. 2002"
                />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600">Nazionalità</label>
              <select
                className="rounded-lg border p-2"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
              {country && (
                <span className="text-xs text-gray-500">{countryPreview}</span>
              )}
            </div>

            <div className="md:col-span-2 flex flex-col gap-1">
              <label className="text-sm text-gray-600">Biografia</label>
              <textarea
                className="rounded-lg border p-2"
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={
                  isClub
                    ? 'Storia, valori, palmarès…'
                    : 'Racconta in breve ruolo, caratteristiche, esperienze…'
                }
              />
            </div>
          </div>
        </section>

        {/* Residenza (solo atleta) */}
        {!isClub && (
          <section className="rounded-2xl border p-4 md:p-5">
            <h2 className="mb-3 text-lg font-semibold">Luogo di residenza</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-600">Regione</label>
                <select
                  className="rounded-lg border p-2"
                  value={resRegionId ?? ''}
                  onChange={(e) =>
                    setResRegionId(e.target.value ? Number(e.target.value) : null)
                  }
                >
                  <option value="">— Seleziona regione —</option>
                  {regionsRes.map((r) => (
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
                  value={resProvinceId ?? ''}
                  onChange={(e) =>
                    setResProvinceId(e.target.value ? Number(e.target.value) : null)
                  }
                  disabled={!resRegionId}
                >
                  <option value="">— Seleziona provincia —</option>
                  {provincesRes.map((p) => (
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
                  value={resMunicipalityId ?? ''}
                  onChange={(e) =>
                    setResMunicipalityId(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  disabled={!resProvinceId}
                >
                  <option value="">— Seleziona città —</option>
                  {municipalitiesRes.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Se vivi all’estero, lascia vuoto e indica la città qui sotto.
            </p>
            <div className="mt-2 flex flex-col gap-1">
              <label className="text-sm text-gray-600">
                Residenza (estero) – città (solo se NON Italia)
              </label>
              <input
                className="rounded-lg border p-2"
                value={residenceCity}
                onChange={(e) => setResidenceCity(e.target.value)}
                placeholder="Es. Madrid"
              />
            </div>
          </section>
        )}

        {/* Nascita (solo atleta) */}
        {!isClub && (
          <section className="rounded-2xl border p-4 md:p-5">
            <h2 className="mb-3 text-lg font-semibold">Luogo di nascita</h2>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-600">Paese di nascita</label>
                <select
                  className="rounded-lg border p-2"
                  value={birthCountry}
                  onChange={(e) => setBirthCountry(e.target.value)}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {birthCountry === 'IT' ? (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-gray-600">Regione</label>
                    <select
                      className="rounded-lg border p-2"
                      value={birthRegionId ?? ''}
                      onChange={(e) =>
                        setBirthRegionId(
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                    >
                      <option value="">— Seleziona regione —</option>
                      {regionsBirth.map((r) => (
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
                      value={birthProvinceId ?? ''}
                      onChange={(e) =>
                        setBirthProvinceId(
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                      disabled={!birthRegionId}
                    >
                      <option value="">— Seleziona provincia —</option>
                      {provincesBirth.map((p) => (
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
                      value={birthMunicipalityId ?? ''}
                      onChange={(e) =>
                        setBirthMunicipalityId(
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                      disabled={!birthProvinceId}
                    >
                      <option value="">— Seleziona città —</option>
                      {municipalitiesBirth.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div className="md:col-span-3 flex flex-col gap-1">
                  <label className="text-sm text-gray-600">Città di nascita (estero)</label>
                  <input
                    className="rounded-lg border p-2"
                    value={birthPlace}
                    onChange={(e) => setBirthPlace(e.target.value)}
                    placeholder="Es. Paris"
                  />
                </div>
              )}
            </div>
          </section>
        )}

        {/* Zona di interesse (comune) */}
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
        </section>

        {/* Dettagli atleta / club */}
        {isClub ? (
          <section className="rounded-2xl border p-4 md:p-5">
            <h2 className="mb-3 text-lg font-semibold">Dettagli club</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-600">Sport</label>
                <select
                  className="rounded-lg border p-2"
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                >
                  {Object.keys(CATEGORIES_BY_SPORT).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-600">Categoria / Campionato</label>
                <select
                  className="rounded-lg border p-2"
                  value={clubCategory}
                  onChange={(e) => setClubCategory(e.target.value)}
                >
                  {sportCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-600">Anno di fondazione</label>
                <input
                  type="number"
                  inputMode="numeric"
                  className="rounded-lg border p-2"
                  value={foundationYear}
                  onChange={(e) =>
                    setFoundationYear(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  min={1850}
                  max={currentYear}
                  placeholder="es. 1926"
                />
              </div>

              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-sm text-gray-600">Stadio / Impianto</label>
                <input
                  className="rounded-lg border p-2"
                  value={stadium}
                  onChange={(e) => setStadium(e.target.value)}
                  placeholder='Es. "Sebastiano Romano"'
                />
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border p-4 md:p-5">
            <h2 className="mb-3 text-lg font-semibold">Dettagli atleta</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-600">Piede preferito</label>
                <select
                  className="rounded-lg border p-2"
                  value={foot}
                  onChange={(e) => setFoot(e.target.value)}
                >
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
                  onChange={(e) =>
                    setHeightCm(e.target.value === '' ? '' : Number(e.target.value))
                  }
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
                  onChange={(e) =>
                    setWeightKg(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  min={40}
                  max={150}
                  placeholder="es. 85"
                />
              </div>
            </div>
          </section>
        )}

        {/* Social */}
        <section className="rounded-2xl border p-4 md:p-5">
          <h2 className="mb-3 text-lg font-semibold">Profili social</h2>
          <p className="mb-3 text-xs text-gray-500">
            Inserisci URL completi o semplici @handle.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600">Instagram</label>
              <input
                className="rounded-lg border p-2"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@tuonome oppure https://instagram.com/tuonome"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600">Facebook</label>
              <input
                className="rounded-lg border p-2"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="pagina o profilo"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600">TikTok</label>
              <input
                className="rounded-lg border p-2"
                value={tiktok}
                onChange={(e) => setTiktok(e.target.value)}
                placeholder="@tuonome"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600">X (Twitter)</label>
              <input
                className="rounded-lg border p-2"
                value={x}
                onChange={(e) => setX(e.target.value)}
                placeholder="@tuonome"
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
    </>
  );
}
