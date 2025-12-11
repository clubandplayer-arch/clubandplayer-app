'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import NotificationsBell from './NotificationsBell'
import BrandLogo from './BrandLogo'

type ProfileRow = {
  id: string
  account_type: 'athlete' | 'club' | null
  is_admin: boolean | null
}

export default function Navbar() {
  const pathname = usePathname()
  const supabase = useMemo(() => supabaseBrowser(), [])
  const [sessionUserId, setSessionUserId] = useState<string | null>(null)
  const [accountType, setAccountType] = useState<'athlete' | 'club' | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)

  useEffect(() => {
    const fetchMe = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setSessionUserId(null)
        setAccountType(null)
        setIsAdmin(false)
        return
      }
      setSessionUserId(user.id)

      const { data } = await supabase
        .from('profiles')
        .select('id, account_type, is_admin')
        .eq('id', user.id)
        .maybeSingle()

      if (data) {
        setAccountType((data.account_type as ProfileRow['account_type']) ?? null)
        setIsAdmin(Boolean(data.is_admin))
      }
    }

    fetchMe()
  }, [supabase, pathname])

  const isOnboardingNeeded = sessionUserId !== null && accountType == null

  const linkClass = (href: string) =>
    `px-3 py-2 rounded-md text-sm font-medium ${
      pathname === href ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }`

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <nav className="sticky top-0 z-40 bg-gray-800">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-3">
            <BrandLogo variant="navbar" href="/" />

            <div className="ml-4 hidden md:flex items-center gap-1">
              <Link href="/" className={linkClass('/')}>Home</Link>
              <Link href="/opportunities" className={linkClass('/opportunities')}>Opportunità</Link>
              <Link href="/search-map?type=player" className={linkClass('/search-map')}>Atleti</Link>
              <Link href="/search-map?type=club" className={linkClass('/search-map')}>Club</Link>
              <Link href="/favorites" className={linkClass('/favorites')}>Preferiti</Link>
              {isAdmin && (
                <Link href="/admin/reports" className={linkClass('/admin/reports')}>Moderazione</Link>
              )}
              {isOnboardingNeeded && (
                <Link href="/onboarding" className={linkClass('/onboarding')}>Onboarding</Link>
              )}
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            {/* Campanella notifiche */}
            {sessionUserId && <NotificationsBell />}

            {/* Login/Logout */}
            {sessionUserId ? (
              <>
                <Link href="/settings" className="text-sm text-gray-300 hover:text-white">Impostazioni</Link>
                <button
                  onClick={handleLogout}
                  className="rounded-md bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600"
                >
                  Esci
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                Accedi
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
