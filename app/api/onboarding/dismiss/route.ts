import { NextResponse, type NextRequest } from 'next/server';

import { jsonError, withAuth } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, { key: `onboarding:dismiss:${user.id}`, limit: 10, window: '1m' } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('onboarding_dismiss_count')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return jsonError(error.message, 400);

  const current = Number(profile?.onboarding_dismiss_count) || 0;
  const next = Math.min(3, current + 1);

  const { data: updated, error: upsertError } = await supabase
    .from('profiles')
    .upsert(
      {
        user_id: user.id,
        onboarding_dismiss_count: next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    .select('onboarding_dismiss_count')
    .maybeSingle();

  if (upsertError) return jsonError(upsertError.message, 400);

  return NextResponse.json({ ok: true, onboardingDismissCount: updated?.onboarding_dismiss_count ?? next });
});
