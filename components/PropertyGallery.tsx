import Image from "next/image";
import type { ContentImage } from "@/types/content";

export function PropertyGallery({ images }: { images: ContentImage[] }) {
  const openingImages = images.slice(0, 3);
  return <section className="property-opening-gallery" aria-label="Property photography"><div className="opening-primary">{openingImages[0] && <Image src={openingImages[0].src} alt={openingImages[0].alt} fill preload sizes="(max-width: 800px) 100vw, 68vw" />}</div><div className="opening-pair">{openingImages.slice(1).map((image) => <div className="opening-secondary" key={image.src}><Image src={image.src} alt={image.alt} fill sizes="(max-width: 800px) 50vw, 32vw" /></div>)}</div><span className="gallery-count">{String(images.length).padStart(2, "0")} approved photographs</span></section>;
}
