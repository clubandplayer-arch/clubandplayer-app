import type { SupabaseClient } from '@supabase/supabase-js';

import type { CanonicalGeoAreaImportRecord } from '../canonical';
import { canonicalFingerprint, type ProductionBatchResult, type ProductionExistingRecord, type ProductionGeoRepository } from './productionImport';
import type { OfficialGeoCountry } from './providers';

type GeoAreaRow = { id: string; source_provider: string; source_record_id: string; parent_id: string | null; code: string | null; code_authority: string | null; official_name: string; short_name: string | null; area_type: string; level: number; centroid_lat: number | null; centroid_lng: number | null; min_lat: number | null; min_lng: number | null; max_lat: number | null; max_lng: number | null; source_updated_at: string | null; source_license: string | null; metadata: Record<string, unknown> };
const key = (provider: string, externalId: string) => `${provider}:${externalId}`;

export class SupabaseProductionGeoRepository implements ProductionGeoRepository {
  private countryId = ''; private readonly rows = new Map<string, GeoAreaRow>(); private readonly rowsById = new Map<string, GeoAreaRow>();
  constructor(private readonly client: SupabaseClient) {}

  async existing(provider: string, country: OfficialGeoCountry): Promise<ProductionExistingRecord[]> {
    const countryResult = await this.client.from('countries').select('id').eq('iso2', country).single();
    if (countryResult.error) throw countryResult.error;
    this.countryId = countryResult.data.id as string;
    this.rows.clear(); this.rowsById.clear();
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const result = await this.client.from('geo_areas').select('id,source_provider,source_record_id,parent_id,code,code_authority,official_name,short_name,area_type,level,centroid_lat,centroid_lng,min_lat,min_lng,max_lat,max_lng,source_updated_at,source_license,metadata').eq('country_id', this.countryId).eq('source_provider', provider).order('id').range(from, from + pageSize - 1);
      if (result.error) throw result.error;
      for (const value of result.data as GeoAreaRow[]) { this.rows.set(key(value.source_provider, value.source_record_id), value); this.rowsById.set(value.id, value); }
      if (result.data.length < pageSize) break;
    }
    return [...this.rows.values()].map((row) => ({ provider: row.source_provider, externalId: row.source_record_id, id: row.id, officialCode: row.code, fingerprint: canonicalFingerprint(this.fromRow(row)) }));
  }

  async upsertBatch(records: readonly CanonicalGeoAreaImportRecord[]): Promise<ProductionBatchResult> {
    if (!this.countryId) throw new Error('existing() must initialize the country before writes');
    const inserts: Record<string, unknown>[] = []; const updates: Array<{ row: GeoAreaRow; payload: Record<string, unknown>; record: CanonicalGeoAreaImportRecord }> = [];
    let unchanged = 0;
    for (const record of records) {
      const current = this.rows.get(key(record.provider, record.externalId));
      if (current && canonicalFingerprint(this.fromRow(current)) === canonicalFingerprint(record)) { unchanged += 1; continue; }
      const payload = this.toPayload(record);
      if (current) updates.push({ row: current, payload, record }); else inserts.push(payload);
    }
    if (inserts.length) {
      const result = await this.client.from('geo_areas').insert(inserts).select('id,source_provider,source_record_id,parent_id,code,code_authority,official_name,short_name,area_type,level,centroid_lat,centroid_lng,min_lat,min_lng,max_lat,max_lng,source_updated_at,source_license,metadata');
      if (result.error) throw result.error;
      for (const value of result.data as GeoAreaRow[]) { this.rows.set(key(value.source_provider, value.source_record_id), value); this.rowsById.set(value.id, value); }
    }
    for (const update of updates) {
      const result = await this.client.from('geo_areas').update(update.payload).eq('id', update.row.id).select('id,source_provider,source_record_id,parent_id,code,code_authority,official_name,short_name,area_type,level,centroid_lat,centroid_lng,min_lat,min_lng,max_lat,max_lng,source_updated_at,source_license,metadata').single();
      if (result.error) throw result.error;
      const value = result.data as GeoAreaRow; this.rows.set(key(value.source_provider, value.source_record_id), value); this.rowsById.set(value.id, value);
    }
    return { inserted: inserts.length, updated: updates.length, unchanged };
  }

  private toPayload(record: CanonicalGeoAreaImportRecord): Record<string, unknown> {
    const parentId = record.parentExternalId ? this.rows.get(key(record.provider, record.parentExternalId))?.id : null;
    if (record.parentExternalId && !parentId) throw new Error(`Parent has not been imported: ${record.parentExternalId}`);
    return { country_id: this.countryId, parent_id: parentId, code: record.code, code_authority: record.codeAuthority, official_name: record.officialName, short_name: record.shortName, area_type: record.areaType, level: record.level, source_provider: record.provider, source_record_id: record.externalId, source_updated_at: record.sourceUpdatedAt, source_license: record.sourceLicense, centroid_lat: record.coordinates?.lat ?? null, centroid_lng: record.coordinates?.lng ?? null, min_lat: record.bounds?.minLat ?? null, min_lng: record.bounds?.minLng ?? null, max_lat: record.bounds?.maxLat ?? null, max_lng: record.bounds?.maxLng ?? null, metadata: record.metadata };
  }

  private fromRow(row: GeoAreaRow): CanonicalGeoAreaImportRecord {
    return { provider: row.source_provider, externalId: row.source_record_id, countryIso2: '', parentExternalId: row.parent_id ? this.rowsById.get(row.parent_id)?.source_record_id ?? null : null, code: row.code, codeAuthority: row.code_authority, officialName: row.official_name, shortName: row.short_name, areaType: row.area_type, level: row.level, coordinates: row.centroid_lat == null || row.centroid_lng == null ? null : { lat: Number(row.centroid_lat), lng: Number(row.centroid_lng) }, bounds: row.min_lat == null || row.min_lng == null || row.max_lat == null || row.max_lng == null ? null : { minLat: Number(row.min_lat), minLng: Number(row.min_lng), maxLat: Number(row.max_lat), maxLng: Number(row.max_lng) }, sourceUpdatedAt: row.source_updated_at, sourceLicense: row.source_license, metadata: row.metadata };
  }
}
