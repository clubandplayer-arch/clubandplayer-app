mkdir -p components

cat > components/ReportButton.tsx <<'TSX'
'use client'

import { useMemo, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type Props = {
  targetType: 'opportunity'
  targetId: string
}

const REASONS = [
  { value: 'spam', label: 'Spam / promozionale' },
  { value: 'illecito', label: 'Contenuto illecito' },
  { value: 'offensivo', label: 'Contenuto offensivo' },
  { value: 'altro', label: 'Altro' },
] as const

export default function ReportButton({ targetType, targetId }: Props) {
  const supabase = useMemo(() => supabaseBrowser(), [])
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<typeof REASONS[number]['value']>('spam')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<string>('')

  const submit = async () => {
    setMsg('')
    setSubmitting(true)

    const { data: ures } = await supabase.auth.getUser()
    const user = ures?.user ?? null
    if (!user) {
      setMsg('Devi essere loggato per inviare una segnalazione.')
      setSubmitting(false)
      return
    }

    const { data: exists, error: e1 } = await supabase
      .from('reports')
      .select('id')
      .eq('user_id', user.id)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .eq('status', 'open')
      .maybeSingle()

    if (e1) {
      setMsg(`Errore: ${e1.message}`)
      setSubmitting(false)
      return
    }
    if (exists) {
      setMsg('Hai già inviato una segnalazione per questo contenuto (in attesa di revisione).')
      setSubmitting(false)
      return
    }

    const { error } = await supabase.from('reports').insert({
      user_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      description: description || null,
      status: 'open',
    })

    setSubmitting(false)
    if (error) {
      setMsg(`Errore invio: ${error.message}`)
      return
    }

    setMsg('Segnalazione inviata. Grazie!')
    setTimeout(() => {
      setOpen(false)
      setDescription('')
      setReason('spam')
      setMsg('')
    }, 1000)
  }

  return (
    <div style={{ display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          padding: '6px 10px',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          cursor: 'pointer',
          background: '#fff'
        }}
      >
        Segnala
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.35)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 50,
          }}
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(520px, 92vw)',
              background: '#fff',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              padding: 16,
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Segnala contenuto</h3>
            <p style={{ marginTop: 0, opacity: .8, fontSize: 14 }}>
              Indica il motivo della segnalazione e, se vuoi, aggiungi un commento.
            </p>

            <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: 13 }}>Motivo</span>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as any)}
                  disabled={submitting}
                  style={{ padding: 8, borderRadius: 8, border: '1px solid #e5e7eb' }}
                >
                  {REASONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: 13 }}>Dettagli (opzionale)</span>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={submitting}
                  style={{ padding: 8, borderRadius: 8, border: '1px solid #e5e7eb', resize: 'vertical' }}
                />
              </label>

              {msg && (
                <p style={{ margin: 0, color: msg.startsWith('Errore') ? '#b91c1c' : '#065f46' }}>
                  {msg}
                </p>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => !submitting && setOpen(false)}
                  disabled={submitting}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    background: submitting ? '#f3f4f6' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  {submitting ? 'Invio…' : 'Invia segnalazione'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
TSX
