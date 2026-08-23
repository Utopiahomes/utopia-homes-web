import Image from "next/image";
import type { ContentImage } from "@/types/content";
export function PageHero({ eyebrow, title, intro, image, tone = "light" }: { eyebrow: string; title: React.ReactNode; intro: string; image?: ContentImage; tone?: "light" | "dark" | "clay" }) {
  return <header className={`page-hero page-hero-${tone}`}><div className="page-hero-copy"><p className={tone === "light" ? "eyebrow" : "eyebrow eyebrow-light"}>{eyebrow}</p><h1>{title}</h1><p>{intro}</p></div>{image && <div className="page-hero-image"><Image src={image.src} alt={image.alt} fill priority sizes="(max-width: 800px) 100vw, 45vw" /></div>}<span className="page-hero-mark" aria-hidden="true">U</span></header>;
}
