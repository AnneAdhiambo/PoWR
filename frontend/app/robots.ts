import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/jobs", "/product", "/developers", "/powr-score", "/pricing", "/security"],
      disallow: ["/recruiter/", "/dashboard", "/account"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
