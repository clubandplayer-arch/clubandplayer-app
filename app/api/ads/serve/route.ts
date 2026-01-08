import { NextResponse, type NextRequest } from 'next/server';
import { jsonError } from '@/lib/api/auth';
import { isAdsEnabled, isAdsEnabledServer } from '@/lib/env/features';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type ServePayload = {
  slot?: string;
  page?: string;
  debug?: boolean;
  excludeCreativeIds?: string[];
};

type AdTargetRow = {
  country: string | null;
  region: string | null;
  province: string | null;
  city: string | null;
  sport: string | null;
  audience: string | null;
  device: string | null;
};

type AdTargetWithCampaignId = AdTargetRow & {
  campaign_id: string;
};

type CreativeWithCampaign = {
  id: string;
  campaign_id: string;
  slot: string;
  title: string | null;
  body: string | null;
  image_url: string | null;
  target_url: string | null;
  is_active: boolean | null;
};

const normalize = (value: string | null | undefined) => value?.toString().trim().toLowerCase() ?? '';

const isWildcard = (value: string | null | undefined) => {
  const normalized = normalize(value);
  return normalized === '' || normalized === 'all';
};

const matchesTarget = (target: AdTargetRow, context: Record<string, string>) => {
  const checks: Array<[keyof AdTargetRow, string]> = [
    ['country', context.country],
    ['region', context.region],
    ['province', context.province],
    ['city', context.city],
    ['sport', context.sport],
    ['audience', context.audience],
    ['device', context.device],
  ];

  return checks.every(([field, value]) => {
    if (isWildcard(target[field])) return true;
    const normalizedValue = normalize(value);
    if (!normalizedValue) return true;
    return normalize(target[field]) === normalizedValue;
  });
};

const detectDevice = (userAgent: string | null) => {
  const ua = (userAgent ?? '').toLowerCase();
  if (!ua) return 'desktop';
  if (/mobile|iphone|ipod|android/.test(ua)) return 'mobile';
  if (/ipad|tablet/.test(ua)) return 'tablet';
  return 'desktop';
};

const targetValueOrNull = (targets: AdTargetRow[], field: keyof AdTargetRow) => {
  const value = targets.find((target) => normalize(target[field]) !== '')?.[field] ?? null;
  return value ? value.toString() : null;
};

const supabaseUrlHost = (url: string | undefined | null) => {
  if (!url) return '';
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
};

