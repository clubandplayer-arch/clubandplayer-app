// lib/auth/role.ts
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

export type UserRole = 'athlete' | 'club' | null;

// Deriva il tipo del client dal factory, così evitiamo mismatch tra generics
type SupaClient = Awaited<ReturnType<typeof getSupabaseServerClient>>;

type GetUserAndRole = Promise<{
  user: User | null;
  role: UserRole;
  supabase: SupaClient;
}>;

export async function getUserAndRole(): GetUserAndRole {
  const supabase = await getSupabaseServerClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;
  if (!user) {
    return { user: null, role: null, supabase };
  }

  // Leggi il profilo per determinare il ruolo
  const { data: prof } = await supabase
    .from('profiles')
    .select('type')
    .eq('user_id', user.id)
    .maybeSingle();

  const role = prof?.type
    ? (String(prof.type).toLowerCase() as UserRole)
    : null;

  return { user, role, supabase };
}
