'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import NotificationsBell from './NotificationsBell'
import BrandLogo from '@/components/brand/BrandLogo'
import { buildProfileDisplayName } from '@/lib/displayName'
import { BadgeCheck } from 'lucide-react'

type ProfileRow = {
  id: string
  account_type: 'athlete' | 'club' | null
  is_admin: boolean | null
  avatar_url: string | null
  full_name: string | null
  display_name: string | null
}

export default function Navbar() {
  const pathname = usePathname()
  const supabase = useMemo(() => supabaseBrowser(), [])
  const [sessionUserId, setSessionUserId] = useState<string | null>(null)
  const [accountType, setAccountType] = useState<'athlete' | 'club' | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [profileName, setProfileName] = useState<string>('')
  const [isVerified, setIsVerified] = useState<boolean>(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement | null>(null)
  const profileButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const fetchMe = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setSessionUserId(null)
        setAccountType(null)
        setIsAdmin(false)
        setIsVerified(false)
        return
      }
      setSessionUserId(user.id)

      const { data } = await supabase
        .from('profiles')
        .select('id, account_type, is_admin, avatar_url, full_name, display_name')
        .eq('id', user.id)
        .maybeSingle()

      if (data) {
        setAccountType((data.account_type as ProfileRow['account_type']) ?? null)
        setIsAdmin(Boolean(data.is_admin))
        setAvatarUrl(data.avatar_url ?? null)
        setProfileName(buildProfileDisplayName(data.full_name, data.display_name, 'Profilo'))
        if (data.account_type === 'club' && data.id) {
          const { data: verificationData } = await supabase
            .from('club_verification_requests_view')
            .select('is_verified')
            .eq('club_id', data.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          setIsVerified(verificationData?.is_verified === true)
        } else {
          setIsVerified(false)
        }
      }
    }

    fetchMe()
  }, [supabase, pathname])

  const isOnboardingNeeded = sessionUserId !== null && accountType == null
  const isClub = accountType === 'club'
  const profileHref = isClub ? '/club/profile' : '/player/profile'

  const profileInitials = useMemo(() => {
    const trimmed = profileName.trim()
    if (!trimmed) return 'CP'
    const parts = trimmed.split(/\s+/).filter(Boolean)
    const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase())
    return letters.join('') || 'CP'
  }, [profileName])

  const linkClass = (href: string) =>
    `px-3 py-2 rounded-md text-sm font-medium ${
      pathname === href ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }`

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  useEffect(() => {
    if (!isProfileMenuOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false)
      }
    }

    const handlePointerDown = (event: Event) => {
      const target = event.target as Node | null
      if (!target) return
      if (profileMenuRef.current?.contains(target) || profileButtonRef.current?.contains(target)) {
        return
      }
      setIsProfileMenuOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [isProfileMenuOpen])

  return (
    <nav className="sticky top-0 z-40 bg-gray-800">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between" style={{ ['--nav-h' as any]: '64px' }}>
          {/* Left */}
          <div className="flex h-full items-center gap-3">
            <div className="min-w-0 flex h-10 flex-shrink-0 items-center overflow-hidden">
              <BrandLogo variant="header" href="/feed" priority />
            </div>

            <div className="ml-4 hidden md:flex items-center gap-1">
              <Link href="/" className={linkClass('/')}>Home</Link>
              <Link href="/opportunities" className={linkClass('/opportunities')}>Opportunità</Link>
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

            {/* Login/Profile */}
            {sessionUserId ? (
              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  ref={profileButtonRef}
                  onClick={() => setIsProfileMenuOpen((v) => !v)}
                  aria-label="Apri menu profilo"
                  aria-haspopup="menu"
                  aria-expanded={isProfileMenuOpen}
                  aria-controls="navbar-profile-menu"
                  className="inline-flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800"
                  style={{ width: 'calc(var(--nav-h) * 0.9)', height: 'calc(var(--nav-h) * 0.9)' }}
                >
                  <span className="sr-only">Apri menu profilo</span>
                  <span className="relative block h-full w-full overflow-hidden rounded-full border border-gray-600">
                    {avatarUrl ? (
                      <Image src={avatarUrl} alt="Profilo" fill className="object-cover" sizes="58px" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-gray-700 text-sm font-semibold text-gray-200">
                        {profileInitials}
                      </span>
                    )}
                    {isClub && isVerified ? (
                      <span
                        className="absolute bottom-0 right-0 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white text-blue-600 shadow ring-1 ring-blue-200"
                        title="Profilo verificato"
                      >
                        <BadgeCheck className="h-3 w-3" aria-hidden="true" />
                      </span>
                    ) : null}
                  </span>
                </button>
                {isProfileMenuOpen ? (
                  <div
                    id="navbar-profile-menu"
                    role="menu"
                    className="absolute right-0 mt-2 w-52 rounded-xl border border-gray-700 bg-gray-800 p-1 text-sm text-gray-100 shadow-lg"
                  >
                    {isClub && (
                      <Link
                        href="/opportunities/new"
                        role="menuitem"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="block rounded-lg px-3 py-2 text-gray-100 transition hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                      >
                        Crea opportunità
                      </Link>
                    )}
                    <Link
                      href={profileHref}
                      role="menuitem"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="block rounded-lg px-3 py-2 text-gray-100 transition hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                    >
                      Modifica profilo
                    </Link>
                    {isClub && (
                      <Link
                        href="/club/verification"
                        role="menuitem"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="block rounded-lg px-3 py-2 text-gray-100 transition hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                      >
                        Verifica profilo
                      </Link>
                    )}
                    <div className="my-1 h-px bg-gray-700" role="separator" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsProfileMenuOpen(false)
                        void handleLogout()
                      }}
                      className="block w-full rounded-lg px-3 py-2 text-left text-red-300 transition hover:bg-red-950/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
                    >
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>
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
