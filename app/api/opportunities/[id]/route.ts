// app/api/opportunities/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/opportunities/:id
 * Pubblico: restituisce i dettagli dell'opportunità
 * normalizzando owner_id / created_by.
 *
 * Nota: in questo progetto Next tipizza context.params come Promise<{ id: string }>,
 * quindi rispettiamo quella firma.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from('opportunities')
    .select(
      'id, owner_id, created_by, title, description, sport, required_category, city, province, region, country, club_name, created_at, role, age_min, age_max'
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return jsonError(error.message, 400);
  }
  if (!data) {
    return jsonError('not_found', 404);
  }

  const row: any = data;
  const ownerId = row.owner_id ?? row.created_by ?? null;

  return NextResponse.json({
    data: {
      ...row,
      owner_id: ownerId,
      created_by: row.created_by ?? null,
    },
  });
}

/**
 * PATCH /api/opportunities/:id
 * Solo il proprietario (owner_id || created_by) può modificare.
 *
 * Usiamo withAuth: il wrapper gestisce auth + supabase.
 * L'id lo leggiamo dall'URL per evitare dipendenze dal tipo di context.params.
 */
export const PATCH = withAuth(
  async (req: NextRequest, { supabase, user }) => {
    try {
      await rateLimit(req, {
        key: `opps:PATCH:${user.id}`,
        limit: 60,
        window: '1m',
      } as any);
    } catch {
      return jsonError('Too Many Requests', 429);
    }

    // Estrae l'id dal path: /api/opportunities/[id]
    const segments = req.nextUrl.pathname.split('/');
    const id = segments[segments.length - 1] || segments[segments.length - 2];
    if (!id) {
      return jsonError('Missing id', 400);
    }

    const body = await req.json().catch(() => ({} as any));

    const allowed = [
      'title',
      'description',
      'sport',
      'required_category',
      'city',
      'province',
      'region',
      'country',
      'role',
      'age_min',
      'age_max',
      'club_name',
    ] as const;

    const update: Record<string, any> = {};
    for (const key of allowed) {
      if (key in body) {
        update[key] = body[key];
      }
    }

    if (Object.keys(update).length === 0) {
      return jsonError('No valid fields to update', 400);
    }

    // Verifica proprietà opportunità
    const { data: opp, error: oppErr } = await supabase
      .from('opportunities')
      .select('id, owner_id, created_by')
      .eq('id', id)
      .maybeSingle();

    if (oppErr) {
      return jsonError(oppErr.message, 400);
    }
    if (!opp) {
      return jsonError('not_found', 404);
    }

    const ownerId =
      (opp as any).owner_id ??
      (opp as any).created_by ??
      null;

    if (!ownerId || ownerId !== user.id) {
      return jsonError('forbidden', 403);
    }

    const { data: updated, error: updateErr } = await supabase
      .from('opportunities')
      .update(update)
      .eq('id', id)
      .select(
        'id, owner_id, created_by, title, description, sport, required_category, city, province, region, country, club_name, created_at, role, age_min, age_max'
      )
      .maybeSingle();

    if (updateErr) {
      return jsonError(updateErr.message, 400);
    }
    if (!updated) {
      return jsonError('Update failed', 400);
    }

    const row: any = updated;
    const newOwnerId =
      row.owner_id ??
      row.created_by ??
      user.id;

    return NextResponse.json({
      data: {
        ...row,
        owner_id: newOwnerId,
        created_by: row.created_by ?? null,
      },
    });
  }
);
