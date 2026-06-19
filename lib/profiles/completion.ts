export type ProfileCompletionAccountType = 'athlete' | 'club' | 'staff' | 'fan' | null;

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
  if (raw === 'athlete' || raw === 'club' || raw === 'staff' || raw === 'fan') return raw;
  return null;
}

export function getProfilePathForAccountType(accountType: ProfileCompletionAccountType) {
  if (accountType === 'club') return '/club/profile';
  if (accountType === 'staff') return '/staff/profile';
  if (accountType === 'fan') return '/fan/profile';
  return '/player/profile';
}

export function getMissingRequiredProfileFields(profile?: ProfileCompletionProfile | null) {
  const accountType = normalizeCompletionAccountType(profile);
  const missing: string[] = [];

  if (accountType === 'club') {
    if (!hasText(profile?.full_name) && !hasText(profile?.display_name)) missing.push('nome società');
    if (!hasText(profile?.sport)) missing.push('sport principale');
    if (!hasText(profile?.country)) missing.push('nazione');
    if (!hasText(profile?.region)) missing.push('regione');
    if (!hasText(profile?.province)) missing.push('provincia');
    if (!hasText(profile?.city)) missing.push('città');
    return missing;
  }

  if (accountType === 'fan') {
    if (!hasText(profile?.display_name) && !hasText(profile?.full_name)) {
      missing.push('nome visualizzato o nome gruppo tifosi');
    }
    return missing;
  }

  if (accountType === 'athlete' || accountType === 'staff') {
    if (!hasText(profile?.full_name)) missing.push('nome e cognome');
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
