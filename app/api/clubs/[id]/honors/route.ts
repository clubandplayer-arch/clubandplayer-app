import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.from('club_honors')
    .select('id,season,placement,sports:sport_id(code,canonical_name),organization:sports_organization_id(code,canonical_name),category:sports_organization_category_id(canonical_name)')
    .eq('club_profile_id', id).eq('is_active', true).order('season', { ascending: false }).order('placement').order('created_at').order('id');
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ data: data ?? [] });
}
