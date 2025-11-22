// Minimal dataset derivato da dr5hn/countries-states-cities-database
// Limitato ai casi più frequenti nell'app, senza chiamate API esterne.
export type DatasetState = {
  name: string;
  isoCode?: string;
  cities?: string[];
};

export type DatasetCountry = {
  isoCode: string;
  name: string;
  states?: DatasetState[];
};

export const COUNTRY_STATE_CITY_DATA: DatasetCountry[] = [
  {
    isoCode: 'IT',
    name: 'Italy',
    states: [
      { name: 'Abruzzo' },
      { name: 'Basilicata' },
      { name: 'Calabria' },
      { name: 'Campania' },
      { name: 'Emilia-Romagna' },
      { name: 'Friuli-Venezia Giulia' },
      { name: 'Lazio' },
      { name: 'Liguria' },
      { name: 'Lombardia' },
      { name: 'Marche' },
      { name: 'Molise' },
      { name: 'Piemonte' },
      { name: 'Puglia' },
      { name: 'Sardegna' },
      { name: 'Sicilia' },
      { name: 'Toscana' },
      { name: 'Trentino-Alto Adige' },
      { name: 'Umbria' },
      { name: "Valle d'Aosta" },
      { name: 'Veneto' },
    ],
  },
  { isoCode: 'FR', name: 'France' },
  { isoCode: 'ES', name: 'Spain' },
  { isoCode: 'PT', name: 'Portugal' },
  { isoCode: 'DE', name: 'Germany' },
  { isoCode: 'GB', name: 'United Kingdom' },
  { isoCode: 'IE', name: 'Ireland' },
  { isoCode: 'NL', name: 'Netherlands' },
  { isoCode: 'BE', name: 'Belgium' },
  { isoCode: 'CH', name: 'Switzerland' },
  { isoCode: 'US', name: 'United States' },
];

export function resolveCountryName(code?: string | null): string {
  if (!code) return '';
  const normalized = code.trim().toUpperCase();
  const hit = COUNTRY_STATE_CITY_DATA.find((c) => c.isoCode === normalized);
  return hit?.name ?? normalized;
}

export function resolveStateName(countryCode: string | null | undefined, rawState?: string | null): string {
  if (!countryCode || !rawState) return rawState?.trim() || '';
  const country = COUNTRY_STATE_CITY_DATA.find((c) => c.isoCode === countryCode.trim().toUpperCase());
  if (!country?.states) return rawState.trim();
  const target = rawState.trim().toLowerCase();
  const match = country.states.find((s) => s.name.toLowerCase() === target || s.isoCode?.toLowerCase() === target);
  return match?.name ?? rawState.trim();
}
