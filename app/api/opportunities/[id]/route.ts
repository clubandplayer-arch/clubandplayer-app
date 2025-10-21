// app/api/opportunities/[id]/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import {
  PLAYING_CATEGORY_IT,
  PLAYING_CATEGORY_EN,
  normalizePlayingCategoryCandidates,
} from '@/lib/enums';

// --- helper per compatibilità Next 15 (params può essere oggetto o Promise) ---
async function resolveId(context: any): Promise<string> {
  const p = context?.params;
  const obj = (p && typeof p.then === 'function') ? await p : p;
  const id = obj?.id;
  if (!id || typeof id !== 'string') throw new Error('missing_id_param');
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
    return NextResponse.json(
      { error: e?.message === 'missing_id_param' ? 'bad_request' : 'internal_error' },
      { status: e?.message === 'missing_id_param' ? 400 : 500 }
    );
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
    const baseUpdate: Record<string, unknown> = {};
    const setIfPresent = (src: string, dst = src) => {
      if (Object.prototype.hasOwnProperty.call(body, src)) baseUpdate[dst] = body[src];
    };

    setIfPresent('title');
    setIfPresent('description');
    setIfPresent('sport');

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

    // prepara update finale
    const applyUpdate = async (patch: Record<string, unknown>) => {
      return await supabase
        .from('opportunities')
        .update({ ...baseUpdate, ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id')
        .maybeSingle();
    };

    // Se non stiamo aggiornando la categoria, fai un update semplice
    const wantsRoleUpdate = 'role' in body || 'required_category' in body;

    if (!wantsRoleUpdate) {
      if (Object.keys(baseUpdate).length === 0) {
        return NextResponse.json({ error: 'empty_update' }, { status: 400 });
      }
      const { data, error } = await applyUpdate({});
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true, data });
    }

    // Normalizza ruolo -> candidati IT/EN
    const { it, en } = normalizePlayingCategoryCandidates(
      (body as any).role ?? (body as any).required_category
    );

    if (!it && !en) {
      return NextResponse.json(
        {
          error: 'invalid_required_category',
          allowed_it: PLAYING_CATEGORY_IT,
          allowed_en: PLAYING_CATEGORY_EN,
        },
        { status: 400 }
      );
    }

    // 1° tentativo: slug IT
    if (it) {
      const { data, error } = await applyUpdate({ required_category: it });
      if (!error) return NextResponse.json({ ok: true, data });

      // se il DB rifiuta l'IT per enum, prova l'ENG
      if (
        en &&
        /invalid input value for enum\s+playing_category/i.test(error.message)
      ) {
        const retry = await applyUpdate({ required_category: en });
        if (!retry.error) return NextResponse.json({ ok: true, data: retry.data });
        return NextResponse.json({ error: retry.error.message }, { status: 400 });
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // solo EN disponibile: prova con EN
    if (en) {
      const { data, error } = await applyUpdate({ required_category: en });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true, data });
    }

    // fallback
    return NextResponse.json(
      { error: 'invalid_required_category' },
      { status: 400 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message === 'missing_id_param' ? 'bad_request' : 'internal_error' },
      { status: e?.message === 'missing_id_param' ? 400 : 500 }
    );
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
    return NextResponse.json(
      { error: e?.message === 'missing_id_param' ? 'bad_request' : 'internal_error' },
      { status: e?.message === 'missing_id_param' ? 400 : 500 }
    );
  }
}
