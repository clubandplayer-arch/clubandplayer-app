// app/(dashboard)/search-map/SearchMapClient.tsx
'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

type LeafletLib = any;

type ProfilePoint = {
  id: string;
  user_id?: string | null;
  profile_id?: string | null;
  display_name?: string | null;
  full_name?: string | null;
  account_type?: string | null;
  type?: string | null;
  country?: string | null;
  region?: string | null;
  province?: string | null;
  city?: string | null;
  avatar_url?: string | null;
  sport?: string | null;
  role?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  foot?: string | null;
  gender?: string | null;
  birth_year?: number | null;
  club_league_category?: string | null;
};

type Bounds = {
  north?: number;
  south?: number;
  east?: number;
  west?: number;
};

type PolygonPoint = [number, number];

const DEFAULT_CENTER: [number, number] = [41.9, 12.5];

function loadLeaflet(): Promise<LeafletLib> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('no-window'));
    if ((window as any).L) return resolve((window as any).L as LeafletLib);

    const existingScript = document.querySelector('script[data-leaflet]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve((window as any).L as LeafletLib), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('leaflet-load-failed')), { once: true });
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.dataset.leaflet = 'true';
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve((window as any).L as LeafletLib);
    script.onerror = () => reject(new Error('leaflet-load-failed'));
    document.body.appendChild(script);
  });
}

