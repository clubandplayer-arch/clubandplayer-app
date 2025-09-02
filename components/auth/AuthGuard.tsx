'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

const BYPASS =
  process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true' &&
  process.env.NODE_ENV !== 'production';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = supabaseBrowser();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (BYPASS) {
        if (active) setOk(true);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) { router.replace('/login'); return; }
      setOk(true);
    })();
    return () => { active = false; };
  }, [router, supabase]);

  if (!ok) return null;

  return (
    <>
      {BYPASS && (
        <div className="fixed bottom-2 right-2 rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800 shadow">
          AUTH BYPASS (preview/dev)
        </div>
      )}
      {children}
    </>
  );
}
