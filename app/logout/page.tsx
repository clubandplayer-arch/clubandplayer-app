'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export default function LogoutPage() {
  const router = useRouter();
  useEffect(() => {
    const run = async () => {
      await supabaseBrowser().auth.signOut();
      router.replace('/login');
    };
    run();
  }, [router]);
  return <p className="p-6">Uscita in corso…</p>;
}
