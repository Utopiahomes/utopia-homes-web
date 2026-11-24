import Image from "next/image";
import { StaySearchForm } from "@/components/StaySearchForm";
import { wording } from "@/lib/edit/wording";

export function HomeBeachOpening() {
  const { hero, belief } = wording.home;
  return <section className="home-beach-opening" aria-labelledby="home-hero-title">
    <div className="home-beach-sticky" aria-hidden="true">
      <div className="home-beach-media">
        <Image
          className="home-beach-image"
          src="/images/home/wildwoods-beach-summer.jpg"
          alt="Busy summer beach in the Wildwoods with amusement pier rides in the distance"
          fill
          priority
          sizes="100vw"
        />
        <div className="home-beach-wash" />
      </div>
    </div>

    <div className="home-beach-scenes">
      <div className="home-beach-hero">
        <p>{hero.kicker}</p>
        <h1 id="home-hero-title">{hero.titleLine1}<br /><em>{hero.titleLine2}</em></h1>
        <StaySearchForm variant="hero" />
        <span className="home-scroll-cue" aria-hidden="true">Scroll</span>
      </div>
      <div className="home-beach-belief">
        <p>{belief.kicker}</p>
        <h2>{belief.title}</h2>
      </div>
    </div>
  </section>;
}
