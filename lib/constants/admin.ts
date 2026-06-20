export const PLATFORM_ADMIN_EMAIL = 'clubandplayer@gmail.com';
export const PLATFORM_ADMIN_ROLE = 'admin';
export const PLATFORM_ADMIN_ROLE_LABEL = 'Admin';
export const DEFAULT_ADMIN_EMAILS = [PLATFORM_ADMIN_EMAIL];

export function normalizeAdminEmail(email?: string | null) {
  return (email ?? '').trim().toLowerCase();
}

export function isPlatformAdminEmail(email?: string | null) {
  return normalizeAdminEmail(email) === PLATFORM_ADMIN_EMAIL;
}
