import { NextResponse } from 'next/server';
import { getSupabaseAdminClientOrNull } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type SignupStatsResponse = {
  clubs: number;
  players: number;
  fans: number;
};

const EMPTY_STATS: SignupStatsResponse = { clubs: 0, players: 0, fans: 0 };

async function countProfilesByRole(role: 'club' | 'fan' | 'athlete') {
  const admin = getSupabaseAdminClientOrNull();

  if (admin) {
    const { count, error } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('account_type', role);

    if (error) throw error;
    return count ?? 0;
  }

  const supabase = await getSupabaseServerClient();
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('account_type', role);

  if (error) throw error;
  return count ?? 0;
}

export async function GET() {
  try {
    const [clubs, players, fans] = await Promise.all([
      countProfilesByRole('club'),
      countProfilesByRole('athlete'),
      countProfilesByRole('fan'),
    ]);

    return NextResponse.json<SignupStatsResponse>({ clubs, players, fans });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[api/public/signup-stats] failed to fetch counters', error);
    }
    return NextResponse.json<SignupStatsResponse>(EMPTY_STATS, { status: 200 });
  }
}
