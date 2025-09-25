// components/activity/ActivityList.tsx
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Role = 'athlete' | 'club' | 'guest';

type ApplicationRow = {
  id: string;
  created_at?: string | null;
  status?: string | null; // 'submitted' | 'accepted' | 'rejected' | null
  opportunity_id?: string | null;
  athlete_id?: string | null;
};

type ActivityItem = {
  id: string;
  at: number; // unix ms
  type:
    | 'application_sent'
    | 'application_received'
    | 'application_accepted'
    | 'application_rejected'
    | 'followed_club';
  title: string;
  subtitle?: string;
  href?: string;
};

const FOLLOW_KEY = 'cp_follow_map_v1'; // lo leggiamo da localStorage per eventi "Segui"

function toMs(t?: string | number | null): number {
  if (!t) return Date.now();
  if (typeof t === 'number') return t;
  const n = Date.parse(t);
  return Number.isFinite(n) ? n : Date.now();
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const sec = Math.max(1, Math.round(diff / 1000));
  if (sec < 60) return `${sec}s fa`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m fa`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h fa`;
  const d = Math.round(h / 24);
  return `${d}g fa`;
}

export default function ActivityList() {
  const [role, setRole] = useState<Role>('guest');
  const [meId, setMeId] = useState<string | null>(null);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Chi sono?
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (cancelled) return;
        setMeId(j?.user?.id ?? null);
        const raw = (j?.role ?? '').toString().toLowerCase();
        setRole(raw === 'club' || raw === 'athlete' ? raw : 'guest');
      } catch {
        if (!cancelled) setRole('guest');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Carica attività
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const out: ActivityItem[] = [];

        // 1) Eventi "Segui" (localStorage) – disponibili solo lato client
        try {
          const raw = localStorage.getItem(FOLLOW_KEY);
          if (raw) {
            const map = JSON.parse(raw) as Record<string, { name?: string; followedAt: number }>;
            Object.entries(map).forEach(([clubId, v]) => {
              out.push({
                id: `follow-${clubId}`,
                at: toMs(v?.followedAt),
                type: 'followed_club',
                title: `Hai iniziato a seguire ${v?.name ?? 'un club'}`,
                subtitle: v?.name ? `Club: ${v.name}` : undefined,
                href: v?.name ? `/c/${clubId}` : undefined,
              });
            });
          }
        } catch {
          // noop
        }

        // 2) Candidature inviate (atleta)
        if (role === 'athlete') {
          const r = await fetch('/api/applications/mine', {
            credentials: 'include',
            cache: 'no-store',
          });
          const j = await r.json().catch(() => ({}));
          const rows: ApplicationRow[] = Array.isArray(j?.data)
            ? j.data
            : Array.isArray(j)
              ? j
              : Array.isArray(j?.applications)
                ? j.applications
                : [];

          for (const a of rows) {
            // inviata
            out.push({
              id: `sent-${a.id}`,
              at: toMs(a.created_at),
              type: 'application_sent',
              title: 'Candidatura inviata',
              subtitle: a.opportunity_id ? `Annuncio #${a.opportunity_id}` : undefined,
              href: a.opportunity_id ? `/opportunities/${a.opportunity_id}` : undefined,
            });

            // esiti
            if (a.status === 'accepted' || a.status === 'rejected') {
              out.push({
                id: `status-${a.id}`,
                at: toMs(a.created_at),
                type: a.status === 'accepted' ? 'application_accepted' : 'application_rejected',
                title: a.status === 'accepted' ? 'Candidatura accettata' : 'Candidatura rifiutata',
                subtitle: a.opportunity_id ? `Annuncio #${a.opportunity_id}` : undefined,
                href: a.opportunity_id ? `/opportunities/${a.opportunity_id}` : undefined,
              });
            }
          }
        }

        // 3) Candidature ricevute (club)
        if (role === 'club') {
          const r = await fetch('/api/applications/received', {
            credentials: 'include',
            cache: 'no-store',
          });
          const j = await r.json().catch(() => ({}));
          const rows: ApplicationRow[] = Array.isArray(j?.data)
            ? j.data
            : Array.isArray(j)
              ? j
              : Array.isArray(j?.applications)
                ? j.applications
                : [];

          for (const a of rows) {
            out.push({
              id: `recv-${a.id}`,
              at: toMs(a.created_at),
              type: 'application_received',
              title: 'Nuova candidatura ricevuta',
              subtitle: a.athlete_id ? `Atleta #${a.athlete_id}` : undefined,
              href: a.opportunity_id ? `/opportunities/${a.opportunity_id}` : undefined,
            });
          }
        }

        // ordina per data desc e limita
        out.sort((a, b) => b.at - a.at);
        const limited = out.slice(0, 50);

        if (!cancelled) setItems(limited);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Errore durante il caricamento');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [role, reloadKey]);

  const grouped = useMemo(() => {
    return items.reduce(
      (acc, it) => {
        const d = new Date(it.at);
        const key = d.toLocaleDateString();
        (acc[key] ||= []).push(it);
        return acc;
      },
      {} as Record<string, ActivityItem[]>,
    );
  }, [items]);

  if (loading) {
    return <div className="animate-pulse rounded-xl border bg-white/40 p-6">Carico attività…</div>;
  }

  if (error) {
    return (
      <div className="rounded-xl border bg-red-50 p-4 text-red-700">
        {error}{' '}
        <button
          onClick={() => setReloadKey((k) => k + 1)}
          className="ml-2 rounded-md border bg-white px-2 py-1 hover:bg-gray-50"
        >
          Riprova
        </button>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-xl border p-10 text-center text-gray-500">
        Nessuna attività recente.
        <div className="mt-3">
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="rounded-lg border px-3 py-1 hover:bg-gray-50"
          >
            Aggiorna
          </button>
        </div>
      </div>
    );
  }

  function pill(type: ActivityItem['type']) {
    const base = 'inline-block px-2 py-0.5 rounded-full text-xs';
    switch (type) {
      case 'application_sent':
        return <span className={`${base} bg-blue-100 text-blue-800`}>Inviata</span>;
      case 'application_received':
        return <span className={`${base} bg-purple-100 text-purple-800`}>Ricevuta</span>;
      case 'application_accepted':
        return <span className={`${base} bg-green-100 text-green-800`}>Accettata</span>;
      case 'application_rejected':
        return <span className={`${base} bg-red-100 text-red-800`}>Rifiutata</span>;
      case 'followed_club':
        return <span className={`${base} bg-amber-100 text-amber-800`}>Segui</span>;
      default:
        return null;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Ruolo: <span className="font-medium">{role}</span>
          {meId ? ` • Utente #${meId}` : ''}
        </div>
        <button
          onClick={() => setReloadKey((k) => k + 1)}
          className="rounded-lg border px-3 py-1.5 hover:bg-gray-50"
        >
          Aggiorna
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border">
        {Object.entries(grouped).map(([day, list]) => (
          <div key={day} className="border-b last:border-b-0">
            <div className="bg-gray-50 px-4 py-2 text-sm text-gray-600">{day}</div>
            <ul className="divide-y">
              {list.map((it) => (
                <li key={it.id} className="flex items-center gap-3 p-4">
                  {pill(it.type)}
                  <div className="flex-1">
                    <div className="font-medium">{it.title}</div>
                    <div className="text-sm text-gray-600">
                      {it.subtitle ?? '—'}
                      {it.href && (
                        <>
                          {' '}
                          •{' '}
                          <Link href={it.href} className="text-blue-700 hover:underline">
                            Apri
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-xs whitespace-nowrap text-gray-500">{timeAgo(it.at)}</div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
