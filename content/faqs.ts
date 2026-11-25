import type { FAQ, Property } from "../types/content.js";
import { listOf, numberWord, parkingLabel, stayFacts } from "../lib/stay-facts.js";
import { properties } from "./properties.js";
import { faqSchema, validateCollection } from "./schemas.js";

const active = properties.filter((property) => property.status === "active");
const homes = active.map((property) => stayFacts(property));
const names = (items: typeof homes) => listOf(items.map((home) => home.name));
const perHome = (read: (property: Property) => string) => active.map((property) => `${property.name}: ${read(property)}`).join(" ");

const located = listOf(homes.map((home) => `${home.name} in ${home.city}`));
const capacity = homes.map((home) => `${home.name} sleeps up to ${home.guests} guests in ${home.bedrooms} bedrooms, with ${home.beds} beds and ${home.bathrooms} baths.`).join(" ");
const poolHomes = homes.filter((home) => home.pool);
const noPoolHomes = homes.filter((home) => !home.pool);
const fenced = listOf(homes.filter((home) => home.fencedYard).map((home) => `${home.name} has a ${home.fencedYard!.toLowerCase()}`));
const parking = homes.map((home) => `${home.name} has parking for ${parkingLabel(home)}.`).join(" ");
const rated = active.filter((property) => property.reviewSummary && property.sourceAudit.reviewRights === "approved");
const ratings = rated.map((property) => `${property.name} is rated ${property.reviewSummary!.rating.toFixed(2)} out of 5 from ${property.reviewSummary!.count} reviews.`).join(" ");
const ratingsChecked = new Date(`${rated[0].reviewSummary!.lastVerifiedAt}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

// Ray, 2026-11-18: these answer the questions customers asked answer engines. Anything about a home
// is written from its approved record above, so an answer can't drift from the stay page.
const records: FAQ[] = [
  { id: "faq-location", category: "stays", question: "Where are Utopia Homes located?", answer: `Utopia Homes has ${numberWord(homes.length)} large-group vacation homes in the Wildwoods, New Jersey: ${located}.`, sortOrder: 1 },
  { id: "faq-capacity", category: "stays", question: "How many guests can each home sleep?", answer: capacity, sortOrder: 2 },
  { id: "faq-pool", category: "stays", question: "Which homes have a private pool and hot tub?", answer: `${names(poolHomes)} each have a heated private pool and a hot tub. ${names(noPoolHomes)} ${noPoolHomes.length === 1 ? "does" : "do"} not have a pool or hot tub.`, sortOrder: 3 },
  { id: "faq-dogs", category: "stays", question: "Are dogs allowed?", answer: `Yes, at every home. ${perHome((property) => property.petPolicy)}`, sortOrder: 4 },
  { id: "faq-fenced", category: "stays", question: "Which homes have a fenced yard?", answer: `${fenced}.`, sortOrder: 5 },
  { id: "faq-parking", category: "stays", question: "How much parking does each home have?", answer: parking, sortOrder: 6 },
  { id: "faq-booking", category: "stays", question: "Where do I complete my booking?", answer: "On the home’s page. Choose your dates and guests to see the price, then select Book now to finish at checkout. Each home is also listed on Airbnb if you prefer to book there.", sortOrder: 7 },
  { id: "faq-direct", category: "stays", question: "Can I book directly with the owner?", answer: "Yes. Utopia Homes is Ray and Meghan DeLuca, the owners who host these homes. Booking direct with Utopia Homes is 10% cheaper than Airbnb.", sortOrder: 8 },
  { id: "faq-ratings", category: "stays", question: "How do guests rate the homes?", answer: `On Airbnb, as of ${ratingsChecked}: ${ratings}`, sortOrder: 9 },
  { id: "faq-accessibility", category: "stays", question: "Are the homes accessible?", answer: perHome((property) => property.accessibility), sortOrder: 10 },
  { id: "faq-manage", category: "owners", question: "Does Utopia Homes manage vacation rentals in the Wildwoods?", answer: "Yes. Utopia Homes manages vacation rentals in the Wildwoods, New Jersey. We handle pricing and marketing, guest communication, cleaning, maintenance, and local oversight, so your home performs without consuming your time.", sortOrder: 11 },
  { id: "faq-owner-crest", category: "owners", question: "I own a shore house in Wildwood Crest. Can Utopia Homes manage it?", answer: "Tell us about it. Share your listing and your goals on our owner page, and a Utopia team member will review the details and contact you directly. Our own Buttercup Beauty is in Wildwood Crest, so we know the area firsthand.", sortOrder: 12 },
  { id: "faq-owner", category: "owners", question: "What happens after I submit my property?", answer: "A Utopia team member reviews your details and contacts you directly. Nothing is automatically handed to an outside operator.", sortOrder: 13 },
  { id: "faq-owner-experience", category: "owners", question: "Who runs Utopia Homes?", answer: "Ray and Meghan DeLuca own Utopia Homes. Ray has nearly 15 years of hosting experience and has welcomed thousands of guests. Meghan is the designer behind Utopia Design.", sortOrder: 14 },
  { id: "faq-design", category: "design", question: "Does Utopia Homes design and furnish vacation rentals?", answer: "Yes. Utopia Design, a Utopia Homes company, designs and furnishes vacation rentals. We can improve an existing rental, furnish an empty one until it is complete and guest-ready, or plan a rental renovation.", sortOrder: 15 },
  { id: "faq-design-who", category: "design", question: "Who designed the Utopia Homes collection?", answer: `Meghan DeLuca designed ${names(homes)}.`, sortOrder: 16 },
  { id: "faq-design-estimate", category: "design", question: "How do I get a design estimate?", answer: "Start in the Quote Studio on our design page. Tell us about the property, its spaces, and what you want to change, and you’ll receive a nonbinding preliminary estimate to review before scheduling with Meghan.", sortOrder: 17 },
  { id: "faq-membership", category: "membership", question: "Is Utopia membership live today?", answer: "Membership is coming soon. Join the launch list to hear when it opens and what early members can expect.", sortOrder: 18 },
  { id: "faq-contact", category: "general", question: "How do I contact Utopia Homes?", answer: "Use the contact form to reach Utopia Homes about stays, property management, design, or general questions.", sortOrder: 19 },
];

export const faqs: FAQ[] = validateCollection(faqSchema, records, "FAQs");
