import Image from "next/image";
import type { ContentImage } from "@/types/content";

type StoryBeat = {
  eyebrow?: string;
  heading: string;
  body: string;
};

export function ImmersiveScrollStory({
  image,
  secondaryImage,
  label,
  beats,
  className = "",
}: {
  image: ContentImage;
  secondaryImage?: ContentImage;
  label: string;
  beats: StoryBeat[];
  className?: string;
}) {
  return <section className={`immersive-story ${className}`} aria-label={label}>
    <div className="immersive-story-visual" aria-hidden="true">
      <Image src={image.src} alt="" fill sizes="100vw" />
      <div className="immersive-story-shade" />
    </div>
    <div className="immersive-story-beats">
      {beats.map((beat, index) => <article className="immersive-story-beat" key={`${beat.heading}-${index}`}>
        {index === 1 && secondaryImage && <figure className="immersive-story-inset"><Image src={secondaryImage.src} alt={secondaryImage.alt} fill sizes="(max-width: 700px) 76vw, 36vw" /></figure>}
        <span>0{index + 1}</span>
        {beat.eyebrow && <p className="eyebrow eyebrow-light">{beat.eyebrow}</p>}
        <h2>{beat.heading}</h2>
        <p>{beat.body}</p>
      </article>)}
    </div>
  </section>;
}
