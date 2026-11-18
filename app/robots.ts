import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots { return process.env.VERCEL_ENV === "production" ? { rules: { userAgent: "*", allow: "/" }, sitemap: `${getSiteUrl().origin}/sitemap.xml` } : { rules: { userAgent: "*", disallow: "/" } }; }
