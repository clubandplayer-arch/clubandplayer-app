'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import NotificationsBell from './NotificationsBell'

type Profile = {
  account_type: 'athlete' | 'club' | null
  is_admin: boolean | null
}

export default function Navbar() {
  const pathname = usePathname()
  const supabase = supabaseBrowser()

  const [session, setSession] = useState<boolean>(false)
  const [profile, setProfile] = useState<Profile | null>(null)

  const loadProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setSession(!!user)
    if (!user) {
      setProfile(null)
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('account_type, is_admin')
      .eq('id', user.id)
      .single()
    setProfile((data as Profile) ?? { account_type: null, is_admin: false })
  }, [supabase])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const active = (href: string) =>
    pathname === href ? 'text-blue-700 font-semibold' : 'text-gray-800'

  return (
    <nav className="w-full border-b bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
        <Link href="/" className="text-lg font-bold">
          Club&Player
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/" className={active('/')}>
            Home
          </Link>
          <Link href="/opportunities" className={active('/opportunities')}>
            Opportunità
          </Link>
          <Link href="/search/athletes" className={active('/search/athletes')}>
            Atleti
          </Link>
          <Link href="/search/club" className={active('/search/club')}>
            Club
          </Link>
          <Link href="/favorites" className={active('/favorites')}>
            Preferiti
          </Link>
          {/* Link Moderazione solo admin */}
          {profile?.is_admin ? (
            <Link href="/admin/reports" className={active('/admin/reports')}>
              Moderazione
            </Link>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-4">
          {/* Campanella notifiche */}
          {session ? <NotificationsBell /> : null}

          {/* Onboarding link se account_type mancante */}
          {profile && !profile.account_type ? (
            <Link href="/onboarding" className="underline">
              Onboarding
            </Link>
          ) : null}

          {session ? (
            <>
              <Link href="/settings" className={active('/settings')}>
                Impostazioni
              </Link>
              <button
                onClick={signOut}
                className="text-gray-700 hover:text-black underline"
              >
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" className="underline">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
