import Image from "next/image";
import Link from "next/link";
import { CTASection } from "@/components/CTASection";
import { Hero } from "@/components/Hero";
import { ImmersiveScrollStory } from "@/components/ImmersiveScrollStory";
import { cms } from "@/lib/cms";

export default async function Home() {
  const [properties, destinations] = await Promise.all([cms.getProperties(), cms.getDestinations()]);
  const heroProperty = properties.find(({ slug }) => slug === "the-shamrock") ?? properties[0];
  const visualProperty = properties.find(({ slug }) => slug === "central-ave-socialization") ?? properties[1] ?? heroProperty;
  const destination = destinations[0];

  return <>
    <Hero image={heroProperty.heroImage} />

    <section className="home-intro-v2">
      <p className="eyebrow">The Utopia point of view</p>
      <h2>Remarkable homes<br />for <em>everyone you bring.</em></h2>
      <p>Large-group stays with personality, space, and a reason to keep talking about the trip.</p>
    </section>

    <section className="home-collection-v2" id="collection" aria-labelledby="home-collection-title">
      <header><p className="eyebrow">Three homes · The Wildwoods</p><h2 id="home-collection-title">Pick your<br /><em>kind of together.</em></h2></header>
      {properties.map((property, index) => <article className={`home-property-feature home-property-feature-${index + 1}`} key={property.id}>
        <Link className="home-property-main-image" href={`/stays/${property.slug}`} aria-label={`Explore ${property.name}`}><Image src={property.gallery[0].src} alt={property.gallery[0].alt} fill sizes="(max-width: 900px) 100vw, 62vw" /></Link>
        {property.gallery[1] && <div className="home-property-detail-image"><Image src={property.gallery[1].src} alt={property.gallery[1].alt} fill sizes="(max-width: 900px) 48vw, 28vw" /></div>}
        <div className="home-property-copy"><span>0{index + 1}</span><p className="eyebrow">{property.city}, {property.state}</p><h3>{property.name}</h3><p>{property.shortDescription}</p><div className="home-property-facts"><b>{property.maxGuests ?? "—"}<small>Guests</small></b><b>{property.bedrooms ?? "—"}<small>Bedrooms</small></b></div><Link className="text-link" href={`/stays/${property.slug}`}>Enter the house <span aria-hidden="true">→</span></Link></div>
      </article>)}
    </section>

    <section className="home-statement-v2">
      <div><p className="eyebrow eyebrow-light">Stay distinctly</p><h2>Not a backdrop.<br /><em>Part of the story.</em></h2></div>
      <p>Every Utopia home has its own energy. The common thread is room to gather—and details worth remembering.</p>
    </section>

    <ImmersiveScrollStory
      className="home-scroll-story"
      image={visualProperty.gallery[3] ?? visualProperty.heroImage}
      label="The Utopia way of gathering"
      beats={[
        { eyebrow: "The house is part of the trip", heading: "Come with everyone.", body: "Spaces made for full houses, late nights, long tables, and the people who make a place matter." },
        { eyebrow: "Designed to be lived in", heading: "Find your corner.", body: "Gather together when you want to. Spread out when you need to. Every room has a role in the stay." },
        { eyebrow: "Stay distinctly", heading: "Leave with stories.", body: "The best homes do more than hold a group. They give the weekend its own unmistakable character." },
      ]}
    />

    {destination && <section className="home-destination-v2"><div><p className="eyebrow">One coast. More season.</p><h2>{destination.city}<br /><em>does it louder.</em></h2><Link className="text-link" href={`/destinations/${destination.slug}`}>Meet the Wildwoods <span>→</span></Link></div><div className="home-destination-v2-image"><Image src={destination.heroImage.src} alt={destination.heroImage.alt} fill sizes="(max-width: 900px) 100vw, 58vw" /></div></section>}

    <CTASection />
  </>;
}
