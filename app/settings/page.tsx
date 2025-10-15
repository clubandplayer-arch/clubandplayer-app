'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import InterestAreaForm from '@/components/profiles/InterestAreaForm' // 👈 PLURALE

type Profile = {
  id: string
  account_type: 'athlete' | 'club' | null
  notify_email_new_message: boolean | null
}

export default function SettingsPage() {
  const supabase = useMemo(() => supabaseBrowser(), [])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string>('')

  const [userId, setUserId] = useState<string | null>(null)
  const [accountType, setAccountType] = useState<'athlete' | 'club' | null>(null)
  const [notifyEmailNewMessage, setNotifyEmailNewMessage] = useState<boolean>(false)

  useEffect(() => {
    const load = async () => {
      setMsg('')
      setLoading(true)
      const { data: ures } = await supabase.auth.getUser()
      const user = ures?.user ?? null
      if (!user) {
        setMsg('Devi effettuare il login.')
        setLoading(false)
        return
      }
      setUserId(user.id)

      const { data, error } = await supabase
        .from('profiles')
        .select('id, account_type, notify_email_new_message')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        setMsg(`Errore caricamento profilo: ${error.message}`)
        setLoading(false)
        return
      }

      const p = (data ?? null) as Profile | null
      setAccountType(p?.account_type ?? null)
      setNotifyEmailNewMessage(!!p?.notify_email_new_message)
      setLoading(false)
    }

    load()
  }, [supabase])

  const save = async () => {
    if (!userId) return
    setMsg('')
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        notify_email_new_message: notifyEmailNewMessage,
      })
      .eq('id', userId)

    setSaving(false)
    if (error) {
      setMsg(`Errore salvataggio: ${error.message}`)
      return
    }
    setMsg('Impostazioni salvate.')
  }

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: 24 }}>
      <h1>Impostazioni</h1>

      {loading && <p>Caricamento…</p>}
      {!!msg && <p style={{ color: msg.includes('Errore') ? '#b91c1c' : '#065f46' }}>{msg}</p>}

      {!loading && (
        <div style={{ display: 'grid', gap: 16 }}>
          <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
            <h2 style={{ marginTop: 0 }}>Profilo</h2>
            <p style={{ margin: '8px 0' }}>
              Tipo account: <b>{accountType ?? '—'}</b>
            </p>
            <p style={{ margin: '8px 0' }}>
              Profilo pubblico: <Link href="/u/me">/u/me</Link>
            </p>
          </section>

          <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
            <h2 style={{ marginTop: 0 }}>Zona di interesse</h2>
            <InterestAreaForm />
          </section>

          <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
            <h2 style={{ marginTop: 0 }}>Notifiche</h2>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={notifyEmailNewMessage}
                onChange={(e) => setNotifyEmailNewMessage(e.target.checked)}
              />
              Ricevi email per nuovi messaggi
            </label>

            <div style={{ marginTop: 12 }}>
              <button
                onClick={save}
                disabled={saving}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  background: '#fff',
                  cursor: 'pointer'
                }}
              >
                {saving ? 'Salvataggio…' : 'Salva'}
              </button>
            </div>
          </section>

          <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
            <h2 style={{ marginTop: 0 }}>Sessione</h2>
            <button
              onClick={logout}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid '#e5e7eb',
                background: '#fff',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </section>
        </div>
      )}
    </main>
  )
}
