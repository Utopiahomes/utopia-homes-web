import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { properties } from "@/content";
import { hostingChapters, meghanIntro, meghanStats, meghanTodayIntro } from "@/content/meghan";

export const metadata: Metadata = {
  title: "About Meghan DeLuca",
  description:
    "Meghan DeLuca, owner of Utopia Homes and Utopia Design, has hosted guests at the Jersey Shore and in the Poconos since 2014.",
};

export default function MeghanPage() {
  const today = properties.filter((p) => p.status === "active" && p.designerNote);

  return <>
    <PageHero
      eyebrow={meghanIntro.eyebrow}
      title={<>Meghan<br /><em>DeLuca</em></>}
      intro={meghanIntro.lead}
      image={{ src: "/images/about/meghan/crest-oasis.webp", alt: "Our Oasis by the Sea, one of the Wildwood Crest condos Meghan styled and hosted" }}
      tone="light"
    />

    <section className="meghan-stats" aria-label="Meghan’s hosting in numbers">
      {meghanStats.map((s) => (
        <div key={s.label}><strong>{s.value}</strong><span>{s.label}</span></div>
      ))}
      <p className="meghan-stats-source">From Meghan’s Airbnb host record, September 2026.</p>
    </section>

    <section className="editorial-callout meghan-callout">
      <p>{meghanIntro.statement}</p>
    </section>

    <section className="meghan-chapters" aria-label="The homes Meghan has hosted">
      {hostingChapters.map((c, i) => (
        <article key={c.id} className={`meghan-chapter meghan-chapter-${c.images.length > 2 ? "gallery" : "pair"}`}>
          <header>
            <span className="meghan-chapter-index">{String(i + 1).padStart(2, "0")}</span>
            <p className="eyebrow">{c.years} · {c.place}</p>
            <h2>{c.title}</h2>
            {c.paragraphs.map((p) => <p key={p}>{p}</p>)}
            <blockquote>
              <p>{c.guestsSaid}</p>
              <cite>{c.reviews} guest reviews</cite>
            </blockquote>
          </header>
          <div className="meghan-chapter-images">
            {c.images.map((image) => (
              <figure key={image.src}>
                <Image src={image.src} alt={image.alt} fill sizes="(max-width: 900px) 100vw, 40vw" />
              </figure>
            ))}
          </div>
        </article>
      ))}
    </section>

    <section className="meghan-today">
      <div className="meghan-today-heading">
        <span className="meghan-chapter-index">{String(hostingChapters.length + 1).padStart(2, "0")}</span>
        <p className="eyebrow">Today · The Utopia Homes collection</p>
        <h2>In her words.</h2>
        <p>{meghanTodayIntro}</p>
      </div>
      <div className="meghan-today-grid">
        {today.map((p) => (
          <Link key={p.slug} href={`/stays/${p.slug}`} className="meghan-today-card">
            <div className="meghan-today-image">
              <Image src={p.heroImage.src} alt={p.heroImage.alt} fill sizes="(max-width: 900px) 100vw, 33vw" />
            </div>
            <p className="eyebrow">{p.name} · {p.city}</p>
            <h3>{p.designerNote!.headline}</h3>
            <p>{p.designerNote!.paragraphs[0]}</p>
            <span className="text-link">See the home <span aria-hidden="true">→</span></span>
          </Link>
        ))}
      </div>
    </section>

    <section className="about-statement founder-statement">
      <span>M / D</span>
      <h2>Designing a home of your own? <em>Work with Meghan.</em></h2>
      <div>
        <p>Utopia Design brings the same approach to vacation rentals and personal homes: spaces that photograph beautifully, work for real guests, and feel like home.</p>
        <Link className="text-link" href="/design">Explore Utopia Design <span>→</span></Link>
      </div>
    </section>
  </>;
}
