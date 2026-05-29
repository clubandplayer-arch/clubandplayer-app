// app/robots.ts
import type { MetadataRoute } from 'next';

import { getSiteUrl, PUBLIC_VISITABLE_PATHS } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: [...PUBLIC_VISITABLE_PATHS, '/_next/', '/icons/', '/favicon.ico', '/manifest.webmanifest'],
        disallow: '/',
      },
    ],
    sitemap: [`${base}/sitemap.xml`],
    host: base,
  };
}
