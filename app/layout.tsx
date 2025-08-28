export const dynamic = 'force-dynamic'
import './globals.css'
import { ReactNode } from 'react'
import Navbar from '@/components/Navbar'
import RealtimeMessagesClient from '@/components/RealtimeMessagesClient'
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body>
        <Navbar />
        {children}
        <RealtimeMessagesClient />
      </body>
    </html>
  )
}
