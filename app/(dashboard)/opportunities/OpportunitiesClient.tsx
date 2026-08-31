'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

import OpportunitiesTable from '@/components/opportunities/OpportunitiesTable';
import Modal from '@/components/ui/Modal';
import OpportunityForm from '@/components/opportunities/OpportunityForm';
import CanonicalGeographySelector from '@/components/geo/CanonicalGeographySelector';
import type { OpportunitiesApiResponse, Opportunity } from '@/types/opportunity';

import { AGE_BRACKETS, normalizeSport, SPORTS, SPORTS_ROLES } from '@/lib/opps/constants';
import { CATEGORIES_BY_SPORT } from '@/lib/opps/categories';
import { useI18n } from '@/components/i18n/I18nProvider';
import { localizeSportRole } from '@/lib/i18n/controlledVocabulary';

type Role = 'athlete' | 'club' | 'staff' | 'fan' | 'guest';

export default function OpportunitiesClient() {
  const { t } = useI18n();
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
  const filterCountryId = sp.get('countryId') ?? sp.get('country_id');
  const filterGeoAreaId = sp.get('geoAreaId') ?? sp.get('geo_area_id');
  const countryChangeResetsArea = useRef(false);
  const selectedCategory = sp.get('category') ?? sp.get('required_category') ?? '';
  const selectedSport = sp.get('sport') ?? '';
  const normalizedSelectedSport = normalizeSport(selectedSport) ?? selectedSport;
  const selectedRole = sp.get('role') ?? '';
  const selectedRoleGroup = sp.get('role_group') ?? sp.get('roleGroup') ?? '';


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
    if (!normalizedSelectedSport) return [] as string[];
    return SPORTS_ROLES[normalizedSelectedSport] ?? [];
  }, [normalizedSelectedSport]);

  const categoryOptions = useMemo(() => {
    if (!normalizedSelectedSport) return [] as string[];
    return CATEGORIES_BY_SPORT[normalizedSelectedSport] ?? [];
  }, [normalizedSelectedSport]);

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

      const normalizedValue = normalizeSport(value) ?? value;
      const roleIsValid = value && selectedRole && (SPORTS_ROLES[normalizedValue] ?? []).includes(selectedRole);
      const categoryIsValid = value && selectedCategory && (CATEGORIES_BY_SPORT[normalizedValue] ?? []).includes(selectedCategory);

      if (!value || !roleIsValid) p.delete('role');
      if (!value || !categoryIsValid) {
        p.delete('category');
        p.delete('required_category');
      }
    });
  }

  // Costruisci i filtri base dai parametri URL
  const urlFilters = useMemo(() => {
    const p = new URLSearchParams();
    for (const k of [
      'q', 'page', 'pageSize', 'sort',
      'country', 'region', 'province', 'city', 'club',
      'countryId', 'country_id', 'geoAreaId', 'geo_area_id',
      'clubId', 'club_id',
      'sport', 'role', 'age',
      'role_group',
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
        if (raw === 'club' || raw === 'athlete' || raw === 'staff' || raw === 'fan') setRole(raw as Role);
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
      const roleGroup = (row?.role_group ?? row?.roleGroup) === 'staff' ? 'staff' : 'player';
      return { ...row, owner_id: ownerId, created_by: ownerId, role_group: roleGroup, roleGroup } as Opportunity;
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
        <h1 className="heading-h1">{t('opportunities.title')}</h1>
        {/* CTA spostata in topbar (link /opportunities?new=1) */}
      </div>

      {/* Barra filtri */}
      <div className="space-y-4 rounded-2xl border p-4 bg-white/70 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2">
          <input
            placeholder={t('opportunities.searchPlaceholder')}
            defaultValue={sp.get('q') ?? ''}
            onChange={(e) => setParam('q', e.currentTarget.value)}
            className="w-full rounded-xl border px-4 py-2"
          />

          <input
            placeholder={t('opportunities.clubPlaceholder')}
            defaultValue={sp.get('club') ?? ''}
            onBlur={(e) => setParam('club', e.currentTarget.value)}
            className="w-full rounded-xl border px-3 py-2"
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <CanonicalGeographySelector
            idPrefix="opportunity-filter-geography"
            countryId={filterCountryId}
            geoAreaId={filterGeoAreaId}
            onCountryChange={(countryId) => {
              countryChangeResetsArea.current = true;
              updateParams((p) => {
                for (const key of ['country', 'region', 'province', 'city', 'country_id', 'geo_area_id', 'geoAreaId']) p.delete(key);
                if (countryId) p.set('countryId', countryId);
                else p.delete('countryId');
              });
            }}
            onGeoAreaChange={(geoAreaId) => {
              if (countryChangeResetsArea.current && !geoAreaId) {
                countryChangeResetsArea.current = false;
                return;
              }
              countryChangeResetsArea.current = false;
              updateParams((p) => {
                p.delete('geo_area_id');
                if (geoAreaId) p.set('geoAreaId', geoAreaId);
                else p.delete('geoAreaId');
              });
            }}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <select
            value={selectedSport}
            onChange={(e) => handleSportChange(e.target.value)}
            className="w-full rounded-xl border px-3 py-2"
          >
            <option value="">{t('opportunities.sport')}</option>
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
            <option value="">{selectedSport ? t('opportunities.role') : t('opportunities.selectSport')}</option>
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {localizeSportRole(r, t)}
              </option>
            ))}
          </select>

          <select
            value={selectedRoleGroup}
            onChange={(e) => setParam('role_group', e.target.value)}
            className="w-full rounded-xl border px-3 py-2"
          >
            <option value="">{t('opportunities.allRoleGroups')}</option>
            <option value="player">Player</option>
            <option value="staff">Staff</option>
          </select>

        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <select
            value={selectedCategory}
            onChange={(e) => setParam('category', e.target.value)}
            className="w-full rounded-xl border px-3 py-2"
            disabled={!selectedSport}
          >
            <option value="">{selectedSport ? t('opportunities.category') : t('opportunities.selectSport')}</option>
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
            <option value="">{t('opportunities.age')}</option>
            {AGE_BRACKETS.map((b: string) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <label className="text-sm text-gray-600">{t('opportunities.sort')}</label>
            <select
              value={sp.get('sort') ?? 'recent'}
              onChange={(e) => setParam('sort', e.target.value)}
              className="w-full rounded-xl border px-3 py-2 sm:w-44"
            >
              <option value="recent">{t('opportunities.recent')}</option>
              <option value="oldest">{t('opportunities.oldest')}</option>
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
            <label className="text-sm text-gray-600">{t('opportunities.perPage')}</label>
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
            <p className="text-xs text-gray-500">{t('opportunities.totalResults')}</p>
            <p className="text-2xl font-semibold">{items.length}</p>
            <p className="text-xs text-gray-500">{data?.total ? `${data.totalIsExact === false ? '≥ ' : ''}${data.total} risultati` : 'Vista corrente'}</p>
          </div>
          <div className="rounded-xl border bg-gray-50 p-3">
            <p className="text-xs text-gray-500">{t('opportunities.uniqueClubs')}</p>
            <p className="text-2xl font-semibold">{new Set(items.map((o) => o.created_by || o.owner_id || o.club_name)).size}</p>
            <p className="text-xs text-gray-500">{t('opportunities.currentView')}</p>
          </div>
          <div className="rounded-xl border bg-gray-50 p-3">
            <p className="text-xs text-gray-500">{t('opportunities.mainArea')}</p>
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
            <p className="text-xs text-gray-500">{t('opportunities.byOccurrences')}</p>
          </div>
        </div>

      {loading && <div className="h-64 w-full rounded-2xl bg-gray-200 animate-pulse" />}

      {err && (
        <div className="border rounded-xl p-4 bg-red-50 text-red-700">
          {t('opportunities.loadError')}: {err}{' '}
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
          <div className="text-sm text-gray-600">{t('opportunities.clubOnly')}</div>
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
