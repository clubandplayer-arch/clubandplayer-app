'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

import OpportunitiesTable from '@/components/opportunities/OpportunitiesTable';
import Modal from '@/components/ui/Modal';
import OpportunityForm from '@/components/opportunities/OpportunityForm';
import type { OpportunitiesApiResponse, Opportunity } from '@/types/opportunity';

import { COUNTRIES } from '@/lib/opps/geo';
import { AGE_BRACKETS, SPORTS, SPORTS_ROLES } from '@/lib/opps/constants';
import { PLAYING_CATEGORY_EN } from '@/lib/enums';
import { useItalyLocations } from '@/hooks/useItalyLocations';

type Role = 'athlete' | 'club' | 'guest';

export default function OpportunitiesClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const [data, setData] = useState<OpportunitiesApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [clubNames, setClubNames] = useState<Record<string, string>>({});
  const [recommended, setRecommended] = useState<Opportunity[]>([]);
  const [recommendedError, setRecommendedError] = useState<string | null>(null);
  const [recommendedLoading, setRecommendedLoading] = useState(false);

  const [meId, setMeId] = useState<string | null>(null);
  const [role, setRole] = useState<Role>('guest');            // da /api/auth/whoami
  const [profileType, setProfileType] = useState<string>(''); // fallback da /api/profiles/me

  const [openCreate, setOpenCreate] = useState(false);
  const [editItem, setEditItem] = useState<Opportunity | null>(null);
  const { data: italyLocations } = useItalyLocations();
  const selectedCountry = sp.get('country') ?? '';
  const selectedRegion = sp.get('region') ?? '';
  const selectedProvince = sp.get('province') ?? '';
  const selectedCategory = sp.get('category') ?? sp.get('required_category') ?? '';
  const selectedRole = sp.get('role') ?? '';
  const selectedStatus = sp.get('status') ?? '';
  const availableProvinces =
    selectedCountry === 'Italia' ? italyLocations.provincesByRegion[selectedRegion] ?? [] : [];
  const availableCities =
    selectedCountry === 'Italia' ? italyLocations.citiesByProvince[selectedProvince] ?? [] : [];

  const roleOptions = useMemo(() => {
    const values = Object.values(SPORTS_ROLES).flat();
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
  }, []);

  const categoryOptions = useMemo(
    () => PLAYING_CATEGORY_EN.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) })),
    [],
  );

  const statusOptions = useMemo(
    () => [
      { value: '', label: 'Tutte' },
      { value: 'open', label: 'Aperte' },
      { value: 'draft', label: 'Bozza' },
      { value: 'closed', label: 'Chiuse' },
      { value: 'archived', label: 'Archiviate' },
    ],
    [],
  );

  const loadRecommended = useCallback(() => {
    if (!meId) {
      setRecommended([]);
      return;
    }

    setRecommendedLoading(true);
    setRecommendedError(null);

    fetch(`/api/opportunities/recommended?limit=5`, { credentials: 'include', cache: 'no-store' })
      .then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) {
          const message = (json as any)?.message || (json as any)?.error || `HTTP ${r.status}`;
          throw new Error(message);
        }
        return (json as any)?.data || [];
      })
      .then((rows: Opportunity[]) => {
        setRecommended(Array.isArray(rows) ? rows : []);
      })
      .catch((e: any) => {
        setRecommendedError(e?.message || 'Errore nel caricamento delle opportunità consigliate');
        setRecommended([]);
      })
      .finally(() => {
        setRecommendedLoading(false);
      });
  }, [meId]);

  // Costruisci i filtri base dai parametri URL
  const urlFilters = useMemo(() => {
    const p = new URLSearchParams();
    for (const k of [
      'q', 'page', 'pageSize', 'sort',
      'country', 'region', 'province', 'city', 'club',
      'clubId', 'club_id',
      'sport', 'role', 'age', 'status',
      'category', 'required_category',
      'owner', 'owner_id', 'created_by',
    ]) {
      const v = sp.get(k);
      if (v) p.set(k, v);
    }
    return p;
  }, [sp]);

  function setParam(name: string, value: string) {
    const p = new URLSearchParams(sp.toString());
    if (value) p.set(name, value);
    else p.delete(name);
    if (name !== 'page') p.set('page', '1');
    const qs = p.toString();
    router.replace(qs ? `/opportunities?${qs}` : '/opportunities');
  }

  function clearClubFilter() {
    const p = new URLSearchParams(sp.toString());
    p.delete('clubId');
    p.delete('club_id');
    p.set('page', '1');
    const qs = p.toString();
    router.replace(qs ? `/opportunities?${qs}` : '/opportunities');
  }

  // 1) Chi sono? (id + role se disponibile)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/auth/whoami', { credentials: 'include', cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (cancelled) return;
        setMeId(j?.user?.id ?? null);
        const raw = (j?.role ?? '').toString().toLowerCase();
        if (raw === 'club' || raw === 'athlete') setRole(raw as Role);
        else setRole('guest');
      } catch {
        if (!cancelled) setRole('guest');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 2) Fallback ruolo da profiles.me se whoami non chiarisce
  useEffect(() => {
    let cancelled = false;
    if (!meId) return;
    if (role === 'club' || role === 'athlete') return;

    (async () => {
      try {
        const r = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (cancelled) return;
        const t = (
          j?.data?.account_type ??
          j?.data?.profile_type ??
          j?.data?.type ??
          j?.type ??
          j?.profile?.account_type ??
          j?.profile?.type ??
          ''
        )
          .toString()
          .toLowerCase();
        setProfileType(t);
        if (t.startsWith('club')) setRole('club');
        else if (t === 'athlete') setRole('athlete');
      } catch { /* noop */ }
    })();

    return () => { cancelled = true; };
  }, [meId, role]);

  // 2bis) Opportunità raccomandate per il profilo corrente
  useEffect(() => {
    loadRecommended();
  }, [loadRecommended]);

  const isClub = role === 'club' || profileType.startsWith('club');
  const activeClubFilter = sp.get('clubId') ?? sp.get('club_id');

  // 3) Apertura robusta della modale da ?new=1 e pulizia URL
  useEffect(() => {
    const shouldOpen =
      sp.get('new') === '1' ||
      (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('new') === '1');

    if (!shouldOpen) return;

    // Apri subito la modale (la form comparirà quando isClub diventa true)
    const t = setTimeout(() => setOpenCreate(true), 0);

    // Rimuovi ?new=1 dall’URL
    const p = new URLSearchParams(sp.toString());
    p.delete('new');
    const qs = p.toString();
    router.replace(qs ? `/opportunities?${qs}` : '/opportunities');

    return () => clearTimeout(t);
  }, [sp, router]);

  // 4) Caricamento lista
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);

    const p = new URLSearchParams(urlFilters.toString());
    const resolveMe = (key: string) => {
      if (p.get(key) === 'me') {
        if (meId) p.set(key, meId);
        else p.delete(key);
      }
    };
    resolveMe('owner');
    resolveMe('owner_id');
    resolveMe('created_by');

    const qs = p.toString();

    fetch(`/api/opportunities?${qs}`, { credentials: 'include', cache: 'no-store' })
      .then(async (r) => {
        const t = await r.text();
        if (!r.ok) {
          try { const j = JSON.parse(t); throw new Error(j.error || `HTTP ${r.status}`); }
          catch { throw new Error(t || `HTTP ${r.status}`); }
        }
        return JSON.parse(t) as OpportunitiesApiResponse;
      })
      .then((json) => {
        if (cancelled) return;
        const rows = Array.isArray((json as any)?.data) ? (json as any).data : [];
        const normalized = rows.map((row: any) => {
          const ownerId = row?.owner_id ?? row?.created_by ?? null;
          const clubName = row?.club_name ?? row?.clubName ?? row?.owner_name ?? null;
          return { ...row, owner_id: ownerId, created_by: ownerId, club_name: clubName, clubName };
        });
        setData({ ...(json as any), data: normalized } as OpportunitiesApiResponse);
      })
      .catch((e) => !cancelled && setErr(e.message || 'Errore'))
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
    // dipendenze: quando cambiano i parametri URL, l'utente (meId) o la forzatura reloadKey
  }, [urlFilters, meId, reloadKey]);

  async function handleDelete(o: Opportunity) {
    if (!confirm(`Eliminare "${o.title}"?`)) return;
    try {
      const res = await fetch(`/api/opportunities/${o.id}`, { method: 'DELETE', credentials: 'include' });
      const t = await res.text();
      if (!res.ok) {
        try { const j = JSON.parse(t); throw new Error(j.error || `HTTP ${res.status}`); }
        catch { throw new Error(t || `HTTP ${res.status}`); }
      }
      setReloadKey((k) => k + 1);
      router.refresh();
    } catch (e: any) {
      alert(e.message || 'Errore durante eliminazione');
    }
  }

  const items: Opportunity[] = useMemo(() => {
    const arr = (data as any)?.data;
    if (!Array.isArray(arr)) return [];
    return arr.map((row: any) => {
      const ownerId = row?.owner_id ?? row?.created_by ?? null;
      return { ...row, owner_id: ownerId, created_by: ownerId } as Opportunity;
    });
  }, [data]);

  const activeClubName = useMemo(() => {
    if (!activeClubFilter) return null;
    if (clubNames[activeClubFilter]) return clubNames[activeClubFilter];
    const found = items.find(
      (o) =>
        (o as any)?.club_id === activeClubFilter ||
        o.created_by === activeClubFilter ||
        (o as any)?.owner_id === activeClubFilter,
    );
    return (found as any)?.club_name || (found as any)?.clubName || null;
  }, [activeClubFilter, clubNames, items]);

  useEffect(() => {
    const ids = Array.from(
      new Set(
        items
          .flatMap((o) => [o.created_by, (o as any)?.owner_id, (o as any)?.club_id])
          .filter((id): id is string => Boolean(id)),
      ),
    );

    if (!ids.length) {
      setClubNames({});
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        const qs = encodeURIComponent(ids.join(','));
        const res = await fetch(`/api/profiles/public?ids=${qs}`, {
          cache: 'no-store',
          credentials: 'include',
          signal: controller.signal,
        });
        const json = await res.json().catch(() => ({ data: [] }));
        const map: Record<string, string> = {};
        const list = Array.isArray(json?.data) ? json.data : [];
        list.forEach((row: any) => {
          const name = row.display_name || row.full_name || row.headline || null;
          const userId = row.user_id || row.id;
          if (name && userId) {
            map[String(userId)] = name;
          }
        });
        setClubNames(map);
      } catch (fetchErr) {
        if (!(fetchErr as any)?.name?.includes('AbortError')) {
          setClubNames({});
        }
      }
    })();

    return () => controller.abort();
  }, [items]);

  return (
    <div className="page-shell space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="heading-h1">Opportunità</h1>
        {/* CTA spostata in topbar (link /opportunities?new=1) */}
      </div>

      <div className="rounded-2xl border bg-white/70 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Suggerite</p>
            <h2 className="text-lg font-semibold">Opportunità presenti</h2>
          </div>
          <button
            type="button"
            onClick={loadRecommended}
            className="rounded-xl border px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
          >
            Aggiorna
          </button>
        </div>

        <div className="mt-3 space-y-3">
          {recommendedLoading && <div className="h-20 w-full animate-pulse rounded-xl bg-gray-200" />}
          {!recommendedLoading && recommendedError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {recommendedError}
            </div>
          )}
          {!recommendedLoading && !recommendedError && recommended.length > 0 && (
            <div className="space-y-3">
              {recommended.map((opp) => {
                const place = [opp.city, opp.province, opp.region, opp.country].filter(Boolean).join(', ');
                return (
                  <div key={opp.id} className="rounded-xl border bg-gray-50 px-3 py-2 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <div className="text-xs uppercase tracking-wide text-gray-500">Suggerita</div>
                        <a href={`/opportunities/${opp.id}`} className="block text-base font-semibold hover:underline">
                          {opp.title}
                        </a>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-700">
                          {opp.sport && <span className="rounded-full bg-white px-2 py-0.5">{opp.sport}</span>}
                          {opp.role && <span className="rounded-full bg-white px-2 py-0.5">{opp.role}</span>}
                          {place && <span className="rounded-full bg-white px-2 py-0.5">📍 {place}</span>}
                        </div>
                      </div>
                      <a
                        href={`/opportunities/${opp.id}`}
                        className="shrink-0 rounded-lg border px-3 py-1 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        Vedi dettagli
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Barra filtri */}
      <div className="space-y-4 rounded-2xl border p-4 bg-white/70 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input
            placeholder="Cerca per titolo/descrizione…"
            defaultValue={sp.get('q') ?? ''}
            onChange={(e) => setParam('q', e.currentTarget.value)}
            className="w-full rounded-xl border px-4 py-2"
          />

          <input
            placeholder="Nome club/squadra"
            defaultValue={sp.get('club') ?? ''}
            onBlur={(e) => setParam('club', e.currentTarget.value)}
            className="w-full rounded-xl border px-3 py-2"
          />

          <select
            value={selectedRole}
            onChange={(e) => setParam('role', e.target.value)}
            className="w-full rounded-xl border px-3 py-2"
          >
            <option value="">Ruolo/posizione</option>
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <select
            value={sp.get('country') ?? ''}
            onChange={(e) => setParam('country', e.target.value)}
            className="w-full rounded-xl border px-3 py-2"
          >
            <option value="">Paese</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.label}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Regione/Provincia/Città per Italia */}
          {selectedCountry === 'Italia' && (
            <>
              <select
                value={selectedRegion}
                onChange={(e) => { setParam('region', e.target.value); setParam('province', ''); setParam('city', ''); }}
                className="w-full rounded-xl border px-3 py-2"
              >
                <option value="">Regione</option>
                {italyLocations.regions.map((r: string) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              {availableProvinces.length > 0 ? (
                <select
                  value={selectedProvince}
                  onChange={(e) => { setParam('province', e.target.value); setParam('city', ''); }}
                  className="w-full rounded-xl border px-3 py-2"
                >
                  <option value="">Provincia</option>
                  {availableProvinces.map((p: string) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              ) : (
                <input
                  placeholder="Provincia"
                  defaultValue={selectedProvince}
                  onBlur={(e) => setParam('province', e.currentTarget.value)}
                  className="w-full rounded-xl border px-3 py-2"
                />
              )}

              {availableCities.length > 0 ? (
                <select
                  value={sp.get('city') ?? ''}
                  onChange={(e) => setParam('city', e.target.value)}
                  className="w-full rounded-xl border px-3 py-2"
                >
                  <option value="">Città</option>
                  {availableCities.map((c: string) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              ) : (
                <input
                  placeholder="Città"
                  defaultValue={sp.get('city') ?? ''}
                  onBlur={(e) => setParam('city', e.currentTarget.value)}
                  className="w-full rounded-xl border px-3 py-2"
                />
              )}
            </>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <select
            value={sp.get('sport') ?? ''}
            onChange={(e) => setParam('sport', e.target.value)}
            className="w-full rounded-xl border px-3 py-2"
          >
            <option value="">Sport</option>
            {SPORTS.map((s: string) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={sp.get('age') ?? ''}
            onChange={(e) => setParam('age', e.target.value)}
            className="w-full rounded-xl border px-3 py-2"
          >
            <option value="">Età</option>
            {AGE_BRACKETS.map((b: string) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setParam('category', e.target.value)}
            className="w-full rounded-xl border px-3 py-2"
          >
            <option value="">Categoria/Livello</option>
            {categoryOptions.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setParam('status', e.target.value)}
            className="w-full rounded-xl border px-3 py-2"
          >
            <option value="">Tipo opportunità</option>
            {statusOptions.map((s) => (
              <option key={s.value || 'all'} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <label className="text-sm text-gray-600">Ordina</label>
            <select
              value={sp.get('sort') ?? 'recent'}
              onChange={(e) => setParam('sort', e.target.value)}
              className="w-full rounded-xl border px-3 py-2 sm:w-44"
            >
              <option value="recent">Più recenti</option>
              <option value="oldest">Meno recenti</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => setParam('sort', (sp.get('sort') ?? 'recent') === 'recent' ? 'oldest' : 'recent')}
            className="w-full rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 sm:w-auto"
          >
            Inverti ordine
          </button>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <label className="text-sm text-gray-600">Per pagina</label>
            <select
              value={sp.get('pageSize') ?? '20'}
              onChange={(e) => setParam('pageSize', e.target.value)}
              className="w-full rounded-xl border px-3 py-2 sm:w-24"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>
      </div>

        {activeClubFilter && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed bg-blue-50 px-3 py-2 text-sm text-blue-900">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-blue-800">Filtro club</span>
              <span>
                Filtrate per: <strong>{activeClubName || activeClubFilter}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={clearClubFilter}
              className="text-xs font-semibold text-blue-700 underline-offset-4 hover:underline"
            >
              Rimuovi filtro
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-700">
          <div className="rounded-xl border bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Totale risultati</p>
            <p className="text-2xl font-semibold">{items.length}</p>
            <p className="text-xs text-gray-500">{data?.total ? `${data.total} in database` : 'Vista corrente'}</p>
          </div>
          <div className="rounded-xl border bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Club unici</p>
            <p className="text-2xl font-semibold">{new Set(items.map((o) => o.created_by || o.owner_id || o.club_name)).size}</p>
            <p className="text-xs text-gray-500">in questa vista</p>
          </div>
          <div className="rounded-xl border bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Area prevalente</p>
            <p className="text-sm font-medium">
              {(() => {
                const byRegion = items.reduce((acc, curr) => {
                  const key = curr.region || curr.country || 'N/D';
                  acc[key] = (acc[key] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);
                const top = Object.entries(byRegion).sort((a, b) => b[1] - a[1])[0];
                return top ? `${top[0]} (${top[1]})` : 'Nessuna area';
              })()}
            </p>
            <p className="text-xs text-gray-500">ordinata per occorrenze</p>
          </div>
        </div>

      {loading && <div className="h-64 w-full rounded-2xl bg-gray-200 animate-pulse" />}

      {err && (
        <div className="border rounded-xl p-4 bg-red-50 text-red-700">
          Errore nel caricamento: {err}{' '}
          <button onClick={() => setReloadKey((k) => k + 1)} className="ml-3 px-3 py-1 border rounded-lg bg-white hover:bg-gray-50">
            Riprova
          </button>
        </div>
      )}

      {!loading && !err && (
        <OpportunitiesTable
          items={items}
          currentUserId={meId ?? undefined}
          userRole={role}
          clubNames={clubNames}
          onEdit={(o) => setEditItem(o)}
          onDelete={(o) => handleDelete(o)}
        />
      )}

      {/* Modale creazione: si apre anche da ?new=1; la form appare quando isClub è true */}
      <Modal open={openCreate} title="Nuova opportunità" onClose={() => setOpenCreate(false)}>
        {isClub ? (
          <OpportunityForm
            onCancel={() => setOpenCreate(false)}
            onSaved={() => {
              setOpenCreate(false);
              setReloadKey((k) => k + 1);
              router.refresh();
            }}
          />
        ) : (
          <div className="text-sm text-gray-600">Devi essere un club per creare un’opportunità.</div>
        )}
      </Modal>

      <Modal open={!!editItem} title={`Modifica: ${editItem?.title ?? ''}`} onClose={() => setEditItem(null)}>
        {editItem && (
          <OpportunityForm
            initial={editItem}
            onCancel={() => setEditItem(null)}
            onSaved={() => {
              setEditItem(null);
              setReloadKey((k) => k + 1);
              router.refresh();
            }}
          />
        )}
      </Modal>
    </div>
  );
}
