import Image from "next/image";
import type { ContentImage } from "@/types/content";

export function PropertyGallery({ images }: { images: ContentImage[] }) {
  const visibleImages = images.slice(0, 5);
  return <div className="property-gallery">{visibleImages.map((image, index) => <div className={`gallery-image gallery-image-${index + 1}`} key={`${image.src}-${index}`}><Image src={image.src} alt={image.alt} fill priority={index === 0} sizes={index === 0 ? "(max-width: 800px) 100vw, 66vw" : "(max-width: 800px) 50vw, 34vw"} /></div>)}<span className="gallery-count">{String(visibleImages.length).padStart(2, "0")} photographs</span></div>;
}
