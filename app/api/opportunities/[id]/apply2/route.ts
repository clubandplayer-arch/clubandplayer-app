// app/api/opportunities/[id]/apply2/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await getSupabaseServerClient();

  // Auth richiesta
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = auth.user.id;

  // Body opzionale: { note?: string }
  const body = await request.json().catch(() => ({}));
  const note = typeof body?.note === 'string' ? body.note : '';

  // Guard: esiste già una candidatura per (opportunity_id, athlete_id)?
  const { data: existing, error: existingErr } = await supabase
    .from('applications')
    .select('id')
    .eq('opportunity_id', id)
    .eq('athlete_id', userId)
    .maybeSingle();

  if (existingErr && !`${existingErr.code || ''}`.includes('PGRST116')) {
    // PGRST116 = no rows, non è un vero errore
    return NextResponse.json({ error: 'db_error', detail: existingErr.message }, { status: 500 });
  }

  if (existing) {
    // Già candidato: ritorno ok per permettere alla UI di disabilitare il bottone
    return NextResponse.json({ ok: true, id: existing.id });
  }

  // Inserisci candidatura
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
