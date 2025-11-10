'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
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
  id?: string;
  user_id?: string;
  account_type?: string | null;
  profile_type?: string | null;
  type?: string | null;

  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;

  country?: string | null;
  city?: string | null;

  // atleta
  birth_year?: number | null;
  birth_place?: string | null;
  birth_country?: string | null;
  foot?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  sport?: string | null;
  role?: string | null;

  // club
  club_league_category?: string | null;
  club_foundation_year?: number | null;
  club_stadium?: string | null;

  // interests
  interest_country?: string | null;

  // social
  links?: Links | null;

  // notifications
  notify_email_new_message?: boolean | null;
};

const LATERAL_PREFERENCE = ['Destro', 'Sinistro', 'Ambidestro'];

const SPORTS = [
  'Calcio',
  'Calcio Femminile',
  'Futsal',
  'Calcio a 7',
  'Volley',
  'Basket',
  'Rugby',
  'Pallanuoto',
];

const ROLES_BY_SPORT: Record<string, string[]> = {
  Calcio: [
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
  ],
  'Calcio Femminile': [
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
  ],
  Futsal: [
    'Portiere',
    'Ultimo',
    'Laterale',
    'Pivot',
    'Universale',
  ],
  'Calcio a 7': [
    'Portiere',
    'Difensore',
    'Esterno',
    'Centrale',
    'Attaccante',
  ],
  Volley: [
    'Palleggiatore',
    'Opposto',
    'Centrale',
    'Schiacciatore',
    'Libero',
  ],
  Basket: [
    'Playmaker',
    'Guardia',
    'Guardia/Ala',
    'Ala piccola',
    'Ala grande',
    'Centro',
  ],
  Rugby: [
    'Pilone',
    'Talloner',
    'Seconda linea',
    'Terza linea',
    'Mediano di mischia',
    'Mediano di apertura',
    'Centro',
    'Ala',
    'Estremo',
  ],
  Pallanuoto: [
    'Portiere',
    'Difensore',
    'Attaccante',
    'Centroboa',
    'Esterno',
  ],
};

function normalizeAccountType(p?: Profile | null): AccountType {
  const raw =
    (p?.account_type ??
      p?.profile_type ??
      p?.type ??
      '') as string;
  const t = raw.toLowerCase();
  if (t.includes('club')) return 'club';
  if (t.includes('athlete') || t.includes('atlet')) return 'athlete';
  return 'athlete';
}

