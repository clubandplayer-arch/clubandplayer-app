// app/api/opportunities/[id]/apply/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await getSupabaseServerClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = auth.user.id;

  const body = await request.json().catch(() => ({}));
  const note = typeof body?.note === 'string' ? body.note : '';

  const { data: existing } = await supabase
    .from('applications')
    .select('id')
    .eq('opportunity_id', id)
    .eq('athlete_id', userId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, id: existing.id });
  }

  const { data: inserted, error: insertErr } = await supabase
    .from('applications')
    .insert({
      opportunity_id: id,
      athlete_id: userId,
      note,
      status: 'submitted',
    })
    .select('id')
    .single();

  if (insertErr) {
    return NextResponse.json({ error: 'insert_failed', detail: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: inserted.id });
}
