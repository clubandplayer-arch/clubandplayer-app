import type { Profile } from '@/types/profile';

function hasLocation(profile: Profile) {
  return Boolean(profile.city?.trim() || profile.province?.trim() || profile.region?.trim() || profile.country?.trim());
}

function hasDisplayName(profile: Profile) {
  return Boolean(profile.display_name?.trim());
}

function hasSport(profile: Profile) {
  return Boolean(profile.sport?.trim());
}

function hasBio(profile: Profile) {
  return Boolean(profile.bio?.trim());
}

export function isProfileComplete(profile?: Profile | null): profile is Profile {
  if (!profile) return false;

  return hasDisplayName(profile) && hasSport(profile) && hasLocation(profile) && hasBio(profile);
}
