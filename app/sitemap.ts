// app/sitemap.ts
import type { MetadataRoute } from 'next';

function baseUrl() {
  // Preferisci NEXT_PUBLIC_SITE_URL, altrimenti deriva da VERCEL_URL, fallback al dominio live.
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://clubandplayer.app');
  return raw.replace(/\/+$/, '');
}

export default function sitemap(): MetadataRoute.Sitemap {
  const site = baseUrl();
  const now = new Date();

  // NB: /clubs è stato rimosso dal sitemap
  return [
    { url: `${site}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${site}/feed`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${site}/opportunities`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },

    // account / auth
    { url: `${site}/login`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${site}/signup`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${site}/profile`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${site}/my/applications`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },

    // legal
    { url: `${site}/legal/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${site}/legal/terms`,   lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
