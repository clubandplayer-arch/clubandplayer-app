export type MinimumProfileRole = 'club' | 'athlete' | 'staff' | 'fan';

export const MINIMUM_PROFILE_MESSAGE =
  'Completa il tuo profilo per continuare. Questi dati servono per identificarti correttamente all’interno di Club & Player.';
export const INCOMPLETE_PROFILE_PUBLIC_NAME = 'Profilo da completare';

export function normalizeMinimumProfileRole(value: unknown): MinimumProfileRole | null {
  const role = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (role === 'club') return 'club';
  if (role === 'athlete' || role === 'player') return 'athlete';
  if (role === 'staff') return 'staff';
  if (role === 'fan') return 'fan';
  return null;
}

export function minimumProfilePathForRole(role: unknown): string {
  const normalized = normalizeMinimumProfileRole(role);
  if (normalized === 'club') return '/club/profile';
  if (normalized === 'fan') return '/fan/profile';
  if (normalized === 'staff' || normalized === 'athlete') return '/player/profile';
  return '/onboarding/choose-role';
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function hasPersonName(value: unknown): boolean {
  const text = cleanText(value);
  if (!text || text.includes('@')) return false;
  return text.split(' ').filter(Boolean).length >= 2;
}

function hasPublicName(value: unknown): boolean {
  const text = cleanText(value);
  return Boolean(text && !text.includes('@'));
}

export function isMinimumProfileComplete(profile?: Record<string, any> | null): boolean {
  if (!profile) return false;
  const role = normalizeMinimumProfileRole(profile.account_type ?? profile.type);
  const name = profile.full_name ?? profile.display_name;
  if (role === 'athlete' || role === 'staff') return hasPersonName(name);
  if (role === 'club' || role === 'fan') return hasPublicName(name);
  return false;
}

export function getMinimumProfileError(profile?: Record<string, any> | null): string | null {
  if (isMinimumProfileComplete(profile)) return null;
  const role = normalizeMinimumProfileRole(profile?.account_type ?? profile?.type);
  if (role === 'athlete' || role === 'staff') return 'Nome e cognome sono obbligatori.';
  if (role === 'club') return 'Nome squadra / nome società obbligatorio.';
  if (role === 'fan') return 'Nome personale o nome gruppo tifoso obbligatorio.';
  return 'Ruolo profilo non valido.';
}
