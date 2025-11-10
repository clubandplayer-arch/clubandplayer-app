import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { rateLimit } from '@/lib/api/rateLimit';

export const runtime = 'nodejs';

/**
 * GET /api/applications
 * Restituisce le candidature dell'atleta loggato (mine).
 */
export const GET = withAuth(async (_req: NextRequest, { supabase, user }) => {
  // Lista candidature dove l'utente è l'atleta
  const { data, error } = await supabase
    .from('applications')
    .select(
      `
      id,
      opportunity_id,
      athlete_id,
      note,
      status,
      created_at,
      updated_at,
      opportunities (
        id,
        title,
        role,
        status,
        country,
        city,
        owner_id,
        created_by
      )
    `
    )
    .eq('athlete_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return jsonError(error.message, 400);
  }

  const rows = data ?? [];

  const normalized = rows.map((row: any) => {
    const opp = row.opportunities ?? row.opportunity ?? null;
    let ownerId: string | null =
      (opp && (opp.owner_id as string)) ??
      (opp && (opp.created_by as string)) ??
      null;

    return {
      id: row.id,
      opportunityId: row.opportunity_id,
      athleteId: row.athlete_id,
      note: row.note,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      opportunity: opp
        ? {
            id: opp.id,
            title: opp.title,
            role: opp.role,
            status: opp.status,
            country: opp.country,
            city: opp.city,
            owner_id: opp.owner_id ?? null,
            created_by: opp.created_by ?? null,
            ownerId,
          }
        : null,
    };
  });

  return NextResponse.json({ data: normalized });
});

/**
 * POST /api/applications
 * Crea una candidatura per un'opportunità.
 * Body: { opportunity_id: string, note?: string }
 */
export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    await rateLimit(req, {
      key: `applications:CREATE:${user.id}`,
      limit: 30,
      window: '1m',
    } as any);
  } catch {
    return jsonError('Too Many Requests', 429);
  }

  const body = await req.json().catch(() => null);

  if (!body || !body.opportunity_id) {
    return jsonError('Missing opportunity_id', 400);
  }

  const opportunityId = String(body.opportunity_id);
  let note: string | null =
    typeof body.note === 'string' ? body.note.trim() : null;

  if (note && note.length > 500) {
    note = note.slice(0, 500);
  }

  // Verifica opportunità esistente
  const { data: opp, error: oppErr } = await supabase
    .from('opportunities')
    .select('id, owner_id, created_by')
    .eq('id', opportunityId)
    .maybeSingle();

  if (oppErr || !opp) {
    return jsonError('Opportunity not found', 404);
  }

  const ownerId =
    (opp as any).owner_id ??
    (opp as any).created_by ??
    null;

  // Impedisci candidatura al proprio annuncio
  if (ownerId && ownerId === user.id) {
    return jsonError('You cannot apply to your own opportunity', 400);
  }

  // Evita duplicati
  const { data: existing, error: existingErr } = await supabase
    .from('applications')
    .select('id')
    .eq('opportunity_id', opportunityId)
    .eq('athlete_id', user.id)
    .limit(1);

  if (existingErr) {
    return jsonError(existingErr.message, 400);
  }

  if (existing && existing.length > 0) {
    return jsonError('Application already exists', 409);
  }

  // Crea candidatura
  const { data: created, error: createErr } = await supabase
    .from('applications')
    .insert({
      opportunity_id: opportunityId,
      athlete_id: user.id,
      note,
      status: 'submitted',
    })
    .select()
    .single();

  if (createErr || !created) {
    return jsonError(
      createErr?.message ?? 'Failed to create application',
      400,
    );
  }

  return NextResponse.json({ data: created }, { status: 201 });
});
