/**
 * Single database-level scope for public profile reads. Completion is converted
 * into this lifecycle state by the profiles trigger.
 */
export function applyPublicProfileVisibilityFilters<T>(query: T): T {
  let nextQuery: any = query;

  nextQuery = nextQuery
    .eq('status', 'active')
    .eq('profile_visibility_status', 'published');

  return nextQuery as T;
}
