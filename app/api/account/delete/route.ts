import type { NextRequest } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';
import { successResponse } from '@/lib/api/standardResponses';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';

type SupabaseErrorLike = { code?: string; message?: string };

function isMissingTableError(error: SupabaseErrorLike | null | undefined): boolean {
  return error?.code === '42P01';
}

async function safeDeleteByUserId(admin: NonNullable<ReturnType<typeof getSupabaseAdminClientOrNull>>, table: string, userId: string) {
  const { error } = await admin.from(table).delete().eq('user_id', userId);
  if (error && !isMissingTableError(error)) throw error;
}

export const DELETE = withAuth(async (_req: NextRequest, { user }) => {
  const admin = getSupabaseAdminClientOrNull();
  if (!admin) return jsonError('Service role non configurato', 500);

  const userId = user.id;
  if (!userId) return jsonError('Unauthorized', 401);

  try {
    // Cleanup dati opzionali legati all\'utente (tabelle potrebbero non esistere in tutti gli ambienti).
    await safeDeleteByUserId(admin, 'profiles', userId);
    await safeDeleteByUserId(admin, 'push_tokens', userId);

    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(userId);
    if (deleteAuthError) return jsonError(deleteAuthError.message || 'Errore eliminazione account', 500);

    return successResponse({});
  } catch (error: unknown) {
    const err = error as SupabaseErrorLike;
    return jsonError(err?.message || 'Unexpected error', 500);
  }
});
