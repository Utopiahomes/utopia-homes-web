import Link from "next/link";
import Image from "next/image";
import type { ContentImage } from "@/types/content";

export function Hero({ image }: { image: ContentImage }) {
  return <section className="hero"><Image className="hero-image" src={image.src} alt={image.alt} fill priority sizes="100vw" /><div className="hero-wash" aria-hidden="true" /><div className="hero-copy"><p className="eyebrow eyebrow-light">A more memorable way to stay</p><h1>Find your<br /><em>kind of place.</em></h1><p className="lede">Distinctive destination homes, thoughtfully chosen and professionally cared for.</p><div className="button-row"><Link className="button button-light-solid" href="/stays">Explore our stays <span aria-hidden="true">↗</span></Link><Link className="text-button" href="/list-your-home">List your home <span aria-hidden="true">→</span></Link></div></div><div className="hero-caption"><span>The launch collection</span><Link href="/stays">Three distinctive homes · The Wildwoods</Link></div></section>;
}
