// app/api/opportunities/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

/**
 * GET /api/opportunities/:id
 * Pubblico: restituisce i dettagli dell'opportunità normalizzando owner_id/created_by.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

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

  const ownerId =
    (data as any).owner_id ??
    (data as any).created_by ??
    null;

  return NextResponse.json({
    data: {
      ...data,
      owner_id: ownerId,
      created_by: (data as any).created_by ?? null,
    },
  });
}

/**
 * PATCH /api/opportunities/:id
 * Solo owner (owner_id o created_by).
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

    const segments = req.nextUrl.pathname.split('/');
    const id = segments[segments.length - 1];

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
    for (const k of allowed) {
      if (k in body) update[k] = body[k];
    }

    if (Object.keys(update).length === 0) {
      return jsonError('No valid fields to update', 400);
    }

    // Verifica proprietario
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

    const newOwnerId =
      (updated as any).owner_id ??
      (updated as any).created_by ??
      null;

    return NextResponse.json({
      data: {
        ...updated,
        owner_id: newOwnerId,
        created_by: (updated as any).created_by ?? null,
      },
    });
  }
);
