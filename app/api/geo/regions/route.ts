import { NextResponse } from 'next/server';

import { jsonError } from '@/lib/api/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.from('regions').select('id,name').order('name', { ascending: true });

    if (error) return jsonError(error.message, 400);
    return NextResponse.json({ data: data ?? [] });
  } catch (err: any) {
    return jsonError(err?.message || 'Unexpected error', 500);
  }
}
