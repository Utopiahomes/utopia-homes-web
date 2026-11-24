import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import Script from "next/script";
import { EditBridge } from "@/components/edit/EditBridge";
import { editMode } from "@/lib/edit/wording";
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
  robots: process.env.VERCEL_ENV === "production" && !editMode ? { index: true, follow: true } : { index: false, follow: false, noarchive: true, nocache: true },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [profile, properties] = await Promise.all([cms.getBusinessProfile(), cms.getProperties()]);
  return <html lang="en" data-scroll-behavior="smooth"><body className={`${display.variable} ${sans.variable}`}><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(organizationStructuredData(profile, properties, getSiteUrl().origin)) }} /><SiteHeader /><main>{children}</main><SiteFooter />{editMode ? <EditBridge parent={process.env.SITE_EDIT_PARENT} /> : <TalkWithLyra />}</body></html>;
}

// Ray, 2026-11-23: "build Lyra into the website ... the beach Lyra ... in the top right of the
// screen and can answer questions". Stoin's talk-to-lucy block (utopia-workspaces site_blocks)
// opens a live room with Utopia's Lyra, in her beach look, for one visitor; her rules and what
// she knows are set in Stoin (website_sites "utopiahomes.com"). It replaces the text chat box
// (LucyWidget), as on stoin.ai, where Ray called a chat box "sort of useless". The edit copy has
// no Talk button.
function TalkWithLyra() {
  const faces = "https://app.stoin.ai/synths/lyra-beach";
  return <>
    <div data-stoin-block="talk-to-lucy" data-site="utopiahomes.com" data-position="top-right" data-below=".site-header" data-label="Talk with Lyra" data-status="Online now" data-face={`${faces}/idle-01.mp4`} data-still={`${faces}/still.jpg`} />
    <Script src="/blocks/talk-to-lucy.js" strategy="afterInteractive" />
  </>;
}
