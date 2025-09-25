'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

type Athlete = {
  id: string;
  full_name: string | null;
  sport: string | null;
  role: string | null;
  city: string | null;
  account_type?: 'athlete' | 'club' | null;
};

type Filters = {
  sport: string;
  role: string;
  city: string;
};

export default function SearchAthletesPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const router = useRouter();

  const [filters, setFilters] = useState<Filters>({
    sport: '',
    role: '',
    city: '',
  });

  const [rows, setRows] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setMsg('');

    // redirect for onboarding incompleto (account_type nullo)
    try {
      const { data: ures } = await supabase.auth.getUser();
      const uid = ures?.user?.id ?? null;

      if (uid) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('account_type')
          .eq('id', uid)
          .limit(1)
          .maybeSingle();

        if (prof && (prof as { account_type: string | null }).account_type == null) {
          router.replace('/onboarding');
          return;
        }
      }
    } catch {
      // ignore onboarding check errors for this page
    }

    // query base: solo profili atleta
    let q = supabase
      .from('profiles')
      .select('id, full_name, sport, role, city, account_type')
      .eq('account_type', 'athlete')
      .order('full_name', { ascending: true });

    // filtri
    if (filters.sport.trim()) q = q.ilike('sport', `%${filters.sport.trim()}%`);
    if (filters.role.trim()) q = q.ilike('role', `%${filters.role.trim()}%`);
    if (filters.city.trim()) q = q.ilike('city', `%${filters.city.trim()}%`);

    const { data, error } = await q.limit(100);
    if (error) {
      setMsg(`Errore caricamento: ${error.message}`);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as Athlete[]);
    setLoading(false);
  }, [filters.city, filters.role, filters.sport, router, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const resetFilters = () => setFilters({ sport: '', role: '', city: '' });

  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
      <h1>Cerca atleti</h1>

      {/* Filtri */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          alignItems: 'end',
          marginTop: 12,
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: 12, opacity: 0.8 }}>Sport</label>
          <input
            type="text"
            value={filters.sport}
            onChange={(e) => setFilters((f) => ({ ...f, sport: e.target.value }))}
            placeholder="Es. Calcio, Basket…"
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, opacity: 0.8 }}>Ruolo</label>
          <input
            type="text"
            value={filters.role}
            onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}
            placeholder="Es. Attaccante, Playmaker…"
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, opacity: 0.8 }}>Città</label>
          <input
            type="text"
            value={filters.city}
            onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
            placeholder="Es. Milano"
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={load}
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Filtra
          </button>
          <button
            onClick={resetFilters}
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Stato caricamento e messaggi */}
      {msg && <p style={{ color: '#b91c1c', marginTop: 12 }}>{msg}</p>}
      {loading && <p style={{ marginTop: 12 }}>Caricamento…</p>}

      {/* Lista risultati */}
      {!loading && !msg && (
        <>
          {rows.length === 0 ? (
            <p style={{ marginTop: 12 }}>Nessun atleta trovato.</p>
          ) : (
            <ul style={{ display: 'grid', gap: 12, marginTop: 16 }}>
              {rows.map((a) => (
                <li
                  key={a.id}
                  style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      flexWrap: 'wrap',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      {/* NOME → link al profilo pubblico atleta */}
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>
                        <Link href={`/athletes/${a.id}`}>{a.full_name ?? 'Atleta'}</Link>
                      </div>
                      <div style={{ fontSize: 14, opacity: 0.85 }}>
                        {a.role ?? 'Ruolo n/d'} · {a.sport ?? 'Sport n/d'} · {a.city ?? 'Città n/d'}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4 }}>
                        ID: <code>{a.id}</code>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {/* Bottone Messaggia */}
                      <Link
                        href={`/messages/${a.id}`}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: 8,
                        }}
                      >
                        Messaggia
                      </Link>
                      {/* Link al profilo */}
                      <Link
                        href={`/athletes/${a.id}`}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: 8,
                        }}
                      >
                        Vedi profilo
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
