import type { SupabaseClient } from '@supabase/supabase-js';

export async function getActiveProfile(
  supabase: SupabaseClient<any, "public", any>,
  userId: string
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, status')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id || data.status !== 'active') return null;
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
