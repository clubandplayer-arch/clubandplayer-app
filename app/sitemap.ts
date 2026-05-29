// app/sitemap.ts
import type { MetadataRoute } from 'next';

import { absoluteUrl, PUBLIC_INDEXABLE_PATHS } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return PUBLIC_INDEXABLE_PATHS.map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: path === '/signup' ? 'weekly' : 'yearly',
    priority: path === '/signup' ? 1 : 0.2,
  }));
}