export default function ProfileEditForm() {
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [accountType, setAccountType] =
    useState<AccountType>('athlete');

  // common
  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('Italia');

  // athlete
  const [birthYear, setBirthYear] = useState<number | ''>('');
  const [birthPlace, setBirthPlace] = useState('');
  const [city, setCity] = useState('');
  const [birthCountry, setBirthCountry] =
    useState('Italia');
  const [foot, setFoot] = useState('');
  const [height, setHeight] = useState<number | ''>('');
  const [weight, setWeight] = useState<number | ''>('');
  const [sport, setSport] = useState('');
  const [role, setRole] = useState('');

  // club
  const [clubSport, setClubSport] = useState('');
  const [clubCategory, setClubCategory] = useState('');
  const [clubFoundationYear, setClubFoundationYear] =
    useState<number | ''>('');
  const [clubStadium, setClubStadium] = useState('');

  // other
  const [interestCountry, setInterestCountry] =
    useState('IT');
  const [links, setLinks] = useState<Links>({});
  const [notifyEmailNewMessage, setNotifyEmailNewMessage] =
    useState(true);

  const forcedAccountType: AccountType | null =
    pathname === '/club/profile' ||
    pathname.startsWith('/club/')
      ? 'club'
      : null;

  const effectiveAccountType: AccountType =
    forcedAccountType ??
    (accountType || normalizeAccountType(profile));

  const isClub = effectiveAccountType === 'club';
  const title = isClub ? 'Profilo CLUB' : 'Profilo ATLETA';

  /* ------------------------ LOAD PROFILO ------------------------ */

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        setSuccess(null);

        const res = await fetch('/api/profiles/me', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });

        if (cancelled) return;

        if (res.status === 401) {
          // non loggato: lascio campi vuoti, niente errore rumoroso
          setLoading(false);
          return;
        }

        if (!res.ok) {
          console.error(
            '[ProfileEditForm] GET /api/profiles/me status',
            res.status
          );
          setError('Errore nel caricamento del profilo.');
          setLoading(false);
          return;
        }

        const json = await res.json().catch(() => ({} as any));
        const data: Profile | null =
          (json && (json.data || json.profile)) || null;

        if (cancelled) return;

        if (!data) {
          // utente loggato ma nessun profilo ancora: form vuoto, ok
          setLoading(false);
          return;
        }

        setProfile(data);

        const detected = normalizeAccountType(data);
        setAccountType(forcedAccountType || detected);

        setFullName(data.full_name || '');
        setDisplayName(data.display_name || '');
        setAvatarUrl(data.avatar_url || '');
        setBio(data.bio || '');
        setCountry(data.country || 'Italia');

        setBirthYear(data.birth_year ?? '');
        setBirthPlace(data.birth_place || '');
        setCity(data.city || '');
        setBirthCountry(data.birth_country || 'Italia');
        setFoot(data.foot || '');
        setHeight(data.height_cm ?? '');
        setWeight(data.weight_kg ?? '');
        setSport(data.sport || '');
        setRole(data.role || '');

        setClubSport(data.sport || '');
        setClubCategory(
          data.club_league_category || ''
        );
        setClubFoundationYear(
          data.club_foundation_year ?? ''
        );
        setClubStadium(data.club_stadium || '');

        setInterestCountry(
          data.interest_country || 'IT'
        );

        const rawLinks = (data.links || {}) as Links;
        setLinks({
          instagram: rawLinks.instagram || '',
          facebook: rawLinks.facebook || '',
          tiktok: rawLinks.tiktok || '',
          x: rawLinks.x || '',
          website: rawLinks.website || '',
        });

        setNotifyEmailNewMessage(
          data.notify_email_new_message ?? true
        );

        setLoading(false);
      } catch (err) {
        console.error('[ProfileEditForm] load error', err);
        if (!cancelled) {
          setError('Errore nel caricamento del profilo.');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  /* ------------------------ SUBMIT PROFILO ------------------------ */

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
        interest_country: interestCountry || 'IT',
        links: {
          instagram: links.instagram || null,
          facebook: links.facebook || null,
          tiktok: links.tiktok || null,
          x: links.x || null,
          website: links.website || null,
        },
        notify_email_new_message:
          !!notifyEmailNewMessage,
      };

      if (!isClub) {
        Object.assign(body, {
          birth_year: birthYear || null,
          birth_place: birthPlace || null,
          city: city || null,
          birth_country: birthCountry || 'Italia',
          foot: foot || null,
          height_cm: height || null,
          weight_kg: weight || null,
          sport: sport || null,
          role: role || null,
        });
      } else {
        Object.assign(body, {
          sport: clubSport || null,
          club_league_category:
            clubCategory || null,
          club_foundation_year:
            clubFoundationYear || null,
          club_stadium: clubStadium || null,
        });
      }

      const res = await fetch('/api/profiles/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          json?.error ||
            `Errore durante il salvataggio (${res.status})`
        );
      }

      if (json?.data) {
        setProfile(json.data as Profile);
      }

      setSuccess('Profilo aggiornato con successo.');
    } catch (err: any) {
      console.error('[ProfileEditForm] save error', err);
      setError(
        err?.message ||
          'Errore durante il salvataggio del profilo.'
      );
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------ RENDER ------------------------------ */

  if (loading) {
    return (
      <div className="py-10 text-center text-sm text-gray-500">
        Caricamento profilo in corso...
      </div>
    );
  }

  const rolesForSport =
    ROLES_BY_SPORT[sport] || [];

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
          {isClub ? 'Club' : 'Atleta'} su Club&Player.
        </p>
      </header>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 border border-emerald-200">
          {success}
        </div>
      )}

      {/* Avatar + dati base */}
      <section className="space-y-4 rounded-2xl border bg-white p-4 md:p-5">
        <h2 className="text-lg font-semibold">
          Dati generali
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">
              Nome completo
            </label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={fullName}
              onChange={(e) =>
                setFullName(e.target.value)
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium">
              Nome pubblico
            </label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={displayName}
              onChange={(e) =>
                setDisplayName(e.target.value)
              }
              placeholder="Come comparirai nella bacheca"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Foto profilo
          </label>
          <AvatarUploader
            value={avatarUrl || null}
            onChange={(url) =>
              setAvatarUrl(url || '')
            }
          />
        </div>

        <div>
          <label className="text-sm font-medium">
            Bio
          </label>
          <textarea
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={
              isClub
                ? 'Racconta storia, valori e progetto sportivo del club.'
                : 'Racconta chi sei, carriera sportiva e obiettivi.'
            }
          />
        </div>
      </section>

      {/* Atleta */}
      {!isClub && (
        <section className="space-y-4 rounded-2xl border bg-white p-4 md:p-5">
          <h2 className="text-lg font-semibold">
            Dettagli atleta
          </h2>

          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium">
                Anno di nascita
              </label>
              <input
                type="number"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={birthYear}
                onChange={(e) =>
                  setBirthYear(
                    e.target.value
                      ? Number(e.target.value)
                      : ''
                  )
                }
              />
            </div>
            <div className="md:col-span-3">
              <label className="text-sm font-medium">
                Luogo di nascita
              </label>
              <input
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={birthPlace}
                onChange={(e) =>
                  setBirthPlace(e.target.value)
                }
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">
                Città di residenza
              </label>
              <input
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                Preferenza laterale
              </label>
              <select
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={foot}
                onChange={(e) =>
                  setFoot(e.target.value)
                }
              >
                <option value="">
                  Seleziona
                </option>
                {LATERAL_PREFERENCE.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">
                Altezza (cm)
              </label>
              <input
                type="number"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={height}
                onChange={(e) =>
                  setHeight(
                    e.target.value
                      ? Number(e.target.value)
                      : ''
                  )
                }
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">
                Peso (kg)
              </label>
              <input
                type="number"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={weight}
                onChange={(e) =>
                  setWeight(
                    e.target.value
                      ? Number(e.target.value)
                      : ''
                  )
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                Sport principale
              </label>
              <select
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={sport}
                onChange={(e) => {
                  const next = e.target.value;
                  setSport(next);
                  // se cambio sport e il ruolo attuale non è più valido, resetto
                  const allowed =
                    ROLES_BY_SPORT[next] || [];
                  if (
                    allowed.length &&
                    !allowed.includes(role)
                  ) {
                    setRole('');
                  }
                }}
              >
                <option value="">
                  Seleziona
                </option>
                {SPORTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">
                Ruolo
              </label>
              <select
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={role}
                onChange={(e) =>
                  setRole(e.target.value)
                }
              >
                <option value="">
                  Seleziona ruolo
                </option>
                {rolesForSport.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>
      )}

      {/* Club */}
      {isClub && (
        <section className="space-y-4 rounded-2xl border bg-white p-4 md:p-5">
          <h2 className="text-lg font-semibold">
            Dettagli club
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">
                Sport principale
              </label>
              <select
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={clubSport}
                onChange={(e) =>
                  setClubSport(e.target.value)
                }
              >
                <option value="">
                  Seleziona
                </option>
                {SPORTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">
                Categoria / campionato
              </label>
              <input
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={clubCategory}
                onChange={(e) =>
                  setClubCategory(e.target.value)
                }
                placeholder="Es. Eccellenza, Promozione..."
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">
                Anno di fondazione
              </label>
              <input
                type="number"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={clubFoundationYear}
                onChange={(e) =>
                  setClubFoundationYear(
                    e.target.value
                      ? Number(e.target.value)
                      : ''
                  )
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                Stadio / Centro sportivo
              </label>
              <input
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={clubStadium}
                onChange={(e) =>
                  setClubStadium(e.target.value)
                }
              />
            </div>
          </div>
        </section>
      )}

      {/* Social & notifiche */}
      <section className="space-y-4 rounded-2xl border bg-white p-4 md:p-5">
        <h2 className="text-lg font-semibold">
          Social & notifiche
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">
              Instagram
            </label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={links.instagram || ''}
              onChange={(e) =>
                setLinks((prev) => ({
                  ...prev,
                  instagram: e.target.value,
                }))
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium">
              Facebook
            </label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={links.facebook || ''}
              onChange={(e) =>
                setLinks((prev) => ({
                  ...prev,
                  facebook: e.target.value,
                }))
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium">
              TikTok
            </label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={links.tiktok || ''}
              onChange={(e) =>
                setLinks((prev) => ({
                  ...prev,
                  tiktok: e.target.value,
                }))
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium">
              X / Twitter
            </label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={links.x || ''}
              onChange={(e) =>
                setLinks((prev) => ({
                  ...prev,
                  x: e.target.value,
                }))
              }
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium">
              Sito web
            </label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={links.website || ''}
              onChange={(e) =>
                setLinks((prev) => ({
                  ...prev,
                  website: e.target.value,
                }))
              }
            />
          </div>
        </div>

        <label className="mt-2 flex items-center gap-2 text-sm">
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
          className="inline-flex items-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-50"
        >
          {saving
            ? 'Salvataggio in corso…'
            : 'Salva profilo'}
        </button>
      </div>
    </form>
  );
}
