'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { TEAM_SPORTS } from '@/types/domain';
import AvatarUploader from './AvatarUploader';

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

  interest_country: string | null;
  interest_region_id: number | null;
  interest_province_id: number | null;
  interest_municipality_id: number | null;

  foot: string | null;
  height_cm: number | null;
  weight_kg: number | null;

  links: Links | null;

  notify_email_new_message: boolean;
};

type LocationRow = { id: number; name: string };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

const FOOT_OPTIONS = [
  { value: 'right', label: 'Destro' },
  { value: 'left', label: 'Sinistro' },
  { value: 'both', label: 'Ambidestro' },
] as const;

function sportLabel(slug: string) {
  if (!slug) return '';
  return slug
    .replace(/_/g, ' ')
    .split(' ')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

const SPORT_OPTIONS = TEAM_SPORTS.map((slug) => ({
  value: slug,
  label: sportLabel(slug),
}));

function normalizeFoot(value: string | null | undefined): '' | 'right' | 'left' | 'both' {
  const raw = (value ?? '').toString().trim().toLowerCase();
  if (!raw) return '';
  if (['right', 'destro', 'dx', 'r'].includes(raw)) return 'right';
  if (['left', 'sinistro', 'sx', 'l'].includes(raw)) return 'left';
  if (['both', 'ambi', 'ambidestro', 'ambidextrous'].includes(raw)) return 'both';
  return '';
}

function flagEmoji(country?: string | null): string {
  const v = (country || '').trim();
  if (!v) return '';
  const iso2 = /^[A-Za-z]{2}$/.test(v) ? v.toUpperCase() : '';
  if (!iso2) return '';
  const codePoints = [...iso2].map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function countryName(country?: string | null): string {
  const v = (country || '').trim();
  if (!v) return '';
  try {
    if (/^[A-Za-z]{2}$/.test(v)) {
      const dn = new Intl.DisplayNames(['it'], { type: 'region' });
      return (dn.of(v.toUpperCase()) as string) || v.toUpperCase();
    }
  } catch {
    // ignore
  }
  return v;
}

export default function ProfileEditForm() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [birthYear, setBirthYear] = useState<string | ''>('');
  const [birthPlace, setBirthPlace] = useState('');
  const [residenceCity, setResidenceCity] = useState('');
  const [country, setCountry] = useState('');

  const [sport, setSport] = useState('');
  const [foot, setFoot] = useState(''); // UI: lato dominante

  const [heightCm, setHeightCm] = useState<string | ''>('');
  const [weightKg, setWeightKg] = useState<string | ''>('');

  const [links, setLinks] = useState<Links>({});
  const [notifyEmail, setNotifyEmail] = useState(false);

  const [regions, setRegions] = useState<LocationRow[]>([]);
  const [provinces, setProvinces] = useState<LocationRow[]>([]);
  const [municipalities, setMunicipalities] = useState<LocationRow[]>([]);

  const [regionId, setRegionId] = useState<number | null>(null);
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [municipalityId, setMunicipalityId] = useState<number | null>(null);

  useEffect(() => {
    void loadProfile();
  }, []);

  useEffect(() => {
    if (regionId) {
      void loadProvinces(regionId);
    } else {
      setProvinces([]);
      setProvinceId(null);
      setMunicipalities([]);
      setMunicipalityId(null);
    }
  }, [regionId]);

  useEffect(() => {
    if (provinceId) {
      void loadMunicipalities(provinceId);
    } else {
      setMunicipalities([]);
      setMunicipalityId(null);
    }
  }, [provinceId]);

  async function loadProfile() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/profiles/me', {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!res.ok) throw new Error('Impossibile caricare il profilo');

      const json = await res.json().catch(() => ({} as any));
      const rawProfile: Profile =
        (json.profile as Profile) ??
        (json.data as Profile) ??
        (json as Profile);

      if (!rawProfile) {
        setLoading(false);
        return;
      }

      const type = (rawProfile.account_type || '').toString().toLowerCase();
      if (type === 'club') {
        // questo form è solo per atleta
        router.replace('/club/profile');
        return;
      }

      setFullName(rawProfile.full_name ?? '');
      setBio(rawProfile.bio ?? '');
      setAvatarUrl(rawProfile.avatar_url ?? '');
      setBirthYear(rawProfile.birth_year ? String(rawProfile.birth_year) : '');
      setBirthPlace(rawProfile.birth_place ?? '');
      setResidenceCity(rawProfile.city ?? '');
      setCountry(rawProfile.country ?? '');

      setSport(rawProfile.sport ?? '');
      setFoot(normalizeFoot(rawProfile.foot) || '');

      setHeightCm(rawProfile.height_cm ? String(rawProfile.height_cm) : '');
      setWeightKg(rawProfile.weight_kg ? String(rawProfile.weight_kg) : '');

      setLinks(rawProfile.links ?? {});
      setNotifyEmail(!!rawProfile.notify_email_new_message);

      setRegionId(rawProfile.interest_region_id ?? null);
      setProvinceId(rawProfile.interest_province_id ?? null);
      setMunicipalityId(rawProfile.interest_municipality_id ?? null);

      await loadRegions();

      if (rawProfile.interest_region_id) {
        await loadProvinces(rawProfile.interest_region_id);
      }
      if (rawProfile.interest_province_id) {
        await loadMunicipalities(rawProfile.interest_province_id);
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Errore durante il caricamento del profilo');
    } finally {
      setLoading(false);
    }
  }

  async function loadRegions() {
    try {
      const { data, error } = await supabase
        .from('regions')
        .select('id,name')
        .order('name', { ascending: true });
      if (!error && data) setRegions(data as LocationRow[]);
    } catch (e) {
      console.warn('regions load failed', e);
    }
  }

  async function loadProvinces(region: number) {
    try {
      const { data, error } = await supabase
        .from('provinces')
        .select('id,name,region_id')
        .eq('region_id', region)
        .order('name', { ascending: true });
      if (!error && data) setProvinces(data as LocationRow[]);
    } catch (e) {
      console.warn('provinces load failed', e);
    }
  }

  async function loadMunicipalities(province: number) {
    try {
      const { data, error } = await supabase
        .from('municipalities')
        .select('id,name,province_id')
        .eq('province_id', province)
        .order('name', { ascending: true });
      if (!error && data) setMunicipalities(data as LocationRow[]);
    } catch (e) {
      console.warn('municipalities load failed', e);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const currentYear = new Date().getFullYear();
      const by = typeof birthYear === 'string' && birthYear !== '' ? Number(birthYear) : null;
      const safeBirthYear =
        by && by >= 1950 && by <= currentYear - 5 ? by : null;

      const h =
        typeof heightCm === 'string' && heightCm !== ''
          ? Number(heightCm)
          : null;
      const w =
        typeof weightKg === 'string' && weightKg !== ''
          ? Number(weightKg)
          : null;

      const nf = normalizeFoot(foot) || null; // 👈 qui rispettiamo profiles_foot_check

      const payload = {
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl || null,
        birth_year: safeBirthYear,
        birth_place: birthPlace.trim() || null,
        city: residenceCity.trim() || null,
        country: country.trim() || null,

        interest_country: 'IT',
        interest_region_id: regionId,
        interest_province_id: provinceId,
        interest_municipality_id: municipalityId,

        foot: nf,
        sport: sport.trim() || null,
        height_cm: h,
        weight_kg: w,

        links,
        notify_email_new_message: !!notifyEmail,
      };

      const res = await fetch('/api/profiles/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'Salvataggio non riuscito');
      }

      await loadProfile();
      setMessage('Profilo aggiornato correttamente.');
      router.refresh();
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Errore durante il salvataggio');
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

  const countryPreview =
    country ? `${flagEmoji(country)} ${countryName(country)}` : '';

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Foto profilo */}
      <section className="rounded-2xl border p-4 md:p-5">
        <h2 className="mb-3 text-lg font-semibold">Foto profilo</h2>
        <AvatarUploader
          value={avatarUrl || null}
          onChange={(url) => setAvatarUrl(url ?? '')}
        />
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
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Anno di nascita</label>
            <input
              type="number"
              inputMode="numeric"
              className="rounded-lg border p-2"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
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
              placeholder="Es. Catania"
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
            {country && (
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
              placeholder="Racconta ruolo, caratteristiche, esperienze…"
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
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Lato dominante</label>
            <select
              className="rounded-lg border p-2"
              value={foot}
              onChange={(e) => setFoot(e.target.value)}
            >
              <option value="">— Seleziona —</option>
              {FOOT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Sport principale</label>
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

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Altezza (cm)</label>
            <input
              type="number"
              inputMode="numeric"
              className="rounded-lg border p-2"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
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
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="Es. 78"
            />
          </div>
        </div>
      </section>

      {/* Social & notifiche */}
      <section className="rounded-2xl border p-4 md:p-5">
        <h2 className="mb-3 text-lg font-semibold">Social & notifiche</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Instagram</label>
            <input
              className="rounded-lg border p-2"
              value={links.instagram ?? ''}
              onChange={(e) =>
                setLinks((l) => ({ ...l, instagram: e.target.value }))
              }
              placeholder="@username"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Facebook</label>
            <input
              className="rounded-lg border p-2"
              value={links.facebook ?? ''}
              onChange={(e) =>
                setLinks((l) => ({ ...l, facebook: e.target.value }))
              }
              placeholder="Pagina o profilo"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">TikTok</label>
            <input
              className="rounded-lg border p-2"
              value={links.tiktok ?? ''}
              onChange={(e) =>
                setLinks((l) => ({ ...l, tiktok: e.target.value }))
              }
              placeholder="@username"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">X (Twitter)</label>
            <input
              className="rounded-lg border p-2"
              value={links.x ?? ''}
              onChange={(e) =>
                setLinks((l) => ({ ...l, x: e.target.value }))
              }
              placeholder="@username"
            />
          </div>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300"
            checked={notifyEmail}
            onChange={(e) => setNotifyEmail(e.target.checked)}
          />
          Ricevi una mail quando hai un nuovo messaggio
        </label>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? 'Salvataggio…' : 'Salva profilo'}
        </button>
        {message && (
          <span className="text-sm text-green-600">{message}</span>
        )}
      </div>
    </form>
  );
}
