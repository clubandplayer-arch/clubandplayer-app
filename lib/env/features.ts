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
