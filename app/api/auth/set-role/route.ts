import { NextRequest, NextResponse } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';

export const runtime = 'nodejs';

type AccountType = 'club' | 'athlete' | 'fan';

function normalizeRole(value: unknown): AccountType | null {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'club') return 'club';
  if (normalized === 'athlete') return 'athlete';
  if (normalized === 'fan') return 'fan';
  return null;
}

export const POST = withAuth(async (req: NextRequest, { supabase, user }) => {
  const body = await req.json().catch(() => ({}));
  const accountType = normalizeRole((body as Record<string, unknown>)?.account_type);

  if (!accountType) {
    return jsonError('account_type non valido', 400);
  }

  const { data: existing, error: existingError } = await supabase
    .from('profiles')
    .select('account_type')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingError) {
    return jsonError(existingError.message, 400);
  }

  if (existing?.account_type) {
    return jsonError('Ruolo già impostato', 409);
  }

  const updates: Record<string, string> = { account_type: accountType };
  if (accountType === 'club') {
    updates.role = 'Club';
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        user_id: user.id,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    .select('account_type')
    .maybeSingle();

  if (error) {
    return jsonError(error.message, 400);
  }

  return NextResponse.json({ ok: true, account_type: data?.account_type ?? accountType });
});