export const POST = async (req: NextRequest) => {
  const endpointVersion = 'ads-serve@2026-01-08a';
  const queryDebug = req.nextUrl.searchParams.get('debug');
  const debugFromQuery = queryDebug === '1' || queryDebug === 'true';
  const adsEnabled = isAdsEnabledServer();
  const clientAdsEnabled = isAdsEnabled();
  const serviceRoleConfigured = Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY,
  );
  const publicUrlHost = supabaseUrlHost(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const adminUrlHost = supabaseUrlHost(process.env.SUPABASE_URL);

  let payload: ServePayload;
  try {
    payload = await req.json();
  } catch {
    return jsonError('Invalid payload', 400);
  }

  const debugFromBody = payload?.debug === true;
  const debugEnabled = debugFromQuery || debugFromBody;
  const slot = typeof payload?.slot === 'string' ? payload.slot.trim().toLowerCase() : '';
  const page = typeof payload?.page === 'string' ? payload.page.trim() : '';
  const excludeCreativeIds = Array.isArray(payload?.excludeCreativeIds)
    ? payload.excludeCreativeIds.filter((id) => typeof id === 'string' && id.trim().length > 0)
    : [];
  const excludeCreativeIdsSet = new Set(excludeCreativeIds);
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  if (!slot || !page) {
    return jsonError('Missing slot or page', 400);
  }

  if (!adsEnabled) {
    return NextResponse.json({
      creative: null,
      ok: false,
      debug: debugEnabled
        ? {
            endpointVersion,
            flags: {
              ADS_ENABLED: adsEnabled,
              NEXT_PUBLIC_ADS_ENABLED: clientAdsEnabled,
            },
            serviceRoleConfigured,
            usingAdminClient: false,
            publicUrlHost,
            adminUrlHost,
            derivedContext: {
              country: '',
              region: '',
              province: '',
              city: '',
              sport: '',
              audience: '',
              device: '',
              page,
              slot,
            },
            nowMs,
            nowIso,
            counts: {
              campaignsActiveCount: 0,
              campaignsAfterDateFilterCount: 0,
              targetsCountForActiveCampaigns: 0,
              creativesCountForSlot: 0,
              creativesJoinedWithCampaignCount: 0,
              eligibleCount: 0,
            },
            firstRejectReason: 'ads_disabled',
            rejectedSamples: [],
          }
        : undefined,
    });
  }

  const admin = getSupabaseAdminClientOrNull();
  if (!admin) {
    return NextResponse.json({
      ok: false,
      code: 'CONFIG_MISSING_SERVICE_ROLE',
      message: 'SUPABASE_SERVICE_ROLE_KEY is missing or invalid for ads serving.',
      creative: null,
      debug: debugEnabled
        ? {
            endpointVersion,
            flags: {
              ADS_ENABLED: adsEnabled,
              NEXT_PUBLIC_ADS_ENABLED: clientAdsEnabled,
            },
            serviceRoleConfigured,
            usingAdminClient: false,
            publicUrlHost,
            adminUrlHost,
            derivedContext: {
              country: '',
              region: '',
              province: '',
              city: '',
              sport: '',
              audience: '',
              device: '',
              page,
              slot,
            },
            nowMs,
            nowIso,
            counts: {
              campaignsActiveCount: 0,
              campaignsAfterDateFilterCount: 0,
              targetsCountForActiveCampaigns: 0,
              creativesCountForSlot: 0,
              creativesJoinedWithCampaignCount: 0,
              eligibleCount: 0,
            },
            firstRejectReason: 'supabase_admin_unavailable',
            rejectedSamples: [],
          }
        : undefined,
    });
  }

  const supabase = await getSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user ?? null;

  let profile: {
    country: string | null;
    region: string | null;
    province: string | null;
    city: string | null;
    sport: string | null;
    interest_province: string | null;
  } | null = null;
  if (user?.id) {
    const { data } = await admin
      .from('profiles')
      .select('country, region, province, city, sport, interest_province')
      .eq('user_id', user.id)
      .maybeSingle();
    profile = data ?? null;
  }

  const province = normalize(profile?.province) || normalize(profile?.interest_province);
  const device = detectDevice(req.headers.get('user-agent'));
  const context = {
    country: normalize(profile?.country),
    region: normalize(profile?.region),
    province,
    city: normalize(profile?.city),
    sport: normalize(profile?.sport),
    audience: '',
    device: normalize(device),
  };

  const flags = {
    ADS_ENABLED: adsEnabled,
    NEXT_PUBLIC_ADS_ENABLED: clientAdsEnabled,
  };

  const { data: campaignsActive, error: campaignsActiveError } = await admin
    .from('ad_campaigns')
    .select('id,status,priority,start_at,end_at,created_at')
    .eq('status', 'active');

  const { count: campaignsActiveCount } = await admin
    .from('ad_campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');

  const { count: probeCampaignsTotal, error: probeCampaignsErr } = await admin
    .from('ad_campaigns')
    .select('id', { count: 'exact', head: true });
  const { count: probeCreativesTotal, error: probeCreativesErr } = await admin
    .from('ad_creatives')
    .select('id', { count: 'exact', head: true });
  const { count: probeTargetsTotal, error: probeTargetsErr } = await admin
    .from('ad_targets')
    .select('id', { count: 'exact', head: true });

  const probeErrors = {
    campaignsErr: probeCampaignsErr ? `${probeCampaignsErr.message} (${probeCampaignsErr.code ?? 'unknown'})` : null,
    creativesErr: probeCreativesErr ? `${probeCreativesErr.message} (${probeCreativesErr.code ?? 'unknown'})` : null,
    targetsErr: probeTargetsErr ? `${probeTargetsErr.message} (${probeTargetsErr.code ?? 'unknown'})` : null,
  };

  if (campaignsActiveError || probeCampaignsErr || probeCreativesErr || probeTargetsErr) {
    return NextResponse.json({
      ok: false,
      code: 'DB_ERROR',
      message: 'Errore durante le probe query delle tabelle ads.',
      creative: null,
      debug: debugEnabled
        ? {
            endpointVersion,
            flags,
            serviceRoleConfigured,
            usingAdminClient: true,
            publicUrlHost,
            adminUrlHost,
            derivedContext: {
              ...context,
              page,
              slot,
            },
            nowMs,
            nowIso,
            counts: {
              campaignsActiveCount: campaignsActiveCount ?? 0,
              campaignsAfterDateFilterCount: 0,
              targetsCountForActiveCampaigns: 0,
              creativesCountForSlot: 0,
              creativesJoinedWithCampaignCount: 0,
              eligibleCount: 0,
            },
            probe: {
              campaignsTotal: probeCampaignsTotal ?? 0,
              creativesTotal: probeCreativesTotal ?? 0,
              targetsTotal: probeTargetsTotal ?? 0,
            },
            probeErrors: {
              ...probeErrors,
              campaignsActiveErr: campaignsActiveError
                ? `${campaignsActiveError.message} (${campaignsActiveError.code ?? 'unknown'})`
                : null,
            },
            firstRejectReason: 'probe_query_error',
            rejectedSamples: [],
          }
        : undefined,
    });
  }

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
      is_active
    `,
    )
    .eq('slot', slot)
    .eq('is_active', true);

  if (error) {
    return jsonError('Ads unavailable', 500);
  }

  const evalDate = (campaign: { start_at: string | null; end_at: string | null }, referenceMs: number) => {
    const toMs = (value: string | null | undefined) => {
      if (!value) return null;
      const t = new Date(value).getTime();
      return Number.isFinite(t) ? t : null;
    };
    const startMs = toMs(campaign.start_at);
    const endMs = toMs(campaign.end_at);
    const startOk = startMs === null || startMs <= referenceMs;
    const endOk = endMs === null || endMs >= referenceMs;
    const dateOk = startOk && endOk;
    return { startMs, endMs, startOk, endOk, dateOk };
  };
  const campaignsAfterDate = (campaignsActive ?? []).filter((campaign) => evalDate(campaign, nowMs).dateOk);
  const campaignsById = new Map(campaignsAfterDate.map((campaign) => [campaign.id, campaign]));
  const creativeRows = (creatives ?? []) as CreativeWithCampaign[];
  const joined = creativeRows
    .map((creative) => ({
      creative,
      campaign: campaignsById.get(creative.campaign_id) ?? null,
    }))
    .filter((entry) => entry.campaign);
  const missingCampaignIdsSample = creativeRows
    .filter((creative) => !campaignsById.get(creative.campaign_id))
    .slice(0, 3)
    .map((creative) => creative.campaign_id);
  const targetsForActiveCampaigns: AdTargetRow[] = [];
  const campaignIds = campaignsAfterDate.map((campaign) => campaign.id);
  const { data: targetsData, error: targetsError } = campaignIds.length
    ? await admin
        .from('ad_targets')
        .select('campaign_id, country, region, province, city, sport, audience, device')
        .in('campaign_id', campaignIds)
    : { data: [], error: null };
  if (targetsError) {
    return jsonError('Ads unavailable', 500);
  }
  const targetsByCampaignId = new Map<string, AdTargetRow[]>();
  ((targetsData ?? []) as AdTargetWithCampaignId[]).forEach((target) => {
    const list = targetsByCampaignId.get(target.campaign_id) ?? [];
    list.push({
      country: target.country ?? null,
      region: target.region ?? null,
      province: target.province ?? null,
      city: target.city ?? null,
      sport: target.sport ?? null,
      audience: target.audience ?? null,
      device: target.device ?? null,
    });
    targetsByCampaignId.set(target.campaign_id, list);
  });
  targetsByCampaignId.forEach((targets) => {
    targetsForActiveCampaigns.push(...targets);
  });
  const rejectedSamples: Array<{
    campaign_id: string | null;
    reason: string;
    fields: Record<string, string | null>;
  }> = [];

  let firstRejectReason = '';

  const recordReject = (entry: { campaign_id: string | null; reason: string; fields: Record<string, string | null> }) => {
    if (!firstRejectReason) {
      firstRejectReason = entry.reason;
    }
    if (rejectedSamples.length < 3) {
      rejectedSamples.push(entry);
    }
  };

  const eligible = creativeRows.reduce<Array<{ creative: CreativeWithCampaign; priority: number }>>((acc, creative) => {
    const campaign = campaignsById.get(creative.campaign_id) ?? null;
    if (!campaign) {
      recordReject({
        campaign_id: creative.campaign_id,
        reason: 'missing_campaign_join',
        fields: { campaign_id: creative.campaign_id },
      });
      return acc;
    }
    if (campaign.status !== 'active') {
      recordReject({
        campaign_id: campaign.id,
        reason: 'campaign_inactive',
        fields: { status: campaign.status },
      });
      return acc;
    }

    const { startOk, endOk } = evalDate(campaign, nowMs);
    if (!startOk) {
      recordReject({
        campaign_id: campaign.id,
        reason: 'campaign_not_started',
        fields: { start_at: campaign.start_at },
      });
      return acc;
    }
    if (!endOk) {
      recordReject({
        campaign_id: campaign.id,
        reason: 'campaign_expired',
        fields: { end_at: campaign.end_at },
      });
      return acc;
    }
    const targets = targetsByCampaignId.get(campaign.id) ?? [];
    if (targets.length) {
      const matches = targets.some((target) => matchesTarget(target, context));
      if (!matches) {
        recordReject({
          campaign_id: campaign.id,
          reason: 'target_mismatch',
          fields: {
            country: targetValueOrNull(targets, 'country'),
            region: targetValueOrNull(targets, 'region'),
            province: targetValueOrNull(targets, 'province'),
            city: targetValueOrNull(targets, 'city'),
            sport: targetValueOrNull(targets, 'sport'),
            audience: targetValueOrNull(targets, 'audience'),
            device: targetValueOrNull(targets, 'device'),
          },
        });
        return acc;
      }
    }

    acc.push({
      creative,
      priority: Number.isFinite(campaign.priority) ? (campaign.priority as number) : 0,
    });
    return acc;
  }, []);
  const dateSample = (campaignsActive ?? []).slice(0, 3).map((campaign) => ({
    id: campaign.id,
    start_at: campaign.start_at,
    end_at: campaign.end_at,
    ...evalDate(campaign, nowMs),
  }));

  if (!eligible.length) {
    if (!firstRejectReason) {
      if (!creativeRows.length) {
        firstRejectReason = 'no_creatives_for_slot';
      } else {
        firstRejectReason = 'no_eligible_creatives';
      }
    }
    return NextResponse.json({
      creative: null,
      ok: false,
      debug: debugEnabled
        ? {
            endpointVersion,
            flags,
            serviceRoleConfigured,
            usingAdminClient: true,
            publicUrlHost,
            adminUrlHost,
            derivedContext: {
              ...context,
              page,
              slot,
            },
            nowMs,
            nowIso,
            counts: {
              campaignsActiveCount: campaignsActiveCount ?? 0,
              campaignsAfterDateFilterCount: campaignsAfterDate.length,
              targetsCountForActiveCampaigns: targetsForActiveCampaigns.length,
              creativesCountForSlot: creativeRows.length,
              creativesJoinedWithCampaignCount: joined.length,
              eligibleCount: eligible.length,
            },
            probe: {
              campaignsTotal: probeCampaignsTotal ?? 0,
              creativesTotal: probeCreativesTotal ?? 0,
              targetsTotal: probeTargetsTotal ?? 0,
            },
            probeErrors,
            missingCampaignIdsSample,
            dateSample,
            firstRejectReason,
            rejectedSamples,
          }
        : undefined,
    });
  }

  const eligibleWithoutExcluded = excludeCreativeIdsSet.size
    ? eligible.filter((item) => !excludeCreativeIdsSet.has(item.creative.id))
    : eligible;
  const eligibleForSelection = eligibleWithoutExcluded.length ? eligibleWithoutExcluded : eligible;
  const maxPriority = Math.max(...eligibleForSelection.map((item) => item.priority));
  const top = eligibleForSelection.filter((item) => item.priority === maxPriority);
  const selected = top[Math.floor(Math.random() * top.length)]?.creative ?? null;

  if (!selected?.target_url) {
    return NextResponse.json({
      creative: null,
      ok: false,
      debug: debugEnabled
        ? {
            endpointVersion,
            flags,
            serviceRoleConfigured,
            usingAdminClient: true,
            publicUrlHost,
            adminUrlHost,
            derivedContext: {
              ...context,
              page,
              slot,
            },
            nowMs,
            nowIso,
            counts: {
              campaignsActiveCount: campaignsActiveCount ?? 0,
              campaignsAfterDateFilterCount: campaignsAfterDate.length,
              targetsCountForActiveCampaigns: targetsForActiveCampaigns.length,
              creativesCountForSlot: creativeRows.length,
              creativesJoinedWithCampaignCount: joined.length,
              eligibleCount: eligible.length,
            },
            probe: {
              campaignsTotal: probeCampaignsTotal ?? 0,
              creativesTotal: probeCreativesTotal ?? 0,
              targetsTotal: probeTargetsTotal ?? 0,
            },
            probeErrors,
            missingCampaignIdsSample,
            dateSample,
            firstRejectReason: 'missing_target_url',
            rejectedSamples,
          }
        : undefined,
    });
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
    ok: true,
    creative: {
      id: selected.id,
      campaignId: selected.campaign_id,
      slot: selected.slot,
      title: selected.title,
      body: selected.body,
      imageUrl: selected.image_url,
      targetUrl: selected.target_url,
    },
    debug: debugEnabled
      ? {
          endpointVersion,
          flags,
          serviceRoleConfigured,
          usingAdminClient: true,
          publicUrlHost,
          adminUrlHost,
          derivedContext: {
            ...context,
            page,
            slot,
          },
          nowMs,
          nowIso,
          counts: {
            campaignsActiveCount: campaignsActiveCount ?? 0,
            campaignsAfterDateFilterCount: campaignsAfterDate.length,
            targetsCountForActiveCampaigns: targetsForActiveCampaigns.length,
            creativesCountForSlot: creativeRows.length,
            creativesJoinedWithCampaignCount: joined.length,
            eligibleCount: eligible.length,
          },
          probe: {
            campaignsTotal: probeCampaignsTotal ?? 0,
            creativesTotal: probeCreativesTotal ?? 0,
            targetsTotal: probeTargetsTotal ?? 0,
          },
          probeErrors,
          missingCampaignIdsSample,
          dateSample,
          firstRejectReason: firstRejectReason || null,
          rejectedSamples,
        }
      : undefined,
  });
};
