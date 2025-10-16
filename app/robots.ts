// app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const isProd = process.env.VERCEL_ENV === "production";

  const baseEnv =
    process.env.NEXT_PUBLIC_BASE_URL ?? "https://clubandplayer-app.vercel.app";
  // forza https se qualcuno mette http per errore
  const base = baseEnv.replace(/^http:\/\//, "https://");

  return {
    rules: [
      {
        userAgent: "*",
        allow: isProd ? "/" : "",
        disallow: isProd ? ["/api/"] : ["/"],
      },
    ],
    // in preview possiamo anche omettere la sitemap
    sitemap: isProd ? `${base}/sitemap.xml` : undefined,
    host: new URL(base).host,
  };
}
