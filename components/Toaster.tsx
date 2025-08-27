'use client'
import { useEffect, useState } from 'react'

type Toast = { id: string; text: string; href?: string }

export default function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Toast>).detail
      setToasts(prev => [...prev, { ...detail, id: detail.id || String(Date.now()) }])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== detail.id))
      }, 5000)
    }
    window.addEventListener('app:toast', handler as EventListener)
    return () => window.removeEventListener('app:toast', handler as EventListener)
  }, [])

  return (
    <div style={{
      position:'fixed', right:16, bottom:16, display:'grid', gap:8, zIndex:9999, maxWidth:320
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background:'#111827', color:'#fff', padding:'10px 12px',
          borderRadius:8, boxShadow:'0 8px 20px rgba(0,0,0,0.25)'
        }}>
          <div style={{fontSize:14, lineHeight:1.25}}>
            {t.href ? <a href={t.href} style={{color:'#93c5fd', textDecoration:'underline'}}>{t.text}</a> : t.text}
          </div>
        </div>
      ))}
    </div>
  )
}
