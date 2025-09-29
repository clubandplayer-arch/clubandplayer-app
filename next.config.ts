// next.config.ts
import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // niente experimental.instrumentationHook qui: Next 15 lo rileva automaticamente
};

export default withSentryConfig(nextConfig, {
  silent: true,
  widenClientFileUpload: true,
});
