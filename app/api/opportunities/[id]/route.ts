export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { normalizeToEN, PLAYING_CATEGORY_EN } from '@/lib/enums';

// Estrae stringhe utili anche da oggetti {label,value}
function pickStr(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'string') {
    const s = v.trim();
    return s && s !== '[object Object]' ? s : null;
  }
  if (typeof v === 'object') {
    const any = v as Record<string, unknown>;
    const s =
      (typeof any.value === 'string' && any.value) ||
      (typeof any.label === 'string' && any.label) ||
      (typeof any.name === 'string' && any.name) ||
      (typeof any.nome === 'string' && any.nome) ||
      '';
    return s ? String(s).trim() : null;
  }
  return String(v).trim() || null;
}

// Bracket → range
function bracketToRange(code?: string): { age_min: number | null; age_max: number | null; known: boolean } {
  const v = (code || '').trim();
  switch (v) {
    case '17-20': return { age_min: 17, age_max: 20, known: true };
    case '21-25': return { age_min: 21, age_max: 25, known: true };
    case '26-30': return { age_min: 26, age_max: 30, known: true };
    case '31+':   return { age_min: 31, age_max: null, known: true };
    case '':      return { age_min: null, age_max: null, known: true }; // reset esplicito
    default:      return { age_min: null, age_max: null, known: false };
  }
}

// GET /api/opportunities/[id]
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
        'created_by', // 👈 aggiunto per fallback
        'title',
        'description',
        'sport',
        'role',
        'required_category',
        'age_min',
        'age_max',
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

  // 👇 fallback owner_id <- created_by
  const row = { ...(data as any), owner_id: (data as any).owner_id ?? (data as any).created_by ?? null };

  return NextResponse.json({ data: row });
}

// PATCH /api/opportunities/[id]
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

  // verifica proprietario + dati correnti (invariato)
  const { data: opp, error: oppErr } = await supabase
    .from('opportunities')
    .select('id, owner_id, sport, role, required_category, age_min, age_max')
    .eq('id', id)
    .maybeSingle();

  if (oppErr) return NextResponse.json({ error: oppErr.message }, { status: 400 });
  if (!opp) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if ((opp as any).owner_id !== user.id)
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // build update (invariato vs tuo file)
  const update: Record<string, unknown> = {};
  const setIfPresent = (src: string, dst = src) => {
    if (Object.prototype.hasOwnProperty.call(body, src)) update[dst] = body[src];
  };

  setIfPresent('title');
  setIfPresent('description');
  setIfPresent('sport');
  setIfPresent('city');
  setIfPresent('province');
  setIfPresent('region');
  setIfPresent('country');

  const roleHuman =
    pickStr((body as any).role) ??
    pickStr((body as any).roleLabel) ??
    pickStr((body as any).roleValue);
  if (roleHuman) {
    update.role = roleHuman;
  }

  let touchedAge = false;
  let nextAgeMin: number | null | undefined = undefined;
  let nextAgeMax: number | null | undefined = undefined;

  if ('age_bracket' in body || 'ageBracket' in body || 'age' in body) {
    const br =
      pickStr((body as any).age_bracket) ??
      pickStr((body as any).ageBracket) ??
      pickStr((body as any).age);

    const { age_min, age_max, known } = bracketToRange(br ?? '');
    if (known) {
      nextAgeMin = age_min;
      nextAgeMax = age_max;
      touchedAge = true;
    }
  }

  const rawMin = (body as any).age_min ?? (body as any).ageMin;
  const rawMax = (body as any).age_max ?? (body as any).ageMax;
  if ('age_min' in body || 'ageMin' in body) {
    const v = Number.parseInt(String(rawMin), 10);
    nextAgeMin = Number.isFinite(v) ? v : null;
    touchedAge = true;
  }
  if ('age_max' in body || 'ageMax' in body) {
    const v = Number.parseInt(String(rawMax), 10);
    nextAgeMax = Number.isFinite(v) ? v : null;
    touchedAge = true;
  }

  if (touchedAge) {
    if (nextAgeMin != null && nextAgeMax != null && nextAgeMin > nextAgeMax) {
      const tmp = nextAgeMin;
      nextAgeMin = nextAgeMax;
      nextAgeMax = tmp;
    }
    update.age_min = nextAgeMin ?? null;
    update.age_max = nextAgeMax ?? null;
  }

  const rawCandidate =
    pickStr((body as any).required_category) ??
    pickStr((body as any).requiredCategory) ??
    pickStr((body as any).playing_category) ??
    pickStr((body as any).playingCategory) ??
    roleHuman;

  const sportInBody = pickStr((body as any).sport);
  const nextSport = sportInBody ?? (opp as any).sport;

  if (nextSport === 'Calcio' && rawCandidate) {
    const en = normalizeToEN(rawCandidate);
    if (!en) {
      return NextResponse.json(
        { error: 'invalid_required_category', allowed_en: PLAYING_CATEGORY_EN },
        { status: 400 }
      );
    }
    update.required_category = en;
  } else if (sportInBody && nextSport !== 'Calcio') {
    update.required_category = null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'empty_update' }, { status: 400 });
  }

  const payload = { ...update, updated_at: new Date().toISOString() };

  const { data, error } = await supabase
    .from('opportunities')
    .update(payload)
    .eq('id', id)
    .select('id, age_min, age_max, role, required_category')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, data });
}

// DELETE /api/opportunities/[id]
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
  if ((opp as any).owner_id !== user.id)
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { error } = await supabase.from('opportunities').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
