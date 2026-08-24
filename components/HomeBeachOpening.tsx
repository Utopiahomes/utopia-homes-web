import Image from "next/image";

export function HomeBeachOpening() {
  return <section className="home-beach-opening" aria-labelledby="home-hero-title">
    <div className="home-beach-sticky" aria-hidden="true">
      <Image
        className="home-beach-image"
        src="/images/home/wildwoods-beach-dawn.png"
        alt=""
        fill
        priority
        sizes="100vw"
      />
      <div className="home-beach-wash" />
    </div>

    <div className="home-beach-scenes">
      <div className="home-beach-hero">
        <p>Utopia Homes</p>
        <h1 id="home-hero-title">Big homes.<br /><em>Better weekends.</em></h1>
        <span className="home-scroll-cue" aria-hidden="true">Scroll</span>
      </div>
      <div className="home-beach-belief">
        <p>We own vacation homes.</p>
        <h2>We design them, operate them, and know what makes them work.</h2>
      </div>
    </div>
  </section>;
}
