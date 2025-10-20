// app/sitemap.ts
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseEnv =
    process.env.NEXT_PUBLIC_BASE_URL ?? "https://clubandplayer-app.vercel.app";
  const base = baseEnv.replace(/^http:\/\//, "https://");
  const now = new Date();

  const staticPaths = [
    "/",
    "/feed",
    "/opportunities",
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
    lastModified: now,
    changeFrequency: "daily",
    priority: path === "/" ? 1 : 0.7,
  }));
}
