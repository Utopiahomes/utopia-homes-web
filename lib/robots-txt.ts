// robots.txt, built with the site (apps/web/src/pages/robots.txt.ts). Same rules as the Next.js
// app/robots.ts: only the production deployment invites crawlers and lists the sitemap; previews
// and the edit copy ask every crawler to stay out.
export function robotsTxt(origin: string, vercelEnv = process.env.VERCEL_ENV): string {
  return vercelEnv === "production"
    ? `User-Agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`
    : "User-Agent: *\nDisallow: /\n";
}
