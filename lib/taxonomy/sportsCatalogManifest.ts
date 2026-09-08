import { createHash } from 'node:crypto';

export const SPORTS_CATALOG_MANIFEST_SCHEMA_VERSION = 1 as const;

export const SPORTS_CATALOG_RECORD_KINDS = [
  'gender_category',
  'competition_format',
  'territorial_scope',
  'player_position',
  'staff_role',
  'player_position_applicability',
  'staff_role_applicability',
  'sports_organization',
  'sports_organization_country',
  'competition_level',
  'age_class',
  'season',
  'competition',
  'competition_country',
  'competition_geo_area',
  'competition_edition',
  'competition_group',
  'legacy_player_position_mapping',
  'legacy_staff_role_mapping',
] as const;

export type SportsCatalogRecordKind = (typeof SPORTS_CATALOG_RECORD_KINDS)[number];

export type SportsCatalogManifestSource = {
  provider: string;
  datasetVersion: string;
  publishedAt: string | null;
  retrievedAt: string;
  sourceUrl: string;
  license: string;
  attribution: string;
};

export type SportsCatalogManifestRecord = {
  kind: SportsCatalogRecordKind;
  key: string;
  code?: string;
  canonicalName?: string;
  sourceRecordId?: string;
  countryIso2?: string;
  references?: Record<string, string>;
  attributes?: Record<string, unknown>;
};

export type SportsCatalogManifest = {
  schemaVersion: typeof SPORTS_CATALOG_MANIFEST_SCHEMA_VERSION;
  manifestVersion: string;
  source: SportsCatalogManifestSource;
  countries: string[];
  expectedCounts: Partial<Record<SportsCatalogRecordKind, number>>;
  payloadChecksum: string;
  records: SportsCatalogManifestRecord[];
};

export type SportsCatalogManifestValidationOptions = {
  /** Stable foundation references that already exist outside this manifest. */
  knownReferences?: ReadonlySet<string>;
};

export type SportsCatalogManifestValidationReport = {
  valid: boolean;
  errors: string[];
  recordCounts: Record<SportsCatalogRecordKind, number>;
  calculatedChecksum: string;
};

const codePattern = /^[a-z][a-z0-9_]*$/;
const periodCodePattern = /^[a-z0-9][a-z0-9_-]*$/;
const manifestVersionPattern = /^[0-9]{4}\.[0-9]{2}\.[0-9]{2}(?:\.[a-z0-9_-]+)?$/;
const checksumPattern = /^sha256:[a-f0-9]{64}$/;
const iso2Pattern = /^[A-Z]{2}$/;
const placeholderPattern = /^(?:confirm_required|todo|tbd|unknown|n\/a)$/i;

const globallyCodedKinds = new Set<SportsCatalogRecordKind>([
  'gender_category',
  'competition_format',
  'territorial_scope',
  'player_position',
  'staff_role',
]);
const recordKindSet = new Set<string>(SPORTS_CATALOG_RECORD_KINDS);

const sourcedKinds = new Set<SportsCatalogRecordKind>(['sports_organization', 'competition']);

const requiredReferences: Partial<Record<SportsCatalogRecordKind, readonly string[]>> = {
  player_position_applicability: ['position', 'sport'],
  staff_role_applicability: ['staffRole', 'sport'],
  sports_organization_country: ['organization', 'country'],
  competition_level: ['organization', 'sport'],
  age_class: ['organization', 'sport'],
  season: ['organization'],
  competition: ['organization', 'sport', 'territorialScope'],
  competition_country: ['competition', 'country'],
  competition_geo_area: ['competition', 'geoArea'],
  competition_edition: ['competition', 'organization', 'sport', 'season'],
  competition_group: ['edition'],
  legacy_player_position_mapping: ['position', 'sport'],
  legacy_staff_role_mapping: ['staffRole'],
};

const dependencyRank: Record<SportsCatalogRecordKind, number> = {
  gender_category: 10,
  competition_format: 10,
  territorial_scope: 10,
  player_position: 20,
  staff_role: 20,
  player_position_applicability: 30,
  staff_role_applicability: 30,
  sports_organization: 40,
  sports_organization_country: 50,
  competition_level: 60,
  age_class: 60,
  season: 70,
  competition: 80,
  competition_country: 90,
  competition_geo_area: 90,
  competition_edition: 100,
  competition_group: 110,
  legacy_player_position_mapping: 120,
  legacy_staff_role_mapping: 120,
};

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  }
  return value;
}

export function calculateSportsCatalogPayloadChecksum(records: readonly SportsCatalogManifestRecord[]): string {
  const payload = JSON.stringify(stableValue(records));
  return `sha256:${createHash('sha256').update(payload, 'utf8').digest('hex')}`;
}

