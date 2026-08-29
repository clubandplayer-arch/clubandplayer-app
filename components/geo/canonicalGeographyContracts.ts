import type { GeoAreaRead } from '@/lib/geo/areas';
import type { CanonicalCountryRead } from '@/lib/geo/countryCatalog';

export type CanonicalGeographyAncestry = { area: GeoAreaRead; ancestors: GeoAreaRead[] };

export type CanonicalGeographyLoader = {
  countries(signal?: AbortSignal): Promise<CanonicalCountryRead[]>;
  roots(countryIso2: string, signal?: AbortSignal): Promise<GeoAreaRead[]>;
  children(countryIso2: string, parentId: string, signal?: AbortSignal): Promise<GeoAreaRead[]>;
  ancestry(areaId: string, signal?: AbortSignal): Promise<CanonicalGeographyAncestry>;
};

type ApiEnvelope<T> = { ok?: boolean; data?: T; message?: string };

async function readApi<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', signal });
  const payload = await response.json().catch(() => ({})) as ApiEnvelope<T>;
  if (!response.ok || !payload.data) throw new Error(payload.message || `HTTP ${response.status}`);
  return payload.data;
}

export const canonicalGeographyHttpLoader: CanonicalGeographyLoader = {
  countries: (signal) => readApi('/api/geo/countries', signal),
  roots: (countryIso2, signal) => readApi(`/api/geo/areas?country=${encodeURIComponent(countryIso2)}`, signal),
  children: (countryIso2, parentId, signal) => readApi(`/api/geo/areas?country=${encodeURIComponent(countryIso2)}&parentId=${encodeURIComponent(parentId)}`, signal),
  ancestry: (areaId, signal) => readApi(`/api/geo/areas/${encodeURIComponent(areaId)}/ancestors`, signal),
};
