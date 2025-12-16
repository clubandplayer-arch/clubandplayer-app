import type { SupabaseClient } from '@supabase/supabase-js';

export type ActiveProfile = {
  id: string;
  user_id: string | null;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
  country: string | null;
  account_type?: string | null;
  profile_type?: string | null;
  type?: string | null;
  status?: string | null;
};

export async function getActiveProfile(
  supabase: SupabaseClient<any, "public", any>,
  userId: string
): Promise<ActiveProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, user_id, status, display_name, full_name, avatar_url, city, province, region, country, account_type, profile_type, type'
    )
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id || data.status !== 'active') return null;
  return data as ActiveProfile;
}

export async function getProfileById(
  supabase: SupabaseClient<any, "public", any>,
  profileId: string
): Promise<{ id: string; display_name: string | null; account_type: string | null; avatar_url: string | null } | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, account_type, avatar_url, status')
    .eq('id', profileId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id || data.status !== 'active') return null;
  return data;
}
