import Link from "next/link";
import type { StayGuide } from "@/types/content";

export function StayGuideLinks({ guides, heading = "Plan around your group." }: { guides: StayGuide[]; heading?: string }) {
  return <section className="guide-links" aria-labelledby="guide-links-title">
    <p className="eyebrow">Trip guides</p>
    <h2 id="guide-links-title">{heading}</h2>
    <ul>
      {guides.map((guide) => <li key={guide.slug}><Link href={`/stays/${guide.slug}`}><strong>{guide.navLabel}</strong><span>{guide.navSummary}</span></Link></li>)}
      <li><Link href="/faq"><strong>Questions</strong><span>Booking, parking, dogs, and more, answered.</span></Link></li>
    </ul>
  </section>;
}
