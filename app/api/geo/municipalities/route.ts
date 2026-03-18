import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { jsonError } from '@/lib/api/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const provinceIdRaw = req.nextUrl.searchParams.get('provinceId')?.trim() ?? '';
    const provinceId = Number(provinceIdRaw);
    if (!Number.isFinite(provinceId) || provinceId <= 0) {
      return jsonError('provinceId is required', 400);
    }

    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from('municipalities')
      .select('id,name,province_id')
      .eq('province_id', provinceId)
      .order('name', { ascending: true });

    if (error) return jsonError(error.message, 400);
    return NextResponse.json({ data: data ?? [] });
  } catch (err: any) {
    return jsonError(err?.message || 'Unexpected error', 500);
  }
}
