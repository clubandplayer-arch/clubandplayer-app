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

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Lint gestito in CI; evita fail di build su Vercel
  eslint: { ignoreDuringBuilds: true },

  // ✅ Usa domains (più compatibile) invece di remotePatterns
  images: {
    domains: [
      'api.dicebear.com',
      ...(supaHost ? [supaHost] : []),
    ],
  },

  experimental: {},
};

export default withSentryConfig(nextConfig, {
  silent: true,
  widenClientFileUpload: true,
});
