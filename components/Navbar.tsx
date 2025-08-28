'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type MiniProfile = {
  account_type: 'athlete' | 'club' | null
}

export default function Navbar() {
  const pathname = usePathname()
  const supabase = useMemo(() => supabaseBrowser(), [])

  const [accountType, setAccountType] = useState<'athlete' | 'club' | null>(null)
  const [authed, setAuthed] = useState<boolean>(false)
  const [loadingLogout, setLoadingLogout] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: ures } = await supabase.auth.getUser()
      const user = ures?.user ?? null
      setAuthed(!!user)

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('account_type')
          .eq('id', user.id)
          .maybeSingle()

        setAccountType((data as MiniProfile | null)?.account_type ?? null)
      } else {
        setAccountType(null)
      }
    }
    load()
  }, [supabase])

  const linkStyle = (href: string) => ({
    padding: '8px 10px',
    borderRadius: 8,
    background: pathname === href ? '#f3f4f6' : 'transparent',
  } as React.CSSProperties)

  const handleLogout = async () => {
    setLoadingLogout(true)
    try {
      await supabase.auth.signOut()
    } finally {
      // torna alla home per evitare stati incoerenti
      window.location.href = '/'
    }
  }

  return (
    <nav
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        padding: '10px 16px',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      <Link href="/" style={{ fontWeight: 700, marginRight: 10 }}>
        Club&Player
      </Link>

      <Link href="/" style={linkStyle('/')}>Home</Link>
      <Link href="/opportunities" style={linkStyle('/opportunities')}>Opportunità</Link>
      <Link href="/search/athletes" style={linkStyle('/search/athletes')}>Atleti</Link>
      <Link href="/search/club" style={linkStyle('/search/club')}>Club</Link>
      <Link href="/favorites" style={linkStyle('/favorites')}>Preferiti</Link>

      {/* Link rapido alle candidature proprie: solo atleti autenticati */}
      {authed && accountType === 'athlete' && (
        <Link href="/applications" style={linkStyle('/applications')}>
          Candidature
        </Link>
      )}

      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        {authed ? (
          <>
            <Link href="/messages" style={linkStyle('/messages')}>Messaggi</Link>
            <Link href="/settings" style={linkStyle('/settings')}>Impostazioni</Link>
            <button
              onClick={handleLogout}
              disabled={loadingLogout}
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                background: '#fff',
                cursor: 'pointer'
              }}
            >
              {loadingLogout ? 'Logout…' : 'Logout'}
            </button>
          </>
        ) : (
          <Link href="/login" style={linkStyle('/login')}>Login</Link>
        )}
      </div>
    </nav>
  )
}
