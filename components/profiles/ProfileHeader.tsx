// components/profiles/ProfileHeader.tsx
'use client'
import { useEffect, useState } from 'react'

type AccountType = 'club' | 'athlete' | null

export default function ProfileHeader() {
  const [role, setRole] = useState<AccountType>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch('/api/profiles/me', { credentials: 'include', cache: 'no-store' })
        const j = await r.json().catch(() => ({}))
        const data = (j && typeof j === 'object' && 'data' in j ? (j as any).data : j) || {}
        setRole((data?.account_type as AccountType) ?? null)
      } catch {
        setRole(null)
      }
    })()
  }, [])

  const isClub = role === 'club'

  return (
    <header className="mb-4">
      <h1 className="text-2xl font-semibold">
        {isClub ? 'Il mio profilo club' : 'Il mio profilo atleta'}
      </h1>
      <p className="mt-1 text-sm text-gray-600">
        Aggiorna i tuoi dati per migliorare il matching con club e opportunità.
      </p>
    </header>
  )
}
