import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { jsonError } from '@/lib/api/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const regionIdRaw = req.nextUrl.searchParams.get('regionId')?.trim() ?? '';
    const regionId = Number(regionIdRaw);
    if (!Number.isFinite(regionId) || regionId <= 0) {
      return jsonError('regionId is required', 400);
    }

    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from('provinces')
      .select('id,name,region_id')
      .eq('region_id', regionId)
      .order('name', { ascending: true });

    if (error) return jsonError(error.message, 400);
    return NextResponse.json({ data: data ?? [] });
  } catch (err: any) {
    return jsonError(err?.message || 'Unexpected error', 500);
  }
}
