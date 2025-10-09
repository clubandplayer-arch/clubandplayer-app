// app/sitemap.ts
import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') ||
    'https://clubandplayer.app';

  // NB: /clubs rimosso (legacy)
  return [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/feed`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/opportunities`, changeFrequency: 'hourly', priority: 1 },
    { url: `${base}/opportunities/new`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/profile`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/login`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/signup`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/legal/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/legal/terms`, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
