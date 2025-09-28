// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import HashCleanup from "@/components/auth/HashCleanup";

// Import dinamico: solo client, niente SSR
const SupabaseSessionSync = dynamic(
  () => import("@/components/auth/SupabaseSessionSync"),
  { ssr: false }
);

export const metadata: Metadata = {
  title: "Club & Player",
  description: "Club & Player App",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <HashCleanup />
        {children}
        {/* Mantieni in fondo al body: tiene allineati i cookie server-side con la sessione client */}
        <SupabaseSessionSync />
      </body>
    </html>
  );
}
