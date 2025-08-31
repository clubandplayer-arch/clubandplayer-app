export const dynamic = 'force-dynamic';
import './globals.css';
import { ReactNode } from 'react';
import Navbar from '@/components/Navbar';
import RealtimeMessagesClient from '@/components/RealtimeMessagesClient';
import UserMenu from '@/components/auth/UserMenu';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <head>
        {/* link spostato nel <head> per evitare errori */}
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* La tua navbar */}
        <Navbar />

        {/* Menu utente (logout) allineato a destra, subito sotto la navbar */}
        <div className="max-w-7xl mx-auto px-4 py-2 flex justify-end">
          <UserMenu />
        </div>

        {children}

        <RealtimeMessagesClient />
      </body>
    </html>
  );
}
