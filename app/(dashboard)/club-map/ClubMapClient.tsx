'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
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

const ITALY_CENTER: [number, number] = [42.7, 12.7];
const DEFAULT_CLUB_LOGO_URL = '/logo-cp.svg';
const ITALY_BOUNDS: [[number, number], [number, number]] = [
  [35.2, 6.0],
  [47.3, 19.2],
];

let leafletPromise: Promise<LeafletLib> | null = null;

function loadLeaflet(): Promise<LeafletLib> {
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Mappa non disponibile lato server'));
      return;
    }

    if ((window as any).L) {
      resolve((window as any).L as LeafletLib);
      return;
    }

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
  return value.replace(/[&<>'"]/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    };
    return entities[char] || char;
  });
}

function markerSizeForZoom(zoom: number) {
  return Math.max(34, Math.min(70, Math.round(26 + zoom * 3.2)));
}

function buildClubIcon(L: LeafletLib, pin: ClubMapPin, size: number) {
  const safeName = escapeHtml(pin.name);
  const logoUrl = pin.avatar_url ? escapeHtml(pin.avatar_url) : DEFAULT_CLUB_LOGO_URL;
  const logo = `<img src="${logoUrl}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:9999px;" />`;

  return L.divIcon({
    className: 'cp-club-map-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
    html: `<div title="${safeName}" style="width:${size}px;height:${size}px;border-radius:9999px;background:white;border:3px solid white;box-shadow:0 12px 26px rgba(15,23,42,.32);overflow:hidden;display:flex;align-items:center;justify-content:center;">${logo}</div>`,
  });
}

export default function ClubMapClient() {
  const { t } = useI18n();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletLib['Map'] | null>(null);
  const markersRef = useRef<LeafletLib['Marker'][]>([]);
  const [pins, setPins] = useState<ClubMapPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const locatedCount = pins.length;

  const updateMarkerSizes = useCallback(async () => {
    const map = mapRef.current;
    if (!map || !markersRef.current.length) return;
    const L = await loadLeaflet();
    const size = markerSizeForZoom(map.getZoom());
    markersRef.current.forEach((marker) => {
      const pin = (marker as any).__clubPin as ClubMapPin | undefined;
      if (pin) marker.setIcon(buildClubIcon(L, pin, size));
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPins() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/clubs/geolocated', { credentials: 'include', cache: 'no-store' });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json?.error || 'Errore nel caricamento dei Club geolocalizzati.');
        if (!cancelled) setPins(Array.isArray(json?.data) ? json.data : []);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Errore nel caricamento dei Club geolocalizzati.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadPins();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let zoomHandler: (() => void) | null = null;

    loadLeaflet()
      .then((L) => {
        if (disposed || !mapContainerRef.current || mapRef.current) return;
        const map = L.map(mapContainerRef.current, {
          center: ITALY_CENTER,
          zoom: 6,
          minZoom: 5,
          maxZoom: 18,
          zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        try {
          map.fitBounds(ITALY_BOUNDS, { padding: [18, 18] });
        } catch {
          map.setView(ITALY_CENTER, 6);
        }

        mapRef.current = map;
        zoomHandler = () => {
          void updateMarkerSizes();
        };
        map.on('zoomend', zoomHandler);
        setMapReady(true);
      })
      .catch(() => {
        if (!disposed) setError('Non è stato possibile caricare la mappa. Riprova tra poco.');
      });

    return () => {
      disposed = true;
      const map = mapRef.current;
      if (map && zoomHandler) map.off('zoomend', zoomHandler);
      if (map) map.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
  }, [updateMarkerSizes]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    let cancelled = false;

    loadLeaflet().then((L) => {
      if (cancelled || !mapRef.current) return;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      const size = markerSizeForZoom(mapRef.current.getZoom());
      const group = L.featureGroup();

      pins.forEach((pin) => {
        const safeName = escapeHtml(pin.name);
        const location = [pin.city, pin.province, pin.region].filter(Boolean).map(String).join(' · ');
        const marker = L.marker([pin.latitude, pin.longitude], {
          icon: buildClubIcon(L, pin, size),
          title: pin.name,
        });
        (marker as any).__clubPin = pin;
        marker.bindPopup(
          `<div style="min-width:170px"><strong>${safeName}</strong>${location ? `<br /><span style="color:#64748b">${escapeHtml(location)}</span>` : ''}<br /><a href="/clubs/${escapeHtml(pin.id)}" style="display:inline-flex;margin-top:8px;border-radius:999px;background:#2563eb;color:white;padding:6px 10px;text-decoration:none;font-weight:700;">${escapeHtml(t('common.visitClub'))}</a></div>`,
        );
        marker.addTo(group);
        markersRef.current.push(marker);
      });

      group.addTo(mapRef.current);
      if (pins.length > 0) {
        try {
          mapRef.current.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 8 });
        } catch {
          // ignore
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [mapReady, pins, t]);

  const helperText = useMemo(() => {
    if (loading) return t('common.loading');
    if (locatedCount === 1) return t('map.visibleCount', { count: locatedCount });
    return t('map.visibleCount', { count: locatedCount });
  }, [loading, locatedCount, t]);

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between md:p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">{t('navigation.clubMap')}</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950 md:text-3xl">{t('map.title')}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {t('map.instructions')}
            </p>
          </div>
          <div className="flex flex-col gap-2 text-sm md:items-end">
            <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-800">{helperText}</span>
            <Link href="/club/profile" className="text-blue-700 underline-offset-2 hover:underline">
              {t('map.setLocation')}
            </Link>
          </div>
        </div>

        <div className="relative h-[70vh] min-h-[520px] bg-slate-100">
          <div ref={mapContainerRef} className="absolute inset-0" aria-label="Mappa dei Club geolocalizzati" />
          {loading ? (
            <div className="absolute left-4 top-4 rounded-2xl bg-white/95 px-4 py-3 text-sm font-medium text-slate-700 shadow-lg">
              {t('map.loadingClubs')}
            </div>
          ) : null}
          {error ? (
            <div className="absolute left-4 right-4 top-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-lg md:right-auto">
              {error}
            </div>
          ) : null}
          {!loading && !error && locatedCount === 0 ? (
            <div className="absolute left-4 right-4 top-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 shadow-lg md:right-auto">
              {t('map.empty')}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
