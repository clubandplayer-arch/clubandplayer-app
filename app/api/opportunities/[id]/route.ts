import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jsonError } from '@/lib/api/auth';

export const runtime = 'nodejs';

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const anon = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!url || !anon) throw new Error('Supabase env missing');
  return createClient(url, anon);
}

const SELECT =
  'id,title,description,owner_id,created_at,country,region,province,city,sport,role,required_category,age_min,age_max,club_name';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('opportunities')
      .select(SELECT)
      .eq('id', params.id)
      .single();

    if (error) return jsonError(error.message, 404);
    return NextResponse.json({ data });
  } catch (err: any) {
    return jsonError(err?.message || 'Unexpected error', 500);
  }
}
