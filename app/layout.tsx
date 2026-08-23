import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";
import "./v1.css";
import "./collection.css";
import "./wordmark.css";
import "./owners.css";
import { siteContent } from "@/content";
import { getSiteUrl } from "@/lib/site-url";

const display = Cormorant_Garamond({ subsets: ["latin"], variable: "--font-display", weight: ["500", "600"] });
const sans = Manrope({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: { default: siteContent.defaultTitle, template: `%s | ${siteContent.name}` },
  description: siteContent.description,
  robots: process.env.VERCEL_ENV === "production" ? { index: true, follow: true } : { index: false, follow: false, noarchive: true, nocache: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${display.variable} ${sans.variable}`}><SiteHeader /><main>{children}</main><SiteFooter /></body></html>;
}
