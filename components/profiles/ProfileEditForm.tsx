'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import AvatarUploader from './AvatarUploader';
import { SPORTS, SPORTS_ROLES } from '@/lib/opps/constants';

type AccountType = 'club' | 'athlete' | null;

type Links = {
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  x?: string | null;
};

type Profile = {
  account_type: AccountType;

  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;

  birth_year: number | null;
  birth_place: string | null;

  city: string | null;
  country: string | null;

  sport: string | null;
  role: string | null;

  foot: 'destro' | 'sinistro' | 'ambidestro' | null;
  height_cm: number | null;
  weight_kg: number | null;

  interest_country: string | null;
  interest_region_id: number | null;
  interest_province_id: number | null;
  interest_municipality_id: number | null;

  links: Links | null;

  notify_email_new_message: boolean | null;
};

type LocationRow = { id: number; name: string };

type LocationLevel = 'region' | 'province' | 'municipality';

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const DOMINANT_SIDE_OPTIONS: { value: Profile['foot']; label: string }[] = [
  { value: 'destro', label: 'Destro' },
  { value: 'sinistro', label: 'Sinistro' },
  { value: 'ambidestro', label: 'Ambidestro' },
];

const SPORT_OPTIONS = SPORTS.map((s) => ({ value: s, label: s }));

function pickProfile(raw: any): Partial<Profile> {
  if (!raw || typeof raw !== 'object') return {};
  if ('data' in raw && raw.data) return raw.data as Partial<Profile>;
  if ('profile' in raw && raw.profile) return raw.profile as Partial<Profile>;
  return raw as Partial<Profile>;
}

function normalizeFoot(value: any): Profile['foot'] {
  const v = (value ?? '').toString().trim().toLowerCase();
  if (!v) return null;
  if (['destro', 'right', 'dx', 'r'].includes(v)) return 'destro';
  if (['sinistro', 'left', 'sx', 'l'].includes(v)) return 'sinistro';
  if (['ambidestro', 'ambi', 'both'].includes(v)) return 'ambidestro';
  return null;
}

function sortByName(rows: LocationRow[]): LocationRow[] {
  return [...rows].sort((a, b) =>
    a.name.localeCompare(b.name, 'it', { sensitivity: 'accent' })
  );
}

async function fetchLocations(
  level: LocationLevel,
  parentId: number | null
): Promise<LocationRow[]> {
  // Preferisce RPC se presente, altrimenti tabelle dirette
  try {
    const { data, error } = await supabase.rpc('location_children', {
      level,
      parent: parentId,
    });
    if (!error && Array.isArray(data)) {
      return sortByName(data as LocationRow[]);
    }
  } catch {
    // fallback sotto
  }

  if (level === 'region') {
    const { data } = await supabase
      .from('regions')
      .select('id,name')
      .order('name', { ascending: true });
    return sortByName((data ?? []) as LocationRow[]);
  }

  if (level === 'province') {
    if (parentId == null) return [];
    const { data } = await supabase
      .from('provinces')
      .select('id,name')
      .eq('region_id', parentId)
      .order('name', { ascending: true });
    return sortByName((data ?? []) as LocationRow[]);
  }

  if (parentId == null) return [];
  const { data } = await supabase
    .from('municipalities')
    .select('id,name')
    .eq('province_id', parentId)
    .order('name', { ascending: true });
  return sortByName((data ?? []) as LocationRow[]);
}

