'use client';
import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

type Profile = {
  id: string;
  full_name: string | null;
  sport: string | null;
  role: string | null;
  city: string | null;
  avatar_url?: string | null;
  bio?: string | null;
};

type ApplicationRow = {
  id: string;
  created_at: string;
  status: string;
  opportunity_id: string;
  opportunity?: {
    title: string;
    club_name: string;
    city: string;
  };
};

export default function AthletePublicProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [meId, setMeId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [apps, setApps] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setMsg('');

      // id dell'URL
      const athleteId = params.id;
      if (!athleteId) {
        router.replace('/');
        return;
      }

      // prendo anche il mio id, per capire se sto guardando me stesso
      const { data: userRes } = await supabase.auth.getUser();
      setMeId(userRes?.user?.id ?? null);

      // 1) profilo pubblico
      const { data: profs, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name, sport, role, city, avatar_url, bio')
        .eq('id', athleteId)
        .limit(1);

      if (pErr) {
        setMsg(`Errore profilo: ${pErr.message}`);
        setLoading(false);
        return;
      }
      if (!profs || profs.length === 0) {
        setMsg('Profilo non trovato.');
        setLoading(false);
        return;
      }

      const p = profs[0] as Profile;
      setProfile(p);

      // 2) (facoltativo) ultime candidature visibili solo all’atleta stesso
      if (userRes?.user?.id === athleteId) {
        const { data: appsData } = await supabase
          .from('applications')
          .select('id, created_at, status, opportunity_id')
          .eq('athlete_id', athleteId)
          .order('created_at', { ascending: false })
          .limit(5);

        const appsTyped = (appsData ?? []) as ApplicationRow[];

        if (appsTyped.length > 0) {
          const oppIds = Array.from(new Set(appsTyped.map((a) => a.opportunity_id)));
          const { data: opps } = await supabase
            .from('opportunities')
            .select('id, title, club_name, city')
            .in('id', oppIds);

          const byId = Object.fromEntries((opps ?? []).map((o) => [o.id, o]));
          const merged = appsTyped.map((a) => ({
            ...a,
            opportunity: byId[a.opportunity_id as keyof typeof byId],
          }));
          setApps(merged);
        } else {
          setApps([]);
        }
      } else {
        setApps([]); // per i visitatori non mostriamo candidature
      }

      setLoading(false);
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const isMe = useMemo(() => !!meId && !!profile && meId === profile.id, [meId, profile]);

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
      {loading && <p>Caricamento…</p>}
      {!loading && !!msg && <p style={{ color: '#b91c1c' }}>{msg}</p>}
      {!loading && !msg && profile && (
        <>
          {/* Header profilo */}
          <header style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
            {profile.avatar_url ? (
              // immagine profilo se presente
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={profile.full_name ?? 'Atleta'}
                width={80}
                height={80}
                style={{ borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#e5e7eb' }} />
            )}
            <div>
              <h1 style={{ margin: 0 }}>{profile.full_name ?? 'Atleta'}</h1>
              <p style={{ margin: '4px 0', opacity: 0.8 }}>
                {profile.role ?? 'Ruolo n/d'} · {profile.sport ?? 'Sport n/d'} ·{' '}
                {profile.city ?? 'Città n/d'}
              </p>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>
                  ID: <code>{profile.id}</code>
                </span>
                {/* Messaggia: apre thread con l’atleta */}
                <Link href={`/messages/${profile.id}`} style={{ fontSize: 14 }}>
                  Messaggia →
                </Link>
                {isMe && (
                  <Link href="/settings" style={{ fontSize: 14 }}>
                    Modifica profilo →
                  </Link>
                )}
              </div>
            </div>
          </header>

          {/* Bio */}
          <section
            style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginTop: 12 }}
          >
            <h2 style={{ marginTop: 0 }}>Bio</h2>
            <p style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>
              {profile.bio && profile.bio.trim().length > 0
                ? profile.bio
                : 'Nessuna bio disponibile.'}
            </p>
          </section>

          {/* Panoramica */}
          <section
            style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginTop: 12 }}
          >
            <h2 style={{ marginTop: 0 }}>Panoramica</h2>
            <ul style={{ marginTop: 8, lineHeight: 1.8 }}>
              <li>
                <b>Sport:</b> {profile.sport ?? '—'}
              </li>
              <li>
                <b>Ruolo:</b> {profile.role ?? '—'}
              </li>
              <li>
                <b>Città:</b> {profile.city ?? '—'}
              </li>
            </ul>
          </section>

          {/* Ultime candidature (solo l’atleta vede le proprie) */}
          {isMe && (
            <section
              style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginTop: 12 }}
            >
              <h2 style={{ marginTop: 0 }}>Le mie ultime candidature</h2>
              {apps.length === 0 ? (
                <p>Nessuna candidatura recente.</p>
              ) : (
                <ul style={{ display: 'grid', gap: 12, marginTop: 8 }}>
                  {apps.map((a) => (
                    <li
                      key={a.id}
                      style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}
                    >
                      <div style={{ fontWeight: 600 }}>{a.opportunity?.title ?? 'Annuncio'}</div>
                      <div style={{ fontSize: 14, opacity: 0.8 }}>
                        {a.opportunity?.club_name ?? '—'} — {a.opportunity?.city ?? '—'}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        Stato: {a.status} · {new Date(a.created_at).toLocaleString()}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Azioni */}
          <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            <Link href="/opportunities">← Torna alle opportunità</Link>
            <Link href="/favorites">I miei preferiti</Link>
          </div>
        </>
      )}
    </main>
  );
}
