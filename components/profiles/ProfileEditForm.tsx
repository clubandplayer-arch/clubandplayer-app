// components/profiles/ProfileEditForm.tsx
'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import AvatarUploader from '@/components/profiles/AvatarUploader';
import { SPORTS } from '@/lib/opps/constants';
import { COUNTRIES } from '@/lib/opps/geo';
import ClubStadiumMapPicker from './ClubStadiumMapPicker';

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
  avatar_url: string | null;
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
  club_stadium_lat: number | null;
  club_stadium_lng: number | null;
  club_stadium_address: string | null;

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
const DEFAULT_CLUB_CATEGORIES: string[] = ['Altro'];
const CLUB_SPORT_OPTIONS = Array.from(new Set([...SPORTS, 'Pallavolo']));

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
  Futsal: ['Serie A', 'A2', 'B', 'C1', 'C2', 'Giovanili', 'Altro'],
  Volley: ['SuperLega', 'A2', 'A3', 'B', 'C', 'D', 'Giovanili', 'Altro'],
  Pallavolo: ['SuperLega', 'A2', 'A3', 'B', 'C', 'D', 'Giovanili', 'Altro'],
  Basket: ['Serie A', 'A2', 'B', 'C Gold', 'C Silver', 'D', 'Giovanili', 'Altro'],
  Pallanuoto: ['Serie A1', 'A2', 'B', 'C', 'Giovanili', 'Altro'],
  Pallamano: ['Serie A Gold', 'A Silver', 'B', 'A2 Femminile', 'Giovanili', 'Altro'],
  Rugby: ['Top10', 'Serie A', 'Serie B', 'Serie C', 'Giovanili', 'Altro'],
  'Hockey su prato': ['Serie A1', 'A2', 'Serie B', 'Giovanili', 'Altro'],
  'Hockey su ghiaccio': [
    'Serie A',
    'Italian Hockey League',
    'IHL - Division I',
    'U19',
    'Altro',
  ],
  Baseball: ['Serie A', 'Serie B', 'Serie C', 'Giovanili', 'Altro'],
  Softball: ['Serie A1', 'Serie A2', 'Serie B', 'Giovanili', 'Altro'],
  Lacrosse: ['Serie A', 'Serie B', 'Giovanili', 'Altro'],
  'Football americano': [
    'Prima Divisione',
    'Seconda Divisione',
    'Terza Divisione',
    'College',
    'Giovanili',
    'Altro',
  ],
};

