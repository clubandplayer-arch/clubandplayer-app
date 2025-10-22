// app/api/opportunities/[id]/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

// -----------------------------
// Helpers: normalizzazione ruolo
// -----------------------------
type CatEN = 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
type CatIT = 'portiere' | 'difensore' | 'centrocampista' | 'attaccante';
type CatAny = CatEN | CatIT;

const EN: CatEN[] = ['goalkeeper', 'defender', 'midfielder', 'forward'];
const IT: CatIT[] = ['portiere', 'difensore', 'centrocampista', 'attaccante'];

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

function stripAccents(s: string) {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function normalizeText(v: unknown): string {
  return stripAccents(String(v ?? '').toLowerCase().trim());
}

// keywords (boundary o presenza nel testo) -> macro EN
const KEYWORDS: Record<CatEN, string[]> = {
  goalkeeper: [
    'gk', 'goalie', 'keeper', 'portiere', 'estremo', 'numero 1',
  ],
  defender: [
    'defender', 'defence', 'difensore', 'terzino', 'centrale', 'cb', 'lb', 'rb',
    'fullback', 'full back', 'wingback', 'wing back', 'wb', 'stopper', 'marcatore',
    'esterno difensivo',
  ],
  midfielder: [
    'midfielder', 'centrocampista', 'mediano', 'mezzala', 'mezza ala', 'regista',
    'trequartista', 'interno', 'cm', 'dm', 'am', 'play',
  ],
  forward: [
    'forward', 'attaccante', 'punta', 'centravanti', 'seconda punta', 'esterno',
    'ala', 'esterno alto', 'winger', 'wing', 'striker',
  ],
};

function detectCategoryEN(input: string): CatEN | null {
  if (!input) return null;

  // match diretto uno dei 4
  if ((EN as string[]).includes(input)) return input as CatEN;
  if ((IT as string[]).includes(input)) return EN_OF_IT[input as CatIT];

  // token e ricerca fuzzy
  const text = ` ${input} `; // padding per boundary semplici
  for (const cat of EN as CatEN[]) {
    for (const kw of KEYWORDS[cat]) {
      const k = normalizeText(kw);
      if (text.includes(` ${k} `) || text.includes(k)) return cat;
    }
  }
  return null;
}

function buildCandidates(roleRaw: unknown, prefer: 'EN' | 'IT'): CatAny[] {
  const raw = normalizeText(roleRaw);
  if (!raw) return [];

  const en = detectCategoryEN(raw);
  const it = en ? IT_OF_EN[en] : null;

  const uniq: CatAny[] = [];
  const push = (v?: CatAny | null) => {
    if (v && !uniq.includes(v)) uniq.push(v);
  };

  if (prefer === 'EN') {
    push(en);
    push(it);
  } else {
    push(it);
    push(en);
  }
  return uniq;
}

function isEnumError(msg?: string) {
  return !!msg && /invalid input value for enum\s+playing_category/i.test(msg);
}

// -----------------------------
// GET
// -----------------------------
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

// -----------------------------
// PATCH
// -----------------------------
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

  // prendo anche required_category attuale per capire la lingua dell'enum su questo record
  const { data: opp, error: oppErr } = await supabase
    .from('opportunities')
    .select('id, owner_id, required_category')
    .eq('id', id)
    .maybeSingle();

  if (oppErr) return NextResponse.json({ error: oppErr.message }, { status: 400 });
  if (!opp) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (opp.owner_id !== user.id)
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const current = normalizeText(opp.required_category);
  const dbLang: 'EN' | 'IT' =
    (EN as string[]).includes(current) ? 'EN' : 'IT';

  // costruiamo payload base (senza categoria)
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

  // se non c'è ruolo nel body, aggiorno solo il resto
  const roleRaw = (body as any).role ?? (body as any).required_category;
  const touchingRole = roleRaw !== undefined && roleRaw !== null && String(roleRaw).trim() !== '';

  if (!touchingRole) {
    if (Object.keys(updateBase).length === 0) {
      return NextResponse.json({ error: 'empty_update' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('opportunities')
      .update({ ...updateBase, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, data });
  }

  // devo cambiare la categoria: preparo i candidati nella lingua del record prima
  const candidates = buildCandidates(roleRaw, dbLang); // es. ['attaccante','forward'] se il DB è IT
  if (candidates.length === 0) {
    return NextResponse.json(
      {
        error: 'invalid_required_category',
        tried: [],
        hint:
          'Valore non riconosciuto. Usa uno fra: ' +
          'portiere/difensore/centrocampista/attaccante oppure ' +
          'goalkeeper/defender/midfielder/forward.',
      },
      { status: 400 }
    );
  }

  // prova in ordine tutti i candidati
  for (const cat of candidates) {
    const { data, error } = await supabase
      .from('opportunities')
      .update({ ...updateBase, required_category: cat, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (!error) return NextResponse.json({ ok: true, data });
    if (!isEnumError(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    // enum error: provo il prossimo candidato
  }

  // se arrivo qui, nessun candidato accettato dall'enum del DB
  return NextResponse.json(
    {
      error: 'invalid_required_category',
      tried: candidates,
      hint:
        'Il DB ha un enum diverso dai valori riconosciuti. ' +
        'Prova i macro-ruoli: portiere / difensore / centrocampista / attaccante ' +
        'oppure in inglese: goalkeeper / defender / midfielder / forward.',
    },
    { status: 400 }
  );
}

// -----------------------------
// DELETE
// -----------------------------
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
