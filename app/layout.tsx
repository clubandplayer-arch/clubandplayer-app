// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import HashCleanup from '@/components/auth/HashCleanup';
import SessionSyncMount from '@/components/auth/SessionSyncMount';

export const metadata: Metadata = {
  title: 'Club & Player',
  description: 'Club & Player App',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <HashCleanup />
        {children}
        {/* wrapper client che monta il sync sessione */}
        <SessionSyncMount />
      </body>
    </html>
  );
}
