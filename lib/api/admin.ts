// lib/api/admin.ts
import { isPlatformAdminEmail } from '@/lib/constants/admin';
import { clubsAdminServerAllowlist, isClubsAdminEnabled } from '@/lib/env/features';

type MaybeUser =
  | { id: string; email?: string | null; user_metadata?: Record<string, unknown> }
  | null
  | undefined;

export function isUserInClubsAdminAllowlist(user: MaybeUser) {
  const email = (user?.email ?? '').toLowerCase();
  if (!email) return false;
  return clubsAdminServerAllowlist().includes(email);
}

/**
 * true solo per il Platform Admin riservato a clubandplayer@gmail.com.
 * Non usa fallback DB o metadata per evitare che altre email ottengano questo ruolo.
 */
export async function isAdminUser(_supabase: any, user: MaybeUser): Promise<boolean> {
  if (!user?.id) return false;
  return isPlatformAdminEmail(user.email);
}

/**
 * Regola di admin specifica per i CRUD clubs: richiede il flag UI + allowlist server.
 * Se l'allowlist è vuota, cade sul ruolo admin "generico" per evitare lockout involontari.
 */
export async function isClubsAdminUser(supabase: any, user: MaybeUser): Promise<boolean> {
  if (!isClubsAdminEnabled()) return false;

  if (isUserInClubsAdminAllowlist(user)) return true;

  // fallback: se allowlist vuota, accetta gli admin generici
  if (clubsAdminServerAllowlist().length === 0) {
    return isAdminUser(supabase, user);
  }

  return false;
}
