'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export default function NotificationsBell() {
  const supabase = supabaseBrowser();
  const [unread, setUnread] = useState<number>(0);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUnread(0);
      return;
    }
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);
    setUnread(count ?? 0);
  }, [supabase]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('notifications_bell_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () =>
        load(),
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [load, supabase]);

  return (
    <Link href="/notifications" className="relative inline-flex items-center">
      <span aria-hidden>🔔</span>
      {unread > 0 && (
        <span className="ml-1 rounded bg-red-600 px-1.5 py-0.5 text-xs text-white">{unread}</span>
      )}
    </Link>
  );
}
