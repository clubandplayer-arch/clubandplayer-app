import { jsonError } from '@/lib/api/auth';

export type InstitutionContext = { profileId: string; userId: string };

export async function getInstitutionContext(supabase: any, userId: string): Promise<InstitutionContext | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,user_id,account_type,type')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  const accountType = String(data?.account_type ?? data?.type ?? '').toLowerCase();
  if (!data?.id || accountType !== 'institution') return null;
  return { profileId: data.id, userId };
}

export function institutionOnlyError() {
  return jsonError('Operazione disponibile solo per il ruolo Ente Istituzionale', 403);
}
