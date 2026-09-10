import { normalizeLegacyTaxonomyValue } from '@/lib/taxonomy/legacyMappings';
import type { ProfilePrimarySportColumns } from '@/lib/taxonomy/profilePrimarySportRuntimeContract';

export type OpportunityRoleGroup = 'player' | 'staff';

export type OpportunityCanonicalColumns = ProfilePrimarySportColumns & {
  player_position_id: string | null;
  staff_role_id: string | null;
  gender_code: 'male' | 'female' | 'mixed' | null;
};

export class OpportunityCanonicalContextError extends Error {
  constructor(public readonly code: 'conflicting_role_reference' | 'invalid_role_reference') {
    super(code);
  }
}

const uuid = (value: unknown): string | null =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;

export function parseOpportunityRoleReference(body: Record<string, unknown>, roleGroup: OpportunityRoleGroup) {
  const playerPositionId = uuid(body.playerPositionId ?? body.player_position_id);
  const staffRoleId = uuid(body.staffRoleId ?? body.staff_role_id);
  const hasPlayer = Object.prototype.hasOwnProperty.call(body, 'playerPositionId') || Object.prototype.hasOwnProperty.call(body, 'player_position_id');
  const hasStaff = Object.prototype.hasOwnProperty.call(body, 'staffRoleId') || Object.prototype.hasOwnProperty.call(body, 'staff_role_id');
  const rawPlayer = Object.prototype.hasOwnProperty.call(body, 'playerPositionId') ? body.playerPositionId : body.player_position_id;
  const rawStaff = Object.prototype.hasOwnProperty.call(body, 'staffRoleId') ? body.staffRoleId : body.staff_role_id;
  if ((hasPlayer && rawPlayer !== null && !playerPositionId) ||
      (hasStaff && rawStaff !== null && !staffRoleId) ||
      (playerPositionId && staffRoleId)) {
    throw new OpportunityCanonicalContextError(hasPlayer && hasStaff ? 'conflicting_role_reference' : 'invalid_role_reference');
  }
  if ((roleGroup === 'player' && staffRoleId) || (roleGroup === 'staff' && playerPositionId)) {
    throw new OpportunityCanonicalContextError('invalid_role_reference');
  }
  return { playerPositionId, staffRoleId, hasExplicit: hasPlayer || hasStaff };
}

export async function resolveOpportunityRoleColumns(params: {
  supabase: any;
  body: Record<string, unknown>;
  roleGroup: OpportunityRoleGroup;
  legacyRole: string | null;
  sport: ProfilePrimarySportColumns;
}): Promise<Pick<OpportunityCanonicalColumns, 'player_position_id' | 'staff_role_id'>> {
  const { supabase, body, roleGroup, legacyRole, sport } = params;
  const parsed = parseOpportunityRoleReference(body, roleGroup);

  if (roleGroup === 'staff') {
    const roleId = parsed.staffRoleId;
    if (roleId) {
      const { data } = await supabase.from('staff_roles').select('id').eq('id', roleId).eq('is_active', true).maybeSingle();
      if (!data) throw new OpportunityCanonicalContextError('invalid_role_reference');
      return { player_position_id: null, staff_role_id: roleId };
    }
    if (parsed.hasExplicit) return { player_position_id: null, staff_role_id: null };
    if (!legacyRole) return { player_position_id: null, staff_role_id: null };
    const { data } = await supabase.from('legacy_staff_role_mappings').select('staff_role_id').eq('normalized_source_value', normalizeLegacyTaxonomyValue(legacyRole)).eq('is_active', true).limit(2);
    return { player_position_id: null, staff_role_id: data?.length === 1 ? data[0].staff_role_id : null };
  }

  const positionId = parsed.playerPositionId;
  if (parsed.hasExplicit && !positionId) return { player_position_id: null, staff_role_id: null };
  if (!sport.sport_id) {
    if (positionId) throw new OpportunityCanonicalContextError('invalid_role_reference');
    return { player_position_id: null, staff_role_id: null };
  }
  const scope = (query: any) => {
    let scoped = query.eq('sport_id', sport.sport_id).eq('is_active', true);
    scoped = sport.sport_discipline_id
      ? scoped.eq('discipline_id', sport.sport_discipline_id)
      : scoped.is('discipline_id', null);
    return sport.sport_variant_id
      ? scoped.eq('variant_id', sport.sport_variant_id)
      : scoped.is('variant_id', null);
  };
  if (positionId) {
    const { data } = await scope(supabase.from('player_position_applicability').select('position_id').eq('position_id', positionId)).maybeSingle();
    if (!data) throw new OpportunityCanonicalContextError('invalid_role_reference');
    return { player_position_id: positionId, staff_role_id: null };
  }
  if (!legacyRole) return { player_position_id: null, staff_role_id: null };
  const { data } = await scope(supabase.from('legacy_player_position_mappings').select('position_id').eq('normalized_source_value', normalizeLegacyTaxonomyValue(legacyRole))).limit(2);
  return { player_position_id: data?.length === 1 ? data[0].position_id : null, staff_role_id: null };
}

export function projectOpportunityCanonicalContext(row: Record<string, unknown>) {
  return {
    primarySport: row.sport_id ? {
      sportId: row.sport_id,
      disciplineId: row.sport_discipline_id ?? null,
      variantId: row.sport_variant_id ?? null,
    } : null,
    playerPositionId: row.player_position_id ?? null,
    staffRoleId: row.staff_role_id ?? null,
    genderCode: row.gender_code ?? null,
  };
}
