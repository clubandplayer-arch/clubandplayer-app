// app/api/opportunities/[id]/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

// ---------- Helpers: normalizzazione ruolo/categoria ----------
type CatEN = 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
type CatIT = 'portiere' | 'difensore' | 'centrocampista' | 'attaccante';

const EN_OF_IT: Record<CatIT, CatEN> = {
  portiere: 'goalkeeper',
  difensore: 'defender',
  centrocampista: 'midfielder',
  attaccante: 'forward',
};

const IT_OF_EN: Record<CatEN, CatIT> = {
  goalkeeper: 'portiere',
  defender: 'difensore',
  midfielder: 'centrocampista',
  forward: 'attaccante',
};

// sinonimi -> “macro” ruolo
const SYNONYMS_TO_MACRO: Record<string, CatEN> = {
  // EN
  gk: 'goalkeeper',
  goalie: 'goalkeeper',
  keeper: 'goalkeeper',
  cb: 'defender',
  lb: 'defender',
  rb: 'defender',
  fb: 'defender',
  wb: 'defender',
  dm: 'midfielder',
  cm: 'midfielder',
  am: 'midfielder',
  winger: 'forward',
  wing: 'forward',
  striker: 'forward',
  // IT
  portiere: 'goalkeeper',
  estremo: 'goalkeeper',
  difensore: 'defender',
  terzino: 'defender',
  centrale: 'defender',
  mediano: 'midfielder',
  mezzala: 'midfielder',
  regista: 'midfielder',
  trequartista: 'midfielder',
  esterno: 'forward',
  ala: 'forward',
  punta: 'forward',
  centravanti: 'forward',
  attaccante: 'forward',
};

function normalizeCandidates(input: unknown): string[] {
  if (!input) return [];
  const raw = String(input).trim().toLowerCase();

  // se già è uno dei 4 EN
  if ((['goalkeeper','defender','midfielder','forward'] as string[]).includes(raw)) {
    const en = raw as CatEN;
    const it = IT_OF_EN[en];
    return [en, it];
  }

  // se è uno dei 4 IT
  if ((['portiere','difensore','centrocampista','attaccante'] as string[]).includes(raw)) {
    const it = raw as CatIT;
    const en = EN_OF_IT[it];
    return [en, it];
  }

  // prova sinonimi
  const enFromSyn = SYNONYMS_TO_MACRO[raw];
  if (enFromSyn) {
    const it = IT_OF_EN[enFromSyn];
    return [enFromSyn, it];
  }

  // fallback: niente candidati
  return [];
}

function isEnumError(errMsg?: string) {
  return !!errMsg && /invalid input value for enum\s+playing_category/i.test(errMsg);
}

// ---------- GET ----------
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from('opportunities')
    .select(
      [
        'id',
        'owner_id',
        'title',
        'description',
        'sport',
        'required_category',
        'min_age',
        'max_age',
        'city',
        'province',
        'region',
        'country',
        'created_at',
        'updated_at',
      ].join(', ')
    )
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ data });
}

// ---------- PATCH ----------
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const supabase = await getSupabaseServerClient();
  const { data: ures, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 });
  const user = ures?.user;
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  // verifica proprietario
  const { data: opp, error: oppErr } = await supabase
    .from('opportunities')
    .select('id, owner_id')
    .eq('id', id)
    .maybeSingle();

  if (oppErr) return NextResponse.json({ error: oppErr.message }, { status: 400 });
  if (!opp) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (opp.owner_id !== user.id)
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // costruisci payload aggiornamento (tranne required_category, che gestiamo a parte)
  const updateBase: Record<string, unknown> = {};
  const setIfPresent = (src: string, dst = src) => {
    if (Object.prototype.hasOwnProperty.call(body, src)) updateBase[dst] = body[src];
  };

  setIfPresent('title');
  setIfPresent('description');
  setIfPresent('sport');
  setIfPresent('min_age');
  setIfPresent('max_age');
  setIfPresent('ageMin', 'min_age');
  setIfPresent('ageMax', 'max_age');
  setIfPresent('city');
  setIfPresent('province');
  setIfPresent('region');
  setIfPresent('country');

  // normalizza categoria
  const roleRaw = (body as any).role ?? (body as any).required_category;
  const candidates = normalizeCandidates(roleRaw);

  // se non ci sono altri campi e nemmeno required_category, errore
  if (Object.keys(updateBase).length === 0 && candidates.length === 0) {
    return NextResponse.json({ error: 'empty_update' }, { status: 400 });
  }

  // prova update:
  // 1) senza categoria (se non richiesta)
  // 2) con categoria, provando EN poi IT (o viceversa, secondo i candidati)
  const tryOnce = async (payload: Record<string, unknown>) => {
    return supabase
      .from('opportunities')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id')
      .maybeSingle();
  };

  // Se non stiamo cambiando la categoria, un solo tentativo
  if (candidates.length === 0 && !('required_category' in body) && !('role' in body)) {
    const { data, error } = await tryOnce(updateBase);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, data });
  }

  // Proviamo in ordine i candidati
  for (const cat of candidates) {
    const { data, error } = await tryOnce({ ...updateBase, required_category: cat });
    if (!error) return NextResponse.json({ ok: true, data });
    if (!isEnumError(error.message)) {
      // errore diverso dall'enum -> esci subito
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    // enum error: prova il prossimo candidato
  }

  // se siamo qui, tutti i candidati sono stati rifiutati dall'enum
  return NextResponse.json(
    {
      error: 'invalid_required_category',
      tried: candidates,
      hint:
        'Il valore non appartiene all’enum del DB. Riprova con uno tra: ' +
        'goalkeeper/defender/midfielder/forward oppure portiere/difensore/centrocampista/attaccante.',
    },
    { status: 400 }
  );
}

// ---------- DELETE ----------
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const supabase = await getSupabaseServerClient();

  const { data: ures, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 });
  const user = ures?.user;
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: opp, error: oppErr } = await supabase
    .from('opportunities')
    .select('id, owner_id')
    .eq('id', id)
    .maybeSingle();

  if (oppErr) return NextResponse.json({ error: oppErr.message }, { status: 400 });
  if (!opp) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (opp.owner_id !== user.id)
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { error } = await supabase.from('opportunities').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
