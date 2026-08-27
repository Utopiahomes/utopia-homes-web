"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { DesignAudience, DesignPageContent } from "@/types/content";
import { track } from "@/lib/analytics/events";

const audienceLabels: Record<DesignAudience, string> = {
  rental: "A vacation rental",
  personal: "A home I live in",
};

interface UtopiaDesignPageProps {
  content: DesignPageContent;
  initialAudience: DesignAudience;
  explicitAudience: boolean;
}

export function UtopiaDesignPage({ content, initialAudience, explicitAudience }: UtopiaDesignPageProps) {
  const [audience, setAudience] = useState(initialAudience);
  const router = useRouter();
  const pathname = usePathname();
  const active = content.audiences[audience];

  useEffect(() => {
    if (explicitAudience) return;
    const saved = window.sessionStorage.getItem("utopia-design-audience");
    if (saved !== "rental" && saved !== "personal") return;
    const restore = window.setTimeout(() => setAudience(saved), 0);
    return () => window.clearTimeout(restore);
  }, [explicitAudience]);

  function chooseAudience(nextAudience: DesignAudience) {
    setAudience(nextAudience);
    window.sessionStorage.setItem("utopia-design-audience", nextAudience);
    router.replace(`${pathname}?audience=${nextAudience}`, { scroll: false });
    track({ name: "design_audience_selected", properties: { audience: nextAudience } });
  }

  const meghanSection = (
    <section className="design-meghan" id="meet-meghan" aria-labelledby="meghan-heading">
      <div className="design-meghan-mark" aria-hidden="true">M</div>
      <div>
        <p className="eyebrow">Designed by a person, not a formula</p>
        <h2 id="meghan-heading">{content.meghan.heading}</h2>
        <blockquote>“{content.meghan.statement}”</blockquote>
        <p>{content.meghan.supportingCopy}</p>
        <ul>{content.meghan.principles.map((principle) => <li key={principle}>{principle}</li>)}</ul>
      </div>
    </section>
  );

  const caseStudySection = (
    <section className="design-case-study" id="our-work" aria-labelledby="case-study-heading">
      <div className="design-case-images">
        <figure className="design-case-image design-case-image-primary"><Image src={active.caseStudy.primaryImage.src} alt={active.caseStudy.primaryImage.alt} fill sizes="(max-width: 900px) 100vw, 55vw" /><figcaption>{active.caseStudy.primaryLabel}</figcaption></figure>
        <figure className="design-case-image design-case-image-secondary"><Image src={active.caseStudy.secondaryImage.src} alt={active.caseStudy.secondaryImage.alt} fill sizes="(max-width: 900px) 48vw, 20vw" /><figcaption>{active.caseStudy.secondaryLabel}</figcaption></figure>
      </div>
      <div className="design-case-copy">
        <p className="eyebrow">{active.caseStudy.eyebrow}</p>
        <h2 id="case-study-heading">{active.caseStudy.headline}</h2>
        <p>{active.caseStudy.body}</p>
        <ul>{active.caseStudy.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
      </div>
    </section>
  );

  const outcomeSection = (
    <section className="design-outcomes" id="services" aria-labelledby="outcomes-heading">
      <div className="design-section-heading">
        <p className="eyebrow">Begin with the outcome</p>
        <h2 id="outcomes-heading">What should this home become?</h2>
      </div>
      <div className="design-outcome-grid">
        {active.outcomes.map((outcome, index) => (
          <article key={outcome.serviceId}>
            <span aria-hidden="true">0{index + 1}</span>
            <h3>{outcome.title}</h3>
            <p>{outcome.description}</p>
            <Link href={`/design/quote?audience=${audience}&goal=${outcome.serviceId}`} aria-label={`${outcome.title}: start project profile`}>Start here <b aria-hidden="true">↗</b></Link>
          </article>
        ))}
      </div>
      <Link className="design-help" href={`/design/quote?audience=${audience}`}><strong>Not sure where your project fits?</strong><span> Answer three quick questions and we’ll recommend the right starting point.</span><b aria-hidden="true">↗</b></Link>
    </section>
  );

  return <div className="design-page" data-audience={audience}>
    <section className="design-audience" aria-labelledby="audience-question">
      <p id="audience-question">What kind of space are you designing?</p>
      <div role="group" aria-labelledby="audience-question">
        {(Object.keys(audienceLabels) as DesignAudience[]).map((key) => <button key={key} type="button" aria-pressed={audience === key} onClick={() => chooseAudience(key)}>{audienceLabels[key]}</button>)}
      </div>
    </section>

    <section className="design-hero" aria-labelledby="design-title">
      <Image className="design-hero-image" src={active.heroImage.src} alt={active.heroImage.alt} fill priority sizes="100vw" />
      <div className="design-hero-wash" />
      <div className="design-hero-copy">
        <p className="eyebrow eyebrow-light">{active.eyebrow}</p>
        <h1 id="design-title">{active.headline}</h1>
        <p>{active.supportingCopy}</p>
        <div className="button-row"><Link className="button button-design" href="#services">{active.primaryCta}</Link><Link className="design-text-link" href="#our-work">See Our Work</Link></div>
      </div>
      <div className="design-signature"><span>Utopia Design</span><small>A Utopia Homes company</small></div>
    </section>

    <section className="design-values" aria-label={`${audienceLabels[audience]} design benefits`}>
      {active.values.map((value, index) => <article key={value.title}><span>0{index + 1}</span><h2>{value.title}</h2><p>{value.description}</p></article>)}
    </section>

    {audience === "personal" && meghanSection}
    {audience === "rental" && outcomeSection}
    {caseStudySection}
    {audience === "personal" && outcomeSection}

    <section className="design-quote-intro" id="quote-studio" aria-labelledby="quote-heading">
      <p className="eyebrow eyebrow-light">Quote Studio</p>
      <h2 id="quote-heading">Your project takes shape before the call.</h2>
      <p>Tell us about the property, its spaces, and what you want to change. Once the scope is clear, you’ll receive a personalized preliminary estimate to review before scheduling with Meghan.</p>
      <ol><li><span>01</span><strong>Goal</strong>What should change?</li><li><span>02</span><strong>Property</strong>Confirm the home</li><li><span>03</span><strong>Vision</strong>Rooms, photographs, and style</li><li><span>04</span><strong>Estimate</strong>Review and acknowledge</li></ol>
      <Link className="button button-quote" href={`/design/quote?audience=${audience}`}>{active.quoteCta}</Link>
      <p id="quote-status" className="design-quote-status">The complimentary consultation becomes available after the preliminary estimate is reviewed and acknowledged.</p>
    </section>

    {audience === "rental" && meghanSection}

    <section className="design-final-cta" aria-labelledby="design-final-heading">
      <p className="eyebrow">Utopia Design</p>
      <h2 id="design-final-heading">A more considered home starts with a clearer picture.</h2>
      <Link className="button button-primary" href="#services">Choose your starting point</Link>
    </section>
  </div>;
}
