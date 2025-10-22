// app/api/opportunities/[id]/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import {
  normalizeToEN,
  normalizeToIT,
  PLAYING_CATEGORY_EN,
  PLAYING_CATEGORY_IT,
} from '@/lib/enums';

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

  // required_category: accetta IT/EN → prova EN, fallback IT
  const rawRole =
    (body as any)?.role ??
    (body as any)?.required_category ??
    (body as any)?.playing_category;

  const normEN = normalizeToEN(rawRole);
  const normIT = normalizeToIT(rawRole);
  if (normEN || normIT) {
    update.required_category = normEN ?? normIT; // tentativo 1
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'empty_update' }, { status: 400 });
  }

  const doUpdate = async (required_category?: string) => {
    const payload = {
      ...update,
      ...(required_category ? { required_category } : {}),
      updated_at: new Date().toISOString(),
    };
    return supabase
      .from('opportunities')
      .update(payload)
      .eq('id', id)
      .select('id')
      .maybeSingle();
  };

  // 1° tentativo
  let { data, error } = await doUpdate(update.required_category as string | undefined);
  if (!error) return NextResponse.json({ ok: true, data });

  // enum mismatch → riprova con l’altra lingua
  if (/invalid input value for enum .*playing_category/i.test(error.message)) {
    const first = update.required_category as string | undefined;
    const second =
      first && normEN && first === normEN ? normIT : normEN; // switch lingua
    if (second) {
      const retry = await doUpdate(second);
      if (!retry.error) return NextResponse.json({ ok: true, data: retry.data });
      error = retry.error;
    }
    return NextResponse.json(
      {
        error: 'invalid_required_category',
        allowed_en: PLAYING_CATEGORY_EN,
        allowed_it: PLAYING_CATEGORY_IT,
      },
      { status: 400 }
    );
  }

  // altri errori
  return NextResponse.json({ error: error.message }, { status: 400 });
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
