'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { SPORTS, SPORTS_ROLES } from '@/lib/opps/constants';
import AvatarUploader from './AvatarUploader';

type LocationLevel = 'region' | 'province' | 'municipality';

type LocationRow = {
  id: number;
  name: string;
};

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
  avatar_url: string | null;
  birth_year: number | null;
  birth_place: string | null;
  city: string | null; // residenza
  country: string | null; // ISO2 o nome

  // sport
  sport: string | null;
  role: string | null;

  // interessi geo
  interest_country: string | null;
  interest_region_id: number | null;
  interest_province_id: number | null;
  interest_municipality_id: number | null;

  // atleta
  foot: string | null;
  height_cm: number | null;
  weight_kg: number | null;

  // social
  links: Links | null;

  // notifiche
  notify_email_new_message: boolean | null;
};

// Supabase browser client (solo per RPC/lookup location)
const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const DOMINANT_SIDE_OPTIONS = [
  { value: 'right', label: 'Destro' },
  { value: 'left', label: 'Sinistro' },
  { value: 'both', label: 'Ambidestro' },
] as const;

const SPORT_OPTIONS = SPORTS.map((label) => ({ value: label, label }));

/* ----------------- helpers piede/lato ----------------- */

function normalizeFoot(value: string | null | undefined): string {
  const raw = (value ?? '').toString().trim().toLowerCase();
  if (!raw) return '';
  if (['right', 'destro', 'dx', 'r'].includes(raw)) return 'right';
  if (['left', 'sinistro', 'sx', 'l'].includes(raw)) return 'left';
  if (['both', 'ambi', 'ambidestro', 'ambidextrous'].includes(raw)) return 'both';
  return '';
}

/**
 * Mappa il valore normalizzato verso i valori accettati
 * dal check constraint `profiles_foot_check`.
 */
function footToDb(value: string): string | null {
  if (value === 'right') return 'destro';
  if (value === 'left') return 'sinistro';
  if (value === 'both') return 'ambidestro';
  return null;
}

/* ----------------- helpers vari ----------------- */

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
  } catch {
    // fallback sotto
  }

  if (level === 'region') {
    const { data } = await supabase.from('regions').select('id,name').order('name', { ascending: true });
    return sortByName((data ?? []) as LocationRow[]);
  }

  if (level === 'province') {
    if (parent == null) return [];
    const { data } = await supabase
      .from('provinces')
      .select('id,name')
      .eq('region_id', parent)
      .order('name', { ascending: true });
    return sortByName((data ?? []) as LocationRow[]);
  }

  if (parent == null) return [];
  const { data } = await supabase
    .from('municipalities')
    .select('id,name')
    .eq('province_id', parent)
    .order('name', { ascending: true });
  return sortByName((data ?? []) as LocationRow[]);
}

// Social: normalizza → URL
function normalizeSocial(kind: keyof Links, value: string): string | null {
  const v = (value || '').trim();
  if (!v) return null;

  const isUrl = /^https?:\/\//i.test(v);
  if (isUrl) return v;

  const base: Record<keyof Links, string> = {
    instagram: 'https://instagram.com/',
    facebook: 'https://facebook.com/',
    tiktok: 'https://tiktok.com/@',
    x: 'https://twitter.com/',
  };

  const handle = v.replace(/^@/, '');
  return `${base[kind]}${handle}`;
}

