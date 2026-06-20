import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';
import { getInstitutionContext, institutionOnlyError } from '../utils';

export const runtime = 'nodejs';

export const GET = withAuth(async (req: NextRequest, { supabase, user }) => {
  try { await rateLimit(req, { key: `institution-verification:status:${user.id}`, limit: 60, window: '1m' } as any); } catch { return jsonError('Too Many Requests', 429); }
  const ctx = await getInstitutionContext(supabase, user.id).catch((error) => { throw error; });
  if (!ctx) return institutionOnlyError();
  const { data: profile, error: profileError } = await supabase.from('profiles').select('id,full_name,display_name').eq('id', ctx.profileId).maybeSingle();
  if (profileError) return jsonError(profileError.message, 400);
  const { data: request, error } = await supabase.from('institution_verification_requests').select('*').eq('institution_id', ctx.profileId).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ ok: true, profile, request: request ?? null });
});