function SectionCard({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="glass-panel border border-white/20 p-5 md:p-6 shadow-lg space-y-3">
      <div>
        <h2 className="heading-h2 mb-1 text-2xl md:text-3xl">{title}</h2>
        {description && <p className="text-sm text-gray-600">{description}</p>}
      </div>
      {children}
    </section>
  );
}

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
  const labelClass = 'text-xs font-semibold uppercase tracking-[0.08em] text-gray-500';

  // Anagrafica base
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('IT');

  // Atleta only
  const [birthYear, setBirthYear] = useState<number | ''>('');
  const [clubCity, setClubCity] = useState('');

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
  const [stadiumName, setStadiumName] = useState('');
  const [stadiumAddress, setStadiumAddress] = useState('');
  const [stadiumLat, setStadiumLat] = useState<number | null>(null);
  const [stadiumLng, setStadiumLng] = useState<number | null>(null);

  // categorie dinamiche per sport
  const sportCategories = CATEGORIES_BY_SPORT[sport] ?? DEFAULT_CLUB_CATEGORIES;

  useEffect(() => {
    if (!sportCategories.includes(clubCategory)) {
      setClubCategory(sportCategories[0] ?? 'Altro');
    }
  }, [sport, sportCategories, clubCategory]);

  async function loadProfile() {
    const r = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
    if (!r.ok) throw new Error('Impossibile leggere il profilo');
    const raw = await r.json().catch(() => ({}));
    const j = pickData<Partial<Profile>>(raw) || {};

    const p: Profile = {
      account_type: (j?.account_type ?? null) as AccountType,

      full_name: (j as any)?.full_name ?? null,
      avatar_url: (j as any)?.avatar_url ?? null,
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
      club_stadium_lat: (j as any)?.club_stadium_lat ?? null,
      club_stadium_lng: (j as any)?.club_stadium_lng ?? null,
      club_stadium_address: (j as any)?.club_stadium_address ?? null,

      links: (j as any)?.links ?? null,
      notify_email_new_message: Boolean(j?.notify_email_new_message ?? true),
    };

    setProfile(p);

    // init form fields (normalizzo a ISO2 per sicurezza)
    setFullName(p.full_name || '');
    setAvatarUrl(p.avatar_url || null);
    setBio(p.bio || '');
    setCountry(normalizeCountryCode(p.country) || 'IT');

    // atleta
    setBirthYear(p.birth_year ?? '');
    setClubCity(p.city || '');

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
    setStadiumName(p.club_stadium || '');
    setStadiumAddress(p.club_stadium_address || '');
    setStadiumLat(p.club_stadium_lat ?? null);
    setStadiumLng(p.club_stadium_lng ?? null);
  }

  // prima load
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await loadProfile();

        // liste iniziali
        setRegions(sortByName(await rpcChildren('region', null)));

        if (regionId != null) setProvinces(sortByName(await rpcChildren('province', regionId)));
        if (provinceId != null) setMunicipalities(sortByName(await rpcChildren('municipality', provinceId)));
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? 'Errore caricamento profilo');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  useEffect(() => {
    if (isClub && country !== 'IT') {
      setRegionId(null);
      setProvinceId(null);
      setMunicipalityId(null);
      setProvinces([]);
      setMunicipalities([]);
    }
    if (isClub && country === 'IT') {
      setClubCity('');
    }
  }, [isClub, country]);

  const canSave = useMemo(() => !saving && profile != null, [saving, profile]);
  const currentYear = new Date().getFullYear();
  const normalizedCountry = normalizeCountryCode(country);
  const selectedMunicipality =
    isClub && country !== 'IT'
      ? null
      : municipalities.find((m) => m.id === municipalityId) || null;
  const interestCityName = selectedMunicipality?.name ?? '';

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
        country:   normalizedCountry,   // ISO2 sempre
        avatar_url: avatarUrl || null,

        // interesse
        interest_country: isClub ? normalizedCountry : 'IT',
        interest_region_id: isClub && country !== 'IT' ? null : regionId,
        interest_province_id: isClub && country !== 'IT' ? null : provinceId,
        interest_municipality_id: isClub && country !== 'IT' ? null : municipalityId,

        // social & notifiche
        links,
        notify_email_new_message: !!notifyEmail,
      };

      if (isClub) {
        const clubCityName =
          country === 'IT'
            ? selectedMunicipality?.name || null
            : (clubCity || '').trim() || null;

        Object.assign(basePayload, {
          sport: (sport || '').trim() || null,
          club_league_category: (clubCategory || '').trim() || null,
          club_foundation_year: foundationYear === '' ? null : Number(foundationYear),
          club_stadium: (stadiumName || '').trim() || null,
          club_stadium_address: (stadiumAddress || '').trim() || null,
          club_stadium_lat: stadiumLat == null ? null : Number(stadiumLat),
          club_stadium_lng: stadiumLng == null ? null : Number(stadiumLng),

          city: clubCityName,

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
        // PLAYER
        Object.assign(basePayload, {
          birth_year: birthYear === '' ? null : Number(birthYear),
          city: selectedMunicipality?.name ?? null,

          // atleta
          foot: (foot || '').trim() || null,
          height_cm: heightCm === '' ? null : Number(heightCm),
          weight_kg: weightKg === '' ? null : Number(weightKg),

          // pulizia campi club
          sport: null,
          club_league_category: null,
          club_foundation_year: null,
          club_stadium: null,
          club_stadium_address: null,
          club_stadium_lat: null,
          club_stadium_lng: null,

          // campi legacy non usati più
          residence_region_id: null,
          residence_province_id: null,
          residence_municipality_id: null,
          birth_country: null,
          birth_region_id: null,
          birth_province_id: null,
          birth_municipality_id: null,
          birth_place: null,
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
      <div className="space-y-1">
        <h1 className="heading-h1 text-3xl md:text-4xl">{isClub ? 'Profilo Club' : 'Profilo Player'}</h1>
        <p className="text-sm text-gray-600">
          {isClub
            ? 'Tutte le informazioni essenziali del club raccolte in un’unica scheda chiara.'
            : 'Aggiorna i tuoi dati per migliorare il matching con club e opportunità.'}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <SectionCard
          title={isClub ? 'Dati club' : 'Dati personali'}
          description={
            isClub
              ? 'Nome, località, sport e dettagli principali del club (usiamo le stesse opzioni della mappa e delle mini-card).'
              : undefined
          }
        >
          {isClub ? (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className={labelClass}>Foto profilo</span>
                    <AvatarUploader value={avatarUrl} onChange={setAvatarUrl} />
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>La foto viene mostrata nelle mini-card della bacheca.</span>
                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setAvatarUrl(null)}
                          className="font-medium text-red-600 hover:underline"
                        >
                          Rimuovi foto
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className={labelClass}>Nome del club</span>
                    <input
                      className="input"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Es. ASD Carlentini"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <span className={labelClass}>Sport del club</span>
                      <select
                        className="select"
                        value={sport}
                        onChange={(e) => setSport(e.target.value)}
                      >
                        {CLUB_SPORT_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <span className={labelClass}>Categoria / Campionato</span>
                      <select
                        className="select"
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

                    <div className="space-y-2">
                      <span className={labelClass}>Anno di fondazione</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        className="input"
                        value={foundationYear}
                        onChange={(e) =>
                          setFoundationYear(
                            e.target.value === '' ? '' : Number(e.target.value)
                          )
                        }
                        min={1850}
                    max={currentYear}
                    placeholder="es. 1926"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <ClubStadiumMapPicker
                    value={{
                      name: stadiumName,
                      address: stadiumAddress,
                      lat: stadiumLat,
                      lng: stadiumLng,
                    }}
                    onChange={(next) => {
                      setStadiumName(next.name || '');
                      setStadiumAddress(next.address || '');
                      setStadiumLat(next.lat);
                      setStadiumLng(next.lng);
                    }}
                  />
                </div>
              </div>

                  <div className="space-y-2">
                    <span className={labelClass}>Biografia del club</span>
                    <textarea
                      className="textarea"
                      rows={4}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Storia, valori, palmarès…"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/30 bg-white/60 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className={labelClass}>Località</span>
                  {country && (
                    <span className="text-xs text-gray-600">{countryPreview}</span>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <span className={labelClass}>Nazione del club</span>
                    <select
                      className="select"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {country === 'IT' ? (
                    <>
                      <div className="space-y-2">
                        <span className={labelClass}>Regione del club</span>
                        <select
                          className="select"
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

                      <div className="space-y-2">
                        <span className={labelClass}>Provincia del club</span>
                        <select
                          className="select disabled:bg-gray-50"
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

                      <div className="space-y-2">
                        <span className={labelClass}>Città del club</span>
                        <select
                          className="select disabled:bg-gray-50"
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
                    </>
                  ) : (
                    <div className="space-y-2 md:col-span-3">
                      <span className={labelClass}>Città del club</span>
                      <input
                        className="input"
                        value={clubCity}
                        onChange={(e) => setClubCity(e.target.value)}
                        placeholder="Es. Sydney"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-sm text-gray-600">Foto profilo</label>
                <AvatarUploader value={avatarUrl} onChange={setAvatarUrl} />
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>La foto viene mostrata nelle mini-card della bacheca.</span>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl(null)}
                      className="font-medium text-red-600 hover:underline"
                    >
                      Rimuovi foto
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1 md:col-span-2">
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
                  onChange={(e) =>
                    setBirthYear(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  min={1950}
                  max={new Date().getFullYear() - 5}
                  placeholder="Es. 2002"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-600">Nazionalità</label>
                <select
                  className="rounded-lg border p-2"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
                {country && (
                  <span className="text-xs text-gray-500">{countryPreview}</span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-600">Città (dalla zona di interesse)</label>
                <input
                  className="rounded-lg border bg-gray-50 p-2"
                  value={interestCityName}
                  placeholder="Seleziona zona di interesse per impostare la città"
                  disabled
                />
                {!interestCityName && (
                  <span className="text-xs text-gray-500">
                    Seleziona regione, provincia e città nella sezione "Zona di interesse".
                  </span>
                )}
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
          )}
        </SectionCard>

        {/* Zona di interesse (atleta) */}
        {!isClub && (
          <SectionCard title="Zona di interesse">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1">
                <span className={labelClass}>Paese</span>
                <select className="select" value="IT" disabled>
                  <option value="IT">Italia</option>
                </select>
              </div>
              <div className="space-y-1">
                <span className={labelClass}>Regione</span>
                <select
                  className="select"
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
              <div className="space-y-1">
                <span className={labelClass}>Provincia</span>
                <select
                  className="select disabled:bg-gray-50"
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
              <div className="space-y-1">
                <span className={labelClass}>Città</span>
                <select
                  className="select disabled:bg-gray-50"
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
          </SectionCard>
        )}

        {/* Dettagli player */}
        {!isClub && (
          <SectionCard title="Dettagli Player">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <span className={labelClass}>Piede preferito</span>
                <select
                  className="select"
                  value={foot}
                  onChange={(e) => setFoot(e.target.value)}
                >
                  <option value="">— Seleziona —</option>
                  <option value="Destro">Destro</option>
                  <option value="Sinistro">Sinistro</option>
                  <option value="Ambidestro">Ambidestro</option>
                </select>
              </div>
              <div className="space-y-1">
                <span className={labelClass}>Altezza (cm)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  className="input"
                  value={heightCm}
                  onChange={(e) =>
                    setHeightCm(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  min={100}
                  max={230}
                  placeholder="es. 183"
                />
              </div>
              <div className="space-y-1">
                <span className={labelClass}>Peso (kg)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  className="input"
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
          </SectionCard>
        )}

        {/* Social */}
        <SectionCard title="Profili social" description="Inserisci URL completi o semplici @handle.">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <span className={labelClass}>Instagram</span>
              <input
                className="input"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@tuonome oppure https://instagram.com/tuonome"
              />
            </div>
            <div className="space-y-1">
              <span className={labelClass}>Facebook</span>
              <input
                className="input"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="pagina o profilo"
              />
            </div>
            <div className="space-y-1">
              <span className={labelClass}>TikTok</span>
              <input
                className="input"
                value={tiktok}
                onChange={(e) => setTiktok(e.target.value)}
                placeholder="@tuonome"
              />
            </div>
            <div className="space-y-1">
              <span className={labelClass}>X (Twitter)</span>
              <input
                className="input"
                value={x}
                onChange={(e) => setX(e.target.value)}
                placeholder="@tuonome"
              />
            </div>
          </div>
        </SectionCard>

        {/* Notifiche */}
        <SectionCard title="Notifiche">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.checked)}
            />
            <span className="text-sm">Email per nuovi messaggi</span>
          </label>
        </SectionCard>

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
