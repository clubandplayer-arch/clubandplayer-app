'use client';

import { useEffect, useRef, useState } from 'react';

type StadiumSelection = {
  name: string;
  address?: string | null;
  lat: number | null;
  lng: number | null;
};

type Props = {
  value: StadiumSelection;
  onChange: (value: StadiumSelection) => void;
  initialCenter?: { lat: number; lng: number };
  disabled?: boolean;
};

const DEFAULT_CENTER = { lat: 41.8719, lng: 12.5674 }; // Italia
let googleMapsPromise: Promise<void> | null = null;

const PinIcon = () => (
  <svg
    aria-hidden
    viewBox="0 0 24 24"
    className="h-4 w-4 text-gray-800"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 12.75a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 10.5c0 7.5-7.5 11.25-7.5 11.25S4.5 18 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
    />
  </svg>
);

function ensureGoogleMaps(apiKey: string) {
  if (typeof window === 'undefined') return Promise.reject(new Error('window not available'));
  if ((window as any).google?.maps) return Promise.resolve();
  if (!googleMapsPromise) {
    googleMapsPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.onerror = (err) => reject(err);
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }
  return googleMapsPromise;
}

export default function ClubStadiumMapPicker({ value, onChange, initialCenter, disabled }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [mapReady, setMapReady] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);

  const mapRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!apiKey) {
      setScriptError('Configura NEXT_PUBLIC_GOOGLE_MAPS_API_KEY per usare la mappa.');
      return;
    }
    ensureGoogleMaps(apiKey)
      .then(() => setMapReady(true))
      .catch(() => setScriptError('Impossibile caricare Google Maps.'));
  }, [apiKey]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || typeof window === 'undefined') return;
    const g = (window as any).google;
    if (!g?.maps) return;

    const startCenter =
      value.lat != null && value.lng != null
        ? { lat: value.lat, lng: value.lng }
        : initialCenter || DEFAULT_CENTER;

    const map = new g.maps.Map(mapRef.current, {
      center: startCenter,
      zoom: value.lat != null && value.lng != null ? 14 : 5,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
    });

    mapInstanceRef.current = map;
    geocoderRef.current = new g.maps.Geocoder();

    if (value.lat != null && value.lng != null) {
      markerRef.current = new g.maps.Marker({
        position: { lat: value.lat, lng: value.lng },
        map,
      });
    }

    const clickListener = map.addListener('click', (event: any) => {
      if (disabled) return;
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      placeMarker(g, { lat, lng });
      reverseGeocode(g, lat, lng);
    });

    let autocomplete: any = null;
    if (searchRef.current) {
      autocomplete = new g.maps.places.Autocomplete(searchRef.current, {
        fields: ['formatted_address', 'geometry', 'name'],
      });
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place?.geometry?.location) return;
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        map.panTo({ lat, lng });
        map.setZoom(15);
        placeMarker(g, { lat, lng });
        onChange({
          name: place.name || 'Impianto selezionato',
          address: place.formatted_address || '',
          lat,
          lng,
        });
      });
    }

    return () => {
      if (clickListener) g.maps.event.removeListener(clickListener);
      if (autocomplete) g.maps.event.clearInstanceListeners(autocomplete);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, disabled]);

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    const g = (window as any).google;
    if (!g?.maps || value.lat == null || value.lng == null) return;

    placeMarker(g, { lat: value.lat, lng: value.lng });
    mapInstanceRef.current.panTo({ lat: value.lat, lng: value.lng });
  }, [mapReady, value.lat, value.lng]);

  function placeMarker(g: any, coords: { lat: number; lng: number }) {
    if (!mapInstanceRef.current) return;
    if (markerRef.current) {
      markerRef.current.setPosition(coords);
      markerRef.current.setMap(mapInstanceRef.current);
    } else {
      markerRef.current = new g.maps.Marker({ position: coords, map: mapInstanceRef.current });
    }
  }

  function reverseGeocode(g: any, lat: number, lng: number) {
    if (!geocoderRef.current) return;
    geocoderRef.current.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
      if (status === 'OK' && results?.length) {
        const best = results[0];
        onChange({
          name: best.formatted_address?.split(',')?.[0] || 'Impianto selezionato',
          address: best.formatted_address || '',
          lat,
          lng,
        });
      } else {
        onChange({
          name: value.name || 'Impianto selezionato',
          address: value.address || '',
          lat,
          lng,
        });
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 font-semibold text-gray-800">
          <PinIcon />
          <span>Stadio o impianto</span>
        </div>
        <span className="text-xs text-gray-600">Seleziona su mappa</span>
      </div>

      {!apiKey ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Configura la variabile NEXT_PUBLIC_GOOGLE_MAPS_API_KEY per abilitare la selezione su mappa.
        </div>
      ) : null}

      {scriptError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{scriptError}</div>
      ) : (
        <div className="space-y-2">
          <input
            ref={searchRef}
            type="text"
            className="input"
            placeholder="Cerca stadio o indirizzo"
            disabled={!mapReady || !!scriptError || disabled}
          />

          <div
            ref={mapRef}
            className="h-64 w-full overflow-hidden rounded-xl border border-white/40 bg-white/70"
          />

          <div className="rounded-lg bg-white/70 px-3 py-2 text-xs text-gray-700">
            <div className="font-semibold text-gray-800">{value.name || 'Nessun impianto selezionato'}</div>
            {value.address ? <div className="text-gray-600">{value.address}</div> : null}
            {value.lat != null && value.lng != null ? (
              <div className="text-[11px] text-gray-500">Lat: {value.lat.toFixed(5)} · Lng: {value.lng.toFixed(5)}</div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
