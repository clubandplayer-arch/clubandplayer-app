// lib/api/admin.ts
import type { CookieOptions } from '@supabase/ssr';

type MaybeUser = { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null | undefined;

function parseList(env?: string | null) {
  return (env ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Ritorna true se l'utente è admin secondo una delle regole:
 * - EMAIL in ADMIN_EMAILS (lista CSV)
 * - USER ID in ADMIN_USER_IDS (lista CSV)
 * - user_metadata.role === 'admin'
 * - profiles.is_admin === true (se la colonna esiste)
 */
export async function isAdminUser(supabase: any, user: MaybeUser): Promise<boolean> {
  if (!user?.id) return false;

  const emails = parseList(process.env.ADMIN_EMAILS);
  const ids = parseList(process.env.ADMIN_USER_IDS);

  const email = (user.email ?? '').toLowerCase();
  if (email && emails.includes(email)) return true;
  if (ids.includes(user.id)) return true;

  const metaRole = String(user.user_metadata?.role ?? '').toLowerCase();
  if (metaRole === 'admin') return true;

  // Fallback DB: profiles.is_admin (se esiste)
  try {
    const { data } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data && (data as any).is_admin === true) return true;
  } catch {
    // la colonna potrebbe non esistere: ignoriamo
  }

  return false;
}
