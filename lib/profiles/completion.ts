import { isValidProfileClubName, isValidProfilePersonName } from '@/lib/profiles/nameValidation';

export type ProfileCompletionAccountType = 'athlete' | 'club' | 'staff' | 'fan' | 'admin' | 'institution' | null;

export type ProfileCompletionProfile = {
  account_type?: string | null;
  type?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  birth_year?: number | string | null;
  country?: string | null;
  sport?: string | null;
  role?: string | null;
  region?: string | null;
  province?: string | null;
  city?: string | null;
  interest_region_id?: number | string | null;
  interest_province_id?: number | string | null;
  interest_municipality_id?: number | string | null;
  residence_country_id?: string | null;
  residence_geo_area_id?: string | null;
};

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

function hasText(value: unknown) {
  return text(value).length > 0;
}

function hasBirthYear(value: unknown) {
  const year = typeof value === 'number' ? value : Number(text(value));
  return Number.isInteger(year) && year >= 1900 && year <= new Date().getFullYear();
}

export function normalizeCompletionAccountType(profile?: ProfileCompletionProfile | null): ProfileCompletionAccountType {
  const raw = text(profile?.account_type || profile?.type).toLowerCase();
  if (raw === 'athlete' || raw === 'club' || raw === 'staff' || raw === 'fan' || raw === 'admin' || raw === 'institution') return raw;
  return null;
}

export function getProfilePathForAccountType(accountType: ProfileCompletionAccountType) {
  if (accountType === 'admin') return '/admin/profile';
  if (accountType === 'club') return '/club/profile';
  if (accountType === 'staff') return '/staff/profile';
  if (accountType === 'fan') return '/fan/profile';
  if (accountType === 'institution') return '/institution/profile';
  return '/player/profile';
}

export function getMissingRequiredProfileFields(profile?: ProfileCompletionProfile | null) {
  const accountType = normalizeCompletionAccountType(profile);
  const missing: string[] = [];

  if (accountType === 'admin') return missing;

  if (accountType === 'club') {
    if ((!hasText(profile?.full_name) && !hasText(profile?.display_name)) || !isValidProfileClubName(text(profile?.full_name || profile?.display_name))) missing.push('nome società');
    if (!hasText(profile?.residence_country_id)) missing.push('Paese di residenza');
    if (!hasText(profile?.residence_geo_area_id)) missing.push('area di residenza');
    return missing;
  }

  if (accountType === 'institution') {
    return missing;
  }

  if (accountType === 'fan') {
    const fanName = text(profile?.display_name || profile?.full_name);
    if (!hasText(fanName) || !isValidProfilePersonName(fanName)) {
      missing.push('nome e cognome');
    }
    return missing;
  }

  if (accountType === 'athlete' || accountType === 'staff') {
    if (!hasText(profile?.full_name) || !isValidProfilePersonName(text(profile?.full_name))) missing.push('nome e cognome');
    if (!hasBirthYear(profile?.birth_year)) missing.push('anno di nascita');
    if (!hasText(profile?.country)) missing.push('nazionalità');
    if (!hasText(profile?.sport)) missing.push('sport');
    if (!hasText(profile?.role)) missing.push(accountType === 'staff' ? 'ruolo staff' : 'ruolo');
  }

  return missing;
}

export function isProfileComplete(profile?: ProfileCompletionProfile | null) {
  return getMissingRequiredProfileFields(profile).length === 0;
}

/** Only complete profiles with a real public name can be proposed to follow. */
export function isProfileEligibleForFollowSuggestions(profile?: ProfileCompletionProfile | null) {
  const accountType = normalizeCompletionAccountType(profile);
  const name = text(profile?.full_name || profile?.display_name);

  if (!accountType || accountType === 'admin' || !name || /\S+@\S+\.\S+/u.test(name)) return false;
  if (accountType === 'institution') return isValidProfileClubName(name);
  return isProfileComplete(profile);
}

/**
 * Discovery is also a migration surface: a profile published before newer
 * mandatory fields were introduced must remain searchable. Publication and
 * account status are enforced by the caller; this boundary only rejects
 * malformed account types, missing/invalid public names and admin accounts.
 */
export function isProfileEligibleForPublicDiscovery(profile?: ProfileCompletionProfile | null) {
  const accountType = normalizeCompletionAccountType(profile);
  const name = text(profile?.full_name || profile?.display_name);

  if (!accountType || accountType === 'admin' || !name || /\S+@\S+\.\S+/u.test(name)) return false;
  return accountType === 'club' || accountType === 'institution'
    ? isValidProfileClubName(name)
    : isValidProfilePersonName(name);
}
