export const SITE_NAME = 'Club and Player';
export const DEFAULT_SITE_URL = 'https://www.clubandplayer.com';
export const DEFAULT_OG_IMAGE = '/og.jpg';

export const PUBLIC_INDEXABLE_PATHS = [
  '/signup',
  '/legal/privacy',
  '/legal/terms',
  '/legal/beta',
  '/legal/child-safety',
] as const;

export const PUBLIC_VISITABLE_PATHS = ['/login', ...PUBLIC_INDEXABLE_PATHS] as const;

export function getSiteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : DEFAULT_SITE_URL);

  return raw.replace(/\/+$/, '');
}

export function absoluteUrl(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getSiteUrl()}${normalizedPath}`;
}
