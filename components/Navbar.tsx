'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type AccountType = 'athlete' | 'club' | null

export default function Navbar() {
  const supabase = supabaseBrowser()
  const [userId, setUserId] = useState<string | null>(null)
  const [accountType, setAccountType] = useState<AccountType>(null)

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        setUserId(data.user.id)
        const { data: prof } = await supabase
          .from('profiles')
          .select('account_type')
          .eq('id', data.user.id)
          .limit(1)
        if (prof && prof[0]) setAccountType(prof[0].account_type as AccountType)
      }
    }
    void init()
  }, [supabase])

  return (
    <nav style={{display:'flex', gap:16, padding:12, background:'#f1f5f9'}}>
      <Link href="/">Home</Link>
      <Link href="/opportunities">Opportunità</Link>
      <Link href="/search/athletes">Cerca atleti</Link>
      <Link href="/messages">Messaggi</Link>
      <Link href="/alerts">Avvisi</Link>

      {/* Mostra Onboarding solo se loggato e account_type mancante */}
      {userId && !accountType && (
        <Link href="/onboarding" style={{color:'red', fontWeight:'bold'}}>
          Onboarding
        </Link>
      )}
    </nav>
  )
}
