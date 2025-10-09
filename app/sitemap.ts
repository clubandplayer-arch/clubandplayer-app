// app/sitemap.ts
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://clubandplayer-app.vercel.app";
  const now = new Date();

  // Rotte principali statiche (puoi aggiungerne / rimuoverne quando vuoi)
  const staticPaths = [
    "/",                // home
    "/feed",
    "/opportunities",
    "/clubs",
    "/search/athletes",
    "/search/club",
    "/login",
    "/signup",
    "/profile",
    "/settings",
    "/legal/privacy",
    "/legal/terms",
  ];

  return staticPaths.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,             // aggiornamento "generico" odierno
    changeFrequency: "daily",      // suggerimento a Google
    priority: path === "/" ? 1 : 0.7,
  }));
}
