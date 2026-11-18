import { existsSync } from "node:fs";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { FAQList } from "@/components/FAQList";
import { StayComparisonTable } from "@/components/StayComparisonTable";
import { businessProfile, faqs, properties, stayGuides } from "@/content";
import { buildLlmsTxt } from "@/lib/llms-txt";
import { pageMetadata } from "@/lib/page-metadata";
import { dogsLabel, parkingLabel, stayFacts } from "@/lib/stay-facts";
import { faqPageStructuredData, organizationStructuredData } from "@/lib/structured-data";

const origin = "https://www.utopiahomes.com";
const stay = (slug: string) => properties.find((property) => property.slug === slug)!;
const guide = (slug: string) => stayGuides.find((item) => item.slug === slug)!;
const guideText = (item: (typeof stayGuides)[number]) => [item.answer, item.seoDescription, ...item.fits.flatMap((fit) => [fit.heading, fit.body]), ...item.notes.flatMap((note) => [note.title, note.body]), ...item.faqs.flatMap((faq) => [faq.question, faq.answer]), ...item.extraRows.flatMap((row) => Object.values(row.values))];
const publishedCopy = [...stayGuides.flatMap(guideText), ...faqs.flatMap((faq) => [faq.question, faq.answer])];

describe("stay facts", () => {
  it("reads the approved facts from each record", () => {
    expect(stayFacts(stay("buttercup-beauty"))).toMatchObject({ guests: 22, bedrooms: 7, beds: 12, bathrooms: 3.5, pool: "Heated private pool", parkingCars: 4, maxDogs: 4, noPetFee: true, noCats: true });
    expect(stayFacts(stay("central-ave-socialization"))).toMatchObject({ guests: 22, bedrooms: 7, beds: 18, bathrooms: 3.5, pool: "Heated private pool", hotTub: "Hot tub", parkingCars: 3, streetParking: false });
    expect(stayFacts(stay("the-shamrock"))).toMatchObject({ guests: 32, bedrooms: 10, beds: 19, bathrooms: 5, pool: null, hotTub: null, fencedYard: null, parkingCars: 8, streetParking: true });
  });

  it("writes short table labels", () => {
    expect(parkingLabel(stayFacts(stay("the-shamrock")))).toBe("8 cars, plus street parking");
    expect(dogsLabel(stayFacts(stay("central-ave-socialization")))).toBe("Up to 4 dogs, no pet fee, no cats");
  });
});

