'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import CanonicalGeographySelector from '@/components/geo/CanonicalGeographySelector';
import { useI18n } from '@/components/i18n/I18nProvider';

type LeafletLib = any;

type ClubMapPin = {
  id: string;
  name: string;
  avatar_url: string | null;
  latitude: number;
  longitude: number;
  city: string | null;
  province: string | null;
  region: string | null;
};

type ApiViewport = {
  bounds: { north: number; south: number; east: number; west: number; crossesAntimeridian: boolean } | null;
  countryId: string | null;
  geoAreaId: string | null;
  source: string;
} | null;

const EUROPE_CENTER: [number, number] = [50, 10];
const EUROPE_BOUNDS: [[number, number], [number, number]] = [[34, -12], [72, 35]];
const DEFAULT_CLUB_LOGO_URL = '/logo-cp.svg';

let leafletPromise: Promise<LeafletLib> | null = null;

function loadLeaflet(): Promise<LeafletLib> {
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('map-unavailable'));
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
  return leafletPromise;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] || char);
}

function markerSizeForZoom(zoom: number) {
  return Math.max(34, Math.min(70, Math.round(26 + zoom * 3.2)));
}

function buildClubIcon(L: LeafletLib, pin: ClubMapPin, size: number) {
  const safeName = escapeHtml(pin.name);
  const logoUrl = pin.avatar_url ? escapeHtml(pin.avatar_url) : DEFAULT_CLUB_LOGO_URL;
  return L.divIcon({
    className: 'cp-club-map-marker', iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -size / 2],
    html: `<div title="${safeName}" style="width:${size}px;height:${size}px;border-radius:9999px;background:white;border:3px solid white;box-shadow:0 12px 26px rgba(15,23,42,.32);overflow:hidden"><img src="${logoUrl}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:9999px" /></div>`,
  });
}

function clusterCellSize(zoom: number) {
  if (zoom <= 4) return 5;
  if (zoom <= 6) return 1.5;
  if (zoom <= 8) return 0.4;
  return 0;
}

function clusterPins(pins: ClubMapPin[], zoom: number) {
  const cell = clusterCellSize(zoom);
  if (!cell) return pins.map((pin) => ({ latitude: pin.latitude, longitude: pin.longitude, pins: [pin] }));
  const buckets = new Map<string, ClubMapPin[]>();
  pins.forEach((pin) => {
    const key = `${Math.floor(pin.latitude / cell)}:${Math.floor(pin.longitude / cell)}`;
    buckets.set(key, [...(buckets.get(key) ?? []), pin]);
  });
  return Array.from(buckets.values()).map((members) => ({
    latitude: members.reduce((sum, pin) => sum + pin.latitude, 0) / members.length,
    longitude: members.reduce((sum, pin) => sum + pin.longitude, 0) / members.length,
    pins: members,
  }));
}

