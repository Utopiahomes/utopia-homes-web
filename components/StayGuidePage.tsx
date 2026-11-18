import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingLink } from "@/components/BookingLink";
import { FAQList } from "@/components/FAQList";
import { PageHero } from "@/components/PageHero";
import { StayComparisonTable } from "@/components/StayComparisonTable";
import { StayGuideLinks } from "@/components/StayGuideLinks";
import { StaySearchForm } from "@/components/StaySearchForm";
import { cms } from "@/lib/cms";
import { pageMetadata } from "@/lib/page-metadata";
import { faqPageStructuredData, jsonLdText } from "@/lib/structured-data";
import type { Property } from "@/types/content";

export async function stayGuideMetadata(slug: string): Promise<Metadata> {
  const guide = await cms.getStayGuideBySlug(slug);
  if (!guide) return { title: "Guide not found" };
  return pageMetadata({ title: guide.seoTitle, description: guide.seoDescription, path: `/stays/${guide.slug}`, image: guide.heroImage });
}

function BookDirect({ property, guideSlug }: { property: Property; guideSlug: string }) {
  if (property.lodgify) return <Link className="button button-primary" href={`/stays/${property.slug}#book`} aria-label={`Book ${property.name} direct`}>Book direct</Link>;
  return <BookingLink propertyId={property.id} slug={property.slug} bookingUrl={property.bookingUrl} location={`guide_${guideSlug}`}>Check availability</BookingLink>;
}

export async function StayGuidePage({ slug }: { slug: string }) {
  const [guide, guides, properties] = await Promise.all([cms.getStayGuideBySlug(slug), cms.getStayGuides(), cms.getProperties()]);
  if (!guide) notFound();
  const homes = guide.propertySlugs.flatMap((propertySlug) => properties.filter((property) => property.slug === propertySlug));

  return <div className="guide-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(faqPageStructuredData(guide.faqs)) }} />
    <PageHero eyebrow={guide.eyebrow} title={<>{guide.title}<br /><em>{guide.titleEmphasis}</em></>} intro={guide.answer} image={guide.heroImage} />

    <section className="guide-section" aria-labelledby="guide-compare-title">
      <p className="eyebrow">Side by side</p>
      <h2 id="guide-compare-title">Compare the homes.</h2>
      <StayComparisonTable caption={guide.tableCaption} homes={homes} extraRows={guide.extraRows} />
    </section>

    <section className="guide-section guide-section-cream" aria-labelledby="guide-fit-title">
      <p className="eyebrow">Find your fit</p>
      <h2 id="guide-fit-title">{guide.fitHeading}</h2>
      <div className="guide-fit-grid">
        {guide.fits.flatMap((fit) => homes.filter((home) => home.slug === fit.propertySlug).map((home) => <article className="guide-fit" key={home.id}>
          <div className="guide-fit-image"><Image src={home.heroImage.src} alt={home.heroImage.alt} fill sizes="(max-width: 800px) 100vw, 33vw" /></div>
          <p className="eyebrow">{home.name} · {home.city}</p>
          <h3>{fit.heading}</h3>
          <p>{fit.body}</p>
          <div className="guide-fit-actions"><BookDirect property={home} guideSlug={guide.slug} /><Link className="text-link" href={`/stays/${home.slug}`}>View {home.name} <span aria-hidden="true">→</span></Link></div>
        </article>))}
      </div>
    </section>

    <section className="guide-section" aria-labelledby="guide-notes-title">
      <p className="eyebrow">Good to know</p>
      <h2 id="guide-notes-title">{guide.notesHeading}</h2>
      <div className="guide-notes">{guide.notes.map((note) => <div key={note.title}><h3>{note.title}</h3><p>{note.body}</p></div>)}</div>
    </section>

    <section className="guide-book" aria-labelledby="guide-book-title">
      <p className="eyebrow eyebrow-light">Book direct · save 10%</p>
      <h2 id="guide-book-title">Check your dates.</h2>
      <p>Booking direct with Utopia Homes is 10% cheaper than Airbnb. Search your dates to see the price at each home.</p>
      <StaySearchForm variant="page" defaults={guide.defaultGuests ? { guests: guide.defaultGuests } : undefined} />
    </section>

    <section className="faq-section" aria-labelledby="guide-faq-title">
      <p className="eyebrow">Questions</p>
      <h2 id="guide-faq-title">Good questions, answered.</h2>
      <FAQList items={guide.faqs} open />
    </section>

    <StayGuideLinks guides={guides.filter((item) => item.slug !== guide.slug)} heading="Planning a different kind of trip?" />
  </div>;
}
