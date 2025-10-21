// app/api/opportunities/[id]/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import {
  normalizePlayingCategory,
  PLAYING_CATEGORY,
} from '@/lib/enums';

/**
 * Next 15 in alcune build genera tipi con:
 *   { params: { id: string } }
 * ...e in altre con:
 *   { params: Promise<{ id: string }> }
 * Per rendere il codice robusto, accettiamo `context: any`
 * e risolviamo sempre l'id in modo sicuro.
 */
async function resolveId(context: any): Promise<string> {
  const p = context?.params;
  const obj = (p && typeof p.then === 'function') ? await p : p;
  const id = obj?.id;
  if (!id || typeof id !== 'string') {
    throw new Error('missing_id_param');
  }
  return id;
}

// GET /api/opportunities/[id]
export async function GET(_req: NextRequest, context: any) {
  try {
    const id = await resolveId(context);

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
  } catch (e: any) {
    if (e?.message === 'missing_id_param') {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

// PATCH /api/opportunities/[id]
export async function PATCH(req: NextRequest, context: any) {
  try {
    const id = await resolveId(context);

    const supabase = await getSupabaseServerClient();
    const { data: ures, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 });
    const user = ures?.user;
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    // campi ammessi
    const update: Record<string, unknown> = {};
    const setIfPresent = (src: string, dst = src) => {
      if (Object.prototype.hasOwnProperty.call(body, src)) update[dst] = body[src];
    };

    setIfPresent('title');
    setIfPresent('description');
    setIfPresent('sport');

    // ruolo / categoria (label IT/EN → slug EN della enum)
    if ('role' in body || 'required_category' in body) {
      const normalized = normalizePlayingCategory(
        (body as any).role ?? (body as any).required_category
      );
      if (!normalized) {
        return NextResponse.json(
          { error: 'invalid_required_category', allowed: PLAYING_CATEGORY },
          { status: 400 }
        );
      }
      update.required_category = normalized;
    }

    // età (snake o camel)
    setIfPresent('min_age');
    setIfPresent('max_age');
    setIfPresent('ageMin', 'min_age');
    setIfPresent('ageMax', 'max_age');

    // localizzazione
    setIfPresent('city');
    setIfPresent('province');
    setIfPresent('region');
    setIfPresent('country');

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
  } catch (e: any) {
    if (e?.message === 'missing_id_param') {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

// DELETE /api/opportunities/[id]
export async function DELETE(_req: NextRequest, context: any) {
  try {
    const id = await resolveId(context);

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
  } catch (e: any) {
    if (e?.message === 'missing_id_param') {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
