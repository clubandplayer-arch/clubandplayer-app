export function isEmailLike(value?: string | null): boolean {
  const trimmed = value?.trim();
  if (!trimmed) return false;
  return trimmed.includes('@');
}

export function buildPlayerDisplayName(
  fullName?: string | null,
  displayName?: string | null,
  fallback: string = 'Profilo da completare',
) {
  return buildProfileDisplayName(fullName, displayName, fallback);
}

export function buildProfileDisplayName(
  fullName?: string | null,
  displayName?: string | null,
  fallback: string = 'Profilo da completare',
) {
  const safeFullName = fullName?.trim();
  if (safeFullName) return safeFullName;

  const candidate = displayName?.trim();
  if (candidate && !isEmailLike(candidate)) return candidate;

  return fallback;
}

export function buildClubDisplayName(
  fullName?: string | null,
  displayName?: string | null,
  fallback: string = 'Profilo da completare',
) {
  return buildProfileDisplayName(fullName, displayName, fallback);
}
