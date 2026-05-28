export const SITE_NAME = 'Club & Player';
export const SITE_DESCRIPTION =
  'Social network sportivo per Player, Club, Fan e Staff: profili pubblici, opportunità e networking.';

export function getBaseUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://www.clubandplayer.com');
  return raw.replace(/\/+$/, '');
}

export function absoluteUrl(path = '/') {
  const base = getBaseUrl();
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
}

export const DEFAULT_OG_IMAGE = '/og.jpg';
