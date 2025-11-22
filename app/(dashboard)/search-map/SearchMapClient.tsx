// app/(dashboard)/search-map/SearchMapClient.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

type LeafletLib = any;

type ProfilePoint = {
  id: string;
  user_id?: string | null;
  display_name?: string | null;
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
};

type Bounds = {
  north?: number;
  south?: number;
  east?: number;
  west?: number;
};

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

function MarkerIcon({ type }: { type?: string | null }) {
  const color = type?.toLowerCase().includes('club') ? 'text-blue-700' : 'text-emerald-700';
  return <span className={`${color} text-lg`}>{type?.toLowerCase().includes('club') ? '🏟️' : '🧑‍💼'}</span>;
}

export default function SearchMapClient() {
  const [typeFilter, setTypeFilter] = useState<'all' | 'club' | 'player'>('all');
  const [bounds, setBounds] = useState<Bounds>({
    north: 47,
    south: 36,
    east: 18,
    west: 6,
  });
  const [points, setPoints] = useState<ProfilePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const mapRef = useRef<LeafletLib['Map'] | null>(null);
  const markersRef = useRef<LeafletLib['Marker'][]>([]);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const initialCenter = useRef<[number, number] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapContainerRef.current) return;
        if (!initialCenter.current) initialCenter.current = DEFAULT_CENTER;
        const map = L.map(mapContainerRef.current).setView(initialCenter.current as [number, number], 6);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
        }).addTo(map);
        map.on('moveend', () => {
          const b = map.getBounds();
          setBounds({
            north: b.getNorth(),
            south: b.getSouth(),
            east: b.getEast(),
            west: b.getWest(),
          });
        });
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
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setDataError(null);
      try {
        const params = new URLSearchParams();
        params.set('north', String(bounds.north ?? ''));
        params.set('south', String(bounds.south ?? ''));
        params.set('east', String(bounds.east ?? ''));
        params.set('west', String(bounds.west ?? ''));
        params.set('type', typeFilter);

        const res = await fetch(`/api/search/map?${params.toString()}`, { cache: 'no-store' });
        const json = await res.json().catch(() => ({} as any));
        if (!cancelled && Array.isArray(json?.data)) {
          setPoints(json.data as ProfilePoint[]);
        }
        if (!cancelled && !Array.isArray(json?.data)) {
          setDataError('Risultati non disponibili al momento.');
          setPoints([]);
        }
      } catch (error) {
        console.error('Search map fetch error', error);
        if (!cancelled) {
          setPoints([]);
          setDataError('Errore nel caricamento dei profili.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [bounds, typeFilter]);

  useEffect(() => {
    if (!mapRef.current || mapError) return;
    loadLeaflet()
      .then((L) => {
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];
        const visible = points.filter((p) => p.latitude != null && p.longitude != null);
        visible.forEach((p) => {
          const marker = L.marker([p.latitude as number, p.longitude as number]);
          marker.bindPopup(
            `<div class="space-y-1">
              <div class="font-semibold">${p.display_name || 'Profilo'}</div>
              <div class="text-xs text-gray-600">${[p.city, p.province, p.region].filter(Boolean).join(' · ')}</div>
              <div class="text-xs text-gray-500">${[p.role, p.sport].filter(Boolean).join(' · ')}</div>
            </div>`
          );
          marker.addTo(mapRef.current as any);
          markersRef.current.push(marker);
        });
      })
      .catch((error) => {
        console.error('Leaflet marker error', error);
      });
  }, [mapError, points]);

  const visiblePoints = useMemo(() => {
    const { north, south, east, west } = bounds;
    return points.filter((p) => {
      if (typeFilter === 'club' && (p.type || '').toLowerCase() !== 'club') return false;
      if (typeFilter === 'player' && (p.type || '').toLowerCase() === 'club') return false;

      if (p.latitude == null || p.longitude == null) return true;
      if (north != null && p.latitude > north) return false;
      if (south != null && p.latitude < south) return false;
      if (east != null && p.longitude > east) return false;
      if (west != null && p.longitude < west) return false;
      return true;
    });
  }, [bounds, points, typeFilter]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <aside className="lg:col-span-3 space-y-3">
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
          <p className="text-xs text-gray-600">Sposta o zoomma la mappa per aggiornare l’elenco.</p>
          <div className="text-xs text-gray-700">
            <div>Nord: {bounds.north?.toFixed(2) ?? '—'} · Sud: {bounds.south?.toFixed(2) ?? '—'}</div>
            <div>Est: {bounds.east?.toFixed(2) ?? '—'} · Ovest: {bounds.west?.toFixed(2) ?? '—'}</div>
          </div>
        </div>
      </aside>

      <section className="lg:col-span-6 h-[420px] lg:h-[520px] overflow-hidden rounded-xl border bg-white/80 shadow-sm">
        {mapError ? (
          <div className="flex h-full w-full items-center justify-center text-sm text-red-600">
            {mapError}
          </div>
        ) : (
          <div ref={mapContainerRef} className="h-full w-full" />
        )}
      </section>

      <section className="lg:col-span-3 space-y-2 rounded-xl border bg-white/80 p-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="heading-h2 text-lg">Risultati</h2>
          {loading && <span className="text-xs text-gray-500">Caricamento…</span>}
        </div>
        {dataError && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{dataError}</div>}
        {visiblePoints.length === 0 && (
          <div className="text-sm text-gray-600">Nessun profilo nell’area visibile.</div>
        )}
        <div className="grid grid-cols-1 gap-2">
          {visiblePoints.map((p) => (
            <Link
              key={p.id}
              href={(p.type || '').toLowerCase() === 'club' ? `/clubs/${p.id}` : `/athletes/${p.id}`}
              className="rounded-lg border px-3 py-2 hover:bg-gray-50"
            >
              <div className="flex items-start gap-2">
                <MarkerIcon type={p.type} />
                <div>
                  <div className="font-semibold leading-tight">{p.display_name || 'Profilo'}</div>
                  <div className="text-xs text-gray-600">
                    {[p.city, p.province, p.region, p.country].filter(Boolean).join(' · ') || 'Località non disponibile'}
                  </div>
                  <div className="text-xs text-gray-500">{[p.role, p.sport].filter(Boolean).join(' · ')}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

// Evita warning SSR per Leaflet
export const DynamicSearchMapClient = dynamic(() => Promise.resolve(SearchMapClient), { ssr: false });
