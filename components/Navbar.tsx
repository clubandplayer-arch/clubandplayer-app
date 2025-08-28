'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Profile = {
  account_type: 'athlete' | 'club' | null
}

export default function Navbar() {
  const pathname = usePathname()
  const [userId, setUserId] = useState<string | null>(null)
  const [accountType, setAccountType] = useState<Profile['account_type']>(null)
  const supabase = supabaseBrowser()

  useEffect(() => {
    const load = async () => {
      // utente
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id ?? null)

      // account_type (se loggato)
      if (user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('account_type')
          .eq('id', user.id)
          .maybeSingle()
        setAccountType((data?.account_type as Profile['account_type']) ?? null)
      } else {
        setAccountType(null)
      }
    }
    void load()
  }, [supabase])

  const linkClass = (href: string) =>
    `hover:text-yellow-400 ${pathname === href ? 'text-yellow-400' : ''}`

  return (
    <nav className="bg-gray-900 text-white px-4 py-3 flex justify-between items-center">
      <div className="flex gap-4">
        <Link href="/" className={linkClass('/')}>Home</Link>

        {/* Opportunità (feed annunci) */}
        <Link href="/opportunities" className={linkClass('/opportunities')}>Opportunità</Link>

        {/* Ricerca atleti (per club) */}
        <Link href="/search/athletes" className={linkClass('/search/athletes')}>Atleti</Link>

        {/* Ricerca club (per atleti) */}
        <Link href="/search/club" className={linkClass('/search/club')}>Club</Link>

        {/* Preferiti (per atleti) */}
        <Link href="/favorites" className={linkClass('/favorites')}>Preferiti</Link>

        {/* Profilo club (solo se account club) */}
        {userId && accountType === 'club' && (
          <Link href="/club/profile" className={linkClass('/club/profile')}>Profilo club</Link>
        )}
      </div>

      <div className="flex gap-4 items-center">
        {userId ? (
          <>
            {/* Onboarding (solo se manca account_type) */}
            {!accountType && (
              <Link href="/onboarding" className={linkClass('/onboarding')}>Onboarding</Link>
            )}

            <button
              onClick={async () => {
                await supabase.auth.signOut()
                window.location.href = '/'
              }}
              className="hover:text-yellow-400"
            >
              Logout
            </button>
          </>
        ) : (
          <Link href="/login" className={linkClass('/login')}>Login</Link>
        )}
      </div>
    </nav>
  )
}
