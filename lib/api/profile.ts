import type { SupabaseClient } from '@supabase/supabase-js';

type ProfileRow = {
  id: string;
  user_id?: string | null;
  display_name?: string | null;
  full_name?: string | null;
  account_type?: string | null;
  avatar_url?: string | null;
  status?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

export async function getProfileByUserId(
  supabase: SupabaseClient<any, "public", any>,
  userId: string,
  options?: { activeOnly?: boolean }
): Promise<ProfileRow | null> {
  const activeOnly = options?.activeOnly !== false;
  let query = supabase
    .from('profiles')
    .select('id, user_id, display_name, full_name, account_type, avatar_url, status, updated_at, created_at')
    .eq('user_id', userId);

  if (activeOnly) {
    query = query.eq('status', 'active');
  }

  const { data, error } = await query
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) return null;
  return data as ProfileRow;
}

export async function getActiveProfile(
  supabase: SupabaseClient<any, "public", any>,
  userId: string
): Promise<{ id: string } | null> {
  const data = await getProfileByUserId(supabase, userId, { activeOnly: true });
  if (!data?.id) return null;
  return { id: data.id };
}

export async function getProfileById(
  supabase: SupabaseClient<any, "public", any>,
  profileId: string
): Promise<{ id: string; display_name: string | null; full_name: string | null; account_type: string | null; avatar_url: string | null } | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, full_name, account_type, avatar_url, status')
    .eq('id', profileId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id || data.status !== 'active') return null;
  return data;
}
