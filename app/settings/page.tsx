// app/settings/page.tsx
'use client'

export const dynamic = 'force-dynamic';
export const fetchCache = 'default-no-store';



import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Profile = {
  id: string
  account_type: 'athlete' | 'club' | 'fan' | null
  notify_email_new_message: boolean | null
}

type BlockedItem = {
  blocked_profile_id: string
  display_name: string | null
  full_name: string | null
  avatar_url: string | null
  account_type: 'athlete' | 'club' | 'fan' | null
}

export default function SettingsPage() {
  const supabase = useMemo(() => supabaseBrowser(), [])
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [msg, setMsg] = useState<string>('')
  const [deleteMsg, setDeleteMsg] = useState<string>('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const [userId, setUserId] = useState<string | null>(null)
  const [accountType, setAccountType] = useState<'athlete' | 'club' | 'fan' | null>(null)
  const [notifyEmailNewMessage, setNotifyEmailNewMessage] = useState<boolean>(false)
  const [blockedUsers, setBlockedUsers] = useState<BlockedItem[]>([])
  const [blockedLoading, setBlockedLoading] = useState(false)
  const [blockedMsg, setBlockedMsg] = useState('')
  const [unblockingId, setUnblockingId] = useState<string | null>(null)

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
        .eq('user_id', user.id)
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

      setBlockedLoading(true)
      const blocksRes = await fetch('/api/blocks', { credentials: 'include', cache: 'no-store' })
      const blocksJson = await blocksRes.json().catch(() => ({}))
      if (blocksRes.ok && blocksJson?.ok) {
        setBlockedUsers(Array.isArray(blocksJson.items) ? blocksJson.items : [])
        setBlockedMsg('')
      } else {
        setBlockedMsg(blocksJson?.error || 'Errore nel caricamento utenti bloccati.')
      }
      setBlockedLoading(false)
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
      .eq('user_id', userId)

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

  const deleteAccount = async () => {
    if (deleting) return
    setDeleteMsg('')

    const firstConfirm = window.confirm(
      'Questa azione è definitiva. Verranno eliminati il tuo account, il profilo e i dati collegati. Non potrai recuperarlo.'
    )
    if (!firstConfirm) return

    if (deleteConfirmText.trim().toUpperCase() !== 'ELIMINA') {
      setDeleteMsg('Per confermare devi digitare esattamente ELIMINA.')
      return
    }

    const secondConfirm = window.confirm('Conferma finale: vuoi eliminare definitivamente il tuo account Club & Player?')
    if (!secondConfirm) return

    setDeleting(true)
    try {
      const res = await fetch('/api/account/delete', {
        method: 'DELETE',
        credentials: 'include',
      })
      const body = await res.json().catch(() => null)
      if (!res.ok || !body?.ok) {
        setDeleteMsg(body?.error || 'Errore durante eliminazione account. Riprova.')
        setDeleting(false)
        return
      }

      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch {
      setDeleteMsg('Errore di rete durante eliminazione account. Riprova.')
      setDeleting(false)
    }
  }

  const goBack = () => {
    // se non c'è history (es. aperto da link diretto), vai al feed
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else router.push('/feed')
  }

  const unblockUser = async (blockedProfileId: string) => {
    if (unblockingId) return
    setBlockedMsg('')
    setUnblockingId(blockedProfileId)
    try {
      const res = await fetch('/api/blocks', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedProfileId }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body?.ok) {
        setBlockedMsg(body?.error || 'Errore durante lo sblocco.')
        return
      }
      setBlockedUsers((curr) => curr.filter((item) => item.blocked_profile_id !== blockedProfileId))
    } catch {
      setBlockedMsg('Errore di rete durante lo sblocco.')
    } finally {
      setUnblockingId(null)
    }
  }

  const accountTypeLabel = accountType === 'athlete'
    ? 'Player'
    : accountType === 'club'
      ? 'Club'
      : accountType === 'fan'
        ? 'Fan'
        : '—'

  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: 24 }}>
      {/* Action bar: back + link al feed */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <button
          onClick={goBack}
          className="btn btn-outline"
          aria-label="Torna alla pagina precedente"
        >
          ← Torna indietro
        </button>

        <Link href="/feed" className="btn btn-ghost">
          Vai al feed →
        </Link>
      </div>

      <h1>Impostazioni</h1>

      {loading && <p>Caricamento…</p>}
      {!!msg && (
        <p style={{ color: msg.includes('Errore') ? '#b91c1c' : '#065f46' }}>{msg}</p>
      )}

      {!loading && (
        <div style={{ display: 'grid', gap: 16 }}>
          <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
            <h2 style={{ marginTop: 0 }}>Profilo</h2>
            <p style={{ margin: '8px 0' }}>
              Tipo account: <b>{accountTypeLabel}</b>
            </p>
            <p style={{ margin: '8px 0' }}>
              Profilo pubblico: <Link href="/u/me">/u/me</Link>
            </p>
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
                  cursor: 'pointer',
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
                border: '1px solid #e5e7eb',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              Logout
            </button>
          </section>

          <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
            <h2 style={{ marginTop: 0 }}>Utenti bloccati</h2>
            {blockedLoading ? <p>Caricamento utenti bloccati…</p> : null}
            {blockedMsg ? <p style={{ color: '#b91c1c' }}>{blockedMsg}</p> : null}
            {!blockedLoading && blockedUsers.length === 0 ? <p>Non hai bloccato nessun utente.</p> : null}

            {!blockedLoading && blockedUsers.length > 0 ? (
              <ul style={{ display: 'grid', gap: 10, margin: 0, padding: 0, listStyle: 'none' }}>
                {blockedUsers.map((item) => {
                  const label = item.display_name || item.full_name || item.blocked_profile_id
                  const typeLabel = item.account_type === 'athlete' ? 'Player' : item.account_type === 'club' ? 'Club' : item.account_type === 'fan' ? 'Fan' : '—'
                  return (
                    <li key={item.blocked_profile_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, border: '1px solid #e5e7eb', borderRadius: 10, padding: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {item.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.avatar_url} alt={label} style={{ width: 36, height: 36, borderRadius: '9999px', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: '9999px', background: '#e5e7eb' }} aria-hidden />
                        )}
                        <div>
                          <p style={{ margin: 0, fontWeight: 600 }}>{label}</p>
                          <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>{typeLabel}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => unblockUser(item.blocked_profile_id)}
                        disabled={unblockingId === item.blocked_profile_id}
                        style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}
                      >
                        {unblockingId === item.blocked_profile_id ? 'Sblocco…' : 'Sblocca'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </section>

          <section style={{ border: '1px solid #fecaca', borderRadius: 12, padding: 16, background: '#fff7f7' }}>
            <h2 style={{ marginTop: 0, color: '#991b1b' }}>Zona pericolosa</h2>
            <p style={{ margin: '8px 0', color: '#7f1d1d' }}>
              Eliminando l&apos;account perderai definitivamente accesso a profilo e dati collegati. Questa azione non è reversibile.
            </p>
            <label style={{ display: 'grid', gap: 6, marginTop: 12 }}>
              <span style={{ fontSize: 14, color: '#7f1d1d' }}>
                Digita <b>ELIMINA</b> per abilitare la cancellazione:
              </span>
              <input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="ELIMINA"
                autoComplete="off"
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid #fecaca',
                  background: '#fff',
                }}
              />
            </label>
            {!!deleteMsg && (
              <p style={{ marginTop: 10, color: '#b91c1c' }}>
                {deleteMsg}
              </p>
            )}
            <div style={{ marginTop: 12 }}>
              <button
                onClick={deleteAccount}
                disabled={deleting}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #dc2626',
                  background: '#dc2626',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                {deleting ? 'Eliminazione…' : 'Elimina account'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
