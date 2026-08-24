import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { ParallaxMedia } from "@/components/ParallaxMedia";
import { LeadershipProfile } from "@/components/LeadershipProfile";
import { leadershipProfiles } from "@/content";

export const metadata: Metadata = {
  title: "About Ray DeLuca",
  description: "Meet Utopia Homes founder Ray DeLuca, a longtime Wildwood host, vacation-property owner, and steward of the former Shamrock Hotel.",
};

export default function AboutPage() {
  const image = { src: "/images/shamrock/exterior-main.avif", alt: "The colorful exterior of the former Shamrock Hotel in Wildwood" };
  const ray = leadershipProfiles.find(({ id }) => id === "leadership-ray")!;

  return <>
    <PageHero
      eyebrow="Meet the founder"
      title={<>Hospitality,<br /><em>from the owner’s side.</em></>}
      intro="Utopia Homes grew from nearly 15 years of hosting, thousands of guest stays, and a lifelong affection for the Wildwoods."
      tone="light"
    />
    <ParallaxMedia image={image} />
    <section className="about-statement founder-statement">
      <span>R / D</span>
      <h2>We do not just operate vacation homes. <em>We own them.</em></h2>
      <div>
        <p>That distinction shapes everything. We know what it means to care for a property, earn a guest’s trust, protect an owner’s investment, and make the decisions that turn an ordinary stay into one people remember.</p>
        <p>Utopia is built around the guest experience because great hospitality is not a layer added at the end. It begins with the home, carries through every interaction, and continues long after checkout.</p>
        <Link className="text-link" href="/stays">Meet our homes <span>→</span></Link>
      </div>
    </section>
    <section className="profile-section founder-profile">
      <LeadershipProfile profile={ray} context="The story behind Utopia" />
      <p className="founder-aside">Ray’s Wildwood story began on the beach as a lifeguard—back when, as he puts it, he was skinny. Years later, it continues as the owner of the former Shamrock Hotel and a host who still believes the smallest details can define an entire trip.</p>
    </section>
    <section className="wildwood-season">
      <p className="eyebrow eyebrow-light">A longer way to see the shore</p>
      <div className="season-number" aria-hidden="true">6</div>
      <div>
        <h2>Six months of Wildwood.<br /><em>Not ten weeks.</em></h2>
        <p>We love the Wildwoods because the season does not end with summer. Festival weekends, fall escapes, spring gatherings, and the shore’s year-round personality create more reasons to visit—and more opportunities for owners.</p>
        <p>Utopia specializes in building demand beyond the traditional peak. To us, Wildwood is not a ten-week summer market. It is a six-month hospitality season with something worth returning for every weekend.</p>
        <Link className="text-link" href="/destinations/wildwood-new-jersey">Discover WW / Cape May <span>→</span></Link>
      </div>
    </section>
  </>;
}
