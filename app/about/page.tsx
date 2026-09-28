import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { leadershipProfiles } from "@/content";

export const metadata: Metadata = {
  title: "About Utopia",
  description: "Meet Ray and Meghan DeLuca, the owners behind Utopia Homes.",
};

const people = [
  {
    id: "leadership-ray",
    href: "/about/ray",
    image: { src: "/images/shamrock/exterior-main.avif", alt: "The colorful exterior of the former Shamrock Hotel in Wildwood" },
    businesses: ["Utopia Homes", "Utopia Workspaces", "Stoin (AI consulting)"],
  },
  {
    id: "leadership-meghan",
    href: "/about/meghan",
    image: { src: "/images/about/meghan/crest-luxury-loft.webp", alt: "A living room Meghan styled, with a tufted navy sofa and a gallery wall" },
    businesses: ["Utopia Homes", "Utopia Design"],
  },
];

export default function AboutPage() {
  return <>
    <PageHero
      eyebrow="About Utopia"
      title={<>Two owners.<br /><em>One way of hosting.</em></>}
      intro="Utopia Homes is Ray and Meghan DeLuca: owners who host, design, and care for every home themselves."
      tone="light"
    />
    <section className="about-people" aria-label="The owners">
      {people.map(({ id, href, image, businesses }) => {
        const profile = leadershipProfiles.find((p) => p.id === id)!;
        return (
          <Link key={id} href={href} className="about-person-card">
            <div className="about-person-image">
              <Image src={image.src} alt={image.alt} fill sizes="(max-width: 900px) 100vw, 50vw" />
            </div>
            <div className="about-person-copy">
              <p className="eyebrow">Owner</p>
              <h2>{profile.name}</h2>
              <ul>{businesses.map((b) => <li key={b}>{b}</li>)}</ul>
              <span className="text-link">Read {profile.name.split(" ")[0]}’s story <span aria-hidden="true">→</span></span>
            </div>
          </Link>
        );
      })}
    </section>
    <section className="about-statement founder-statement">
      <span>R / M</span>
      <h2>We do not just operate vacation homes. <em>We own them.</em></h2>
      <div>
        <p>That shapes everything: caring for each property, earning each guest’s trust, and making the decisions that turn an ordinary stay into one people remember.</p>
        <Link className="text-link" href="/stays">Meet our homes <span>→</span></Link>
      </div>
    </section>
  </>;
}
