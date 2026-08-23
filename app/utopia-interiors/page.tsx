import type { Metadata } from "next";
import { LeadForm } from "@/components/forms/LeadForm";
import { LeadershipProfile } from "@/components/LeadershipProfile";
import { PageHero } from "@/components/PageHero";
import { leadershipProfiles } from "@/content";

export const metadata: Metadata = { title: "Utopia Interiors", description: "Hospitality-minded interior design, furnishing, amenity strategy, styling, and property positioning from Utopia Homes." };

const services = [["01", "Shape", "Interior design and property positioning that give the home a clear, memorable point of view."], ["02", "Furnish", "Furniture, styling, and amenity strategy chosen around how guests actually gather, rest, and return."], ["03", "Improve", "Renovation and improvement recommendations that balance character, usefulness, resilience, and commercial opportunity."], ["04", "Present", "Photography readiness, final styling, and storytelling that help the finished home make a stronger first impression."], ["05", "Coordinate", "Project coordination and trusted partner guidance where the agreed scope calls for it."]] as const;

export default function UtopiaInteriorsPage() {
  const meghan = leadershipProfiles.find(({ id }) => id === "leadership-meghan")!;
  return <><PageHero eyebrow="Utopia Interiors" title={<>Make the home<br /><em>mean more.</em></>} intro="Hospitality and design expertise applied to homes that should feel more distinctive, work more beautifully, and perform with greater purpose." tone="clay" /><section className="interiors-intro"><p className="eyebrow">Designed for the stay</p><h2>Character is not decoration.<br /><em>It is part of the experience.</em></h2><p>Utopia Interiors brings the guest lens, the owner lens, and the design lens together. We help shape homes that are useful without feeling generic, memorable without becoming impractical, and commercially thoughtful without losing their soul.</p></section><section className="numbered-services">{services.map(([number, title, description]) => <article key={number}><b>{number}</b><h2>{title}</h2><p>{description}</p></article>)}</section><section className="editorial-callout"><p>The goal is a home people recognize, remember, and want to return to—not a room assembled from a formula.</p></section><section className="profile-section"><LeadershipProfile profile={meghan} context="The Utopia perspective" /></section><section className="form-section"><LeadForm kind="design-inquiry" title="What could your property become?" submitLabel="Start an interiors conversation" /></section></>;
}
