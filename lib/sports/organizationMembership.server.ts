type MembershipScope = {
  organizationId: string | null;
  categoryId: string | null;
  sportId: string | null;
  disciplineId: string | null;
  variantId: string | null;
  countryId?: string | null;
};

export class OrganizationMembershipError extends Error {
  readonly code: string;
  constructor(code: string) { super(code); this.code=code; }
}

/** Validates the complete persisted state before a route performs its single write. */
export async function validateOrganizationMembership(supabase: any, scope: MembershipScope): Promise<void> {
  if (!scope.organizationId && !scope.categoryId) return;
  if (!scope.organizationId || !scope.categoryId || !scope.sportId) {
    throw new OrganizationMembershipError('sports_organization_and_category_required_together');
  }
  let categoryQuery=supabase.from('sports_organization_categories')
    .select('id,organization_id').eq('id',scope.categoryId).eq('organization_id',scope.organizationId)
    .eq('sport_id',scope.sportId).eq('is_active',true);
  if (scope.countryId) categoryQuery=categoryQuery.eq('country_id',scope.countryId);
  categoryQuery=scope.disciplineId ? categoryQuery.eq('discipline_id',scope.disciplineId) : categoryQuery.is('discipline_id',null);
  categoryQuery=scope.variantId ? categoryQuery.eq('variant_id',scope.variantId) : categoryQuery.is('variant_id',null);
  const { data:category, error:categoryError }=await categoryQuery.maybeSingle();
  if (categoryError || !category) throw new OrganizationMembershipError('incompatible_sports_organization_category');
  const { data:organization, error:organizationError }=await supabase.from('sports_organizations')
    .select('id').eq('id',scope.organizationId).eq('is_active',true).maybeSingle();
  if (organizationError || !organization) throw new OrganizationMembershipError('incompatible_sports_organization_category');
}
