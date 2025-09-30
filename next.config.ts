// next.config.ts
import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Evita che Vercel fallisca il build per regole ESLint (il lint lo gestiamo in locale/CI)
  eslint: { ignoreDuringBuilds: true },

  // Next 15 rileva automaticamente l’instrumentation di Sentry.
  // Non usare experimental.instrumentationHook.
};

export default withSentryConfig(nextConfig, {
  silent: true,
  widenClientFileUpload: true,
});
