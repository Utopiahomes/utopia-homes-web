import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FAQList } from "@/components/FAQList";
import { StayComparisonTable } from "@/components/StayComparisonTable";
import { faqs, properties } from "@/content";
import { faqPageStructuredData } from "@/lib/structured-data";

// React render checks for the Next.js components. Not run by the root vitest config (it runs
// tests/*.test.ts for lib/ and content/); the content checks moved to aeo-content.test.ts.
const stay = (slug: string) => properties.find((property) => property.slug === slug)!;

describe("stay guides", () => {
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
});
