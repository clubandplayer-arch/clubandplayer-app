// next.config.ts
import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Evita che Vercel fallisca il build per regole ESLint (il lint lo teniamo in locale/CI separato)
  eslint: { ignoreDuringBuilds: true },

  // NIENTE experimental.instrumentationHook: in Next 15 è auto-rilevato.
};

export default withSentryConfig(nextConfig, {
  silent: true,
  widenClientFileUpload: true,
});
