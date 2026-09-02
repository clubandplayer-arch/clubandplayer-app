export const PUBLIC_MAP_PROVIDER = {
  leafletVersion: '1.9.4',
  leafletCss: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  leafletScript: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; OpenStreetMap contributors',
} as const;

export const PUBLIC_MAP_LIMITS = {
  globalClubs: 1000,
  boundedClubs: 500,
  searchOwnerPool: 300,
  opportunities: 100,
} as const;

/** Fetch one extra row so responses can disclose truncation without a count query. */
export function mapResultWindow<T>(rows: T[], limit: number) {
  return { rows: rows.slice(0, limit), truncated: rows.length > limit };
}
