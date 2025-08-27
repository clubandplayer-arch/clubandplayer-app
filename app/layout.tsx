export const dynamic = 'force-dynamic'
import './globals.css'
import { ReactNode } from 'react'
import RealtimeMessagesClient from '@/components/RealtimeMessagesClient'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body>
        {children}
        {/* Client globale per toast + badge non letti */}
        <RealtimeMessagesClient />
      </body>
    </html>
  )
}
