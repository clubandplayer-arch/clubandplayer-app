'use client';

import { useEffect, useState, FormEvent } from 'react';
import AvatarUploader from './AvatarUploader';

type AccountType = 'athlete' | 'club';

type Profile = {
  account_type?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;

  // athlete
  birth_year?: number | null;
  birth_place?: string | null;
  birth_country?: string | null;
  city?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  foot?: string | null; // lato dominante
  sport?: string | null;
  role?: string | null;

  // club
  club_foundation_year?: number | null;
  club_stadium?: string | null;
  club_league_category?: string | null;
};

function normalizeAccountType(p?: Profile | null): AccountType {
  const raw =
    (p?.account_type ?? '').toString().toLowerCase();
  if (raw.includes('club')) return 'club';
  return 'athlete';
}

const LATO_DOMINANTE_OPTIONS = [
  { value: '', label: 'Seleziona' },
  { value: 'right', label: 'Destro' },
  { value: 'left', label: 'Sinistro' },
  { value: 'both', label: 'Ambidestro' },
];

export default function ProfileEditForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] =
    useState<string | null>(null);
  const [success, setSuccess] =
    useState<string | null>(null);
  const [accountType, setAccountType] =
    useState<AccountType>('athlete');

  const [profile, setProfile] =
    useState<Profile>({
      full_name: '',
      avatar_url: null,
      bio: '',
      city: '',
      sport: '',
      role: '',
      foot: '',
    });

  // Carica profilo
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/profiles/me', {
          credentials: 'include',
          cache: 'no-store',
        });

        if (!res.ok) {
          if (!cancelled) {
            setError('Impossibile caricare il profilo.');
            setLoading(false);
          }
          return;
        }

        const json = await res.json().catch(() => ({}));
        const data: Profile | null =
          (json && json.data) ||
          (json && json.profile) ||
          null;

        if (cancelled) return;

        if (data) {
          const acc = normalizeAccountType(data);
          setAccountType(acc);

          setProfile({
            ...data,
            // garantiamo che sia stringa
            full_name: data.full_name || '',
            bio: data.bio || '',
          });
        }

        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.error(
            '[ProfileEditForm] load error',
            err
          );
          setError('Impossibile caricare il profilo.');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function onFieldChange(
    field: keyof Profile,
    value: any
  ) {
    setProfile(prev => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const payload: any = {
        // solo i campi effettivamente editabili
        full_name: profile.full_name || null,
        bio: profile.bio || null,
        city: profile.city || null,
        sport: profile.sport || null,
        role: profile.role || null,
        height_cm: profile.height_cm || null,
        weight_kg: profile.weight_kg || null,
        birth_year: profile.birth_year || null,
        birth_place: profile.birth_place || null,
        birth_country: profile.birth_country || null,
        foot: profile.foot || null,
        club_foundation_year:
          profile.club_foundation_year || null,
        club_stadium: profile.club_stadium || null,
        club_league_category:
          profile.club_league_category || null,
        avatar_url: profile.avatar_url || null,
        // manteniamo account_type se già noto
        account_type: profile.account_type || accountType,
      };

      // 🔴 nessun "nome pubblico": NON inviamo display_name dall'input
      // (se in futuro servirà per compat, potremo valorizzarlo lato API)

      const res = await fetch('/api/profiles/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error(
          '[ProfileEditForm] PATCH error',
          json
        );
        throw new Error(
          json?.details ||
            json?.error ||
            'Salvataggio non riuscito.'
        );
      }

      const saved: Profile =
        (json && json.data) || profile;

      setProfile(prev => ({
        ...prev,
        ...saved,
        full_name:
          saved.full_name || prev.full_name || '',
      }));
      setAccountType(
        normalizeAccountType(saved)
      );
      setSuccess(
        'Profilo aggiornato con successo.'
      );
    } catch (err: any) {
      setError(
        err?.message ||
          'Errore durante il salvataggio del profilo.'
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-gray-500">
        Caricamento profilo...
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8"
    >
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {success}
        </div>
      )}

      {/* DATI GENERALI */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          Dati generali
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">
              Nome completo
            </label>
            <input
              type="text"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={profile.full_name || ''}
              onChange={e =>
                onFieldChange(
                  'full_name',
                  e.target.value
                )
              }
              placeholder="Nome e cognome"
            />
          </div>
        </div>

        {/* Foto profilo */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-700">
            Foto profilo
          </label>
          <AvatarUploader
            value={
              profile.avatar_url || null
            }
            onChange={url =>
              onFieldChange(
                'avatar_url',
                url
              )
            }
          />
        </div>

        {/* Bio */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">
            Bio
          </label>
          <textarea
            className="w-full rounded-lg border px-3 py-2 text-sm"
            rows={4}
            placeholder="Racconta chi sei, carriera sportiva e obiettivi."
            value={profile.bio || ''}
            onChange={e =>
              onFieldChange(
                'bio',
                e.target.value
              )
            }
          />
        </div>
      </section>

      {/* DETTAGLI ATLETA */}
      {accountType === 'athlete' && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">
            Dettagli atleta
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Anno di nascita
              </label>
              <input
                type="number"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={
                  profile.birth_year || ''
                }
                onChange={e =>
                  onFieldChange(
                    'birth_year',
                    e.target.value
                      ? Number(
                          e.target.value
                        )
                      : null
                  )
                }
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Luogo di nascita
              </label>
              <input
                type="text"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={
                  profile.birth_place ||
                  ''
                }
                onChange={e =>
                  onFieldChange(
                    'birth_place',
                    e.target.value
                  )
                }
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Città di residenza
              </label>
              <input
                type="text"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={profile.city || ''}
                onChange={e =>
                  onFieldChange(
                    'city',
                    e.target.value
                  )
                }
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Lato dominante
              </label>
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={
                  profile.foot || ''
                }
                onChange={e =>
                  onFieldChange(
                    'foot',
                    e.target.value ||
                      null
                  )
                }
              >
                {LATO_DOMINANTE_OPTIONS.map(
                  opt => (
                    <option
                      key={opt.value}
                      value={
                        opt.value
                      }
                    >
                      {opt.label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Altezza (cm)
              </label>
              <input
                type="number"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={
                  profile.height_cm ||
                  ''
                }
                onChange={e =>
                  onFieldChange(
                    'height_cm',
                    e.target.value
                      ? Number(
                          e.target.value
                        )
                      : null
                  )
                }
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Peso (kg)
              </label>
              <input
                type="number"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={
                  profile.weight_kg ||
                  ''
                }
                onChange={e =>
                  onFieldChange(
                    'weight_kg',
                    e.target.value
                      ? Number(
                          e.target.value
                        )
                      : null
                  )
                }
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Sport principale
              </label>
              <input
                type="text"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={
                  profile.sport || ''
                }
                onChange={e =>
                  onFieldChange(
                    'sport',
                    e.target.value
                  )
                }
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Ruolo
              </label>
              <input
                type="text"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={
                  profile.role || ''
                }
                onChange={e =>
                  onFieldChange(
                    'role',
                    e.target.value
                  )
                }
              />
            </div>
          </div>
        </section>
      )}

      {/* DETTAGLI CLUB */}
      {accountType === 'club' && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">
            Dettagli club
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Anno di fondazione
              </label>
              <input
                type="number"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={
                  profile.club_foundation_year ||
                  ''
                }
                onChange={e =>
                  onFieldChange(
                    'club_foundation_year',
                    e.target.value
                      ? Number(
                          e.target.value
                        )
                      : null
                  )
                }
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Stadio / impianto
              </label>
              <input
                type="text"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={
                  profile.club_stadium ||
                  ''
                }
                onChange={e =>
                  onFieldChange(
                    'club_stadium',
                    e.target.value
                  )
                }
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Categoria / campionato
              </label>
              <input
                type="text"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={
                  profile.club_league_category ||
                  ''
                }
                onChange={e =>
                  onFieldChange(
                    'club_league_category',
                    e.target.value
                  )
                }
              />
            </div>
          </div>
        </section>
      )}

      <div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-60"
        >
          {saving
            ? 'Salvataggio...'
            : 'Salva modifiche'}
        </button>
      </div>
    </form>
  );
}
