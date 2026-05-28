import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/clubs', '/players', '/opportunities', '/legal'],
        disallow: ['/api/', '/admin/', '/settings', '/login', '/signup', '/onboarding', '/my/', '/messages', '/alerts', '/post', '/reports', '/debug'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
