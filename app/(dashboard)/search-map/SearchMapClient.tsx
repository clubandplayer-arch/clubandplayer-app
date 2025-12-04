// app/(dashboard)/search-map/SearchMapClient.tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

import { SearchMapProfile, searchProfilesOnMap } from '@/lib/services/search';
import SearchResultsList from '@/components/search/SearchResultsList';

type LeafletLib = any;

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

export default function SearchMapClient() {
  const [typeFilter, setTypeFilter] = useState<'all' | 'club' | 'player'>('all');
  const [searchBounds, setSearchBounds] = useState<Bounds | null>(null);
  const [points, setPoints] = useState<SearchMapProfile[]>([]);
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

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

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
      setSelectedProfileId(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setDataError(null);

      const ageMinNumber = ageMin ? Number(ageMin) : null;
      const ageMaxNumber = ageMax ? Number(ageMax) : null;
      const filters = {
        sport: typeFilter === 'club' ? clubSport || null : playerSport || null,
        clubCategory: typeFilter === 'club' ? clubCategory || null : null,
        foot: typeFilter === 'player' ? playerFoot || null : null,
        gender: typeFilter === 'player' ? playerGender || null : null,
        ageMin: typeFilter === 'player' && !Number.isNaN(ageMinNumber) ? ageMinNumber : null,
        ageMax: typeFilter === 'player' && !Number.isNaN(ageMaxNumber) ? ageMaxNumber : null,
      };

      console.log('[search-map] calling search service', {
        bounds: searchBounds,
        query: searchQuery,
        type: typeFilter,
        filters,
      });

      try {
        const response = await searchProfilesOnMap({
          bounds: searchBounds,
          query: searchQuery,
          type: typeFilter,
          limit: 300,
          filters,
          currentUserId,
        });

        if (!cancelled) {
          console.log('[search-map] service success', {
            count: response.data.length,
            total: response.total,
            fallback: response.fallback,
          });
          setPoints(response.data);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('[search-map] service error', err);
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

  useEffect(() => {
    if (selectedProfileId && !filteredPoints.find((p) => (p.profile_id || p.id || '').toString() === selectedProfileId)) {
      setSelectedProfileId(null);
    }
  }, [filteredPoints, selectedProfileId]);

  const focusOnProfile = useCallback(async (profile: SearchMapProfile) => {
    const map = mapRef.current;
    if (!map || profile.latitude == null || profile.longitude == null) return;

    try {
      map.flyTo([profile.latitude, profile.longitude], Math.max(map.getZoom(), 10), { duration: 0.6 });
    } catch (error) {
      console.error('[search-map] focus error', error);
    }
  }, []);

  const handleSelectFromList = useCallback(
    (profile: SearchMapProfile) => {
      const profileId = (profile.profile_id || profile.id || '').toString();
      setSelectedProfileId(profileId || null);
      void focusOnProfile(profile);
    },
    [focusOnProfile],
  );

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-xl border bg-white/80 p-4 shadow-sm">
        <label htmlFor="search-map-query" className="text-sm font-semibold text-gray-800">
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="space-y-3 rounded-xl border bg-white/80 p-4 shadow-sm">
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
            {!hasArea && !isDrawing && <p className="text-xs text-gray-500">Nessuna area selezionata.</p>}
            {activeArea && !isDrawing && (
              <p className="text-xs text-emerald-700">Area impostata: {activeArea.length} punti.</p>
            )}
          </div>

          <section className="h-[420px] rounded-xl border bg-white/80 shadow-sm lg:h-[640px]">
            {mapError ? (
              <div className="flex h-full w-full items-center justify-center text-sm text-red-600">{mapError}</div>
            ) : (
              <div ref={mapContainerRef} className="h-full w-full" />
            )}
          </section>
        </div>

        <div className="space-y-3">
          <div className="space-y-3 rounded-xl border bg-white/80 p-4 shadow-sm">
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

          <SearchResultsList
            results={filteredPoints}
            loading={loading}
            hasArea={hasArea}
            error={dataError}
            selectedId={selectedProfileId}
            onSelect={handleSelectFromList}
          />
        </div>
      </div>
    </div>
  );
}

export const DynamicSearchMapClient = dynamic(() => Promise.resolve(SearchMapClient), { ssr: false });