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
  excludeCampaignIds?: string[];
  exclude_campaign_ids?: string[];
  exclude_creative_ids?: string[];
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

const normalizeText = (value: string | null | undefined) => value?.toString().trim().toLowerCase() ?? '';
const normalizeSport = (value: string | null | undefined) => {
  const normalized = normalizeText(value);
  if (!normalized) return '';
  const aliases: Record<string, string> = {
    pallavolo: 'volley',
    volley: 'volley',
    football: 'calcio',
    soccer: 'calcio',
    'calcio a 5': 'futsal',
    calcetto: 'futsal',
    futsal: 'futsal',
  };
  return aliases[normalized] ?? normalized;
};
const normalizeDevice = (value: string | null | undefined) => {
  const normalized = normalizeText(value);
  return normalized === 'mobile' ? 'mobile' : 'desktop';
};
const toNullableText = (value: string | null | undefined) => {
  const trimmed = value?.toString().trim() ?? '';
  return trimmed ? trimmed : null;
};

const isWildcard = (value: string | null | undefined) => {
  const normalized = normalizeText(value);
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
    const normalizedValue =
      field === 'sport' ? normalizeSport(value) : normalizeText(value);
    if (!normalizedValue) return false;
    const normalizedTarget =
      field === 'sport' ? normalizeSport(target[field]) : normalizeText(target[field]);
    return normalizedTarget === normalizedValue;
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
  const value = targets.find((target) => normalizeText(target[field]) !== '')?.[field] ?? null;
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
  const excludeCampaignIdsRaw = Array.isArray(payload?.excludeCampaignIds)
    ? payload.excludeCampaignIds
    : Array.isArray(payload?.exclude_campaign_ids)
      ? payload.exclude_campaign_ids
      : [];
  const excludeCampaignIds = excludeCampaignIdsRaw.filter(
    (id) => typeof id === 'string' && id.trim().length > 0,
  );
  const excludeCreativeIdsRaw = Array.isArray(payload?.excludeCreativeIds)
    ? payload.excludeCreativeIds
    : Array.isArray(payload?.exclude_creative_ids)
      ? payload.exclude_creative_ids
      : [];
  const excludeCreativeIds = excludeCreativeIdsRaw.filter(
    (id) => typeof id === 'string' && id.trim().length > 0,
  );
  const excludeCampaignIdsSet = new Set(excludeCampaignIds);
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

  const province = normalizeText(profile?.province) || normalizeText(profile?.interest_province);
  const viewerAudience =
    toNullableText(profile?.account_type) ?? toNullableText(profile?.type) ?? 'all';
  const device = normalizeDevice(detectDevice(req.headers.get('user-agent')));
  const context = {
    country: normalizeText(profile?.country),
    region: normalizeText(profile?.region),
    province,
    city: normalizeText(profile?.city),
    sport: normalizeSport(profile?.sport),
    audience: normalizeText(viewerAudience),
    device,
  };

  const flags = {
    ADS_ENABLED: adsEnabled,
    NEXT_PUBLIC_ADS_ENABLED: clientAdsEnabled,
  };

  const { data: campaignsActive, error: campaignsActiveError } = await admin
    .from('ad_campaigns')
    .select('id,status,priority,start_at,end_at,created_at,daily_cap')
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

  const recordDedupeReject = (entry: { campaign_id: string | null; reason: string; fields: Record<string, string | null> }) => {
    if (rejectedSamples.length < 3) {
      rejectedSamples.push(entry);
    }
  };

  const eligible = creativeRows.reduce<
    Array<{ creative: CreativeWithCampaign; priority: number; dailyCap: number | null }>
  >((acc, creative) => {
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
      dailyCap: Number.isFinite(campaign.daily_cap) ? (campaign.daily_cap as number) : null,
    });
    return acc;
  }, []);
  const dateSample = (campaignsActive ?? []).slice(0, 3).map((campaign) => ({
    id: campaign.id,
    start_at: campaign.start_at,
    end_at: campaign.end_at,
    ...evalDate(campaign, nowMs),
  }));
  const campaignsBeforeDedupe = new Set(eligible.map((item) => item.creative.campaign_id));
  const dedupeExclusionsSummary = {
    total: 0,
    byReason: {
      dedupe_excluded_campaign: 0,
      dedupe_excluded_creative: 0,
    },
  };

  let eligibleAfterDedupe = eligible;
  if (excludeCampaignIdsSet.size) {
    const filtered: typeof eligible = [];
    for (const item of eligible) {
      if (excludeCampaignIdsSet.has(item.creative.campaign_id)) {
        dedupeExclusionsSummary.total += 1;
        dedupeExclusionsSummary.byReason.dedupe_excluded_campaign += 1;
        recordDedupeReject({
          campaign_id: item.creative.campaign_id,
          reason: 'dedupe_excluded',
          fields: { campaign_id: item.creative.campaign_id, creative_id: item.creative.id },
        });
        continue;
      }
      filtered.push(item);
    }
    eligibleAfterDedupe = filtered;
  }

  if (excludeCreativeIdsSet.size) {
    const filtered: typeof eligible = [];
    for (const item of eligibleAfterDedupe) {
      if (excludeCreativeIdsSet.has(item.creative.id)) {
        dedupeExclusionsSummary.total += 1;
        dedupeExclusionsSummary.byReason.dedupe_excluded_creative += 1;
        recordDedupeReject({
          campaign_id: item.creative.campaign_id,
          reason: 'dedupe_excluded',
          fields: { campaign_id: item.creative.campaign_id, creative_id: item.creative.id },
        });
        continue;
      }
      filtered.push(item);
    }
    eligibleAfterDedupe = filtered;
  }

  const campaignsAfterDedupe = new Set(eligibleAfterDedupe.map((item) => item.creative.campaign_id));
  const dedupeCounts = {
    eligibleBeforeDedupeCount: eligible.length,
    eligibleAfterDedupeCount: eligibleAfterDedupe.length,
    campaignsBeforeDedupeCount: campaignsBeforeDedupe.size,
    campaignsAfterDedupeCount: campaignsAfterDedupe.size,
  };

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
            dedupe: {
              excludeCampaignIds,
              excludeCreativeIds,
              counts: dedupeCounts,
              excludedByDedupe: dedupeExclusionsSummary,
            },
          }
        : undefined,
    });
  }

  if (eligible.length && excludeCampaignIdsSet.size + excludeCreativeIdsSet.size > 0 && !eligibleAfterDedupe.length) {
    return NextResponse.json({
      ok: true,
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
            dedupe: {
              excludeCampaignIds,
              excludeCreativeIds,
              counts: dedupeCounts,
              excludedByDedupe: dedupeExclusionsSummary,
            },
            noFillDueToDedupe: true,
          }
        : undefined,
    });
  }

  const eligibleForSelection = eligibleAfterDedupe.length ? eligibleAfterDedupe : eligible;
  const viewerUserId = user?.id ?? null;
  const viewerUserIdPresent = Boolean(viewerUserId);
  const dayStart = new Date(nowMs);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayStartIso = dayStart.toISOString();
  const maxCapChecks = 10;
  const FAIR_TOP_N = 3;
  const excludedByCap: Array<{
    creativeId: string;
    campaignId: string;
    dailyCap: number;
    impressionsToday: number;
    rejectReason: 'frequency_cap';
  }> = [];
  let fairnessDebug:
    | {
        algorithm: 'campaign_first_topN_weighted';
        fairTopN: number;
        topCampaigns: Array<{ campaignId: string; priority: number; creativesCount: number }>;
        chosenCampaignId: string;
        chosenPriority: number;
        weights: number[];
      }
    | null = null;

  let selected: CreativeWithCampaign | null = null;
  let remaining = eligibleForSelection.slice();
  let attempts = 0;

  const pickCandidate = (list: typeof remaining) => {
    if (!list.length) return null;

    const byCampaign = new Map<
      string,
      { campaignId: string; priority: number; indices: number[] }
    >();

    for (let i = 0; i < list.length; i += 1) {
      const entry = list[i];
      const campaignId = entry.creative.campaign_id;
      const prev = byCampaign.get(campaignId) ?? { campaignId, priority: entry.priority, indices: [] };
      prev.priority = Number.isFinite(prev.priority) ? prev.priority : entry.priority;
      prev.indices.push(i);
      byCampaign.set(campaignId, prev);
    }

    const campaigns = Array.from(byCampaign.values()).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    const topN = campaigns.slice(0, Math.min(FAIR_TOP_N, campaigns.length));
    if (!topN.length) return null;

    const weights = topN.map((c) => Math.max(1, Number.isFinite(c.priority) ? c.priority : 0));
    const total = weights.reduce((sum, value) => sum + value, 0);
    let r = Math.random() * total;
    let chosenCampaign = topN[0];
    for (let i = 0; i < topN.length; i += 1) {
      r -= weights[i];
      if (r <= 0) {
        chosenCampaign = topN[i];
        break;
      }
    }

    const pickIndex = chosenCampaign.indices[Math.floor(Math.random() * chosenCampaign.indices.length)];
    const picked = list[pickIndex];
    return {
      item: picked,
      index: pickIndex,
      fairness: {
        algorithm: 'campaign_first_topN_weighted' as const,
        fairTopN: FAIR_TOP_N,
        topCampaigns: topN.map((c) => ({
          campaignId: c.campaignId,
          priority: c.priority,
          creativesCount: c.indices.length,
        })),
        chosenCampaignId: chosenCampaign.campaignId,
        chosenPriority: chosenCampaign.priority,
        weights,
      },
    };
  };

  while (remaining.length && attempts < maxCapChecks) {
    const candidate = pickCandidate(remaining);
    if (!candidate) break;
    const { item, index } = candidate;
    fairnessDebug = candidate.fairness ?? fairnessDebug;
    attempts += 1;

    if (!viewerUserIdPresent || item.dailyCap === null) {
      selected = item.creative;
      break;
    }

    if (item.dailyCap === 0) {
      excludedByCap.push({
        creativeId: item.creative.id,
        campaignId: item.creative.campaign_id,
        dailyCap: item.dailyCap,
        impressionsToday: 0,
        rejectReason: 'frequency_cap',
      });
      remaining = remaining.filter((_, idx) => idx !== index);
      continue;
    }

    const { count: impressionsToday } = await admin
      .from('ad_events')
      .select('id', { count: 'exact', head: true })
      .eq('event_type', 'impression')
      .eq('creative_id', item.creative.id)
      .eq('viewer_user_id', viewerUserId)
      .gte('created_at', dayStartIso);

    const impressionsCount = impressionsToday ?? 0;
    if (impressionsCount >= item.dailyCap) {
      excludedByCap.push({
        creativeId: item.creative.id,
        campaignId: item.creative.campaign_id,
        dailyCap: item.dailyCap,
        impressionsToday: impressionsCount,
        rejectReason: 'frequency_cap',
      });
      remaining = remaining.filter((_, idx) => idx !== index);
      continue;
    }

    selected = item.creative;
    break;
  }

  if (!selected) {
    return NextResponse.json({
      ok: true,
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
            dedupe: {
              excludeCampaignIds,
              excludeCreativeIds,
              counts: dedupeCounts,
              excludedByDedupe: dedupeExclusionsSummary,
            },
            cap: {
              applied: viewerUserIdPresent,
              dayStartIso,
              viewerUserIdPresent,
            },
            excludedByCap,
            fairness:
              fairnessDebug ?? {
                algorithm: 'campaign_first_topN_weighted',
                fairTopN: FAIR_TOP_N,
                topCampaigns: [],
                chosenCampaignId: null,
                chosenPriority: null,
              },
          }
        : undefined,
    });
  }

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
            dedupe: {
              excludeCampaignIds,
              excludeCreativeIds,
              counts: dedupeCounts,
              excludedByDedupe: dedupeExclusionsSummary,
            },
            cap: {
              applied: viewerUserIdPresent,
              dayStartIso,
              viewerUserIdPresent,
            },
            excludedByCap,
            fairness:
              fairnessDebug ?? {
                algorithm: 'campaign_first_topN_weighted',
                fairTopN: FAIR_TOP_N,
                topCampaigns: [],
                chosenCampaignId: null,
                chosenPriority: null,
              },
          }
        : undefined,
    });
  }

  const eventPayload = {
    campaign_id: selected.campaign_id,
    creative_id: selected.id,
    event_type: 'impression',
    slot,
    page,
    viewer_country: toNullableText(profile?.country),
    viewer_region: toNullableText(profile?.region),
    viewer_province: toNullableText(profile?.province) ?? toNullableText(profile?.interest_province),
    viewer_city: toNullableText(profile?.city),
    viewer_sport: toNullableText(profile?.sport),
    viewer_audience: viewerAudience,
    viewer_user_id: user?.id ?? null,
    user_id: user?.id ?? null,
    country: profile?.country ?? null,
    region: profile?.region ?? null,
    city: profile?.city ?? null,
    device,
  };

  await admin.from('ad_events').insert(eventPayload);

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
          eventPayload: {
            ...eventPayload,
            viewer_user_id: user?.id ? 'set' : null,
            user_id: user?.id ? 'set' : null,
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
          dedupe: {
            excludeCampaignIds,
            excludeCreativeIds,
            counts: dedupeCounts,
            excludedByDedupe: dedupeExclusionsSummary,
          },
          cap: {
            applied: viewerUserIdPresent,
            dayStartIso,
            viewerUserIdPresent,
          },
          excludedByCap,
          fairness:
            fairnessDebug ?? {
              algorithm: 'campaign_first_topN_weighted',
              fairTopN: FAIR_TOP_N,
              topCampaigns: [],
              chosenCampaignId: null,
              chosenPriority: null,
            },
        }
      : undefined,
  });
};
