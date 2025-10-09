// app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const isProd = process.env.VERCEL_ENV === "production";
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://clubandplayer-app.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: isProd ? "/" : "",
        // In produzione blocchiamo solo le API; in preview blocchiamo tutto
        disallow: isProd ? ["/api/"] : ["/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base.replace(/^https?:\/\//, ""),
  };
}