export default function ClubMapClient() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countryId, setCountryId] = useState<string | null>(() => searchParams.get('countryId'));
  const [geoAreaId, setGeoAreaId] = useState<string | null>(() => searchParams.get('geoAreaId'));
  const [pins, setPins] = useState<ClubMapPin[]>([]);
  const [viewport, setViewport] = useState<ApiViewport>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [zoomVersion, setZoomVersion] = useState(0);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletLib['Map'] | null>(null);
  const markersRef = useRef<LeafletLib['Marker'][]>([]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (countryId) params.set('countryId', countryId); else params.delete('countryId');
    if (geoAreaId) params.set('geoAreaId', geoAreaId); else params.delete('geoAreaId');
    const query = params.toString();
    if (query === searchParams.toString()) return;
    router.replace(query ? `/club-map?${query}` : '/club-map', { scroll: false });
  }, [countryId, geoAreaId, router, searchParams]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (countryId) params.set('countryId', countryId);
    if (geoAreaId) params.set('geoAreaId', geoAreaId);
    setLoading(true);
    setError(null);
    const request = async (query: URLSearchParams) => {
      const response = await fetch(`/api/clubs/geolocated${query.size ? `?${query}` : ''}`, { credentials: 'include', cache: 'no-store', signal: controller.signal });
      const json = await response.json().catch(() => ({}));
      return { response, json };
    };
    request(params)
      .then(async ({ response, json }) => {
        if (!response.ok) throw new Error(json?.message || 'MAP_LOAD_FAILED');
        setPins(Array.isArray(json?.data) ? json.data : []);
        setViewport(json?.viewport ?? null);
      })
      .catch((reason) => {
        if (reason?.name !== 'AbortError') {
          setPins([]);
          setViewport(null);
          setError(reason instanceof Error ? reason.message : 'MAP_LOAD_FAILED');
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [countryId, geoAreaId]);

  useEffect(() => {
    let disposed = false;
    let zoomHandler: (() => void) | null = null;
    loadLeaflet().then((L) => {
      if (disposed || !mapContainerRef.current || mapRef.current) return;
      const map = L.map(mapContainerRef.current, { center: EUROPE_CENTER, zoom: 4, minZoom: 2, maxZoom: 18, zoomControl: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
      try { map.fitBounds(EUROPE_BOUNDS, { padding: [18, 18] }); } catch { map.setView(EUROPE_CENTER, 4); }
      mapRef.current = map;
      zoomHandler = () => setZoomVersion((value) => value + 1);
      map.on('zoomend', zoomHandler);
      setMapReady(true);
    }).catch(() => { if (!disposed) setError('MAP_UNAVAILABLE'); });
    return () => {
      disposed = true;
      if (mapRef.current && zoomHandler) mapRef.current.off('zoomend', zoomHandler);
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !mapRef.current) return;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      const map = mapRef.current;
      const zoom = map.getZoom();
      clusterPins(pins, zoom).forEach((cluster) => {
        if (cluster.pins.length > 1) {
          const count = cluster.pins.length;
          const icon = L.divIcon({
            className: 'cp-club-map-cluster', iconSize: [46, 46], iconAnchor: [23, 23],
            html: `<div aria-label="${escapeHtml(t('map.clusterLabel', { count }))}" style="width:46px;height:46px;border-radius:9999px;background:#0369a1;color:white;border:3px solid white;box-shadow:0 10px 24px rgba(15,23,42,.3);display:flex;align-items:center;justify-content:center;font-weight:800">${count}</div>`,
          });
          const marker = L.marker([cluster.latitude, cluster.longitude], { icon, title: t('map.clusterLabel', { count }) });
          marker.on('click', () => map.setView([cluster.latitude, cluster.longitude], Math.min(zoom + 2, 12)));
          marker.addTo(map);
          markersRef.current.push(marker);
          return;
        }
        const pin = cluster.pins[0];
        const location = [pin.city, pin.province, pin.region].filter(Boolean).map(String).join(' · ');
        const marker = L.marker([pin.latitude, pin.longitude], { icon: buildClubIcon(L, pin, markerSizeForZoom(zoom)), title: pin.name });
        marker.bindPopup(`<div style="min-width:170px"><strong>${escapeHtml(pin.name)}</strong>${location ? `<br/><span style="color:#64748b">${escapeHtml(location)}</span>` : ''}<br/><a href="/clubs/${escapeHtml(pin.id)}" style="display:inline-flex;margin-top:8px;border-radius:999px;background:#2563eb;color:white;padding:6px 10px;text-decoration:none;font-weight:700">${escapeHtml(t('common.visitClub'))}</a></div>`);
        marker.addTo(map);
        markersRef.current.push(marker);
      });
    });
    return () => { cancelled = true; };
  }, [mapReady, pins, t, zoomVersion]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || loading || error) return;
    const map = mapRef.current;
    if (viewport?.bounds) {
      const { south, west, north, east } = viewport.bounds;
      try { map.fitBounds([[south, west], [north, east]], { padding: [32, 32], maxZoom: 9 }); } catch { /* no-op */ }
      return;
    }
    if (pins.length) {
      loadLeaflet().then((L) => {
        try { map.fitBounds(L.latLngBounds(pins.map((pin) => [pin.latitude, pin.longitude])), { padding: [40, 40], maxZoom: 8 }); } catch { /* no-op */ }
      });
    }
  }, [error, loading, mapReady, pins, viewport]);

  const helperText = useMemo(() => loading ? t('common.loading') : t('map.visibleCount', { count: pins.length }), [loading, pins.length, t]);

  const handleCountryChange = useCallback((value: string | null) => { setCountryId(value); setGeoAreaId(null); }, []);

  return <div className="space-y-4">
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between md:p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">{t('map.kicker')}</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950 md:text-3xl">{t('map.title')}</h1>
          <p className="mt-1 text-sm text-slate-600">{t('map.subtitle')}</p>
        </div>
        <div className="flex flex-col gap-2 text-sm md:items-end">
          <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-800">{helperText}</span>
          <Link href="/club/profile" className="text-blue-700 underline-offset-2 hover:underline">{t('map.setLocation')}</Link>
        </div>
      </div>
      <div className="border-b border-slate-100 bg-slate-50/70 p-4 md:p-5">
        <p className="mb-3 text-sm text-slate-600">{t('map.filterHelp')}</p>
        <CanonicalGeographySelector
          idPrefix="club-map-geography" countryId={countryId} geoAreaId={geoAreaId}
          onCountryChange={handleCountryChange} onGeoAreaChange={setGeoAreaId}
          labels={{ country: t('map.country'), area: t('map.area'), selectCountry: t('map.allCountries'), selectArea: t('map.selectArea'), loading: t('common.loading'), empty: t('map.noAreas'), retry: t('common.retry'), reset: t('map.reset') }}
        />
      </div>
      <div className="relative h-[70vh] min-h-[520px] bg-slate-100">
        <div ref={mapContainerRef} className="absolute inset-0" aria-label={t('map.ariaLabel')} />
        {loading ? <div className="absolute left-4 top-4 rounded-2xl bg-white/95 px-4 py-3 text-sm font-medium text-slate-700 shadow-lg">{t('map.loadingClubs')}</div> : null}
        {error ? <div className="absolute left-14 right-4 top-4 z-[500] rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-lg md:right-auto" role="alert">{error === 'MAP_UNAVAILABLE' ? t('map.unavailable') : t('map.loadError')}</div> : null}
        {!loading && !error && pins.length === 0 ? <div className="absolute left-4 right-4 top-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 shadow-lg md:right-auto">{t('map.empty')}</div> : null}
      </div>
    </section>
  </div>;
}
