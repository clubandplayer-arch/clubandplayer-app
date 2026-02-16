// next.config.ts
import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

// Ricava l'host Supabase dall'env per consentire immagini dal bucket /storage/v1/**
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
let supaHost: string | null = null;
try {
  supaHost = new URL(SUPABASE_URL).hostname;
} catch {
  supaHost = null;
}

const ONE_YEAR = 60 * 60 * 24 * 365;
const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Lint gestito in CI; evita fail di build su Vercel
  eslint: { ignoreDuringBuilds: true },

  // ✅ Usa domains per compatibilità + remotePatterns per bucket Supabase Storage
  images: {
    // ✅ necessario per consentire a Next Image optimizer di ottimizzare URL first-party:
    // https://www.clubandplayer.com/storage/...
    domains: [
      'api.dicebear.com',
      'via.placeholder.com',
      'www.clubandplayer.com',
      ...(supaHost ? [supaHost] : []),
    ],
    remotePatterns: [
      // ✅ first-party storage (rewrite Vercel -> Supabase)
      {
        protocol: 'https' as const,
        hostname: 'www.clubandplayer.com',
        pathname: '/storage/**',
      },

      // ✅ Supabase public storage (già usato nel resto dell'app)
      ...(supaHost
        ? [
            {
              protocol: 'https' as const,
              hostname: supaHost,
              pathname: '/storage/v1/object/public/**',
            },
          ]
        : []),

      {
        protocol: 'https' as const,
        hostname: 'flagcdn.com',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: ONE_YEAR,
    deviceSizes: [320, 420, 640, 768, 1024, 1280, 1536],
    imageSizes: [16, 24, 32, 48, 64, 96],
  },

  async headers() {
    return [
      {
        source: '/_next/image(.*)',
        headers: [{ key: 'Cache-Control', value: `public, max-age=${ONE_YEAR}, immutable` }],
      },
      {
        source: '/_next/static/(.*)',
        headers: [{ key: 'Cache-Control', value: `public, max-age=${ONE_YEAR}, immutable` }],
      },
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|webp|avif)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, immutable' }],
      },
    ];
  },

  experimental: {},
};

export default withSentryConfig(nextConfig, {
  silent: true,
  widenClientFileUpload: true,
});
