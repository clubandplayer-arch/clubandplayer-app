import { NextResponse, type NextRequest } from 'next/server';
import { jsonError } from '@/lib/api/auth';
import { isAdsEnabledServer } from '@/lib/env/features';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type ClickPayload = {
  creativeId?: string;
  campaignId?: string;
  slot?: string;
  page?: string;
};

const detectDevice = (userAgent: string | null) => {
  const ua = (userAgent ?? '').toLowerCase();
  if (!ua) return 'desktop';
  if (/mobile|iphone|ipod|android/.test(ua)) return 'mobile';
  if (/ipad|tablet/.test(ua)) return 'tablet';
  return 'desktop';
};

export const POST = async (req: NextRequest) => {
  if (!isAdsEnabledServer()) {
    return NextResponse.json({ ok: true });
  }

  let payload: ClickPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonError('Invalid payload', 400);
  }

  const creativeId = typeof payload?.creativeId === 'string' ? payload.creativeId.trim() : '';
  const campaignId = typeof payload?.campaignId === 'string' ? payload.campaignId.trim() : '';
  const slot = typeof payload?.slot === 'string' ? payload.slot.trim() : '';
  const page = typeof payload?.page === 'string' ? payload.page.trim() : '';

  if (!creativeId || !campaignId) {
    return jsonError('Missing creativeId or campaignId', 400);
  }

  const admin = getSupabaseAdminClientOrNull();
  if (!admin) {
    return NextResponse.json({ ok: true });
  }

  const supabase = await getSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user ?? null;
  const device = detectDevice(req.headers.get('user-agent'));

  await admin.from('ad_events').insert({
    campaign_id: campaignId,
    creative_id: creativeId,
    event_type: 'click',
    slot: slot || null,
    page: page || null,
    user_id: user?.id ?? null,
    device,
  });

  return NextResponse.json({ ok: true });
};
