'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AvatarUploader from '@/components/AvatarUploader';

type AdminProfile = {
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  birth_year?: number | null;
  headline?: string | null;
  bio?: string | null;
};

function toYearInput(value: unknown) {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : '';
}

export default function AdminProfilePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [projectYear, setProjectYear] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const who = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const whoJson = await who.json().catch(() => ({}));
        const role = String(whoJson?.role ?? whoJson?.profile?.account_type ?? '').toLowerCase();

        if (!whoJson?.user?.id) {
          router.replace('/login?next=%2Fadmin%2Fprofile');
          return;
        }

        if (role !== 'admin') {
          router.replace('/feed');
          return;
        }

        if (!cancelled) setChecking(false);

        const profileRes = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        const profileJson = await profileRes.json().catch(() => ({}));
        if (!profileRes.ok) throw new Error(profileJson?.error ?? 'Impossibile caricare il profilo admin');
        const profile = (profileJson?.data ?? {}) as AdminProfile;

        if (cancelled) return;
        setAvatarUrl(profile.avatar_url ?? null);
        setFullName(profile.full_name ?? profile.display_name ?? '');
        setProjectYear(toYearInput(profile.birth_year));
        setHeadline(profile.headline ?? '');
        setBio(profile.bio ?? '');
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Errore imprevisto');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const payload = {
        full_name: fullName,
        display_name: fullName,
        avatar_url: avatarUrl,
        birth_year: projectYear ? Number(projectYear) : null,
        headline,
        bio,
      };

      const res = await fetch('/api/profiles/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? 'Salvataggio non riuscito');
      setSaved(true);
    } catch (err: any) {
      setError(err?.message ?? 'Errore imprevisto');
    } finally {
      setSaving(false);
    }
  }

  if (checking || loading) {
    return <div className="mx-auto max-w-3xl p-6 text-sm text-slate-600">Caricamento profilo admin…</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Platform Admin</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">Profilo Admin</h1>
            <p className="mt-2 text-sm text-slate-600">
              Gestisci i dati pubblici del profilo amministratore senza vincoli da Player o Club.
            </p>
          </div>
          <Link href="/feed" className="text-sm font-semibold text-sky-700 hover:text-sky-900">
            Torna alla feed
          </Link>
        </div>

        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {saved ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Profilo admin aggiornato.</div> : null}

        <section className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">Foto profilo</label>
            <AvatarUploader value={avatarUrl} onChange={setAvatarUrl} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-semibold text-slate-800">Nome profilo admin</span>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                placeholder="Club & Player"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Anno nascita progetto</span>
              <input
                type="number"
                inputMode="numeric"
                value={projectYear}
                onChange={(event) => setProjectYear(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                placeholder="2025"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">Ruolo pubblico</span>
              <input
                value={headline}
                onChange={(event) => setHeadline(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                placeholder="Founder · Platform Admin"
              />
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-800">Biografia</span>
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows={6}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              placeholder="Racconta il progetto Club & Player"
            />
          </label>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Salvataggio…' : 'Salva profilo admin'}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
