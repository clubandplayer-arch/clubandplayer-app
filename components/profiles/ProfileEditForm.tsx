'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import AvatarUploader from '@/components/profiles/AvatarUploader';

type AccountType = 'athlete' | 'club';

type Links = {
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  x?: string | null;
  website?: string | null;
};

type Profile = {
  id: string;
  user_id: string;
  account_type: AccountType | null;
  profile_type?: string | null; // legacy
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;

  country: string | null;

  // atleta: nascita / residenza / dati fisici
  birth_year: number | null;
  birth_place: string | null;
  city: string | null;

  residence_region_id: number | null;
  residence_province_id: number | null;
  residence_municipality_id: number | null;

  birth_country: string | null;
  birth_region_id: number | null;
  birth_province_id: number | null;
  birth_municipality_id: number | null;

  foot: string | null;
  height_cm: number | null;
  weight_kg: number | null;

  sport: string | null;
  role: string | null;
  visibility: string | null;

  // interessi geo
  interest_country: string | null;
  interest_region_id: number | null;
  interest_province_id: number | null;
  interest_municipality_id: number | null;

  // compat vecchi campi (solo read)
  interest_region?: string | null;
  interest_province?: string | null;
  interest_city?: string | null;

  // social
  links: Links | null;

  // notifiche
  notify_email_new_message: boolean | null;

  // campi club
  club_foundation_year: number | null;
  club_stadium: string | null;
  club_league_category: string | null;
};

type LocationLevel = 'region' | 'province' | 'municipality';

type LocationOption = { id: number; name: string };

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* ------------------------------ helpers geo ------------------------------ */

function sortOptions(options: LocationOption[]): LocationOption[] {
  return [...options].sort((a, b) =>
    a.name.localeCompare(b.name, 'it', { sensitivity: 'base' })
  );
}

async function fetchChildren(
  parentLevel: LocationLevel,
  childLevel: LocationLevel,
  parentId: number | null | undefined
): Promise<LocationOption[]> {
  if (!parentId) return [];
  try {
    const { data, error } = await supabase.rpc('location_children', {
      parent_level: parentLevel,
      child_level: childLevel,
      parent_id: parentId,
    });

    if (error || !Array.isArray(data)) {
      console.error('[ProfileEditForm] location_children error', error);
      return [];
    }

    return sortOptions(
      (data as any[]).map((row) => ({
        id: Number(row.id),
        name: String(row.name),
      }))
    );
  } catch (err) {
    console.error('[ProfileEditForm] location_children exception', err);
    return [];
  }
}

/* ------------------------------ costanti UI ------------------------------ */

const FEET = ['Destro', 'Sinistro', 'Ambidestro'] as const;

const SPORTS = [
  'Calcio',
  'Futsal',
  'Calcio a 7',
  'Calcio Femminile',
  'Volley',
  'Basket',
  'Rugby',
  'Pallanuoto',
];

const CALCIO_ROLES = [
  'Portiere',
  'Difensore centrale',
  'Terzino destro',
  'Terzino sinistro',
  'Esterno destro',
  'Esterno sinistro',
  'Centrocampista centrale',
  'Centrocampista difensivo',
  'Trequartista',
  'Ala destra',
  'Ala sinistra',
  'Prima punta',
  'Seconda punta',
];

const CATEGORIES_BY_SPORT: Record<string, string[]> = {
  Calcio: [
    'Serie A',
    'Serie B',
    'Serie C',
    'Serie D',
    'Eccellenza',
    'Promozione',
    'Prima Categoria',
    'Seconda Categoria',
    'Terza Categoria',
    'Settore giovanile',
    'Scuola calcio',
  ],
  Volley: ['SuperLega', 'A2', 'B', 'C', 'D', 'Settore giovanile'],
  Basket: ['Serie A', 'A2', 'B', 'C', 'D', 'Settore giovanile'],
};

/* ------------------------------- componente ------------------------------ */

