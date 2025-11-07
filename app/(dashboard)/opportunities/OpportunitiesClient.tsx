'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

import OpportunitiesTable from '@/components/opportunities/OpportunitiesTable';
import { SPORTS, AGE_BRACKETS } from '@/lib/opps/constants';
import {
  COUNTRIES,
  ITALY_REGIONS,
  PROVINCES_BY_REGION,
  CITIES_BY_PROVINCE,
} from '@/lib/opps/geo';
import type { Opportunity } from '@/types/opportunity';

type Role = 'athlete' | 'club' | 'guest';

type OpportunitiesApiResponse = {
  data?: Opportunity[];
  error?: string;
};

export default function OpportunitiesClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [role, setRole] = useState<Role>('guest');
  const [meId, setMeId] = useState<string | null>(null);

  const [rows, setRows] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Costruisco i parametri da passare alle API
  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    const keys = [
      'q',
      'page',
      'pageSize',
      'sort',
      'country',
      'region',
      'province',
      'city',
      'sport',
      'role',
      'age',
      'owner',
      'owner_id',
      'created_by',
    ];
    for (const key of keys) {
      const v = searchParams.get(key);
      if (v) p.set(key, v);
    }
    return p;
  }, [searchParams]);

  const setParam = (name: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(name, value);
    else p.delete(name);
    if (name !== 'page') {
      p.set('page', '1');
    }
    const qs = p.toString();
    router.replace(qs ? `/opportunities?${qs}` : '/opportunities');
  };

  // whoami: prendo user.id + role
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/auth/whoami', {
          credentials: 'include',
          cache: 'no-store',
        });
        const data = await res.json().catch(() => ({} as any));
        if (cancelled) return;

        const uid = data?.user?.id ?? null;
        setMeId(uid);

        const raw = (data?.role ?? '').toString().toLowerCase();
        if (raw === 'club' || raw === 'athlete') {
          setRole(raw);
        } else {
          setRole('guest');
        }
      } catch {
        if (!cancelled) {
          setRole('guest');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Carico opportunità
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const p = new URLSearchParams(queryParams.toString());

        // created_by=me → risolvo con meId
        if (p.get('created_by') === 'me') {
          if (meId) p.set('created_by', meId);
          else p.delete('created_by');
        }

        const res = await fetch(`/api/opportunities?${p.toString()}`, {
          credentials: 'include',
          cache: 'no-store',
        });

        const json = (await res.json().catch(() => ({}))) as
          | OpportunitiesApiResponse
          | any;

        if (!res.ok) {
          throw new Error(json?.error || `HTTP ${res.status}`);
        }

        const data = Array.isArray(json?.data)
          ? (json.data as Opportunity[])
          : Array.isArray(json)
          ? (json as Opportunity[])
          : [];

        if (!cancelled) {
          setRows(data);
        }
      } catch (e: any) {
        if (!cancelled) {
          setErr(
            e?.message || 'Errore nel caricamento delle opportunità'
          );
          setRows([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [queryParams, meId]);

  return (
    <div className="space-y-4">
      {/* FILTRI */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white p-3 text-sm">
        <input
          className="w-full max-w-xs rounded-lg border px-3 py-2"
          placeholder="Cerca per titolo, club, posizione..."
          defaultValue={searchParams.get('q') ?? ''}
          onBlur={(e) => setParam('q', e.target.value)}
        />

        <select
          className="rounded-lg border px-2 py-2"
          value={searchParams.get('sport') ?? ''}
          onChange={(e) => setParam('sport', e.target.value)}
        >
          <option value="">Tutti gli sport</option>
          {SPORTS.map((sport) => (
            <option key={sport} value={sport}>
              {sport}
            </option>
          ))}
        </select>

        <select
          className="rounded-lg border px-2 py-2"
          value={searchParams.get('age') ?? ''}
          onChange={(e) => setParam('age', e.target.value)}
        >
          <option value="">Tutte le età</option>
          {AGE_BRACKETS.map((age) => (
            <option key={age} value={age}>
              {age}
            </option>
          ))}
        </select>

        <select
          className="rounded-lg border px-2 py-2"
          value={searchParams.get('country') ?? ''}
          onChange={(e) => setParam('country', e.target.value)}
        >
          <option value="">Paese</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>

        <select
          className="rounded-lg border px-2 py-2"
          value={searchParams.get('region') ?? ''}
          onChange={(e) => {
            setParam('region', e.target.value);
            setParam('province', '');
            setParam('city', '');
          }}
        >
          <option value="">Regione</option>
          {ITALY_REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        {PROVINCES_BY_REGION[searchParams.get('region') ?? ''] && (
          <select
            className="rounded-lg border px-2 py-2"
            value={searchParams.get('province') ?? ''}
            onChange={(e) => {
              setParam('province', e.target.value);
              setParam('city', '');
            }}
          >
            <option value="">Provincia</option>
            {PROVINCES_BY_REGION[
              searchParams.get('region') ?? ''
            ]!.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        )}

        {CITIES_BY_PROVINCE[searchParams.get('province') ?? ''] && (
          <select
            className="rounded-lg border px-2 py-2"
            value={searchParams.get('city') ?? ''}
            onChange={(e) => setParam('city', e.target.value)}
          >
            <option value="">Città</option>
            {CITIES_BY_PROVINCE[
              searchParams.get('province') ?? ''
            ]!.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* LISTA */}
      <OpportunitiesTable
        items={rows}
        currentUserId={meId}
        userRole={role}
      />

      {loading && (
        <div className="mt-2 text-sm text-gray-500">
          Caricamento opportunità…
        </div>
      )}

      {!loading && err && (
        <div className="mt-2 rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-700">
          {err}
        </div>
      )}

      {!loading && !err && rows.length === 0 && (
        <div className="mt-2 text-sm text-gray-500">
          Nessuna opportunità trovata.
        </div>
      )}
    </div>
  );
}
