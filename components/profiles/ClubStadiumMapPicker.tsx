'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_CENTER = { lat: 41.9028, lng: 12.4964 };

type StadiumLocation = {
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
};

type GoogleNamespace = {
  maps?: any;
};

type MapClickEvent = {
  latLng: { lat: () => number; lng: () => number } | null;
};

declare global {
  interface Window {
    google?: GoogleNamespace;
  }
}

type Props = {
  value: StadiumLocation;
  onChange: (value: StadiumLocation) => void;
};

type GoogleMaps = any;

let googleMapsPromise: Promise<GoogleMaps> | null = null;

function ensureGoogleMaps(apiKey?: string | null): Promise<GoogleMaps> {
  if (!apiKey) return Promise.reject(new Error('API key mancante'));
  if (typeof window === 'undefined') return Promise.reject(new Error('window non disponibile'));
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (!googleMapsPromise) {
    googleMapsPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-google-maps-loader]');
      if (existing && existing.dataset.loaded === 'true' && window.google?.maps) {
        resolve(window.google.maps);
        return;
      }

      const script = existing ?? document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.dataset.googleMapsLoader = 'true';
      script.onload = () => {
        script.dataset.loaded = 'true';
        if (window.google?.maps) {
          resolve(window.google.maps);
        } else {
          reject(new Error('Google Maps non disponibile'));
        }
      };
      script.onerror = () => reject(new Error('Caricamento Google Maps fallito'));
      if (!existing) document.head.appendChild(script);
    });
  }
  return googleMapsPromise;
}

export default function ClubStadiumMapPicker({ value, onChange }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const markerRef = useRef<any>(null);
  const mapInstance = useRef<any>(null);
  const [mapsApiAvailable, setMapsApiAvailable] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [locating, setLocating] = useState(false);

  const center = useMemo(() => {
    if (value.lat != null && value.lng != null) return { lat: value.lat, lng: value.lng };
    return DEFAULT_CENTER;
  }, [value.lat, value.lng]);

  useEffect(() => {
    let cancelled = false;
    if (!apiKey) {
      setError('Configura NEXT_PUBLIC_GOOGLE_MAPS_API_KEY per usare la mappa.');
      return () => {
        cancelled = true;
      };
    }

    ensureGoogleMaps(apiKey)
      .then((maps) => {
        if (cancelled) return;
        setMapsApiAvailable(true);

        const map = new maps.Map(mapRef.current as HTMLDivElement, {
          center,
          zoom: value.lat && value.lng ? 14 : 6,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        mapInstance.current = map;

        const placeMarker = (lat: number, lng: number, label?: string) => {
          const pos = { lat, lng };
          if (!markerRef.current) {
            markerRef.current = new maps.Marker({ map, position: pos, title: label });
          } else {
            markerRef.current.setPosition(pos);
            if (label) markerRef.current.setTitle(label);
          }
        };

        if (value.lat != null && value.lng != null) {
          placeMarker(value.lat, value.lng, value.name || 'Stadio / impianto');
        }

        if (inputRef.current) {
          const autocomplete = new maps.places.Autocomplete(inputRef.current, {
            fields: ['geometry', 'formatted_address', 'name'],
          });
          autocomplete.addListener('place_changed', () => {
            if (cancelled) return;
            const place = autocomplete.getPlace();
            const loc = place.geometry?.location;
            if (!loc) return;
            const lat = loc.lat();
            const lng = loc.lng();
            placeMarker(lat, lng, place.name || place.formatted_address || undefined);
            map.panTo({ lat, lng });
            map.setZoom(15);
            onChange({
              name: place.name || place.formatted_address || 'Stadio / impianto',
              address: place.formatted_address || '',
              lat,
              lng,
            });
          });
        }

        const clickListener = map.addListener('click', (ev: MapClickEvent) => {
          if (cancelled) return;
          if (!ev.latLng) return;
          const lat = ev.latLng.lat();
          const lng = ev.latLng.lng();
          placeMarker(lat, lng, value.name || 'Stadio / impianto');
          onChange({
            name: value.name || 'Stadio / impianto',
            address: value.address,
            lat,
            lng,
          });
        });

        return () => {
          maps.event.removeListener(clickListener);
        };
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message || 'Errore di caricamento della mappa');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey, center, onChange, value.address, value.name, value.lat, value.lng]);


  const useCurrentLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Geolocalizzazione del dispositivo non disponibile.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const nextName = value.name || 'Sede / impianto Club';
        onChange({
          name: nextName,
          address: value.address,
          lat,
          lng,
        });
        if (mapInstance.current) {
          mapInstance.current.panTo({ lat, lng });
          mapInstance.current.setZoom(15);
          if (!markerRef.current && window.google?.maps) {
            markerRef.current = new window.google.maps.Marker({
              map: mapInstance.current,
              position: { lat, lng },
              title: nextName,
            });
          } else {
            markerRef.current?.setPosition({ lat, lng });
            markerRef.current?.setTitle(nextName);
          }
        }
        setError(null);
        setLocating(false);
      },
      () => {
        setError('Non è stato possibile leggere la posizione. Controlla i permessi del browser.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  useEffect(() => {
    if (!mapsApiAvailable) return;
    if (value.lat != null && value.lng != null && mapInstance.current) {
      mapInstance.current.panTo({ lat: value.lat, lng: value.lng });
      markerRef.current?.setPosition({ lat: value.lat, lng: value.lng });
    }
  }, [mapsApiAvailable, value.lat, value.lng]);

  return (
    <div className="space-y-3 rounded-xl border border-white/40 bg-white/70 p-3 shadow-sm">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <label className="text-sm font-semibold text-gray-800">Cerca sede, stadio o impianto</label>
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={locating}
            className="inline-flex items-center justify-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {locating ? 'Rilevamento…' : 'Usa la mia posizione'}
          </button>
        </div>
        <input
          ref={inputRef}
          className="rounded-lg border p-2 text-sm"
          placeholder="Digita nome stadio, sede o indirizzo"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Cerca sede, stadio o impianto"
        />
        {value.address ? (
          <p className="text-xs text-gray-600">Indirizzo selezionato: {value.address}</p>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {error}
        </div>
      ) : (
        <div>
          <div ref={mapRef} className="h-64 w-full overflow-hidden rounded-lg bg-gray-100" />
          <p className="mt-2 text-xs text-gray-500">
            Clicca sulla mappa oppure usa la posizione del dispositivo per impostare dove mostrare il logo del Club sulla mappa nazionale.
          </p>
        </div>
      )}
    </div>
  );
}
