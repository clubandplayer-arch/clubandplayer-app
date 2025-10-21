// app/api/opportunities/[id]/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Slug ammessi dall'enum del DB.
 */
const PLAYING_CATEGORY = ['portiere', 'difensore', 'centrocampista', 'attaccante'] as const;
type PlayingCategory = (typeof PLAYING_CATEGORY)[number];

/**
 * Normalizza un valore libero (IT/EN/sinonimi) nello slug dell'enum DB.
 * Esempi validi: "Portiere", "GK", "difensore", "fullback", "midfielder",
 * "centrocampista", "esterno", "ala", "forward", "striker", "trequartista"...
 */
function normalizePlayingCategory(input: unknown): PlayingCategory | null {
  if (typeof input !== 'string') return null;
  const s = input.trim().toLowerCase();

  // portiere
  const gk = [
    'portiere', 'estremo difensore', 'keeper', 'goalkeeper', 'gk'
  ];
  if (gk.includes(s)) return 'portiere';

  // difensore (terzino, centrale, full/wing back, ecc.)
  const dfExact = [
    'difensore', 'difensore centrale', 'centrale', 'terzino', 'terzino destro', 'terzino sinistro',
    'fullback', 'full back', 'wingback', 'wing back', 'center back', 'centre back', 'cb', 'rb', 'lb',
    'defender', 'right back', 'left back', 'back'
  ];
  if (dfExact.includes(s)) return 'difensore';
  if (s.includes('back') || s.includes('defender') || s.includes('center back') || s.includes('centre back'))
    return 'difensore';

  // centrocampista (mediano, mezzala, regista, box to box, ecc.)
  const mfExact = [
    'centrocampista', 'mediano', 'mezzala', 'regista', 'interno', 'playmaker',
    'midfielder', 'holding midfielder', 'central midfielder', 'cm', 'dm', 'am (mezzala)'
  ];
  if (mfExact.includes(s)) return 'centrocampista';
  if (s.includes('midfield')) return 'centrocampista';

  // attaccante (ala/esterno offensivo/trequartista/seconda punta/striker/forward/winger)
  const fwExact = [
    'attaccante', 'punta', 'seconda punta', 'ala', 'esterno offensivo', 'esterno',
    'trequartista', 'esterno alto', 'winger', 'forward', 'striker', 'center forward', 'centre forward', 'cf'
  ];
  if (fwExact.includes(s)) return 'attaccante';
  if (s.includes('forward') || s.includes('striker') || s.includes('wing'))
    return 'attaccante';

  return null;
}

/** Ritorna il primo definito (non undefined) */
function firstDefined<T>(...values: Array<T | undefined>): T | undefined {
  for (const v of values) if (typeof v !== 'undefined') return v;
  return undefined;
}

// ---------------------------------------------------------------------------
// GET /api/opportunities/[id]
// ---------------------------------------------------------------------------
export async function GET(
  _req: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = context.params;

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

// ---------------------------------------------------------------------------
// PATCH /api/opportunities/[id]
// ---------------------------------------------------------------------------
export async function PATCH(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = context.params;

  const supabase = await getSupabaseServerClient();
  const { data: ures, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 });
  const user = ures?.user;
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  // Costruzione payload aggiornabile (whitelist)
  const update: Record<string, unknown> = {};
  const setIfPresent = (src: string, dst = src) => {
    if (Object.prototype.hasOwnProperty.call(body, src)) update[dst] = body[src];
  };

  // campi semplici
  setIfPresent('title');
  setIfPresent('description');
  setIfPresent('sport');

  // età (snake & camel)
  setIfPresent('min_age');
  setIfPresent('max_age');
  setIfPresent('ageMin', 'min_age');
  setIfPresent('ageMax', 'max_age');

  // localizzazione
  setIfPresent('city');
  setIfPresent('province');
  setIfPresent('region');
  setIfPresent('country');

  // categoria: accetta molte chiavi e normalizza SEMPRE
  const rawRole = firstDefined<string>(
    body.role as string | undefined,
    body.required_category as string | undefined,
    (body as any)?.requiredCategory,
    (body as any)?.playing_category,
    (body as any)?.playingCategory,
    (body as any)?.position
  );

  if (typeof rawRole !== 'undefined') {
    const normalized = normalizePlayingCategory(rawRole);
    if (!normalized) {
      return NextResponse.json(
        { error: 'invalid_required_category', allowed: PLAYING_CATEGORY },
        { status: 400 }
      );
    }
    update.required_category = normalized;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'empty_update' }, { status: 400 });
  }

  // verifica proprietario
  const { data: opp, error: oppErr } = await supabase
    .from('opportunities')
    .select('id, owner_id')
    .eq('id', id)
    .maybeSingle();

  if (oppErr) return NextResponse.json({ error: oppErr.message }, { status: 400 });
  if (!opp) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (opp.owner_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // update
  const { data, error } = await supabase
    .from('opportunities')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, data });
}

// ---------------------------------------------------------------------------
// DELETE /api/opportunities/[id]
// ---------------------------------------------------------------------------
export async function DELETE(
  _req: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = context.params;

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
  if (opp.owner_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { error } = await supabase.from('opportunities').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
