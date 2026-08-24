// app/settings/page.tsx
'use client'

export const dynamic = 'force-dynamic';
export const fetchCache = 'default-no-store';



import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import { useI18n } from '@/components/i18n/I18nProvider'

type AccountType = 'athlete' | 'club' | 'fan' | 'staff' | 'institution'

type Profile = {
  id: string
  account_type: AccountType | null
  notify_email_new_message: boolean | null
}

const ROLE_OPTIONS: Array<{ value: AccountType; label: string }> = [
  { value: 'athlete', label: 'Giocatore' }, { value: 'staff', label: 'Staff Tecnico' },
  { value: 'club', label: 'Squadra' }, { value: 'fan', label: 'Tifoso' },
  { value: 'institution', label: 'Federazione/Ente' },
]

type BlockedItem = {
  blocked_profile_id: string
  display_name: string | null
  full_name: string | null
  avatar_url: string | null
  account_type: 'athlete' | 'club' | 'fan' | 'staff' | null
}

export default function SettingsPage() {
  const { t } = useI18n()
  const supabase = useMemo(() => supabaseBrowser(), [])
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [msg, setMsg] = useState<string>('')
  const [deleteMsg, setDeleteMsg] = useState<string>('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const [userId, setUserId] = useState<string | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [accountType, setAccountType] = useState<AccountType | null>(null)
  const [notifyEmailNewMessage, setNotifyEmailNewMessage] = useState<boolean>(false)
  const [showRoleRequest, setShowRoleRequest] = useState(false)
  const [requestedRole, setRequestedRole] = useState<AccountType | ''>('')
  const [roleReason, setRoleReason] = useState('')
  const [roleRequestSending, setRoleRequestSending] = useState(false)
  const [roleRequestMessage, setRoleRequestMessage] = useState('')
  const [roleRequestSent, setRoleRequestSent] = useState(false)
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
      setProfileId(p?.id ?? null)
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
    setMsg(t('settings.saved'))
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

    const secondConfirm = window.confirm('Conferma finale: vuoi eliminare definitivamente il tuo account Club and Player?')
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

  const sendRoleChangeRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (roleRequestSending || roleRequestSent) return
    setRoleRequestMessage('')
    if (!requestedRole || requestedRole === accountType) {
      setRoleRequestMessage('Seleziona un ruolo diverso da quello attuale.')
      return
    }
    if (roleReason.trim().length < 20) {
      setRoleRequestMessage('Spiega la motivazione utilizzando almeno 20 caratteri.')
      return
    }

    setRoleRequestSending(true)
    try {
      const response = await fetch('/api/account/role-change-request', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedRole, reason: roleReason.trim() }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok || !body?.ok) {
        setRoleRequestMessage(body?.error || 'Non è stato possibile inviare la richiesta. Riprova.')
        return
      }
      setRoleRequestSent(true)
      setRoleRequestMessage('Richiesta inviata. Il team la valuterà e ti contatterà all’indirizzo email del tuo account.')
    } catch {
      setRoleRequestMessage('Errore di rete durante l’invio. Riprova.')
    } finally {
      setRoleRequestSending(false)
    }
  }

  const accountTypeLabel = accountType === 'athlete'
    ? 'Giocatore'
    : accountType === 'club'
      ? 'Squadra'
      : accountType === 'fan'
        ? 'Tifoso'
        : accountType === 'staff'
          ? 'Staff Tecnico'
          : accountType === 'institution'
            ? 'Federazione/Ente'
        : '—'
  const publicProfileHref = accountType === 'club' && profileId
    ? `/clubs/${profileId}`
    : (accountType === 'athlete' || accountType === 'staff') && profileId
      ? `/players/${profileId}`
      : null

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

      <h1>{t('settings.title')}</h1>

      {loading && <p>{t('common.loading')}</p>}
      {!!msg && (
        <p style={{ color: msg.includes('Errore') ? '#b91c1c' : '#065f46' }}>{msg}</p>
      )}

      {!loading && (
        <div style={{ display: 'grid', gap: 16 }}>
          <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
            <h2 style={{ marginTop: 0 }}>{t('settings.profile')}</h2>
            <p style={{ margin: '8px 0' }}>
              Tipo account: <b>{accountTypeLabel}</b>
            </p>
            <p style={{ margin: '8px 0' }}>
              Profilo pubblico:{' '}
              {publicProfileHref ? (
                <Link href={publicProfileHref}>{publicProfileHref}</Link>
              ) : (
                <span> non disponibile per questo tipo account</span>
              )}
            </p>
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
              <h3 style={{ margin: '0 0 6px' }}>Hai scelto il ruolo sbagliato?</h3>
              <p style={{ margin: '0 0 12px', color: '#4b5563' }}>
                Invia una richiesta motivata al nostro team. Il cambio non è automatico: sarà valutato
                in base alle informazioni fornite e riceverai una risposta via email.
              </p>
              {!showRoleRequest ? (
                <button type="button" className="btn btn-primary" onClick={() => setShowRoleRequest(true)}>
                  Richiedi cambio ruolo
                </button>
              ) : (
                <form onSubmit={sendRoleChangeRequest} style={{ display: 'grid', gap: 12 }}>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontWeight: 600 }}>Nuovo ruolo desiderato</span>
                    <select
                      value={requestedRole}
                      onChange={(event) => setRequestedRole(event.target.value as AccountType | '')}
                      disabled={roleRequestSending || roleRequestSent}
                      required
                      style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db', background: '#fff' }}
                    >
                      <option value="">Seleziona un ruolo</option>
                      {ROLE_OPTIONS.filter((option) => option.value !== accountType).map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontWeight: 600 }}>Motivazione</span>
                    <textarea
                      value={roleReason}
                      onChange={(event) => setRoleReason(event.target.value)}
                      disabled={roleRequestSending || roleRequestSent}
                      required minLength={20} maxLength={2000} rows={5}
                      placeholder="Spiega perché desideri cambiare ruolo e aggiungi le informazioni utili alla valutazione."
                      style={{ padding: 10, borderRadius: 8, border: '1px solid #d1d5db', resize: 'vertical' }}
                    />
                    <span style={{ color: '#6b7280', fontSize: 13 }}>{roleReason.length}/2000 caratteri</span>
                  </label>
                  <p style={{ margin: 0, color: '#4b5563', fontSize: 14 }}>
                    L’invio non garantisce l’approvazione. Il ruolo attuale resterà invariato fino
                    all’eventuale conferma del team Club and Player.
                  </p>
                  {roleRequestMessage ? (
                    <p role="status" style={{ margin: 0, color: roleRequestSent ? '#065f46' : '#b91c1c', fontWeight: 600 }}>
                      {roleRequestMessage}
                    </p>
                  ) : null}
                  {!roleRequestSent ? (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button type="submit" className="btn btn-primary" disabled={roleRequestSending}>
                        {roleRequestSending ? 'Invio in corso…' : 'Invia richiesta'}
                      </button>
                      <button
                        type="button" className="btn btn-outline" disabled={roleRequestSending}
                        onClick={() => { setShowRoleRequest(false); setRoleRequestMessage('') }}
                      >
                        Annulla
                      </button>
                    </div>
                  ) : null}
                </form>
              )}
            </div>
          </section>

          <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
            <h2 style={{ marginTop: 0 }}>{t('settings.notifications')}</h2>
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
                {saving ? t('settings.saving') : t('settings.save')}
              </button>
            </div>
          </section>

          <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
            <h2 style={{ marginTop: 0 }}>{t('settings.session')}</h2>
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
                  const typeLabel = item.account_type === 'athlete' ? 'Player' : item.account_type === 'club' ? 'Club' : item.account_type === 'fan' ? 'Fan' : item.account_type === 'staff' ? 'Staff' : '—'
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
                {deleting ? t('settings.saving') : t('settings.deleteAccount')}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
