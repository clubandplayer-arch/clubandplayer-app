import { jsonError } from '@/lib/api/auth';

export type ClubContext = {
  clubId: string;
  profileId: string;
};

export async function getClubContext(supabase: any, userId: string): Promise<ClubContext | null> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, account_type, type, status')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile?.id) return null;

  const accountType = String((profile as any).account_type ?? (profile as any).type ?? '').toLowerCase();
  const status = String((profile as any).status ?? '').toLowerCase();

  if (accountType !== 'club') return null;
  if (status && status !== 'active') return null;

  const clubId = String(profile.id);

  return { clubId, profileId: String(profile.id) };
}

export function clubOnlyError() {
  return jsonError('Solo i club possono accedere', 403);
}
