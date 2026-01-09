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
  debug?: boolean;
};

const toNullableText = (value: string | null | undefined) => {
  const trimmed = value?.toString().trim() ?? '';
  return trimmed ? trimmed : null;
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

  const queryDebug = req.nextUrl.searchParams.get('debug');
  const debugFromQuery = queryDebug === '1' || queryDebug === 'true';

  let payload: ClickPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonError('Invalid payload', 400);
  }

  const debugFromBody = payload?.debug === true;
  const debugEnabled = debugFromQuery || debugFromBody;
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

  let profile: {
    country: string | null;
    region: string | null;
    province: string | null;
    city: string | null;
    sport: string | null;
    interest_province: string | null;
    account_type: string | null;
    type: string | null;
  } | null = null;
  if (user?.id) {
    const { data } = await admin
      .from('profiles')
      .select('country, region, province, city, sport, interest_province, account_type, type')
      .eq('user_id', user.id)
      .maybeSingle();
    profile = data ?? null;
  }

  const viewerAudience =
    toNullableText(profile?.account_type) ?? toNullableText(profile?.type) ?? 'all';

  const eventPayload = {
    campaign_id: campaignId,
    creative_id: creativeId,
    event_type: 'click',
    slot: slot || null,
    page: page || null,
    viewer_country: toNullableText(profile?.country),
    viewer_region: toNullableText(profile?.region),
    viewer_province: toNullableText(profile?.province) ?? toNullableText(profile?.interest_province),
    viewer_city: toNullableText(profile?.city),
    viewer_sport: toNullableText(profile?.sport),
    viewer_audience: viewerAudience,
    viewer_user_id: user?.id ?? null,
    user_id: user?.id ?? null,
    device,
  };

  await admin.from('ad_events').insert(eventPayload);

  return NextResponse.json({
    ok: true,
    debug: debugEnabled
      ? {
          eventPayload: {
            ...eventPayload,
            viewer_user_id: user?.id ? 'set' : null,
            user_id: user?.id ? 'set' : null,
          },
        }
      : undefined,
  });
};
