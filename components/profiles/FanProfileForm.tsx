'use client';

import { useEffect, useState } from 'react';
import AvatarUploader from '@/components/profiles/AvatarUploader';
import InterestAreaForm from '@/components/profiles/InterestAreaForm';
import { WORLD_COUNTRY_OPTIONS } from '@/lib/geo/countries';

type Links = {
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  x?: string | null;
};

export default function FanProfileForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [birthYear, setBirthYear] = useState<number | ''>('');
  const [country, setCountry] = useState('IT');
  const [sport, setSport] = useState('');
  const [bio, setBio] = useState('');

  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [x, setX] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        const raw = await res.json().catch(() => ({}));
        const data = raw?.data ?? raw;
        if (!data || cancelled) return;

        setFullName(data.full_name ?? '');
        setAvatarUrl(data.avatar_url ?? null);
        setBirthYear(data.birth_year ?? '');
        setCountry(data.country ?? 'IT');
        setSport(data.sport ?? '');
        setBio(data.bio ?? '');

        const links = (data.links ?? {}) as Links;
        setInstagram(links.instagram ?? '');
        setFacebook(links.facebook ?? '');
        setTiktok(links.tiktok ?? '');
        setX(links.x ?? '');
      } catch {
        if (!cancelled) setError('Impossibile caricare il profilo.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function onSave() {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const links: Links = {
        instagram: instagram.trim() || null,
        facebook: facebook.trim() || null,
        tiktok: tiktok.trim() || null,
        x: x.trim() || null,
      };

      const payload = {
        full_name: fullName.trim() || null,
        avatar_url: avatarUrl,
        birth_year: birthYear === '' ? null : Number(birthYear),
        country: country || null,
        sport: sport.trim() || null,
        bio: bio.trim() || null,
        links,
      };

      const res = await fetch('/api/profiles/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Salvataggio non riuscito');

      setMessage('Profilo fan aggiornato con successo.');
    } catch (err: any) {
      setError(err?.message || 'Errore durante il salvataggio.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 rounded-2xl border bg-white p-4 shadow-sm md:p-6">
      {error ? <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="rounded-md border border-green-200 bg-green-50 p-2 text-sm text-green-700">{message}</p> : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Profilo FAN</h2>
        <AvatarUploader value={avatarUrl} onChange={setAvatarUrl} />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="label">
            Nome e cognome
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </label>

          <label className="label">
            Anno di nascita
            <input
              type="number"
              min={1900}
              max={new Date().getFullYear()}
              className="input"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value ? Number(e.target.value) : '')}
            />
          </label>

          <label className="label">
            Nazionalità
            <select className="select" value={country} onChange={(e) => setCountry(e.target.value)}>
              {WORLD_COUNTRY_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>

          <label className="label">
            Sport che segui
            <input
              className="input"
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              placeholder="Es. Calcio, Basket, Pallavolo"
            />
          </label>
        </div>

        <label className="label">
          Biografia
          <textarea
            className="input min-h-28"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Racconta la tua passione sportiva, le squadre o gli atleti che segui..."
          />
        </label>
      </section>

      <section className="space-y-4">
        <h3 className="text-base font-semibold">Profili social</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="label">
            Instagram
            <input className="input" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/..." />
          </label>
          <label className="label">
            Facebook
            <input className="input" value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/..." />
          </label>
          <label className="label">
            TikTok
            <input className="input" value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="https://tiktok.com/@..." />
          </label>
          <label className="label">
            X
            <input className="input" value={x} onChange={(e) => setX(e.target.value)} placeholder="https://x.com/..." />
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold">Zona di interesse</h3>
        <p className="text-sm text-gray-600">Imposta la tua area per trovare club e player da seguire.</p>
        <InterestAreaForm />
      </section>

      <div>
        <button type="button" onClick={onSave} disabled={loading || saving} className="btn btn-brand">
          {saving ? 'Salvataggio…' : 'Salva profilo'}
        </button>
      </div>
    </div>
  );
}
