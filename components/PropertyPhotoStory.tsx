import Image from "next/image";
import { ImmersiveScrollStory } from "@/components/ImmersiveScrollStory";
import type { Property } from "@/types/content";

export function PropertyPhotoStory({ property }: { property: Property }) {
  const images = property.gallery.slice(3);
  if (images.length === 0) return null;
  const leadImages = images.slice(0, 2);
  const chapterImages = images.slice(2);
  const labels: Record<NonNullable<(typeof chapterImages)[number]["category"]>, string> = {
    arrival: "Arrive",
    outdoors: "Outside, all day",
    "kitchen-dining": "Room at the table",
    gathering: "Made for together",
    entertainment: "Play awhile",
    bedrooms: "Rooms of their own",
    details: "The little things",
  };
  const chapters = Array.from(chapterImages.reduce((groups, image) => {
    const category = image.category ?? "details";
    const group = groups.get(category) ?? [];
    group.push(image);
    groups.set(category, group);
    return groups;
  }, new Map<NonNullable<(typeof chapterImages)[number]["category"]>, typeof chapterImages>()));

  return <>
    <section className="property-photo-story">
      <div className="photo-story-heading"><p className="eyebrow">{property.name} in detail</p><h2>The spaces<br /><em>make the stay.</em></h2><p>Designed for full houses, shared rituals, and the moments that only happen when everyone is together.</p></div>
      <div className="photo-story-sequence">{leadImages.map((image, index) => <figure className={`photo-story-frame photo-story-frame-${index + 1}`} key={image.src}><Image src={image.src} alt={image.alt} fill sizes={index === 0 ? "(max-width: 800px) 100vw, 72vw" : "(max-width: 800px) 82vw, 44vw"} /><figcaption>{image.alt}</figcaption></figure>)}</div>
      {chapters.map(([category, chapter], chapterIndex) => <section className="photo-chapter" key={category} aria-labelledby={`${property.slug}-${category}`}>
        <header><p className="eyebrow">{String(chapterIndex + 1).padStart(2, "0")} · {property.name}</p><h3 id={`${property.slug}-${category}`}>{labels[category]}</h3></header>
        <div className="photo-chapter-mosaic">{chapter.map((image, index) => <figure className={`photo-chapter-frame photo-chapter-frame-${index % 6 + 1}`} key={image.src}><Image src={image.src} alt={image.alt} fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 34vw" /></figure>)}</div>
      </section>)}
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
