import type {
  CanonicalTaxonomyRecord,
  CanonicalTaxonomySelection,
  LegacyTaxonomyValue,
  TaxonomyCatalog,
  TaxonomyRoleKind,
} from '@/lib/taxonomy/compatibilityAdapter';
import { normalizeLegacyTaxonomyValue } from '@/lib/taxonomy/legacyMappings';

type SupabaseLike = { from(table: string): any };

/** Read-only Data API adapter. It performs no persistence and uses no service role. */
export class SupabaseTaxonomyCatalog implements TaxonomyCatalog {
  constructor(private readonly client: SupabaseLike) {}

  async getCanonical(selection: CanonicalTaxonomySelection): Promise<CanonicalTaxonomyRecord | null> {
    const { data: sport } = await this.client.from('sports').select('id,code').eq('id', selection.sportId).maybeSingle();
    if (!sport) return null;

    const [discipline, variant, playerRole, staffRole] = await Promise.all([
      selection.disciplineId ? this.byId('sport_disciplines', selection.disciplineId) : null,
      selection.variantId ? this.byId('sport_variants', selection.variantId) : null,
      selection.playerRoleId ? this.byId('player_roles', selection.playerRoleId) : null,
      selection.staffRoleId ? this.byId('staff_roles', selection.staffRoleId) : null,
    ]);
    if (selection.disciplineId && (!discipline || discipline.sport_id !== sport.id)) return null;
    if (selection.variantId && (!variant || variant.discipline_id !== discipline?.id)) return null;
    if (selection.playerRoleId && (!playerRole || playerRole.sport_id !== sport.id)) return null;
    if (selection.staffRoleId && !staffRole) return null;

    return {
      ...selection,
      sportCode: sport.code,
      disciplineCode: discipline?.code ?? null,
      variantCode: variant?.code ?? null,
      playerRoleCode: playerRole?.code ?? null,
      staffRoleCode: staffRole?.code ?? null,
      legacyProjection: {
        sport: await this.legacySportLabel(sport.id, discipline?.id ?? null, variant?.id ?? null),
        role: await this.legacyRoleLabel(playerRole?.id ?? null, staffRole?.id ?? null),
      },
    };
  }

  async resolveLegacy(value: LegacyTaxonomyValue, roleKind: TaxonomyRoleKind): Promise<CanonicalTaxonomyRecord | null> {
    if (!value.sport) return null;
    const normalizedSport = normalizeLegacyTaxonomyValue(value.sport);
    const { data: sportMapping } = await this.client
      .from('legacy_sport_mappings')
      .select('sport_id,discipline_id,variant_id')
      .eq('normalized_source_value', normalizedSport)
      .eq('is_active', true)
      .maybeSingle();
    if (!sportMapping) return null;

    let playerRoleId: string | null = null;
    let staffRoleId: string | null = null;
    if (value.role) {
      const normalizedRole = normalizeLegacyTaxonomyValue(value.role);
      if (roleKind === 'player') {
        const { data } = await this.client
          .from('legacy_player_role_mappings')
          .select('player_role_id,player_roles!inner(sport_id)')
          .eq('normalized_source_value', normalizedRole)
          .eq('is_active', true)
          .eq('player_roles.sport_id', sportMapping.sport_id)
          .maybeSingle();
        if (!data) return null;
        playerRoleId = data.player_role_id;
      } else {
        const { data } = await this.client
          .from('legacy_staff_role_mappings')
          .select('staff_role_id')
          .eq('normalized_source_value', normalizedRole)
          .eq('is_active', true)
          .maybeSingle();
        if (!data) return null;
        staffRoleId = data.staff_role_id;
      }
    }

    return this.getCanonical({
      sportId: sportMapping.sport_id,
      disciplineId: sportMapping.discipline_id,
      variantId: sportMapping.variant_id,
      playerRoleId,
      staffRoleId,
    });
  }

  private async byId(table: string, id: string) {
    const { data } = await this.client.from(table).select('*').eq('id', id).maybeSingle();
    return data ?? null;
  }

  private async legacySportLabel(sportId: string, disciplineId: string | null, variantId: string | null) {
    let query = this.client.from('legacy_sport_mappings').select('legacy_display_label').eq('sport_id', sportId).eq('is_active', true);
    query = disciplineId ? query.eq('discipline_id', disciplineId) : query.is('discipline_id', null);
    query = variantId ? query.eq('variant_id', variantId) : query.is('variant_id', null);
    const { data } = await query.order('created_at', { ascending: true }).limit(1).maybeSingle();
    return data?.legacy_display_label ?? null;
  }

  private async legacyRoleLabel(playerRoleId: string | null, staffRoleId: string | null) {
    if (playerRoleId) {
      const { data } = await this.client.from('legacy_player_role_mappings').select('legacy_display_label').eq('player_role_id', playerRoleId).eq('is_active', true).limit(1).maybeSingle();
      return data?.legacy_display_label ?? null;
    }
    if (staffRoleId) {
      const { data } = await this.client.from('legacy_staff_role_mappings').select('legacy_display_label').eq('staff_role_id', staffRoleId).eq('is_active', true).limit(1).maybeSingle();
      return data?.legacy_display_label ?? null;
    }
    return null;
  }
}
