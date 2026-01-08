import { NextResponse, type NextRequest } from 'next/server';
import { jsonError } from '@/lib/api/auth';
import { isAdsEnabledServer } from '@/lib/env/features';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type ServePayload = {
  slot?: string;
  page?: string;
};

type AdTarget = {
  country: string | null;
  region: string | null;
  city: string | null;
  sport: string | null;
  audience: string | null;
  device: string | null;
};

type AdCampaign = {
  id: string;
  status: string;
  priority: number | null;
  start_at: string | null;
  end_at: string | null;
  ad_targets?: AdTarget[] | null;
};

type AdCreativeRow = {
  id: string;
  campaign_id: string;
  slot: string;
  title: string | null;
  body: string | null;
  image_url: string | null;
  target_url: string | null;
  is_active: boolean | null;
  ad_campaigns?: AdCampaign | null;
};

const normalize = (value: string | null | undefined) => value?.toString().trim().toLowerCase() ?? '';

const matchesTarget = (target: AdTarget, context: Record<string, string>) => {
  const checks: Array<[keyof AdTarget, string]> = [
    ['country', context.country],
    ['region', context.region],
    ['city', context.city],
    ['sport', context.sport],
    ['audience', context.audience],
    ['device', context.device],
  ];

  return checks.every(([field, value]) => {
    const targetValue = normalize(target[field]);
    if (!targetValue) return true;
    return targetValue === normalize(value);
  });
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
    return NextResponse.json({ creative: null });
  }

  let payload: ServePayload;
  try {
    payload = await req.json();
  } catch {
    return jsonError('Invalid payload', 400);
  }

  const slot = typeof payload?.slot === 'string' ? payload.slot.trim() : '';
  const page = typeof payload?.page === 'string' ? payload.page.trim() : '';

  if (!slot || !page) {
    return jsonError('Missing slot or page', 400);
  }

  const admin = getSupabaseAdminClientOrNull();
  if (!admin) {
    return NextResponse.json({ creative: null });
  }

  const supabase = await getSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user ?? null;

  let profile: { country: string | null; region: string | null; city: string | null; sport: string | null } | null = null;
  if (user?.id) {
    const { data } = await admin
      .from('profiles')
      .select('country, region, city, sport')
      .eq('user_id', user.id)
      .maybeSingle();
    profile = data ?? null;
  }

  const device = detectDevice(req.headers.get('user-agent'));
  const context = {
    country: normalize(profile?.country),
    region: normalize(profile?.region),
    city: normalize(profile?.city),
    sport: normalize(profile?.sport),
    audience: '',
    device: normalize(device),
  };

  const { data: creatives, error } = await admin
    .from('ad_creatives')
    .select(
      `
      id,
      campaign_id,
      slot,
      title,
      body,
      image_url,
      target_url,
      is_active,
      ad_campaigns (
        id,
        status,
        priority,
        start_at,
        end_at,
        ad_targets (
          country,
          region,
          city,
          sport,
          audience,
          device
        )
      )
    `,
    )
    .eq('slot', slot)
    .eq('is_active', true);

  if (error) {
    return jsonError('Ads unavailable', 500);
  }

  const now = Date.now();
  const eligible = (creatives ?? [])
    .map((creative) => {
      const campaign = creative.ad_campaigns;
      if (!campaign) return null;
      if (campaign.status !== 'active') return null;

      const startAt = campaign.start_at ? new Date(campaign.start_at).getTime() : null;
      const endAt = campaign.end_at ? new Date(campaign.end_at).getTime() : null;
      if (startAt && startAt > now) return null;
      if (endAt && endAt < now) return null;

      const targets = campaign.ad_targets ?? [];
      if (targets.length) {
        const matches = targets.some((target) => matchesTarget(target, context));
        if (!matches) return null;
      }

      return {
        creative,
        priority: Number.isFinite(campaign.priority) ? (campaign.priority as number) : 0,
      };
    })
    .filter(Boolean) as Array<{ creative: AdCreativeRow; priority: number }>;

  if (!eligible.length) {
    return NextResponse.json({ creative: null });
  }

  const maxPriority = Math.max(...eligible.map((item) => item.priority));
  const top = eligible.filter((item) => item.priority === maxPriority);
  const selected = top[Math.floor(Math.random() * top.length)]?.creative ?? null;

  if (!selected?.target_url) {
    return NextResponse.json({ creative: null });
  }

  await admin.from('ad_events').insert({
    campaign_id: selected.campaign_id,
    creative_id: selected.id,
    event_type: 'impression',
    slot,
    page,
    user_id: user?.id ?? null,
    country: profile?.country ?? null,
    region: profile?.region ?? null,
    city: profile?.city ?? null,
    device,
  });

  return NextResponse.json({
    creative: {
      id: selected.id,
      campaignId: selected.campaign_id,
      slot: selected.slot,
      title: selected.title,
      body: selected.body,
      imageUrl: selected.image_url,
      targetUrl: selected.target_url,
    },
  });
};