describe("stay guides", () => {
  it("gives every guide a route and a URL no home can claim", () => {
    for (const item of stayGuides) {
      expect(existsSync(`app/stays/${item.slug}/page.tsx`), item.slug).toBe(true);
      expect(properties.some((property) => property.slug === item.slug)).toBe(false);
    }
  });

  it("only compares approved homes and explains each one", () => {
    for (const item of stayGuides) {
      expect(item.propertySlugs.every((slug) => stay(slug))).toBe(true);
      expect(item.fits.map((fit) => fit.propertySlug).sort()).toEqual([...item.propertySlugs].sort());
      for (const row of item.extraRows) expect(Object.keys(row.values).sort()).toEqual([...item.propertySlugs].sort());
    }
  });

  it("never lists The Shamrock as a pool home", () => {
    expect(guide("private-pool-vacation-rentals").propertySlugs).not.toContain("the-shamrock");
    for (const item of stayGuides) {
      const shamrockFit = item.fits.find((fit) => fit.propertySlug === "the-shamrock");
      if (shamrockFit) expect(shamrockFit.body).toMatch(/no pool/i);
    }
    for (const line of publishedCopy) expect(line).not.toMatch(/The Shamrock (has|with|offers) (a |an )?(heated|private|pool|hot tub)/i);
  });

  it("keeps pool wording out of every link shown on The Shamrock's page", () => {
    for (const item of stayGuides.filter((entry) => entry.propertySlugs.includes("the-shamrock") || entry.inFooter)) expect(`${item.navLabel} ${item.navSummary}`).not.toMatch(/pool|hot[ -]?tub/i);
  });

  it("answers the customer's question in the first sentences", () => {
    expect(guide("large-group-vacation-rentals").answer).toMatch(/sleep 20 or more.*up to 32 guests.*up to 22/);
    expect(guide("family-reunion-vacation-rentals").answer).toMatch(/^A family reunion of 20/);
    expect(guide("dog-friendly-vacation-rentals").answer).toMatch(/^All three Utopia Homes.*welcome dogs, up to 4 per stay, with no pet fee/);
    expect(guide("private-pool-vacation-rentals").answer).toMatch(/^Two Utopia Homes have a heated private pool and a hot tub/);
  });

  it("makes no unprovable claims and keeps the house voice", () => {
    for (const line of publishedCopy) {
      expect(line).not.toMatch(/\b(best|#1|number one|top[- ]rated|award|luxury|guarantee)/i);
      expect(line).not.toContain("—");
    }
  });

  it("shows the record's facts in a real comparison table", () => {
    render(<StayComparisonTable caption="Homes compared" homes={[stay("buttercup-beauty"), stay("the-shamrock")]} extraRows={[]} />);
    const table = screen.getByRole("table", { name: "Homes compared" });
    const row = (name: string) => within(within(table).getByRole("rowheader", { name }).closest("tr")!).getAllByRole("cell").map((cell) => cell.textContent);
    expect(row("Guests")).toEqual(["Up to 22", "Up to 32"]);
    expect(row("Beds")).toEqual(["12", "19"]);
    expect(row("Pool")).toEqual(["Heated private pool", "No pool"]);
    expect(row("Hot tub")).toEqual(["Private hot tub", "No hot tub"]);
    expect(row("Parking")).toEqual(["4 cars, plus street parking", "8 cars, plus street parking"]);
    expect(row("Guest rating")[0]).toContain("4.95 from 81 reviews on Airbnb");
    expect(within(table).getByRole("link", { name: /4\.95 from 81 reviews/ })).toHaveAttribute("href", "https://www.airbnb.com/rooms/639163446287777223");
  });

  it("leaves a rating out when review rights are not approved", () => {
    const pending = { ...stay("buttercup-beauty"), sourceAudit: { ...stay("buttercup-beauty").sourceAudit, reviewRights: "pending" as const } };
    render(<StayComparisonTable caption="Pending" homes={[pending]} extraRows={[]} />);
    expect(screen.getByRole("table", { name: "Pending" })).not.toHaveTextContent("4.95");
  });
});

describe("FAQ", () => {
  it("publishes structured answers that match the visible text exactly", () => {
    const { container } = render(<FAQList items={faqs} open />);
    const shown = [...container.querySelectorAll("details")].map((item) => ({ open: item.open, question: item.querySelector("summary")!.lastChild!.textContent, answer: item.querySelector("p")!.textContent }));
    const data = faqPageStructuredData(faqs) as { "@type": string; mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }> };
    expect(data["@type"]).toBe("FAQPage");
    expect(data.mainEntity.map((item) => ({ open: true, question: item.name, answer: item.acceptedAnswer.text }))).toEqual(shown);
  });

  it("answers from the approved records", () => {
    const answer = (id: string) => faqs.find((faq) => faq.id === id)!.answer;
    expect(answer("faq-pool")).toBe("Buttercup Beauty and Central Ave Socialization each have a heated private pool and a hot tub. The Shamrock does not have a pool or hot tub.");
    expect(answer("faq-capacity")).toContain("The Shamrock sleeps up to 32 guests in 10 bedrooms, with 19 beds and 5 baths.");
    expect(answer("faq-dogs")).toContain(stay("central-ave-socialization").petPolicy);
    expect(answer("faq-ratings")).toContain("Buttercup Beauty is rated 4.95 out of 5 from 81 reviews.");
  });
});

describe("business identity", () => {
  const data = organizationStructuredData(businessProfile, properties, origin);

  it("names the business, its towns, and its services", () => {
    expect(data).toMatchObject({ "@type": "Organization", name: "Utopia Homes", url: origin, subjectOf: { url: `${origin}/about` }, contactPoint: { url: `${origin}/contact` } });
    expect(JSON.stringify(data.areaServed)).toContain("Wildwood Crest, New Jersey");
    expect(JSON.stringify(data.makesOffer)).toContain("Vacation rental management");
    expect(JSON.stringify(data.makesOffer)).toContain("Vacation rental design and furnishing");
  });

  it("states nothing the approved content doesn't have", () => {
    for (const field of ["address", "telephone", "foundingDate", "legalName", "email"]) expect(data).not.toHaveProperty(field);
    expect(JSON.stringify(data)).not.toContain("@utopiahomes.com");
  });

  it("describes the homes and key pages in llms.txt", () => {
    const text = buildLlmsTxt({ profile: businessProfile, properties, guides: stayGuides, origin });
    expect(text.startsWith("# Utopia Homes\n\n> ")).toBe(true);
    expect(text).toContain(`[The Shamrock](${origin}/stays/the-shamrock): Wildwood, New Jersey; sleeps up to 32 guests; 10 bedrooms, 19 beds, 5 baths; no pool; no hot tub;`);
    expect(text).toContain("rated 4.95 out of 5 from 81 reviews on Airbnb as of 2026-11-18");
    for (const path of ["/faq", "/about", "/contact", "/list-your-home", "/design", ...stayGuides.map((item) => `/stays/${item.slug}`)]) expect(text).toContain(`${origin}${path}`);
    expect(text).not.toContain("@utopiahomes.com");
  });
});

describe("page basics", () => {
  const image = { src: "/images/buttercup/02.webp", alt: "Heated private pool" };

  it("sets the canonical URL and a preview image", () => {
    expect(pageMetadata({ title: "Stays", description: "Homes", path: "/stays", image })).toMatchObject({ title: "Stays", alternates: { canonical: "/stays" }, openGraph: { title: "Stays | Utopia Homes", url: "/stays", images: [{ url: image.src, alt: image.alt }] } });
  });

  it("swaps AVIF previews for the default photo", () => {
    const metadata = pageMetadata({ title: "About", description: "About", path: "/about", image: { src: "/images/shamrock/exterior-main.avif", alt: "Exterior" } });
    expect(metadata.openGraph?.images).toEqual([{ url: businessProfile.shareImage.src, alt: businessProfile.shareImage.alt }]);
  });

  it("lists the new pages in the sitemap", async () => {
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls.some((url) => url.endsWith("/faq"))).toBe(true);
    for (const item of stayGuides) expect(urls.some((url) => url.endsWith(`/stays/${item.slug}`)), item.slug).toBe(true);
  });
});
