import { isEmailLike } from '@/lib/displayName';
import type { Profile } from '@/types/profile';

type MinimalRole = 'club' | 'athlete' | 'staff' | 'fan';

type ProfileWithNames = Partial<Profile> & {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

function clean(value?: string | null) {
  const trimmed = value?.trim() ?? '';
  if (!trimmed || isEmailLike(trimmed)) return '';
  return trimmed;
}

export function resolveMinimalProfileRole(profile?: ProfileWithNames | null): MinimalRole | null {
  const raw = String(profile?.account_type ?? profile?.type ?? '').toLowerCase().trim();
  if (raw === 'club' || raw === 'athlete' || raw === 'staff' || raw === 'fan') return raw;
  if (raw === 'player') return 'athlete';
  return null;
}

export function getProfileCompletionPath(role: MinimalRole | null) {
  if (role === 'club') return '/club/profile';
  if (role === 'fan') return '/fan/profile';
  if (role === 'athlete' || role === 'staff') return '/player/profile';
  return '/onboarding/choose-role';
}

export function hasPersonalFirstAndLastName(profile?: ProfileWithNames | null) {
  const firstName = clean(profile?.first_name);
  const lastName = clean(profile?.last_name);
  if (firstName && lastName) return true;

  const fullName = clean(profile?.full_name) || clean(profile?.display_name);
  return fullName.split(/\s+/).filter(Boolean).length >= 2;
}

export function hasPublicName(profile?: ProfileWithNames | null) {
  return Boolean(clean(profile?.full_name) || clean(profile?.display_name));
}

export function isMinimumProfileComplete(profile?: ProfileWithNames | null) {
  const role = resolveMinimalProfileRole(profile);
  if (!role) return false;
  if (role === 'club' || role === 'fan') return hasPublicName(profile);
  return hasPersonalFirstAndLastName(profile);
}

function hasLocation(profile: Profile) {
  return Boolean(profile.city?.trim() || profile.province?.trim() || profile.region?.trim() || profile.country?.trim());
}

function hasDisplayName(profile: Profile) {
  return hasPublicName(profile);
}

function hasSport(profile: Profile) {
  return Boolean(profile.sport?.trim());
}

function hasBio(profile: Profile) {
  return Boolean(profile.bio?.trim());
}

export function isProfileComplete(profile?: Profile | null): profile is Profile {
  if (!profile) return false;

  return isMinimumProfileComplete(profile) && hasDisplayName(profile) && hasSport(profile) && hasLocation(profile) && hasBio(profile);
}
