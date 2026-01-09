import { NextResponse } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { isAdminUser } from '@/lib/api/admin';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 93;
const PAGE_SIZE = 1000;

const toDateOnly = (input: Date) => input.toISOString().slice(0, 10);

const parseDateParam = (value: string | null, fallback: string) => {
  const dateValue = value ?? fallback;
  if (!DATE_REGEX.test(dateValue)) {
    return { ok: false as const, value: null };
  }
  const parsed = new Date(`${dateValue}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false as const, value: null };
  }
  return { ok: true as const, value: parsed, original: dateValue };
};

const addDaysUtc = (input: Date, days: number) => {
  const next = new Date(input);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const csvEscape = (value: string | number) => {
  const text = String(value);
  if (!/[\n",]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
};

const toNullable = (value: string | null | undefined) => {
  const trimmed = value?.trim() ?? '';
  return trimmed ? trimmed : '';
};

export const GET = withAuth(async (req, { supabase, user }) => {
  const admin = await isAdminUser(supabase, user);
  if (!admin) return jsonError('Forbidden', 403);

  const adminClient = getSupabaseAdminClientOrNull();
  if (!adminClient) return jsonError('Service role non configurato', 500);

  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get('campaign_id');
  const format = (searchParams.get('format') ?? 'json').toLowerCase();
  if (!campaignId) return jsonError('campaign_id obbligatorio', 400);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(campaignId)) {
    return jsonError('campaign_id non valido', 400);
  }

  const today = new Date();
  const defaultTo = toDateOnly(today);
  const defaultFrom = toDateOnly(addDaysUtc(today, -30));
  const fromResult = parseDateParam(searchParams.get('from'), defaultFrom);
  if (!fromResult.ok || !fromResult.value) return jsonError('from non valido', 400);
  const toResult = parseDateParam(searchParams.get('to'), defaultTo);
  if (!toResult.ok || !toResult.value) return jsonError('to non valido', 400);

  const start = fromResult.value;
  const endExclusive = addDaysUtc(toResult.value, 1);
  if (start > endExclusive) return jsonError('Intervallo date non valido', 400);

  const diffMs = endExclusive.getTime() - start.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays > MAX_RANGE_DAYS) {
    return jsonError('Intervallo troppo ampio (max 93 giorni)', 400);
  }

  const events: Array<{
    event_type: string;
    slot: string | null;
    viewer_region: string | null;
    viewer_province: string | null;
    viewer_city: string | null;
  }> = [];

  let offset = 0;
  while (true) {
    const { data, error } = await adminClient
      .from('ad_events')
      .select(
        'created_at,event_type,campaign_id,creative_id,slot,page,viewer_region,viewer_province,viewer_city,viewer_country,viewer_sport,viewer_audience,viewer_user_id',
      )
      .eq('campaign_id', campaignId)
      .gte('created_at', start.toISOString())
      .lt('created_at', endExclusive.toISOString())
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error('[admin/ads/reports] query error', error);
      return jsonError('Errore nel caricamento report ads', 400);
    }

    const rows = (data ?? []) as typeof events;
    events.push(...rows);

    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const aggregates = new Map<string, {
    slot: string;
    region: string;
    province: string;
    city: string;
    impressions: number;
    clicks: number;
  }>();

  let impressionsTotal = 0;
  let clicksTotal = 0;

  for (const event of events) {
    const slot = toNullable(event.slot);
    const region = toNullable(event.viewer_region);
    const province = toNullable(event.viewer_province);
    const city = toNullable(event.viewer_city);
    const key = `${slot}|${region}|${province}|${city}`;
    const entry = aggregates.get(key) ?? {
      slot,
      region,
      province,
      city,
      impressions: 0,
      clicks: 0,
    };
    if (event.event_type === 'impression') {
      entry.impressions += 1;
      impressionsTotal += 1;
    }
    if (event.event_type === 'click') {
      entry.clicks += 1;
      clicksTotal += 1;
    }
    aggregates.set(key, entry);
  }

  const data = Array.from(aggregates.values()).map((row) => {
    const ctr = row.impressions > 0 ? row.clicks / row.impressions : 0;
    return {
      ...row,
      ctr,
    };
  });

  data.sort((a, b) => {
    if (a.slot === b.slot) return b.impressions - a.impressions;
    return a.slot.localeCompare(b.slot);
  });

  const fromLabel = fromResult.original ?? defaultFrom;
  const toLabel = toResult.original ?? defaultTo;

  if (format === 'csv') {
    const header = [
      'campaign_id',
      'from',
      'to',
      'slot',
      'region',
      'province',
      'city',
      'impressions',
      'clicks',
      'ctr',
    ];
    const lines = [header.join(',')];
    for (const row of data) {
      lines.push(
        [
          campaignId,
          fromLabel,
          toLabel,
          row.slot,
          row.region,
          row.province,
          row.city,
          row.impressions,
          row.clicks,
          row.ctr,
        ].map(csvEscape).join(','),
      );
    }
    const filename = `ads-report-${campaignId}-${fromLabel}-${toLabel}.csv`;
    return new NextResponse(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    meta: {
      campaign_id: campaignId,
      from: fromLabel,
      to: toLabel,
      rows: data.length,
      impressionsTotal,
      clicksTotal,
    },
    data,
  });
});
