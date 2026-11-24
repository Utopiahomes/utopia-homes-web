import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { HomeBeachOpening } from "@/components/HomeBeachOpening";
import { cms } from "@/lib/cms";
import { wording } from "@/lib/edit/wording";
import { pageMetadata } from "@/lib/page-metadata";
import { listOf, stayFacts } from "@/lib/stay-facts";

export async function generateMetadata(): Promise<Metadata> {
  const homes = (await cms.getProperties()).map(stayFacts);
  const guests = homes.map((home) => home.guests);
  return pageMetadata({
    title: "Large-Group Vacation Rentals in the Wildwoods, NJ | Utopia Homes",
    absoluteTitle: true,
    description: `Book direct at large vacation homes for ${Math.min(...guests)} to ${Math.max(...guests)} guests in ${listOf(homes.map((home) => home.city))}, NJ. Dogs welcome. We also manage and design vacation rentals.`,
    path: "/",
  });
}

export default async function Home() {
  const properties = await cms.getProperties();
  const gatheringProperty = properties.find(({ slug }) => slug === "central-ave-socialization") ?? properties[0];
  const gatheringImage = gatheringProperty.gallery.find(({ category }) => category === "gathering") ?? gatheringProperty.heroImage;
  const interiorsProperty = properties.find(({ slug }) => slug === "the-shamrock") ?? properties[2] ?? properties[0];
  const interiorsImage = interiorsProperty.gallery.find(({ category }) => category === "details") ?? interiorsProperty.gallery[1] ?? interiorsProperty.heroImage;
  const words = wording.home;
  const ownersProperty = properties.find(({ slug }) => slug === "buttercup-beauty") ?? properties[0];

  return <>
    <HomeBeachOpening />

    <section className="home-featured" id="collection" aria-labelledby="home-collection-title">
      <header className="home-featured-heading">
        <div><p className="eyebrow">{words.featured.eyebrow}</p><h2 id="home-collection-title">{words.featured.titleLine1}<br /><em>{words.featured.titleLine2}</em></h2></div>
        <Link className="text-link" href="/stays">{words.featured.allStays} <span aria-hidden="true">→</span></Link>
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
            <Link className="text-link" href={`/stays/${property.slug}`}>{words.featured.viewHome} <span aria-hidden="true">→</span></Link>
          </div>
        </article>)}
      </div>
    </section>

    <section className="home-gathering" aria-labelledby="home-gathering-title">
      <Image src={gatheringImage.src} alt={gatheringImage.alt} fill sizes="100vw" />
      <div className="home-gathering-wash" />
      <div><p className="eyebrow eyebrow-light">{words.gathering.eyebrow}</p><h2 id="home-gathering-title">{words.gathering.titleLine1}<br /><em>{words.gathering.titleLine2}</em></h2></div>
    </section>

    <section className="home-pathways" aria-label="Work with Utopia">
      <article>
        <div className="home-pathway-image"><Image src={ownersProperty.heroImage.src} alt={ownersProperty.heroImage.alt} fill sizes="(max-width: 760px) 100vw, 50vw" /></div>
        <div className="home-pathway-copy"><p className="eyebrow">{words.owners.eyebrow}</p><h2>{words.owners.title}</h2><p>{words.owners.text}</p><Link className="text-link" href="/list-your-home">{words.owners.link} <span aria-hidden="true">→</span></Link></div>
      </article>
      <article>
        <div className="home-pathway-copy"><p className="eyebrow">{words.design.eyebrow}</p><h2>{words.design.title}</h2><Link className="text-link" href="/design">{words.design.link} <span aria-hidden="true">→</span></Link></div>
        <div className="home-pathway-image"><Image src={interiorsImage.src} alt={interiorsImage.alt} fill sizes="(max-width: 760px) 100vw, 50vw" /></div>
      </article>
    </section>
  </>;
}
