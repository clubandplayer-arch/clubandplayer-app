// lib/env/features.ts
import { DEFAULT_ADMIN_EMAILS } from '@/lib/constants/admin';

function boolFromEnv(value: string | undefined | null, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const normalized = value.toString().trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

function listFromEnv(value: string | undefined | null) {
  return (value ?? '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

export function isClubsReadOnly() {
  return boolFromEnv(process.env.NEXT_PUBLIC_FEATURE_CLUBS_READONLY, true);
}

export function isClubsAdminEnabled() {
  return boolFromEnv(process.env.NEXT_PUBLIC_FEATURE_CLUBS_ADMIN, false);
}

export function clubsAdminAllowlist() {
  const server = [...DEFAULT_ADMIN_EMAILS, ...listFromEnv(process.env.CLUBS_ADMIN_EMAILS)];
  const client = listFromEnv(process.env.NEXT_PUBLIC_CLUBS_ADMIN_EMAILS);
  return Array.from(new Set([...server, ...client]));
}

export function clubsAdminServerAllowlist() {
  return Array.from(new Set([...DEFAULT_ADMIN_EMAILS, ...listFromEnv(process.env.CLUBS_ADMIN_EMAILS)]));
}

export function isAdsEnabled() {
  return boolFromEnv(process.env.NEXT_PUBLIC_ADS_ENABLED, false);
}

export function isAdsEnabledServer() {
  return boolFromEnv(process.env.ADS_ENABLED ?? process.env.NEXT_PUBLIC_ADS_ENABLED, false);
}

/** B4.4 UI is opt-in and remains disabled until the Supabase runtime gate is cleared. */
export function isCanonicalProfileResidenceUiEnabled() {
  return boolFromEnv(process.env.NEXT_PUBLIC_CANONICAL_PROFILE_RESIDENCE_UI_ENABLED, false);
}

/** Server-side kill switch: no canonical residence RPC can run unless explicitly enabled. */
export function isCanonicalProfileResidenceWriteEnabled() {
  return boolFromEnv(process.env.CANONICAL_PROFILE_RESIDENCE_WRITE_ENABLED, false);
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Temporary B4.4 canary allowlist. Empty or malformed configuration fails closed. */
export function isCanonicalProfileResidenceWriteUserAllowed(userId: string | null | undefined) {
  const normalizedUserId = userId?.trim().toLowerCase() ?? '';
  if (!UUID_PATTERN.test(normalizedUserId)) return false;

  return listFromEnv(process.env.CANONICAL_PROFILE_RESIDENCE_WRITE_USER_IDS)
    .filter((value) => UUID_PATTERN.test(value))
    .includes(normalizedUserId);
}
