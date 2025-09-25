'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export function useSupabaseAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const { data } = await supabase.auth.getUser();
      if (mounted) setUser(data.user ?? null);
      setLoading(false);
    };
    run();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
