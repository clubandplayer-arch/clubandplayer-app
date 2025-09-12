// app/api/opportunities/[id]/apply2/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  // Auth
  const { data: auth, error: authError } = await supabase.auth.getUser();
  const user = auth?.user ?? null;
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Solo atleti possono candidarsi
  const { data: prof } = await supabase
    .from('profiles')
    .select('type')
    .eq('user_id', user.id)
    .maybeSingle();

  const role = (prof?.type ?? '').toString().toLowerCase();
  if (role !== 'athlete') {
    return NextResponse.json(
      { error: 'Solo gli atleti possono candidarsi.' },
      { status: 403 }
    );
  }

  // L’owner non può candidarsi al proprio annuncio
  const { data: opp, error: oppErr } = await supabase
    .from('opportunities')
    .select('owner_id')
    .eq('id', id)
    .maybeSingle();

  if (oppErr || !opp) {
    return NextResponse.json({ error: 'Annuncio non trovato.' }, { status: 404 });
  }
  if (opp.owner_id === user.id) {
    return NextResponse.json(
      { error: 'Non puoi candidarti a un tuo annuncio.' },
      { status: 400 }
    );
  }

  // Se già candidato → risposta positiva idempotente
  const { data: existing, error: existingErr } = await supabase
    .from('applications')
    .select('id,status')
    .eq('opportunity_id', id)
    .eq('athlete_id', user.id)
    .maybeSingle();

  // PGRST116 = no rows; altri errori vanno segnalati
  if (existingErr && !`${existingErr.code ?? ''}`.includes('PGRST116')) {
    return NextResponse.json(
      { error: 'db_error', detail: existingErr.message },
      { status: 500 }
    );
  }
  if (existing?.id) {
    return NextResponse.json({ ok: true, id: existing.id });
  }

  // Body opzionale: { note?: string }
  const body = await request.json().catch(() => ({}));
  const note = typeof body?.note === 'string' ? body.note : '';

  // Inserisci candidatura
  const { data: inserted, error: insertErr } = await supabase
    .from('applications')
    .insert({
      opportunity_id: id,
      athlete_id: user.id,
      note,
      status: 'submitted',
    })
    .select('id')
    .single();

  if (insertErr) {
    return NextResponse.json(
      { error: 'insert_failed', detail: insertErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, id: inserted.id });
}