function pointInPolygon(point: PolygonPoint, polygon: PolygonPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1];
    const yi = polygon[i][0];
    const xj = polygon[j][1];
    const yj = polygon[j][0];
    const intersect = yi > point[0] !== yj > point[0] && point[1] < ((xj - xi) * (point[0] - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function MarkerIcon({ type }: { type?: string | null }) {
  const color = type?.toLowerCase().includes('club') ? 'text-blue-700' : 'text-emerald-700';
  return <span className={`${color} text-lg`}>{type?.toLowerCase().includes('club') ? '🏟️' : '🧑‍💼'}</span>;
}

export default function SearchMapClient() {
  const [typeFilter, setTypeFilter] = useState<'all' | 'club' | 'player'>('all');
  const [searchBounds, setSearchBounds] = useState<Bounds | null>(null);
  const [points, setPoints] = useState<ProfilePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState<PolygonPoint[]>([]);
  const [activeArea, setActiveArea] = useState<PolygonPoint[] | null>(null);

  const [clubSport, setClubSport] = useState('');
  const [clubCategory, setClubCategory] = useState('');
  const [playerSport, setPlayerSport] = useState('');
  const [playerFoot, setPlayerFoot] = useState('');
  const [playerGender, setPlayerGender] = useState('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const mapRef = useRef<LeafletLib['Map'] | null>(null);
  const polygonRef = useRef<LeafletLib['Polygon'] | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const hasArea = !!searchBounds;

  const clearPolygonLayer = useCallback(() => {
    if (polygonRef.current) {
      polygonRef.current.remove();
      polygonRef.current = null;
    }
  }, []);

  const updatePolygonLayer = useCallback(
    async (pts: PolygonPoint[], fit = false) => {
      const map = mapRef.current;
      if (!map) return;
      const L = await loadLeaflet();
      clearPolygonLayer();
      if (!pts.length) return;
      const poly = L.polygon(pts, { color: '#2563eb', weight: 2, fillOpacity: 0.08, opacity: 0.9 });
      poly.addTo(map);
      polygonRef.current = poly;
      if (fit) {
        try {
          map.fitBounds(poly.getBounds(), { padding: [20, 20] });
        } catch {
          // ignore
        }
      }
    },
    [clearPolygonLayer],
  );

  const commitArea = useCallback(
    async (pts: PolygonPoint[]) => {
      if (pts.length < 3) {
        setDataError('Disegna almeno tre punti per definire un’area.');
        return;
      }
      setActiveArea(pts);
      const L = await loadLeaflet();
      const bounds = L.latLngBounds(pts.map(([lat, lng]) => [lat, lng]));
      setSearchBounds({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
      setIsDrawing(false);
      updatePolygonLayer(pts, true);
    },
    [updatePolygonLayer],
  );

  const startDrawing = useCallback(() => {
    setDataError(null);
    setPoints([]);
    setSearchBounds(null);
    setActiveArea(null);
    setDrawPoints([]);
    clearPolygonLayer();
    setIsDrawing(true);
  }, [clearPolygonLayer]);

  const cancelArea = useCallback(() => {
    setIsDrawing(false);
    setDrawPoints([]);
    setActiveArea(null);
    setSearchBounds(null);
    setPoints([]);
    clearPolygonLayer();
  }, [clearPolygonLayer]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/whoami', { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        if (res.ok) {
          setCurrentUserId(json?.user?.id ?? null);
        }
      } catch {
        // ignora: la ricerca funziona comunque senza info utente
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapContainerRef.current) return;
        const map = L.map(mapContainerRef.current).setView(DEFAULT_CENTER, 6);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
        }).addTo(map);
        mapRef.current = map;
      })
      .catch((error) => {
        console.error('Leaflet load error', error);
        if (!cancelled) setMapError('Mappa temporaneamente non disponibile');
      });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let clickHandler: any = null;
    let dblHandler: any = null;

    loadLeaflet()
      .then(() => {
        clickHandler = (ev: any) => {
          if (!isDrawing) return;
          const lat = ev?.latlng?.lat;
          const lng = ev?.latlng?.lng;
          if (lat == null || lng == null) return;
          setDrawPoints((prev) => {
            const next = [...prev, [lat, lng] as PolygonPoint];
            updatePolygonLayer(next);
            return next;
          });
        };

        dblHandler = () => {
          setDrawPoints((prev) => {
            commitArea(prev);
            return prev;
          });
        };

        map.on('click', clickHandler);
        map.on('dblclick', dblHandler);
      })
      .catch(() => {});

    return () => {
      if (clickHandler) map.off('click', clickHandler);
      if (dblHandler) map.off('dblclick', dblHandler);
    };
  }, [commitArea, isDrawing, updatePolygonLayer]);

  useEffect(() => {
    if (!isDrawing && activeArea?.length) {
      updatePolygonLayer(activeArea, false);
    }
  }, [activeArea, isDrawing, updatePolygonLayer]);

  useEffect(() => {
    if (!searchBounds) {
      setPoints([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setDataError(null);
      console.log('[search-map] fetch start', {
        bounds: searchBounds,
        query: searchQuery,
        type: typeFilter,
        filters: { clubSport, clubCategory, playerSport, playerFoot, playerGender, ageMin, ageMax },
      });

      try {
        const params = new URLSearchParams();
        params.set('limit', '300');
        params.set('type', typeFilter);
        params.set('north', String(searchBounds.north ?? ''));
        params.set('south', String(searchBounds.south ?? ''));
        params.set('east', String(searchBounds.east ?? ''));
        params.set('west', String(searchBounds.west ?? ''));

        if (typeFilter === 'club') {
          if (clubSport) params.set('sport', clubSport);
          if (clubCategory) params.set('club_category', clubCategory);
        }
        if (typeFilter === 'player') {
          if (playerSport) params.set('sport', playerSport);
          if (playerFoot) params.set('foot', playerFoot);
          if (playerGender) params.set('gender', playerGender);
          if (ageMin) params.set('age_min', ageMin);
          if (ageMax) params.set('age_max', ageMax);
        }
        if (currentUserId) params.set('current_user_id', currentUserId);
        const trimmedQuery = searchQuery.trim();
        if (trimmedQuery) params.set('query', trimmedQuery);

        const res = await fetch(`/api/search/map?${params.toString()}`, { cache: 'no-store' });
        const text = await res.text();
        let json: any = null;
        try {
          json = JSON.parse(text);
        } catch {
          json = text;
        }
        if (!res.ok) {
          throw new Error(json?.error || text || `HTTP ${res.status}`);
        }

        const arr = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
        if (!cancelled) {
          console.log('[search-map] fetch success', { count: arr.length });
          setPoints(arr as ProfilePoint[]);
        }
      } catch (err: any) {
        if (!cancelled) {
          setDataError(err?.message || 'Errore nel caricamento dei profili.');
          setPoints([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    ageMax,
    ageMin,
    clubCategory,
    clubSport,
    currentUserId,
    playerFoot,
    playerGender,
    playerSport,
    searchQuery,
    searchBounds,
    typeFilter,
  ]);

  const filteredPoints = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return points.filter((p) => {
      const type = (p.type || p.account_type || '').trim().toLowerCase();
      const isClub = type === 'club';
      const isAthlete = type === 'athlete' || type === 'player';

      if (typeFilter === 'club' && !isClub) return false;
      if (typeFilter === 'player' && !isAthlete) return false;

      if (currentUserId && (p.user_id === currentUserId || p.id === currentUserId)) return false;

      if (typeFilter === 'club') {
        if (clubSport && (p.sport || '').toLowerCase() !== clubSport.toLowerCase()) return false;
        if (
          clubCategory &&
          (p.club_league_category || '').toLowerCase() !== clubCategory.toLowerCase()
        )
          return false;
      }

      if (typeFilter === 'player') {
        if (playerSport && (p.sport || '').toLowerCase() !== playerSport.toLowerCase()) return false;
        if (playerFoot && (p.foot || '').toLowerCase() !== playerFoot.toLowerCase()) return false;
        if (playerGender && (p.gender || '').toLowerCase() !== playerGender.toLowerCase()) return false;
        const currentYear = new Date().getFullYear();
        if (ageMin && p.birth_year) {
          const age = currentYear - p.birth_year;
          if (age < Number(ageMin)) return false;
        }
        if (ageMax && p.birth_year) {
          const age = currentYear - p.birth_year;
          if (age > Number(ageMax)) return false;
        }
      }

      if (normalizedQuery) {
        const name = (p.display_name || '').toLowerCase();
        const fullName = (p.full_name || '').toLowerCase();
        const city = (p.city || '').toLowerCase();
        const province = (p.province || '').toLowerCase();
        const region = (p.region || '').toLowerCase();
        const country = (p.country || '').toLowerCase();
        const sport = (p.sport || '').toLowerCase();
        const role = (p.role || '').toLowerCase();
        if (
          !name.includes(normalizedQuery) &&
          !fullName.includes(normalizedQuery) &&
          !city.includes(normalizedQuery) &&
          !province.includes(normalizedQuery) &&
          !region.includes(normalizedQuery) &&
          !country.includes(normalizedQuery) &&
          !sport.includes(normalizedQuery) &&
          !role.includes(normalizedQuery)
        )
          return false;
      }

      if (activeArea && activeArea.length >= 3 && p.latitude != null && p.longitude != null) {
        if (!pointInPolygon([p.latitude, p.longitude], activeArea)) return false;
      }

      return true;
    });
  }, [
    activeArea,
    ageMax,
    ageMin,
    clubCategory,
    clubSport,
    currentUserId,
    playerFoot,
    playerGender,
    playerSport,
    points,
    searchQuery,
    typeFilter,
  ]);

  const resolvePublicHref = useCallback((p: ProfilePoint) => {
    const profileId = (p.profile_id || p.id || '').toString();
    if (!profileId) return '#';
    const type = (p.type || p.account_type || '').trim().toLowerCase();
    return type === 'club' ? `/clubs/${profileId}` : `/athletes/${profileId}`;
  }, []);

  const renderAvatar = (p: ProfilePoint) => {
    const display = p.display_name || p.full_name || 'Profilo';
    const initial = display.trim()[0]?.toUpperCase() || 'P';
    const alt = display || 'Avatar profilo';

    return (
      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-sm font-semibold text-gray-700">
        {p.avatar_url ? (
          <Image
            src={p.avatar_url}
            alt={`Avatar di ${alt}`}
            width={48}
            height={48}
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{initial || '?'}</span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-white/80 p-4 shadow-sm space-y-2">
        <label
          htmlFor="search-map-query"
          className="text-sm font-semibold text-gray-800"
        >
          Ricerca testuale
        </label>
        <input
          id="search-map-query"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cerca per nome club o player…"
          className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          autoComplete="off"
        />
        <p className="text-xs text-gray-600">
          Il nome filtra i risultati nell’area selezionata senza cambiare i confini disegnati sulla mappa.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <aside className="space-y-3 lg:col-span-3">
          <div className="rounded-xl border bg-white/80 p-4 shadow-sm space-y-3">
            <h2 className="heading-h2 text-lg">Area di ricerca</h2>
            <p className="text-xs text-gray-600">
              1) Disegna l’area sulla mappa. 2) Scegli i filtri. 3) Visualizza i risultati.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={startDrawing}
                className="flex-1 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Disegna area di ricerca
              </button>
              <button
                type="button"
                disabled={!drawPoints.length}
                onClick={() => commitArea(drawPoints)}
                className="flex-1 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Chiudi area e cerca
              </button>
              <button
                type="button"
                onClick={cancelArea}
                className="w-full rounded-lg border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancella area
              </button>
            </div>
            {drawPoints.length > 0 && isDrawing && (
              <p className="text-xs text-amber-700">
                Doppio click sulla mappa per chiudere il poligono oppure usa “Chiudi area e cerca”.
              </p>
            )}
            {!hasArea && !isDrawing && (
              <p className="text-xs text-gray-500">Nessuna area selezionata.</p>
            )}
            {activeArea && !isDrawing && (
              <p className="text-xs text-emerald-700">Area impostata: {activeArea.length} punti.</p>
            )}
          </div>

          <div className="rounded-xl border bg-white/80 p-4 shadow-sm space-y-3">
            <h2 className="heading-h2 text-lg">Filtri</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm ${typeFilter === 'all' ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'}`}
              >
                Tutti
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('club')}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm ${typeFilter === 'club' ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'}`}
              >
                Club
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('player')}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm ${typeFilter === 'player' ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'}`}
              >
                Player
              </button>
            </div>

            {typeFilter === 'club' && (
              <div className="space-y-2 text-sm">
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Sport</label>
                  <input
                    value={clubSport}
                    onChange={(e) => setClubSport(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder="Calcio, basket…"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Categoria</label>
                  <input
                    value={clubCategory}
                    onChange={(e) => setClubCategory(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder="Eccellenza, Serie C…"
                  />
                </div>
              </div>
            )}

            {typeFilter === 'player' && (
              <div className="space-y-2 text-sm">
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Sport</label>
                  <input
                    value={playerSport}
                    onChange={(e) => setPlayerSport(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder="Calcio, basket…"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Arto dominante</label>
                  <select
                    value={playerFoot}
                    onChange={(e) => setPlayerFoot(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2"
                  >
                    <option value="">Tutti</option>
                    <option value="destro">Destro</option>
                    <option value="sinistro">Sinistro</option>
                    <option value="ambidestro">Ambidestro</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Sesso</label>
                  <select
                    value={playerGender}
                    onChange={(e) => setPlayerGender(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2"
                  >
                    <option value="">Tutti</option>
                    <option value="m">Uomo</option>
                    <option value="f">Donna</option>
                    <option value="mixed">Misto</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">Età minima</label>
                    <input
                      type="number"
                      min={0}
                      value={ageMin}
                      onChange={(e) => setAgeMin(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2"
                      placeholder="18"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600">Età massima</label>
                    <input
                      type="number"
                      min={0}
                      value={ageMax}
                      onChange={(e) => setAgeMax(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2"
                      placeholder="35"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        <section className="h-[420px] rounded-xl border bg-white/80 shadow-sm lg:col-span-6 lg:h-[520px]">
          {mapError ? (
            <div className="flex h-full w-full items-center justify-center text-sm text-red-600">{mapError}</div>
          ) : (
            <div ref={mapContainerRef} className="h-full w-full" />
          )}
        </section>

        <section className="space-y-2 rounded-xl border bg-white/80 p-3 shadow-sm lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="heading-h2 text-lg">Risultati</h2>
            {loading && <span className="text-xs text-gray-500">Caricamento…</span>}
          </div>
          {dataError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{dataError}</div>
          )}
          {!hasArea && !loading && !dataError && (
            <div className="text-sm text-gray-600">
              Disegna un’area sulla mappa o sposta la mappa e chiudi il poligono per iniziare la ricerca.
            </div>
          )}
          {hasArea && filteredPoints.length === 0 && !loading && !dataError && (
            <div className="text-sm text-gray-600">Nessun profilo nell’area selezionata.</div>
          )}
          <div className="grid grid-cols-1 gap-2">
            {filteredPoints.map((p) => {
              const href = resolvePublicHref(p);
              const name = p.display_name || p.full_name || 'Profilo';
              const rawType = (p.type || p.account_type || '').trim().toLowerCase();
              const typeLabel = rawType === 'club' ? 'CLUB' : 'PLAYER';
              return (
                <div key={p.id} className="rounded-lg border px-3 py-2 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    {renderAvatar(p)}
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-semibold leading-tight">{name}</div>
                        <span className="flex items-center gap-1 text-xs font-medium text-gray-700">
                          <MarkerIcon type={p.type || p.account_type} />
                          <span>{typeLabel}</span>
                        </span>
                        <Link
                          href={href}
                          className="text-xs font-medium underline decoration-blue-600 underline-offset-2 text-blue-700 hover:no-underline"
                        >
                          Visita profilo
                        </Link>
                      </div>
                      <div className="text-xs text-gray-600">
                        {[p.city, p.province, p.region, p.country].filter(Boolean).join(' · ') || 'Località non disponibile'}
                      </div>
                      <div className="text-xs text-gray-500">{[p.role, p.sport].filter(Boolean).join(' · ')}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

export const DynamicSearchMapClient = dynamic(() => Promise.resolve(SearchMapClient), { ssr: false });