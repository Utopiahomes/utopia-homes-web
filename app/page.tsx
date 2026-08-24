import Image from "next/image";
import Link from "next/link";
import { HomeBeachOpening } from "@/components/HomeBeachOpening";
import { cms } from "@/lib/cms";

export default async function Home() {
  const properties = await cms.getProperties();
  const gatheringProperty = properties.find(({ slug }) => slug === "central-ave-socialization") ?? properties[0];
  const gatheringImage = gatheringProperty.gallery.find(({ category }) => category === "gathering") ?? gatheringProperty.heroImage;
  const interiorsProperty = properties.find(({ slug }) => slug === "the-shamrock") ?? properties[2] ?? properties[0];
  const interiorsImage = interiorsProperty.gallery.find(({ category }) => category === "details") ?? interiorsProperty.gallery[1] ?? interiorsProperty.heroImage;
  const ownersProperty = properties.find(({ slug }) => slug === "buttercup-beauty") ?? properties[0];

  return <>
    <HomeBeachOpening />

    <section className="home-featured" id="collection" aria-labelledby="home-collection-title">
      <header className="home-featured-heading">
        <div><p className="eyebrow">Featured stays · The Wildwoods</p><h2 id="home-collection-title">Three homes.<br /><em>Three personalities.</em></h2></div>
        <Link className="text-link" href="/stays">See every stay <span aria-hidden="true">→</span></Link>
      </header>
      <div className="home-featured-grid">
        {properties.map((property, index) => <article className="home-featured-card" key={property.id}>
          <Link className="home-featured-image" href={`/stays/${property.slug}`} aria-label={`View ${property.name}`}>
            <Image src={property.heroImage.src} alt={property.heroImage.alt} fill sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 33vw" />
            <span aria-hidden="true">0{index + 1}</span>
          </Link>
          <div className="home-featured-copy">
            <p>{property.city}, {property.state} · Up to {property.maxGuests ?? "—"} guests</p>
            <h3>{property.name}</h3>
            <p>{property.shortDescription}</p>
            <Link className="text-link" href={`/stays/${property.slug}`}>View home <span aria-hidden="true">→</span></Link>
          </div>
        </article>)}
      </div>
    </section>

    <section className="home-gathering" aria-labelledby="home-gathering-title">
      <Image src={gatheringImage.src} alt={gatheringImage.alt} fill sizes="100vw" />
      <div className="home-gathering-wash" />
      <div><p className="eyebrow eyebrow-light">The house is part of the trip</p><h2 id="home-gathering-title">Built for getting<br /><em>people together.</em></h2></div>
    </section>

    <section className="home-pathways" aria-label="Work with Utopia">
      <article>
        <div className="home-pathway-image"><Image src={ownersProperty.heroImage.src} alt={ownersProperty.heroImage.alt} fill sizes="(max-width: 760px) 100vw, 50vw" /></div>
        <div className="home-pathway-copy"><p className="eyebrow">For owners</p><h2>Own a vacation home?</h2><p>We can make it work harder without making it another job.</p><Link className="text-link" href="/list-your-home">Learn about Utopia management <span aria-hidden="true">→</span></Link></div>
      </article>
      <article>
        <div className="home-pathway-copy"><p className="eyebrow">Utopia Interiors</p><h2>Homes with character perform differently.</h2><Link className="text-link" href="/utopia-interiors">Explore Utopia Interiors <span aria-hidden="true">→</span></Link></div>
        <div className="home-pathway-image"><Image src={interiorsImage.src} alt={interiorsImage.alt} fill sizes="(max-width: 760px) 100vw, 50vw" /></div>
      </article>
    </section>
  </>;
}
