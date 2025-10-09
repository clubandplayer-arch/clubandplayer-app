// app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Suspense } from "react";

import HashCleanup from "@/components/auth/HashCleanup";
import SessionSyncMount from "@/components/auth/SessionSyncMount";
import CookieConsent from "@/components/misc/CookieConsent";
import PostHogInit from "@/components/analytics/PostHogInit";

// Base URL dal tuo env Vercel (Production/Preview)
const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://clubandplayer-app.vercel.app";
// Indica a Next/SERP se indicizzare: solo in produzione mettiamo index/follow
const isProd = process.env.VERCEL_ENV === "production";

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: "Club & Player",
    template: "%s – Club & Player",
  },
  description:
    "Piattaforma che connette atleti e club: profili, opportunità e candidature in un unico posto.",
  openGraph: {
    type: "website",
    siteName: "Club & Player",
    url: "/",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Club & Player" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Club & Player",
    description:
      "Piattaforma che connette atleti e club: profili, opportunità e candidature.",
    images: ["/og.jpg"],
  },
  robots: {
    index: isProd,
    follow: isProd,
  },
  alternates: {
    canonical: "/",
  },
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  themeColor: "#111827",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        {/* Init analytics (rispetta consenso, pageview & identify) */}
        <Suspense fallback={null}>
          <PostHogInit />
        </Suspense>

        {/* Pulisce hash OAuth e fa redirect sicuro */}
        <Suspense fallback={null}>
          <HashCleanup />
        </Suspense>

        {/* Contenuto pagina (copre useSearchParams, ecc.) */}
        <Suspense fallback={null}>{children}</Suspense>

        {/* Sync sessione client->server (cookie) */}
        <Suspense fallback={null}>
          <SessionSyncMount />
        </Suspense>

        {/* Banner GDPR */}
        <Suspense fallback={null}>
          <CookieConsent />
        </Suspense>
      </body>
    </html>
  );
}
