import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return ["", "/product", "/developers", "/powr-score", "/pricing", "/security", "/jobs", "/signup", "/request-demo"].map((path) => ({
    url: `${baseUrl}${path}`,
    changeFrequency: path === "/jobs" ? "daily" : "weekly",
    priority: path === "" ? 1 : path === "/jobs" ? 0.9 : 0.7,
  }));
}
