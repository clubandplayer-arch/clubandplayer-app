// app/api/opportunities/[id]/apply2/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await getSupabaseServerClient();

  // Auth
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  const user = auth?.user ?? null;
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const opportunityId = params?.id;
  if (!opportunityId) {
    return NextResponse.json({ error: 'Missing opportunity id' }, { status: 400 });
  }

  // Ruolo: solo atleti possono candidarsi
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
    .eq('id', opportunityId)
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

  // Se già candidato → 409
  const { data: already } = await supabase
    .from('applications')
    .select('id,status')
    .eq('opportunity_id', opportunityId)
    .eq('athlete_id', user.id)
    .maybeSingle();

  if (already?.id) {
    return NextResponse.json(
      { error: 'Hai già inviato una candidatura a questo annuncio.' },
      { status: 409 }
    );
  }

  // Inserisci candidatura
  const { data: ins, error: insErr } = await supabase
    .from('applications')
    .insert({
      opportunity_id: opportunityId,
      athlete_id: user.id,
      status: 'submitted',
      note: '',
    })
    .select('id')
    .single();

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: ins.id });
}
