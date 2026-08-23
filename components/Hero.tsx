import Link from "next/link";
import Image from "next/image";
import type { ContentImage } from "@/types/content";

export function Hero({ image }: { image: ContentImage }) {
  return <section className="hero"><Image className="hero-image" src={image.src} alt={image.alt} fill preload sizes="100vw" /><div className="hero-wash" aria-hidden="true" /><div className="hero-copy"><p className="eyebrow eyebrow-light">Three homes · The Wildwoods</p><h1>Big houses.<br /><em>Better stories.</em></h1><p className="lede">Distinctive stays for everyone you bring together.</p><div className="button-row"><Link className="button button-light-solid" href="/stays">Meet the homes <span aria-hidden="true">↗</span></Link><Link className="text-button" href="/list-your-home">Own a remarkable home? <span aria-hidden="true">→</span></Link></div></div><div className="hero-caption"><span>Stay with Utopia</span><Link href="/stays">Large-group homes with a point of view</Link></div></section>;
}
