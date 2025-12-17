import { COUNTRY_STATE_CITY_DATA } from '@/lib/geodata/countryStateCityDataset';
import { EU_COUNTRIES } from '@/lib/geo/data/eu';

type BaseLocation = {
  country?: string | null;
  region?: string | null;
  province?: string | null;
  city?: string | null;
};

type InterestLocation = {
  interest_country?: string | null;
  interest_region?: string | null;
  interest_province?: string | null;
  interest_city?: string | null;
};

type LocationInput = BaseLocation | InterestLocation;

function resolveCountryLabel(code?: string | null): string | null {
  const normalized = (code || '').trim().toUpperCase();
  if (!normalized) return null;

  const euName = EU_COUNTRIES.find((c) => c.iso2 === normalized)?.name;
  if (euName) return euName;

  try {
    const dn = new Intl.DisplayNames(['it'], { type: 'region' });
    const intl = dn.of(normalized);
    if (intl) return intl;
  } catch {
    // ignore
  }

  const datasetName = COUNTRY_STATE_CITY_DATA.find((c) => c.isoCode === normalized)?.name;
  if (datasetName) return datasetName;

  return normalized;
}

function pickField(values: Array<string | null | undefined>): string | null {
  for (const val of values) {
    const trimmed = (val || '').toString().trim();
    if (trimmed) return trimmed;
  }
  return null;
}

export function buildLocationLabel(input: LocationInput): string {
  const asAny = input as Record<string, string | null | undefined>;
  const city = pickField([asAny.city, asAny.interest_city]);
  const province = pickField([asAny.province, asAny.interest_province]);
  const region = pickField([asAny.region, asAny.interest_region]);
  const countryCode = pickField([asAny.country, asAny.interest_country]);
  const country = resolveCountryLabel(countryCode) || countryCode;

  const parts = [city, province, region, country].filter(Boolean).map((part) => part!.toString().trim());
  if (!parts.length) return 'Località n/d';
  return parts.join(', ');
}