export default function ProfileEditForm() {
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);

  // tipo account effettivo
  const [accountType, setAccountType] = useState<AccountType>('athlete');

  // anagrafica comune
  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('Italia');

  // atleta: nascita / residenza
  const [birthYear, setBirthYear] = useState<number | undefined>();
  const [birthPlace, setBirthPlace] = useState('');
  const [city, setCity] = useState('');

  const [residenceRegionId, setResidenceRegionId] = useState<number | undefined>();
  const [residenceProvinceId, setResidenceProvinceId] = useState<number | undefined>();
  const [residenceMunicipalityId, setResidenceMunicipalityId] = useState<number | undefined>();

  const [birthCountry, setBirthCountry] = useState('Italia');
  const [birthRegionId, setBirthRegionId] = useState<number | undefined>();
  const [birthProvinceId, setBirthProvinceId] = useState<number | undefined>();
  const [birthMunicipalityId, setBirthMunicipalityId] = useState<number | undefined>();

  const [foot, setFoot] = useState('');
  const [height, setHeight] = useState<number | undefined>();
  const [weight, setWeight] = useState<number | undefined>();
  const [sport, setSport] = useState('');
  const [role, setRole] = useState('');

  // club
  const [clubSport, setClubSport] = useState('');
  const [clubCategory, setClubCategory] = useState('');
  const [clubFoundationYear, setClubFoundationYear] = useState<number | undefined>();
  const [clubStadium, setClubStadium] = useState('');

  // interessi geo
  const [interestCountry, setInterestCountry] = useState('IT');
  const [interestRegionId, setInterestRegionId] = useState<number | undefined>();
  const [interestProvinceId, setInterestProvinceId] = useState<number | undefined>();
  const [interestMunicipalityId, setInterestMunicipalityId] = useState<number | undefined>();

  // social & notifiche
  const [links, setLinks] = useState<Links>({});
  const [notifyEmailNewMessage, setNotifyEmailNewMessage] =
    useState<boolean>(true);

  // opzioni geo (usate solo via setter ⇒ prefisso _ per zittire ESLint)
  const [_residenceRegions, setResidenceRegions] = useState<LocationOption[]>([]);
  const [_residenceProvinces, setResidenceProvinces] = useState<LocationOption[]>([]);
  const [_residenceMunicipalities, setResidenceMunicipalities] = useState<LocationOption[]>([]);

  const [_birthRegions, setBirthRegions] = useState<LocationOption[]>([]);
  const [_birthProvinces, setBirthProvinces] = useState<LocationOption[]>([]);
  const [_birthMunicipalities, setBirthMunicipalities] = useState<LocationOption[]>([]);

  const [_interestRegions, setInterestRegions] = useState<LocationOption[]>([]);
  const [_interestProvinces, setInterestProvinces] = useState<LocationOption[]>([]);
  const [_interestMunicipalities, setInterestMunicipalities] = useState<LocationOption[]>([]);

  /* --------- derivati: tipo account & titolo visibile ---------- */

  const forcedAccountType: AccountType | null =
    pathname === '/club/profile' || pathname?.startsWith('/club/')
      ? 'club'
      : null;

  const effectiveAccountType: AccountType =
    forcedAccountType ??
    accountType ??
    ((profile?.profile_type as AccountType | null) || 'athlete');

  const isClub = effectiveAccountType === 'club';
  const title = isClub ? 'CLUB' : 'ATLETA';

  /* ------------------------ caricamento profilo ------------------------ */

  useEffect(() => {
    void loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProfile() {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/profiles/me', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json().catch(() => ({}));
      const data = (json && json.data) as Profile | null;

      if (!data) {
        setLoading(false);
        return;
      }

      setProfile(data);

      const fromApiType: AccountType =
        (data.account_type as AccountType | null) ??
        ((data.profile_type as AccountType | null) || 'athlete');

      const finalType: AccountType =
        forcedAccountType ?? fromApiType ?? 'athlete';

      setAccountType(finalType);

      // anagrafica
      setFullName(data.full_name ?? '');
      setDisplayName(data.display_name ?? '');
      setAvatarUrl(data.avatar_url ?? '');
      setBio(data.bio ?? '');
      setCountry(data.country ?? 'Italia');

      // atleta
      setBirthYear(data.birth_year ?? undefined);
      setBirthPlace(data.birth_place ?? '');
      setCity(data.city ?? '');

      setResidenceRegionId(data.residence_region_id ?? undefined);
      setResidenceProvinceId(data.residence_province_id ?? undefined);
      setResidenceMunicipalityId(
        data.residence_municipality_id ?? undefined
      );

      setBirthCountry(data.birth_country ?? 'Italia');
      setBirthRegionId(data.birth_region_id ?? undefined);
      setBirthProvinceId(data.birth_province_id ?? undefined);
      setBirthMunicipalityId(
        data.birth_municipality_id ?? undefined
      );

      setFoot(data.foot ?? '');
      setHeight(data.height_cm ?? undefined);
      setWeight(data.weight_kg ?? undefined);

      setSport(data.sport ?? '');
      setRole(data.role ?? '');

      // club
      setClubSport(data.sport ?? '');
      setClubCategory(data.club_league_category ?? '');
      setClubFoundationYear(
        data.club_foundation_year ?? undefined
      );
      setClubStadium(data.club_stadium ?? '');

      // interessi
      setInterestCountry(data.interest_country ?? 'IT');
      setInterestRegionId(data.interest_region_id ?? undefined);
      setInterestProvinceId(data.interest_province_id ?? undefined);
      setInterestMunicipalityId(
        data.interest_municipality_id ?? undefined
      );

      // social
      const rawLinks = (data.links ?? {}) as Links;
      setLinks({
        instagram: rawLinks.instagram ?? '',
        facebook: rawLinks.facebook ?? '',
        tiktok: rawLinks.tiktok ?? '',
        x: rawLinks.x ?? '',
        website: rawLinks.website ?? '',
      });

      // notifiche
      setNotifyEmailNewMessage(
        data.notify_email_new_message ?? true
      );

      // regioni iniziali (se il RPC è configurato)
      const regions = await fetchChildren(
        'region',
        'province',
        0
      ).catch(() => []);
      if (regions.length) {
        setResidenceRegions(regions);
        setBirthRegions(regions);
        setInterestRegions(regions);
      }
    } catch (err: any) {
      console.error('loadProfile error', err);
      setError(
        'Errore nel caricamento del profilo. Riprova più tardi.'
      );
    } finally {
      setLoading(false);
    }
  }

  /* ------------------------- effetti dipendenze geo ------------------------ */

  useEffect(() => {
    void (async () => {
      if (!residenceRegionId) {
        setResidenceProvinces([]);
        setResidenceProvinceId(undefined);
        return;
      }
      const opts = await fetchChildren(
        'region',
        'province',
        residenceRegionId
      );
      setResidenceProvinces(opts);
      if (
        residenceProvinceId &&
        !opts.some((o) => o.id === residenceProvinceId)
      ) {
        setResidenceProvinceId(undefined);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residenceRegionId]);

  useEffect(() => {
    void (async () => {
      if (!residenceProvinceId) {
        setResidenceMunicipalities([]);
        setResidenceMunicipalityId(undefined);
        return;
      }
      const opts = await fetchChildren(
        'province',
        'municipality',
        residenceProvinceId
      );
      setResidenceMunicipalities(opts);
      if (
        residenceMunicipalityId &&
        !opts.some((o) => o.id === residenceMunicipalityId)
      ) {
        setResidenceMunicipalityId(undefined);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residenceProvinceId]);

  useEffect(() => {
    void (async () => {
      if (!birthRegionId) {
        setBirthProvinces([]);
        setBirthProvinceId(undefined);
        return;
      }
      const opts = await fetchChildren(
        'region',
        'province',
        birthRegionId
      );
      setBirthProvinces(opts);
      if (
        birthProvinceId &&
        !opts.some((o) => o.id === birthProvinceId)
      ) {
        setBirthProvinceId(undefined);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [birthRegionId]);

  useEffect(() => {
    void (async () => {
      if (!birthProvinceId) {
        setBirthMunicipalities([]);
        setBirthMunicipalityId(undefined);
        return;
      }
      const opts = await fetchChildren(
        'province',
        'municipality',
        birthProvinceId
      );
      setBirthMunicipalities(opts);
      if (
        birthMunicipalityId &&
        !opts.some((o) => o.id === birthMunicipalityId)
      ) {
        setBirthMunicipalityId(undefined);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [birthProvinceId]);

  useEffect(() => {
    void (async () => {
      if (!interestRegionId) {
        setInterestProvinces([]);
        setInterestProvinceId(undefined);
        return;
      }
      const opts = await fetchChildren(
        'region',
        'province',
        interestRegionId
      );
      setInterestProvinces(opts);
      if (
        interestProvinceId &&
        !opts.some((o) => o.id === interestProvinceId)
      ) {
        setInterestProvinceId(undefined);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interestRegionId]);

  useEffect(() => {
    void (async () => {
      if (!interestProvinceId) {
        setInterestMunicipalities([]);
        setInterestMunicipalityId(undefined);
        return;
      }
      const opts = await fetchChildren(
        'province',
        'municipality',
        interestProvinceId
      );
      setInterestMunicipalities(opts);
      if (
        interestMunicipalityId &&
        !opts.some((o) => o.id === interestMunicipalityId)
      ) {
        setInterestMunicipalityId(undefined);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interestProvinceId]);

  /* ------------------------------ salvataggio ------------------------------ */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const body: any = {
        account_type: effectiveAccountType,
        full_name: fullName || null,
        display_name: displayName || null,
        avatar_url: avatarUrl || null,
        bio: bio || null,
        country: country || null,
        links: {
          instagram: links.instagram || null,
          facebook: links.facebook || null,
          tiktok: links.tiktok || null,
          x: links.x || null,
          website: links.website || null,
        },
        notify_email_new_message: !!notifyEmailNewMessage,
        interest_country: interestCountry || 'IT',
        interest_region_id: interestRegionId || null,
        interest_province_id: interestProvinceId || null,
        interest_municipality_id: interestMunicipalityId || null,
      };

      if (effectiveAccountType === 'athlete') {
        Object.assign(body, {
          birth_year: birthYear || null,
          birth_place: birthPlace || null,
          city: city || null,
          birth_country: birthCountry || 'Italia',
          birth_region_id: birthRegionId || null,
          birth_province_id: birthProvinceId || null,
          birth_municipality_id: birthMunicipalityId || null,
          residence_region_id: residenceRegionId || null,
          residence_province_id: residenceProvinceId || null,
          residence_municipality_id: residenceMunicipalityId || null,
          foot: foot || null,
          height_cm: height || null,
          weight_kg: weight || null,
          sport: sport || null,
          role: role || null,
        });
      } else {
        Object.assign(body, {
          sport: clubSport || null,
          club_league_category: clubCategory || null,
          club_foundation_year: clubFoundationYear || null,
          club_stadium: clubStadium || null,
        });
      }

      const res = await fetch('/api/profiles/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          errJson?.error ||
            `Errore durante il salvataggio (${res.status})`
        );
      }

      const json = await res.json().catch(() => ({}));
      if (json?.data) {
        setProfile(json.data as Profile);
      }

      setSuccess('Profilo aggiornato con successo.');
    } catch (err: any) {
      console.error('save profile error', err);
      setError(
        err?.message || 'Errore durante il salvataggio del profilo.'
      );
    } finally {
      setSaving(false);
    }
  }

  /* --------------------------------- RENDER -------------------------------- */

  if (loading) {
    return (
      <div className="py-10 text-center text-sm text-gray-500">
        Caricamento profilo in corso...
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 max-w-5xl mx-auto"
    >
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-wide">
          {title}
        </h1>
        <p className="text-sm text-gray-600">
          Aggiorna le informazioni del tuo profilo{' '}
          {isClub ? 'Club' : 'Atleta'} su Club&amp;Player.
        </p>
      </header>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 border border-green-200">
          {success}
        </div>
      )}

      {/* Dati personali comuni */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Dati personali</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Nome e cognome
            </label>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Es. ASD Carlentini / Mario Rossi"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Nome pubblico (mostrato in Bacheca)
            </label>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Es. Real Madrink"
            />
          </div>
        </div>

        {/* Avatar uploader + URL */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Foto profilo
          </label>
          <AvatarUploader
            value={avatarUrl || ''}
            onChange={(url: string | null) =>
              setAvatarUrl(url || '')
            }
          />
          <p className="text-xs text-gray-500">
            Puoi caricare un&apos;immagine oppure incollare un URL
            pubblico.
          </p>
          <input
            type="url"
            className="w-full rounded-md border px-3 py-2 text-xs"
            placeholder="Oppure incolla qui un URL immagine"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Biografia</label>
          <textarea
            className="w-full rounded-md border px-3 py-2 text-sm min-h-[80px]"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={
              isClub
                ? 'Racconta la storia e il progetto del tuo club.'
                : 'Racconta chi sei, il tuo percorso sportivo e i tuoi obiettivi.'
            }
          />
        </div>
      </section>

      {/* Sezione ATLETA */}
      {!isClub && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Dettagli atleta</h2>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Anno di nascita
              </label>
              <input
                type="number"
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={birthYear ?? ''}
                onChange={(e) =>
                  setBirthYear(
                    e.target.value
                      ? Number(e.target.value)
                      : undefined
                  )
                }
                placeholder="Es. 2002"
              />
            </div>

            <div className="space-y-1 md:col-span-3">
              <label className="text-sm font-medium">
                Luogo di nascita (testo libero)
              </label>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={birthPlace}
                onChange={(e) =>
                  setBirthPlace(e.target.value)
                }
                placeholder="Es. Roma"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Arto dominante (piede/mano)
              </label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={foot}
                onChange={(e) => setFoot(e.target.value)}
              >
                <option value="">Seleziona</option>
                {FEET.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Altezza (cm)
              </label>
              <input
                type="number"
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={height ?? ''}
                onChange={(e) =>
                  setHeight(
                    e.target.value
                      ? Number(e.target.value)
                      : undefined
                  )
                }
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Peso (kg)
              </label>
              <input
                type="number"
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={weight ?? ''}
                onChange={(e) =>
                  setWeight(
                    e.target.value
                      ? Number(e.target.value)
                      : undefined
                  )
                }
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Sport
              </label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={sport}
                onChange={(e) => setSport(e.target.value)}
              >
                <option value="">Seleziona sport</option>
                {SPORTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Ruolo (per Calcio)
              </label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="">Seleziona ruolo</option>
                {CALCIO_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>
      )}

      {/* Sezione CLUB */}
      {isClub && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Dettagli club</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Sport principale
              </label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={clubSport}
                onChange={(e) => setClubSport(e.target.value)}
              >
                <option value="">Seleziona sport</option>
                {SPORTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Categoria / Campionato
              </label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={clubCategory}
                onChange={(e) =>
                  setClubCategory(e.target.value)
                }
              >
                <option value="">Seleziona</option>
                {(CATEGORIES_BY_SPORT[clubSport] || []).map(
                  (c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Anno di fondazione
              </label>
              <input
                type="number"
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={clubFoundationYear ?? ''}
                onChange={(e) =>
                  setClubFoundationYear(
                    e.target.value
                      ? Number(e.target.value)
                      : undefined
                  )
                }
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Stadio / Campo
              </label>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={clubStadium}
                onChange={(e) =>
                  setClubStadium(e.target.value)
                }
                placeholder="Es. Stadio Comunale"
              />
            </div>
          </div>
        </section>
      )}

      {/* Social & notifiche */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          Social &amp; notifiche
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Instagram
            </label>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={links.instagram ?? ''}
              onChange={(e) =>
                setLinks((prev) => ({
                  ...prev,
                  instagram: e.target.value,
                }))
              }
              placeholder="@username"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Facebook
            </label>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={links.facebook ?? ''}
              onChange={(e) =>
                setLinks((prev) => ({
                  ...prev,
                  facebook: e.target.value,
                }))
              }
              placeholder="Pagina o profilo"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">
              TikTok
            </label>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={links.tiktok ?? ''}
              onChange={(e) =>
                setLinks((prev) => ({
                  ...prev,
                  tiktok: e.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">
              X / Twitter
            </label>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={links.x ?? ''}
              onChange={(e) =>
                setLinks((prev) => ({
                  ...prev,
                  x: e.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium">
              Sito web
            </label>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={links.website ?? ''}
              onChange={(e) =>
                setLinks((prev) => ({
                  ...prev,
                  website: e.target.value,
                }))
              }
              placeholder="https://..."
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300"
            checked={!!notifyEmailNewMessage}
            onChange={(e) =>
              setNotifyEmailNewMessage(e.target.checked)
            }
          />
          Ricevi email per nuovi messaggi.
        </label>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center rounded-md border border-transparent bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-50"
        >
          {saving ? 'Salvataggio in corso…' : 'Salva profilo'}
        </button>
      </div>
    </form>
  );
}