function normalizeSocial(kind: keyof Links, value: string): string | null {
  const v = (value || '').trim();
  if (!v) return null;

  if (/^https?:\/\//i.test(v)) return v;

  const base: Record<keyof Links, string> = {
    instagram: 'https://instagram.com/',
    facebook: 'https://facebook.com/',
    tiktok: 'https://tiktok.com/@',
    x: 'https://twitter.com/',
  };

  const handle = v.replace(/^@/, '');
  return `${base[kind]}${handle}`;
}

/* ================= COMPONENT ================= */

export default function ProfileEditForm() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // state campi
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [birthYear, setBirthYear] = useState<number | ''>('');
  const [birthPlace, setBirthPlace] = useState('');

  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');

  const [sport, setSport] = useState('');
  const [role, setRole] = useState('');

  const [foot, setFoot] = useState<Profile['foot']>(null);
  const [heightCm, setHeightCm] = useState<number | ''>('');
  const [weightKg, setWeightKg] = useState<number | ''>('');

  const [regionId, setRegionId] = useState<number | null>(null);
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [municipalityId, setMunicipalityId] = useState<number | null>(null);

  const [regions, setRegions] = useState<LocationRow[]>([]);
  const [provinces, setProvinces] = useState<LocationRow[]>([]);
  const [municipalities, setMunicipalities] = useState<LocationRow[]>([]);

  const [notifyEmailNewMessage, setNotifyEmailNewMessage] = useState(true);

  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [x, setX] = useState('');

  const currentYear = new Date().getFullYear();

  const roleOptions = useMemo(
    () => (sport ? SPORTS_ROLES[sport] ?? [] : []),
    [sport]
  );

  // disallinea ruolo se sport cambia
  useEffect(() => {
    if (role && !roleOptions.includes(role)) {
      setRole('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport, roleOptions.length]);

  async function loadProfile() {
    const res = await fetch('/api/profiles/me', {
      credentials: 'include',
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error('Impossibile caricare il profilo.');
    }

    const json = await res.json().catch(() => ({}));
    const data = pickProfile(json);

    const p: Profile = {
      account_type: (data.account_type ?? null) as AccountType,
      full_name: data.full_name ?? '',
      bio: data.bio ?? '',
      avatar_url: data.avatar_url ?? '',
      birth_year: data.birth_year ?? null,
      birth_place: data.birth_place ?? '',
      city: data.city ?? '',
      country: data.country ?? '',
      sport: data.sport ?? '',
      role: data.role ?? '',
      foot: normalizeFoot(data.foot),
      height_cm: data.height_cm ?? null,
      weight_kg: data.weight_kg ?? null,
      interest_country: data.interest_country ?? 'IT',
      interest_region_id: data.interest_region_id ?? null,
      interest_province_id: data.interest_province_id ?? null,
      interest_municipality_id: data.interest_municipality_id ?? null,
      links: data.links ?? null,
      notify_email_new_message:
        typeof data.notify_email_new_message === 'boolean'
          ? data.notify_email_new_message
          : true,
    };

    setProfile(p);

    // init campi form
    setFullName(p.full_name || '');
    setBio(p.bio || '');
    setAvatarUrl(p.avatar_url || '');

    setBirthYear(p.birth_year ?? '');
    setBirthPlace(p.birth_place || '');

    setCity(p.city || '');
    setCountry(p.country || '');

    setSport(p.sport || '');
    setRole(p.role || '');

    setFoot(p.foot);
    setHeightCm(p.height_cm ?? '');
    setWeightKg(p.weight_kg ?? '');

    setRegionId(p.interest_region_id);
    setProvinceId(p.interest_province_id);
    setMunicipalityId(p.interest_municipality_id);

    setNotifyEmailNewMessage(Boolean(p.notify_email_new_message));

    setInstagram(p.links?.instagram || '');
    setFacebook(p.links?.facebook || '');
    setTiktok(p.links?.tiktok || '');
    setX(p.links?.x || '');
  }

  // init
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await loadProfile();

        const rs = await fetchLocations('region', null);
        setRegions(rs);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || 'Errore durante il caricamento del profilo.');
      } finally {
        setLoading(false);
      }
    })();
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
      const ps = await fetchLocations('province', regionId);
      setProvinces(ps);
      if (!ps.some((p) => p.id === provinceId)) {
        setProvinceId(null);
        setMunicipalities([]);
        setMunicipalityId(null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionId]);

  // quando cambia provincia
  useEffect(() => {
    (async () => {
      if (provinceId == null) {
        setMunicipalities([]);
        setMunicipalityId(null);
        return;
      }
      const ms = await fetchLocations('municipality', provinceId);
      setMunicipalities(ms);
      if (!ms.some((m) => m.id === municipalityId)) {
        setMunicipalityId(null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provinceId]);

  const canSubmit = !saving && !!profile;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

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
        if (!(links as any)[k]) delete (links as any)[k];
      });

      const payload: Partial<Profile> = {
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl || null,

        birth_year:
          birthYear === '' ? null : Number.isFinite(birthYear) ? Number(birthYear) : null,
        birth_place: birthPlace.trim() || null,

        city: city.trim() || null,
        country: country.trim() || null,

        sport: sport || null,
        role: role || null,

        foot: foot ?? null,
        height_cm:
          heightCm === '' ? null : Number.isFinite(heightCm) ? Number(heightCm) : null,
        weight_kg:
          weightKg === '' ? null : Number.isFinite(weightKg) ? Number(weightKg) : null,

        interest_country: 'IT',
        interest_region_id: regionId,
        interest_province_id: provinceId,
        interest_municipality_id: municipalityId,

        links: Object.keys(links).length ? links : null,
        notify_email_new_message: !!notifyEmailNewMessage,
      };

      const res = await fetch('/api/profiles/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'profile_update_failed');
      }

      await loadProfile();
      setMessage('Profilo aggiornato con successo.');
      router.refresh();

      setTimeout(() => setMessage(null), 4000);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Errore durante il salvataggio del profilo.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border p-4 text-sm text-gray-600">
        Caricamento profilo…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
        Impossibile caricare il profilo. Riprova più tardi.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
          {message}
        </div>
      )}

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

      {/* Dati generali */}
      <section className="rounded-2xl border p-4 md:p-5">
        <h2 className="mb-3 text-lg font-semibold">Dati generali</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">Nome completo</label>
            <input
              className="rounded-lg border p-2 text-sm"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Es. Gabriele Basso"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">Anno di nascita</label>
            <input
              type="number"
              inputMode="numeric"
              className="rounded-lg border p-2 text-sm"
              value={birthYear}
              onChange={(e) =>
                setBirthYear(
                  e.target.value === '' ? '' : Number(e.target.value)
                )
              }
              min={1950}
              max={currentYear - 5}
              placeholder="Es. 2000"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">
              Luogo di nascita (città)
            </label>
            <input
              className="rounded-lg border p-2 text-sm"
              value={birthPlace}
              onChange={(e) => setBirthPlace(e.target.value)}
              placeholder="Es. Roma"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">
              Luogo di residenza (città)
            </label>
            <input
              className="rounded-lg border p-2 text-sm"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Es. Carlentini"
            />
          </div>

          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-sm text-gray-700">Nazionalità</label>
            <input
              className="rounded-lg border p-2 text-sm"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Es. IT o Italia"
            />
          </div>

          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-sm text-gray-700">Bio</label>
            <textarea
              className="min-h-[80px] rounded-lg border p-2 text-sm"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Racconta chi sei, carriera sportiva e obiettivi."
            />
          </div>
        </div>
      </section>

      {/* Zona di interesse */}
      <section className="rounded-2xl border p-4 md:p-5">
        <h2 className="mb-3 text-lg font-semibold">Zona di interesse</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">Paese</label>
            <select className="rounded-lg border p-2 text-sm" value="IT" disabled>
              <option value="IT">Italia</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">Regione</label>
            <select
              className="rounded-lg border p-2 text-sm"
              value={regionId ?? ''}
              onChange={(e) =>
                setRegionId(
                  e.target.value ? Number(e.target.value) : null
                )
              }
            >
              <option value="">— Seleziona —</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">Provincia</label>
            <select
              className="rounded-lg border p-2 text-sm disabled:bg-gray-50"
              value={provinceId ?? ''}
              onChange={(e) =>
                setProvinceId(
                  e.target.value ? Number(e.target.value) : null
                )
              }
              disabled={!regionId}
            >
              <option value="">— Seleziona —</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">Città</label>
            <select
              className="rounded-lg border p-2 text-sm disabled:bg-gray-50"
              value={municipalityId ?? ''}
              onChange={(e) =>
                setMunicipalityId(
                  e.target.value ? Number(e.target.value) : null
                )
              }
              disabled={!provinceId}
            >
              <option value="">— Seleziona —</option>
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
            <label className="text-sm text-gray-700">
              Sport principale
            </label>
            <select
              className="rounded-lg border p-2 text-sm"
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
            <label className="text-sm text-gray-700">Ruolo</label>
            <select
              className="rounded-lg border p-2 text-sm disabled:bg-gray-50"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={!sport || roleOptions.length === 0}
            >
              <option value="">— Seleziona ruolo —</option>
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">
              Lato dominante
            </label>
            <select
              className="rounded-lg border p-2 text-sm"
              value={foot ?? ''}
              onChange={(e) =>
                setFoot(
                  (e.target.value || null) as Profile['foot']
                )
              }
            >
              <option value="">— Seleziona —</option>
              {DOMINANT_SIDE_OPTIONS.map((opt) => (
                <option key={opt.value || 'none'} value={opt.value || ''}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">Altezza (cm)</label>
            <input
              type="number"
              inputMode="numeric"
              className="rounded-lg border p-2 text-sm"
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
            <label className="text-sm text-gray-700">Peso (kg)</label>
            <input
              type="number"
              inputMode="numeric"
              className="rounded-lg border p-2 text-sm"
              value={weightKg}
              onChange={(e) =>
                setWeightKg(
                  e.target.value === '' ? '' : Number(e.target.value)
                )
              }
              min={40}
              max={150}
              placeholder="Es. 80"
            />
          </div>
        </div>
      </section>

      {/* Social */}
      <section className="rounded-2xl border p-4 md:p-5">
        <h2 className="mb-3 text-lg font-semibold">Profili social</h2>
        <p className="mb-2 text-xs text-gray-500">
          Puoi inserire URL completi o semplici @handle.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">Instagram</label>
            <input
              className="rounded-lg border p-2 text-sm"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">Facebook</label>
            <input
              className="rounded-lg border p-2 text-sm"
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">TikTok</label>
            <input
              className="rounded-lg border p-2 text-sm"
              value={tiktok}
              onChange={(e) => setTiktok(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">X (Twitter)</label>
            <input
              className="rounded-lg border p-2 text-sm"
              value={x}
              onChange={(e) => setX(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Notifiche */}
      <section className="rounded-2xl border p-4 md:p-5">
        <h2 className="mb-3 text-lg font-semibold">Notifiche</h2>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={notifyEmailNewMessage}
            onChange={(e) =>
              setNotifyEmailNewMessage(e.target.checked)
            }
          />
          <span>Ricevi una email quando hai nuovi messaggi.</span>
        </label>
      </section>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? 'Salvataggio…' : 'Salva profilo'}
        </button>
        {message && (
          <span className="text-sm text-emerald-700">
            {message}
          </span>
        )}
      </div>
    </form>
  );
}
