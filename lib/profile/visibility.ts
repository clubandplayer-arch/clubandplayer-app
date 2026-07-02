const NON_EMPTY_LOCATION_FILTER = 'city.neq.,province.neq.,region.neq.,country.neq.';

/**
 * Restricts public profile listings to profiles that are active and have completed
 * the minimum onboarding fields required before becoming visible to other users.
 */
export function applyPublicProfileVisibilityFilters<T>(query: T): T {
  let nextQuery: any = query;

  nextQuery = nextQuery
    .eq('status', 'active')
    .not('display_name', 'is', null)
    .neq('display_name', '')
    .not('sport', 'is', null)
    .neq('sport', '')
    .not('bio', 'is', null)
    .neq('bio', '')
    .or(NON_EMPTY_LOCATION_FILTER);

  return nextQuery as T;
}