// Flag emoji + nome localizzato (preview nazionalità)
function flagEmoji(iso2?: string | null) {
  const code = (iso2 || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return '';
  const A = 0x1f1e6;
  const a = 'A'.charCodeAt(0);
  return (
    String.fromCodePoint(A + code.charCodeAt(0) - a) +
    String.fromCodePoint(A + code.charCodeAt(1) - a)
  );
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

/* ================= COMPONENT ================= */

export default function ProfileEditForm() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // anagrafica
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [birthYear, setBirthYear] = useState<number | ''>('');
  const [birthPlace, setBirthPlace] = useState('');
  const [residenceCity, setResidenceCity] = useState('');
  const [country, setCountry] = useState('');

  // sport
  const [sport, setSport] = useState('');
  const [sportRole, setSportRole] = useState('');

  // geo interesse
  const [regionId, setRegionId] = useState<number | null>(null);
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [municipalityId, setMunicipalityId] = useState<number | null>(null);

  const [regions, setRegions] = useState<LocationRow[]>([]);
  const [provinces, setProvinces] = useState<LocationRow[]>([]);
  const [municipalities, setMunicipalities] = useState<LocationRow[]>([]);

  // atleta
  const [dominantSide, setDominantSide] = useState(''); // right/left/both
  const [heightCm, setHeightCm] = useState<number | ''>('');
  const [weightKg, setWeightKg] = useState<number | ''>('');

  // notifiche
  const [notifyEmail, setNotifyEmail] = useState(true);

  // social
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [x, setX] = useState('');

  const currentYear = new Date().getFullYear();

  const roleOptions = useMemo(
    () => (sport ? SPORTS_ROLES[sport] ?? [] : []),
    [sport]
  );

  // reset ruolo quando cambia sport
  useEffect(() => {
    if (!roleOptions.includes(sportRole)) {
      setSportRole('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport, roleOptions.length]);

  async function loadProfile() {
    const r = await fetch('/api/profiles/me', {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!r.ok) {
      throw new Error('Impossibile leggere il profilo');
    }
    const raw = await r.json().catch(() => ({}));
    const j = pickData<Partial<Profile>>(raw) || {};

    const p: Profile = {
      account_type: (j.account_type ?? null) as AccountType,
      full_name: j.full_name ?? '',
      bio: j.bio ?? '',
      avatar_url: j.avatar_url ?? '',
      birth_year: j.birth_year ?? null,
      birth_place: j.birth_place ?? '',
      city: j.city ?? '',
      country: j.country ?? '',
      sport: j.sport ?? '',
      role: j.role ?? '',
      interest_country: j.interest_country ?? 'IT',
      interest_region_id: j.interest_region_id ?? null,
      interest_province_id: j.interest_province_id ?? null,
      interest_municipality_id: j.interest_municipality_id ?? null,
      foot: j.foot ?? null,
      height_cm: j.height_cm ?? null,
      weight_kg: j.weight_kg ?? null,
      links: j.links ?? null,
      notify_email_new_message:
        typeof j.notify_email_new_message === 'boolean'
          ? j.notify_email_new_message
          : true,
    };

    setProfile(p);

    // init campi form
    setFullName(p.full_name || '');
    setBio(p.bio || '');
    setAvatarUrl(p.avatar_url || '');
    setBirthYear(p.birth_year ?? '');
    setBirthPlace(p.birth_place || '');
    setResidenceCity(p.city || '');
    setCountry(p.country || '');
    setSport(p.sport || '');
    setSportRole(p.role || '');

    setRegionId(p.interest_region_id);
    setProvinceId(p.interest_province_id);
    setMunicipalityId(p.interest_municipality_id);

    setDominantSide(normalizeFoot(p.foot));
    setHeightCm(p.height_cm ?? '');
    setWeightKg(p.weight_kg ?? '');
    setNotifyEmail(Boolean(p.notify_email_new_message));

    setInstagram(p.links?.instagram || '');
    setFacebook(p.links?.facebook || '');
    setTiktok(p.links?.tiktok || '');
    setX(p.links?.x || '');
  }

  // first load
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await loadProfile();

        const rs = await rpcChildren('region', null);
        setRegions(rs);

        if (regionId != null) {
          setProvinces(await rpcChildren('province', regionId));
        }
        if (provinceId != null) {
          setMunicipalities(await rpcChildren('municipality', provinceId));
        }
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? 'Errore caricamento profilo');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // quando cambia regione
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

  // quando cambia provincia
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

  const canSave = !saving && profile != null;
  const countryPreview = country
    ? `${flagEmoji(country)} ${countryName(country)}`
    : '';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const links: Links = {
        instagram: normalizeSocial('instagram', instagram),
        facebook: normalizeSocial('facebook', facebook),
        tiktok: normalizeSocial('tiktok', tiktok),
        x: normalizeSocial('x', x),
      };

      Object.keys(links).forEach((k) => {
        if ((links as any)[k] == null) delete (links as any)[k];
      });

      const payload = {
        // anagrafica
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl || null,
        birth_year: birthYear === '' ? null : Number(birthYear),
        birth_place: birthPlace.trim() || null,
        city: residenceCity.trim() || null,
        country: country.trim() || null,

        // geo interesse (country fisso IT per ora)
        interest_country: 'IT',
        interest_region_id: regionId,
        interest_province_id: provinceId,
        interest_municipality_id: municipalityId,

        // atleta
        foot: footToDb(normalizeFoot(dominantSide)),
        sport: sport || null,
        role: sportRole || null,
        height_cm: heightCm === '' ? null : Number(heightCm),
        weight_kg: weightKg === '' ? null : Number(weightKg),

        // social
        links: Object.keys(links).length ? links : null,

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
        throw new Error(j?.error || 'profile_update_failed');
      }

      await loadProfile();
      setMessage('Profilo aggiornato con successo.');
      router.refresh();
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Errore durante il salvataggio del profilo.');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border p-4 text-sm text-gray-600">
        Caricamento profilo…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
        {error}
      </div>
    );
  }

  if (!profile) return null;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Foto profilo */}
      <section className="rounded-2xl border p-4 md:p-5">
        <h2 className="mb-3 text-lg font-semibold">Foto profilo</h2>
        <AvatarUploader
          value={avatarUrl || null}
          onChange={(url) => setAvatarUrl(url ?? '')}
        />
        <p className="mt-2 text-xs text-gray-500">
          Immagine verticale 4:5 consigliata. Max 10MB. Formati supportati: JPG/PNG.
        </p>
      </section>

      {/* Dati personali */}
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
              required
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
                setBirthYear(
                  e.target.value === '' ? '' : Number(e.target.value)
                )
              }
              min={1950}
              max={currentYear - 5}
              placeholder="Es. 2002"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">
              Luogo di nascita (città)
            </label>
            <input
              className="rounded-lg border p-2"
              value={birthPlace}
              onChange={(e) => setBirthPlace(e.target.value)}
              placeholder="Es. Laguna Larga"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">
              Luogo di residenza (città)
            </label>
            <input
              className="rounded-lg border p-2"
              value={residenceCity}
              onChange={(e) => setResidenceCity(e.target.value)}
              placeholder="Es. Carlentini (SR)"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">
              Nazionalità (ISO2 o nome)
            </label>
            <input
              className="rounded-lg border p-2"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Es. IT oppure Italia"
            />
            {countryPreview && (
              <span className="text-xs text-gray-500">
                {countryPreview}
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
              onChange={(e) =>
                setRegionId(
                  e.target.value ? Number(e.target.value) : null
                )
              }
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
              onChange={(e) =>
                setProvinceId(
                  e.target.value ? Number(e.target.value) : null
                )
              }
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
              onChange={(e) =>
                setMunicipalityId(
                  e.target.value ? Number(e.target.value) : null
                )
              }
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

      {/* Dettagli atleta */}
      <section className="rounded-2xl border p-4 md:p-5">
        <h2 className="mb-3 text-lg font-semibold">Dettagli atleta</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1 lg:col-span-2">
            <label className="text-sm text-gray-600">
              Sport principale
            </label>
            <select
              className="rounded-lg border p-2"
              value={sport}
              onChange={(e) => setSport(e.target.value)}
            >
              <option value="">— Seleziona sport —</option>
              {SPORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 lg:col-span-2">
            <label className="text-sm text-gray-600">Ruolo</label>
            <select
              className="rounded-lg border p-2 disabled:bg-gray-50"
              value={sportRole}
              onChange={(e) => setSportRole(e.target.value)}
              disabled={!sport || roleOptions.length === 0}
            >
              <option value="">— Seleziona ruolo —</option>
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {!sport && (
              <span className="text-xs text-gray-500">
                Seleziona uno sport per vedere i ruoli disponibili.
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">
              Lato dominante
            </label>
            <select
              className="rounded-lg border p-2"
              value={dominantSide}
              onChange={(e) => setDominantSide(e.target.value)}
            >
              <option value="">— Seleziona —</option>
              {DOMINANT_SIDE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
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
                setHeightCm(
                  e.target.value === '' ? '' : Number(e.target.value)
                )
              }
              min={100}
              max={230}
              placeholder="Es. 183"
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
                setWeightKg(
                  e.target.value === '' ? '' : Number(e.target.value)
                )
              }
              min={40}
              max={150}
              placeholder="Es. 85"
            />
          </div>
        </div>
      </section>

      {/* Social */}
      <section className="rounded-2xl border p-4 md:p-5">
        <h2 className="mb-3 text-lg font-semibold">Profili social</h2>
        <p className="mb-3 text-xs text-gray-500">
          Puoi inserire URL completi o semplici @handle.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Instagram</label>
            <input
              className="rounded-lg border p-2"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Facebook</label>
            <input
              className="rounded-lg border p-2"
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">TikTok</label>
            <input
              className="rounded-lg border p-2"
              value={tiktok}
              onChange={(e) => setTiktok(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">X (Twitter)</label>
            <input
              className="rounded-lg border p-2"
              value={x}
              onChange={(e) => setX(e.target.value)}
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
          <span className="text-sm">
            Ricevi una email quando hai nuovi messaggi.
          </span>
        </label>
      </section>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!canSave}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? 'Salvataggio…' : 'Salva profilo'}
        </button>
        {message && (
          <span className="text-sm text-green-700">{message}</span>
        )}
        {error && (
          <span className="text-sm text-red-700">{error}</span>
        )}
      </div>
    </form>
  );
}
