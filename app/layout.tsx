import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { LucyWidgetMount } from "@/components/lucy/LucyWidgetMount";
import "./globals.css";
import "./v1.css";
import "./collection.css";
import "./wordmark.css";
import "./owners.css";
import "./destination-region.css";
import "./navigation.css";
import "./photography.css";
import "./reviews.css";
import "./home-v2.css";
import "./scroll-story.css";
import "./design.css";
import "./design-adjustments.css";
import "./lucy.css";
import "./about.css";
import "./guides.css";
import { businessProfile, siteContent } from "@/content";
import { cms } from "@/lib/cms";
import { getSiteUrl } from "@/lib/site-url";
import { jsonLdText, organizationStructuredData } from "@/lib/structured-data";

const display = Cormorant_Garamond({ subsets: ["latin"], variable: "--font-display", weight: ["500", "600"] });
const sans = Manrope({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: { default: siteContent.defaultTitle, template: `%s | ${siteContent.name}` },
  description: siteContent.description,
  openGraph: { type: "website", siteName: siteContent.name, images: [{ url: businessProfile.shareImage.src, alt: businessProfile.shareImage.alt }] },
  twitter: { card: "summary_large_image", images: [businessProfile.shareImage.src] },
  robots: process.env.VERCEL_ENV === "production" ? { index: true, follow: true } : { index: false, follow: false, noarchive: true, nocache: true },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [profile, properties] = await Promise.all([cms.getBusinessProfile(), cms.getProperties()]);
  return <html lang="en" data-scroll-behavior="smooth"><body className={`${display.variable} ${sans.variable}`}><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(organizationStructuredData(profile, properties, getSiteUrl().origin)) }} /><SiteHeader /><main>{children}</main><SiteFooter /><LucyWidgetMount /></body></html>;
}
