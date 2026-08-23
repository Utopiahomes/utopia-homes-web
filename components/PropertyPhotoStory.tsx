import { ImmersiveScrollStory } from "@/components/ImmersiveScrollStory";
import type { Property } from "@/types/content";

export function PropertyPhotoStory({ property }: { property: Property }) {
  const images = property.gallery.slice(3);
  if (images.length === 0) return null;

  return <ImmersiveScrollStory
    className="property-scroll-story"
    image={images[0]}
    secondaryImage={images[1]}
    label={`${property.name} photographic story`}
    beats={[
      { eyebrow: `${property.name} in detail`, heading: "The spaces make the stay.", body: "Designed for full houses, shared rituals, and the moments that only happen when everyone is together." },
      { eyebrow: property.city, heading: "A house with a point of view.", body: property.shortDescription },
    ]}
  />;
}
