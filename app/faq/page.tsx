import type { Metadata } from "next";
import Link from "next/link";
import { FAQList } from "@/components/FAQList";
import { PageHero } from "@/components/PageHero";
import { StayGuideLinks } from "@/components/StayGuideLinks";
import { cms } from "@/lib/cms";
import { pageMetadata } from "@/lib/page-metadata";
import { faqPageStructuredData, jsonLdText } from "@/lib/structured-data";
import type { FAQ } from "@/types/content";

export const metadata: Metadata = pageMetadata({
  title: "Frequently Asked Questions",
  description: "Answers about Utopia Homes in the Wildwoods, NJ: guest capacity, pools, dogs, parking, booking direct, vacation rental management, and design.",
  path: "/faq",
});

const sections: Array<{ id: string; heading: string; categories: FAQ["category"][]; link: { href: string; label: string } }> = [
  { id: "stays", heading: "Staying with us", categories: ["stays"], link: { href: "/stays", label: "See the homes" } },
  { id: "owners", heading: "Owners and property management", categories: ["owners"], link: { href: "/list-your-home", label: "Talk to us about your home" } },
  { id: "design", heading: "Design and furnishing", categories: ["design"], link: { href: "/design", label: "Explore Utopia Design" } },
  { id: "more", heading: "Membership and contact", categories: ["membership", "general"], link: { href: "/contact", label: "Contact us" } },
];

export default async function FaqPage() {
  const [faqs, guides] = await Promise.all([cms.getFAQs(), cms.getStayGuides()]);
  const groups = sections.map((section) => ({ ...section, items: faqs.filter((faq) => section.categories.includes(faq.category)) }));

  return <div className="guide-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(faqPageStructuredData(groups.flatMap((group) => group.items))) }} />
    <PageHero eyebrow="Utopia Homes · The Wildwoods, NJ" title={<>Frequently asked<br /><em>questions.</em></>} intro="Straight answers about our homes in the Wildwoods, booking direct, and working with Utopia Homes as an owner or design client." />
    {groups.map((group) => <section className="faq-section" id={group.id} aria-labelledby={`faq-${group.id}-title`} key={group.id}>
      <h2 id={`faq-${group.id}-title`}>{group.heading}</h2>
      <FAQList items={group.items} open />
      <Link className="text-link" href={group.link.href}>{group.link.label} <span aria-hidden="true">→</span></Link>
    </section>)}
    <StayGuideLinks guides={guides} />
  </div>;
}
