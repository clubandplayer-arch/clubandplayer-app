import { NextResponse } from 'next/server';
import { jsonError, withAuth } from '@/lib/api/auth';

export const runtime = 'nodejs';

export const POST = withAuth(async (_req, { supabase, user }) => {
  try {
    const { error, count } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString(), read: true }, { count: 'exact' })
      .eq('user_id', user.id)
      .is('read_at', null);

    if (error) return jsonError(error.message, 500);

    return NextResponse.json({ success: true, updated: count || 0 });
  } catch (e: any) {
    return jsonError(e?.message || 'Errore inatteso', 500);
  }
});
