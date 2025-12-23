'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

import OpportunitiesTable from '@/components/opportunities/OpportunitiesTable';
import Modal from '@/components/ui/Modal';
import OpportunityForm from '@/components/opportunities/OpportunityForm';
import type { OpportunitiesApiResponse, Opportunity } from '@/types/opportunity';

import { COUNTRIES } from '@/lib/opps/geo';
import { AGE_BRACKETS, SPORTS, SPORTS_ROLES } from '@/lib/opps/constants';
import { CATEGORIES_BY_SPORT } from '@/lib/opps/categories';
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

  const [meId, setMeId] = useState<string | null>(null);
  const [role, setRole] = useState<Role>('guest');            // da /api/auth/whoami
  const [profileType, setProfileType] = useState<string>(''); // fallback da /api/profiles/me
  const [meProfileId, setMeProfileId] = useState<string | null>(null);

  const [openCreate, setOpenCreate] = useState(false);
  const [editItem, setEditItem] = useState<Opportunity | null>(null);
  const [deleteItem, setDeleteItem] = useState<Opportunity | null>(null);
  const { data: italyLocations } = useItalyLocations();
  const [countryCode, setCountryCode] = useState(() => sp.get('country') ?? '');
  const [region, setRegion] = useState(() => sp.get('region') ?? '');
  const [province, setProvince] = useState(() => sp.get('province') ?? '');
  const [city, setCity] = useState(() => sp.get('city') ?? '');
  const selectedCategory = sp.get('category') ?? sp.get('required_category') ?? '';
  const selectedSport = sp.get('sport') ?? '';
  const selectedRole = sp.get('role') ?? '';
  const selectedStatus = sp.get('status') ?? '';

  useEffect(() => {
    setCountryCode(sp.get('country') ?? '');
    setRegion(sp.get('region') ?? '');
    setProvince(sp.get('province') ?? '');
    setCity(sp.get('city') ?? '');
  }, [sp]);

  const availableRegions = useMemo(
    () => (countryCode === 'IT' ? italyLocations.regions : []),
    [countryCode, italyLocations],
  );
  const availableProvinces = useMemo(
    () => (countryCode === 'IT' ? italyLocations.provincesByRegion[region] ?? [] : []),
    [countryCode, italyLocations, region],
  );
  const availableCities = useMemo(
    () => (countryCode === 'IT' ? italyLocations.citiesByProvince[province] ?? [] : []),
    [countryCode, italyLocations, province],
  );

  const updateParams = useCallback((mutator: (params: URLSearchParams) => void, options?: { resetPage?: boolean }) => {
    const base = new URLSearchParams(sp.toString());
    mutator(base);
    if (options?.resetPage ?? true) base.set('page', '1');
    const qs = base.toString();
    router.replace(qs ? `/opportunities?${qs}` : '/opportunities');
  }, [router, sp]);

  const setParam = useCallback((name: string, value: string, options?: { resetPage?: boolean }) => {
    updateParams((p) => {
      if (value) p.set(name, value);
      else p.delete(name);
    }, options);
  }, [updateParams]);

  const roleOptions = useMemo(() => {
    if (!selectedSport) return [] as string[];
    return SPORTS_ROLES[selectedSport] ?? [];
  }, [selectedSport]);

  const categoryOptions = useMemo(() => {
    if (!selectedSport) return [] as string[];
    return CATEGORIES_BY_SPORT[selectedSport] ?? [];
  }, [selectedSport]);

  useEffect(() => {
    if (!selectedSport && selectedRole) {
      setParam('role', '');
      return;
    }
    if (selectedRole && !roleOptions.includes(selectedRole)) {
      setParam('role', '');
    }
  }, [selectedSport, selectedRole, roleOptions, setParam]);

  useEffect(() => {
    if (!selectedSport && selectedCategory) {
      setParam('category', '');
      setParam('required_category', '');
      return;
    }
    if (selectedCategory && !categoryOptions.includes(selectedCategory)) {
      setParam('category', '');
      setParam('required_category', '');
    }
  }, [selectedSport, selectedCategory, categoryOptions, setParam]);

  function handleSportChange(value: string) {
    updateParams((p) => {
      if (value) p.set('sport', value);
      else p.delete('sport');

      const roleIsValid = value && selectedRole && (SPORTS_ROLES[value] ?? []).includes(selectedRole);
      const categoryIsValid = value && selectedCategory && (CATEGORIES_BY_SPORT[value] ?? []).includes(selectedCategory);

      if (!value || !roleIsValid) p.delete('role');
      if (!value || !categoryIsValid) {
        p.delete('category');
        p.delete('required_category');
      }
    });
  }

  const statusOptions = useMemo(
    () => [
      { value: '', label: 'Tutte' },
      { value: 'open', label: 'Aperte' },
      { value: 'closed', label: 'Chiuse' },
      { value: 'archived', label: 'Archiviate' },
      { value: 'draft', label: 'Bozza' },
    ],
    [],
  );

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

  // 2) Profilo corrente da /api/profiles/me (id + tipo)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const r = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (cancelled) return;
        setMeProfileId(
          (j?.data?.id ||
            j?.data?.profile_id ||
            j?.profile?.id ||
            j?.profile?.profile_id ||
            null) as string | null,
        );
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
        if (role === 'guest') {
          if (t.startsWith('club')) setRole('club');
          else if (t === 'athlete') setRole('athlete');
        }
      } catch { /* noop */ }
    })();

    return () => { cancelled = true; };
  }, [role]);

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
          const ownerEmail =
            row?.owner_email ?? row?.created_by_email ?? row?.email ?? row?.owner ?? null;

          return {
            ...row,
            owner_id: ownerId,
            created_by: ownerId,
            club_name: clubName,
            clubName,
            owner_email: ownerEmail,
          };
        });
        setData({ ...(json as any), data: normalized } as OpportunitiesApiResponse);
      })
      .catch((e) => !cancelled && setErr(e.message || 'Errore'))
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
    // dipendenze: quando cambiano i parametri URL, l'utente (meId) o la forzatura reloadKey
  }, [urlFilters, meId, reloadKey]);

  async function performDelete(o: Opportunity) {
    try {
      const res = await fetch(`/api/opportunities/${o.id}`, { method: 'DELETE', credentials: 'include' });
      const t = await res.text();
      if (!res.ok) {
        try { const j = JSON.parse(t); throw new Error(j.error || `HTTP ${res.status}`); }
        catch { throw new Error(t || `HTTP ${res.status}`); }
      }
      setReloadKey((k) => k + 1);
      router.refresh();
      setDeleteItem(null);
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
          const userId = row.user_id || null;
          const profileId = row.id || null;

          if (name) {
            if (userId) map[String(userId)] = name;
            if (profileId) map[String(profileId)] = name;
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
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select
            value={countryCode}
            onChange={(e) => {
              const nextCode = e.target.value;
              setCountryCode(nextCode);
              setRegion('');
              setProvince('');
              setCity('');
              updateParams((p) => {
                if (nextCode) p.set('country', nextCode);
                else p.delete('country');
                p.delete('region');
                p.delete('province');
                p.delete('city');
              });
            }}
            className="w-full rounded-xl border px-3 py-2"
          >
            <option value="">Paese</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            value={region}
            onChange={(e) => {
              const nextRegion = e.target.value;
              setRegion(nextRegion);
              setProvince('');
              setCity('');
              updateParams((p) => {
                if (nextRegion) p.set('region', nextRegion);
                else p.delete('region');
                p.delete('province');
                p.delete('city');
              });
            }}
            className="w-full rounded-xl border px-3 py-2"
            disabled={!countryCode || countryCode !== 'IT'}
          >
            <option value="">Regione</option>
            {availableRegions.map((r: string) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <select
            value={province}
            onChange={(e) => {
              const nextProvince = e.target.value;
              setProvince(nextProvince);
              setCity('');
              updateParams((p) => {
                if (nextProvince) p.set('province', nextProvince);
                else p.delete('province');
                p.delete('city');
              });
            }}
            className="w-full rounded-xl border px-3 py-2"
            disabled={!region || countryCode !== 'IT'}
          >
            <option value="">Provincia</option>
            {availableProvinces.map((p: string) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select
            value={city}
            onChange={(e) => {
              const nextCity = e.target.value;
              setCity(nextCity);
              updateParams((p) => {
                if (nextCity) p.set('city', nextCity);
                else p.delete('city');
              });
            }}
            className="w-full rounded-xl border px-3 py-2"
            disabled={!province || countryCode !== 'IT'}
          >
            <option value="">Città</option>
            {availableCities.map((c: string) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <select
            value={selectedSport}
            onChange={(e) => handleSportChange(e.target.value)}
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
            value={selectedRole}
            onChange={(e) => setParam('role', e.target.value)}
            className="w-full rounded-xl border px-3 py-2"
            disabled={!selectedSport}
          >
            <option value="">{selectedSport ? 'Ruolo/posizione' : 'Seleziona uno sport'}</option>
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {r}
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <select
            value={selectedCategory}
            onChange={(e) => setParam('category', e.target.value)}
            className="w-full rounded-xl border px-3 py-2"
            disabled={!selectedSport}
          >
            <option value="">{selectedSport ? 'Categoria/Livello' : 'Seleziona uno sport'}</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
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
          myProfileId={meProfileId ?? undefined}
          clubNames={clubNames}
          onEdit={(o) => setEditItem(o)}
          onDelete={(o) => setDeleteItem(o)}
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

      <Modal
        open={!!deleteItem}
        title="Eliminare opportunità?"
        onClose={() => setDeleteItem(null)}
      >
        {deleteItem && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">Vuoi eliminare “{deleteItem.title}”?</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50"
                onClick={() => setDeleteItem(null)}
              >
                Annulla
              </button>
              <button
                type="button"
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                onClick={() => performDelete(deleteItem)}
              >
                Elimina
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
