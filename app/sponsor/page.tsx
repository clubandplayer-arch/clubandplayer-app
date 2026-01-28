'use client'

import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'

type LeadFormState = {
  fullName: string
  company: string
  email: string
  phone: string
  location: string
  message: string
  budget: string
  company_website: string
}

const INITIAL_FORM: LeadFormState = {
  fullName: '',
  company: '',
  email: '',
  phone: '',
  location: '',
  message: '',
  budget: '',
  company_website: '',
}

const COOLDOWN_MS = 20_000

export default function SponsorPage() {
  const [form, setForm] = useState<LeadFormState>(INITIAL_FORM)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null)

  const cooldownSeconds = useMemo(() => {
    if (!cooldownUntil) return null
    const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000))
    return remaining || null
  }, [cooldownUntil])

  const onChange =
    (field: keyof LeadFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }))
    }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (cooldownUntil && Date.now() < cooldownUntil) {
      setStatus('error')
      setError('Attendi qualche secondo prima di inviare di nuovo.')
      return
    }

    setStatus('loading')
    try {
      const res = await fetch('/api/ads/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const payload = await res.json().catch(() => ({}))
      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.error || 'Invio non riuscito. Riprova più tardi.')
      }

      setStatus('success')
      setForm(INITIAL_FORM)
      setCooldownUntil(Date.now() + COOLDOWN_MS)
    } catch (err: any) {
      setStatus('error')
      setError(err?.message ?? 'Invio non riuscito. Riprova più tardi.')
    }
  }

  const isBusy = status === 'loading'

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-12 lg:flex-row lg:items-start">
        <section className="space-y-6 lg:max-w-xl">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              Sponsorizza la tua attività su Club &amp; Player
            </h1>
            <p className="text-base text-slate-700 sm:text-lg">
              Raccontaci i tuoi obiettivi pubblicitari: ti aiutiamo a raggiungere player e club con campagne mirate.
            </p>
          </div>
          <ul className="space-y-3 text-base text-slate-700">
            <li>• Banner e creatività native su feed e profili</li>
            <li>• Targeting per province, sport e audience</li>
            <li>• Report con performance e risultati</li>
          </ul>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
            <p className="font-semibold text-slate-800">Tempi rapidi di risposta</p>
            <p>Il nostro team ti ricontatta con una proposta personalizzata.</p>
          </div>
        </section>

        <section className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Nome e Cognome
                <input
                  required
                  value={form.fullName}
                  onChange={onChange('fullName')}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  placeholder="Mario Rossi"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Nome attività / Azienda
                <input
                  required
                  value={form.company}
                  onChange={onChange('company')}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  placeholder="Nome della tua azienda"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Email
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={onChange('email')}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  placeholder="nome@azienda.it"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Telefono (facoltativo)
                <input
                  type="tel"
                  value={form.phone}
                  onChange={onChange('phone')}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  placeholder="+39 333 1234567"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Città / Provincia o Area di interesse
                <input
                  required
                  value={form.location}
                  onChange={onChange('location')}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  placeholder="Milano, Lombardia"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Budget indicativo (facoltativo)
                <input
                  value={form.budget}
                  onChange={onChange('budget')}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  placeholder="es. 1.000€ / mese"
                />
              </label>
            </div>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Messaggio
              <textarea
                required
                rows={4}
                value={form.message}
                onChange={onChange('message')}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                placeholder="Descrivi il tuo obiettivo o il tipo di campagna che vuoi attivare."
              />
            </label>

            <div className="hidden">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Company website
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.company_website}
                  onChange={onChange('company_website')}
                />
              </label>
            </div>

            {status === 'success' && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                Richiesta inviata! Ti ricontatteremo a breve.
              </p>
            )}
            {status === 'error' && error && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={isBusy}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isBusy ? 'Invio in corso...' : 'Invia richiesta'}
            </button>

            {cooldownSeconds && (
              <p className="text-xs text-slate-500">
                Puoi inviare una nuova richiesta tra {cooldownSeconds} secondi.
              </p>
            )}
          </form>
        </section>
      </div>
    </main>
  )
}
