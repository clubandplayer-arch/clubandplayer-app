import { NextResponse } from 'next/server';
import { withAuth, jsonError } from '@/lib/api/auth';

export const runtime = 'nodejs';

export const GET = withAuth(async (_req, { supabase, user }) => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .or('read_at.is.null,read.eq.false');

    if (error) return jsonError(error.message, 400);

    return NextResponse.json({ count: count || 0 });
  } catch (e: any) {
    return jsonError(e?.message || 'Errore inatteso', 400);
  }
});
