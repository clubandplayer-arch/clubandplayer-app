import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';
import { ensureSingleProfileRowForUser } from '@/lib/server/profileIntegrity';

export const runtime = 'nodejs';

const ACCOUNT_TYPES = new Set(['institution', 'club', 'athlete', 'staff', 'fan']);

/**
 * Role choice is intentionally a narrow onboarding write. Geography belongs to
 * the later, role-specific profile flow and must never be inferred here.
 */
export const PATCH = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: `onboarding:ROLE:${user.id}`, limit: 10, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const accountType = String(body.account_type ?? '').trim().toLowerCase();
  if (!ACCOUNT_TYPES.has(accountType) || Object.keys(body).some((key) => key !== 'account_type')) {
    return jsonError('Invalid account type', 400);
  }

  await ensureSingleProfileRowForUser(supabase, user.id, {
    displayNameHint: user.user_metadata?.full_name || user.email || null,
    emailHint: user.email,
  });

  const { data, error } = await supabase
    .from('profiles')
    .update({ account_type: accountType })
    .eq('user_id', user.id)
    .select('account_type')
    .maybeSingle();

  if (error) return jsonError(error.message, 400);
  if (!data) return jsonError('Profile not found', 404);
  return NextResponse.json({ data });
});