function requiredText(errors: string[], path: string, value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) {
    errors.push(`${path}:required`);
    return false;
  }
  if (placeholderPattern.test(value.trim())) errors.push(`${path}:placeholder_forbidden`);
  return true;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateSportsCatalogManifest(
  manifest: SportsCatalogManifest,
  options: SportsCatalogManifestValidationOptions = {},
): SportsCatalogManifestValidationReport {
  const errors: string[] = [];
  const counts = Object.fromEntries(SPORTS_CATALOG_RECORD_KINDS.map((kind) => [kind, 0])) as Record<
    SportsCatalogRecordKind,
    number
  >;

  if (manifest.schemaVersion !== SPORTS_CATALOG_MANIFEST_SCHEMA_VERSION) errors.push('schemaVersion:unsupported');
  if (!manifestVersionPattern.test(manifest.manifestVersion)) errors.push('manifestVersion:invalid');

  const sourceFields: (keyof SportsCatalogManifestSource)[] = [
    'provider', 'datasetVersion', 'retrievedAt', 'sourceUrl', 'license', 'attribution',
  ];
  for (const field of sourceFields) requiredText(errors, `source.${field}`, manifest.source[field]);
  if (manifest.source.publishedAt !== null && !validDate(manifest.source.publishedAt)) {
    errors.push('source.publishedAt:invalid_date');
  }
  if (!validDate(manifest.source.retrievedAt)) errors.push('source.retrievedAt:invalid_date');
  if (!/^https:\/\//.test(manifest.source.sourceUrl)) errors.push('source.sourceUrl:https_required');

  const countrySet = new Set<string>();
  for (const country of manifest.countries) {
    if (!iso2Pattern.test(country)) errors.push(`countries:${country}:invalid_iso2`);
    if (countrySet.has(country)) errors.push(`countries:${country}:duplicate`);
    countrySet.add(country);
  }

  const keys = new Set<string>();
  const codedIdentities = new Set<string>();
  const sourceIdentities = new Set<string>();
  const knownReferences = new Set(options.knownReferences ?? []);
  let previousRank = 0;

  for (const [index, record] of manifest.records.entries()) {
    const path = `records[${index}]`;
    if (!recordKindSet.has(record.kind)) {
      errors.push(`${path}.kind:unsupported`);
      continue;
    }
    counts[record.kind] += 1;
    if (!requiredText(errors, `${path}.key`, record.key)) continue;
    if (keys.has(record.key)) errors.push(`${path}.key:duplicate:${record.key}`);
    keys.add(record.key);

    const rank = dependencyRank[record.kind];
    if (rank < previousRank) errors.push(`${path}.kind:dependency_order`);
    previousRank = Math.max(previousRank, rank);

    const applicableCodePattern = record.kind === 'season' || record.kind === 'competition_edition'
      ? periodCodePattern
      : codePattern;
    if (record.code !== undefined && !applicableCodePattern.test(record.code)) errors.push(`${path}.code:invalid`);
    if (globallyCodedKinds.has(record.kind)) {
      if (!requiredText(errors, `${path}.code`, record.code)) continue;
      requiredText(errors, `${path}.canonicalName`, record.canonicalName);
      const identity = `${record.kind}:${record.code}`;
      if (codedIdentities.has(identity)) errors.push(`${path}.code:collision:${identity}`);
      codedIdentities.add(identity);
    }

    if (sourcedKinds.has(record.kind)) {
      if (!requiredText(errors, `${path}.sourceRecordId`, record.sourceRecordId)) continue;
      requiredText(errors, `${path}.code`, record.code);
      requiredText(errors, `${path}.canonicalName`, record.canonicalName);
      const identity = `${record.kind}:${manifest.source.provider}:${record.sourceRecordId}`;
      if (sourceIdentities.has(identity)) errors.push(`${path}.sourceRecordId:collision:${identity}`);
      sourceIdentities.add(identity);
    }

    if (record.countryIso2 !== undefined && !countrySet.has(record.countryIso2)) {
      errors.push(`${path}.countryIso2:not_declared:${record.countryIso2}`);
    }

    for (const name of requiredReferences[record.kind] ?? []) {
      if (!record.references?.[name]) errors.push(`${path}.references.${name}:required`);
    }
    for (const [name, reference] of Object.entries(record.references ?? {})) {
      if (reference === record.key) errors.push(`${path}.references.${name}:self_reference`);
      if (/^(?:uuid:|[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$)/i.test(reference)) {
        errors.push(`${path}.references.${name}:environment_uuid_forbidden`);
      }
      if (!keys.has(reference) && !knownReferences.has(reference)) {
        errors.push(`${path}.references.${name}:missing_or_forward:${reference}`);
      }
    }
  }

  for (const kind of SPORTS_CATALOG_RECORD_KINDS) {
    const expected = manifest.expectedCounts[kind];
    if (expected !== undefined && expected !== counts[kind]) {
      errors.push(`expectedCounts.${kind}:expected_${expected}:actual_${counts[kind]}`);
    }
  }

  const calculatedChecksum = calculateSportsCatalogPayloadChecksum(manifest.records);
  if (!checksumPattern.test(manifest.payloadChecksum)) errors.push('payloadChecksum:invalid');
  else if (manifest.payloadChecksum !== calculatedChecksum) errors.push('payloadChecksum:mismatch');

  return { valid: errors.length === 0, errors, recordCounts: counts, calculatedChecksum };
}
