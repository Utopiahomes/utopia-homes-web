import Image from "next/image";
import { ImmersiveScrollStory } from "@/components/ImmersiveScrollStory";
import type { Property } from "@/types/content";

export function PropertyPhotoStory({ property }: { property: Property }) {
  const images = property.gallery.slice(3);
  if (images.length === 0) return null;

  return <>
    <section className="property-photo-story">
      <div className="photo-story-heading"><p className="eyebrow">{property.name} in detail</p><h2>The spaces<br /><em>make the stay.</em></h2><p>Designed for full houses, shared rituals, and the moments that only happen when everyone is together.</p></div>
      <div className="photo-story-sequence">{images.map((image, index) => <figure className={`photo-story-frame photo-story-frame-${index + 1}`} key={image.src}><Image src={image.src} alt={image.alt} fill sizes={index === 0 ? "(max-width: 800px) 100vw, 72vw" : "(max-width: 800px) 82vw, 44vw"} /><figcaption>{image.alt}</figcaption></figure>)}</div>
    </section>
    <ImmersiveScrollStory
      className="property-scroll-story"
      image={property.heroImage}
      label={`${property.name} photographic story`}
      beats={[
        { eyebrow: "A house with a point of view", heading: "More than a backdrop.", body: property.shortDescription },
        { eyebrow: property.city, heading: "Make yourselves at home.", body: "Gather together, find your own corner, and let the house become part of the story you take with you." },
      ]}
    />
  </>;
}
