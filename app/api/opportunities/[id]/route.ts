// app/api/opportunities/[id]/route.ts
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
        'title',
        'description',
        'sport',
        'role',
        'required_category',
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

  // verifica proprietario + dati correnti
  const { data: opp, error: oppErr } = await supabase
    .from('opportunities')
    .select('id, owner_id, sport, role, required_category')
    .eq('id', id)
    .maybeSingle();

  if (oppErr) return NextResponse.json({ error: oppErr.message }, { status: 400 });
  if (!opp) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (opp.owner_id !== user.id)
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // build update
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

  // 🔹 Ruolo (label umana mostrata in lista/UI)
  const roleHuman =
    pickStr((body as any).role) ??
    pickStr((body as any).roleLabel) ??
    pickStr((body as any).roleValue);
  if (roleHuman) {
    update.role = roleHuman; // ✅ aggiorna la label visibile
  }

  // 🔹 required_category (slug EN per enum playing_role) SOLO per Calcio
  const rawCandidate =
    pickStr((body as any).required_category) ??
    pickStr((body as any).requiredCategory) ??
    pickStr((body as any).playing_category) ??
    pickStr((body as any).playingCategory) ??
    roleHuman;

  // se l'edit cambia lo sport in qualcosa ≠ Calcio → azzera required_category
  const sportInBody = pickStr((body as any).sport);
  const nextSport = sportInBody ?? opp.sport;

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
    // se l'utente ha cambiato sport a non-Calcio, togliamo il vincolo
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
    .select('id')
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
  if (opp.owner_id !== user.id)
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { error } = await supabase.from('opportunities').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
