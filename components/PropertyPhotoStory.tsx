import Image from "next/image";
import { ImmersiveScrollStory } from "@/components/ImmersiveScrollStory";
import type { Property } from "@/types/content";

export function PropertyPhotoStory({ property }: { property: Property }) {
  const images = property.gallery.slice(3);
  if (images.length === 0) return null;
  const leadImages = images.slice(0, 2);
  const chapterImages = images.slice(2);
  const chapters = [
    { id: "living", eyebrow: "The heart of the house", title: "Inside living spaces", story: "Cook, eat, watch, and play across connected rooms that let a full house stay together without asking everyone to do the same thing.", categories: ["gathering", "kitchen-dining", "entertainment", "details"] },
    { id: "bedrooms", eyebrow: "Room for every generation", title: "Bedrooms", story: `${property.bedrooms ?? "Multiple"} bedrooms give families and friends space to settle in, recharge, and find a sleeping arrangement that works for the group.`, categories: ["bedrooms"] },
    { id: "bathrooms", eyebrow: "Built for a full house", title: "Bathrooms", story: "Bright, practical bathrooms keep mornings moving and make sharing the home feel easier when every bedroom is full.", categories: ["bathrooms"] },
    { id: "outside", eyebrow: "The stay continues outdoors", title: "Outside", story: "The fenced backyard becomes its own destination—pool days, hot-tub evenings, open-air meals, and room to linger together.", categories: ["arrival", "outdoors"] },
  ].map((chapter) => ({ ...chapter, images: chapterImages.filter((image) => chapter.categories.includes(image.category ?? "details")) })).filter((chapter) => chapter.images.length > 0);

  return <>
    <section className="property-photo-story">
      <div className="photo-story-heading"><p className="eyebrow">{property.name} in detail</p><h2>The spaces<br /><em>make the stay.</em></h2><p>Designed for full houses, shared rituals, and the moments that only happen when everyone is together.</p></div>
      <div className="photo-story-sequence">{leadImages.map((image, index) => <figure className={`photo-story-frame photo-story-frame-${index + 1}`} key={image.src}><Image src={image.src} alt={image.alt} fill sizes={index === 0 ? "(max-width: 800px) 100vw, 72vw" : "(max-width: 800px) 82vw, 44vw"} /><figcaption>{image.alt}</figcaption></figure>)}</div>
      {chapters.map((chapter, chapterIndex) => <section className="photo-chapter" key={chapter.id} aria-labelledby={`${property.slug}-${chapter.id}`}>
        <header><div><p className="eyebrow">{String(chapterIndex + 1).padStart(2, "0")} · {chapter.eyebrow}</p><h3 id={`${property.slug}-${chapter.id}`}>{chapter.title}</h3></div><p>{chapter.story}</p></header>
        <div className="photo-chapter-mosaic">{chapter.images.map((image, index) => <figure className={`photo-chapter-frame photo-chapter-frame-${index % 6 + 1}`} key={image.src}><Image src={image.src} alt={image.alt} fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 30vw" /></figure>)}</div>
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
