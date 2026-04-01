// lib/auth/role.ts
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

export type UserRole = 'athlete' | 'club' | 'fan' | null;

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
    .select('account_type,type')
    .eq('user_id', user.id)
    .maybeSingle();

  const rawRole = String((prof as any)?.account_type ?? (prof as any)?.type ?? '').toLowerCase();
  const role: UserRole = rawRole === 'club' || rawRole === 'athlete' || rawRole === 'fan' ? rawRole : null;

  return { user, role, supabase };
}
