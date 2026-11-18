import type { FAQ, Property, StayGuide } from "@/types/content";
import { listOf, numberWord, stayFacts } from "@/lib/stay-facts";
import { properties } from "./properties";
import { stayGuideSchema, validateCollection } from "./schemas";

function home(slug: string) {
  const property = properties.find((record) => record.slug === slug);
  if (!property) throw new Error(`Stay guides need the approved record for ${slug}`);
  return { property, ...stayFacts(property) };
}

const buttercup = home("buttercup-beauty");
const central = home("central-ave-socialization");
const shamrock = home("the-shamrock");
const everyHome = [buttercup, central, shamrock];
const poolHomes = everyHome.filter((stay) => stay.pool);
const dogLimit = Math.min(...everyHome.map((stay) => stay.maxDogs));
const smallestCapacity = Math.min(...everyHome.map((stay) => stay.guests));
const image = (property: Property, src: string) => {
  const found = property.gallery.find((item) => item.src === src);
  if (!found) throw new Error(`${property.slug} has no approved photo ${src}`);
  return found;
};
const faqList = (slug: string, items: Array<[string, string]>): FAQ[] => items.map(([question, answer], index) => ({ id: `${slug}-${index + 1}`, category: "stays", question, answer, sortOrder: index + 1 }));
const bookDirect = "Booking direct with Utopia Homes is 10% cheaper than Airbnb.";

// Ray, 2026-11-18: a scorecard asked answer engines 16 real customer questions and Utopia never
// appeared. Each guide answers one family of those questions in its first sentences, then compares
// only the homes that fit. Numbers come from the approved records, so they can't drift.
const records: StayGuide[] = [
  {
    slug: "large-group-vacation-rentals",
    navLabel: "Large group stays",
    navSummary: "Homes for 20 or more, compared by beds, baths, and parking.",
    inFooter: true,
    eyebrow: "Sleeps 20 or more · The Wildwoods, NJ",
    title: "Large group vacation rentals",
    titleEmphasis: "in the Wildwoods.",
    answer: `All ${numberWord(everyHome.length)} Utopia Homes in the Wildwoods sleep 20 or more. ${shamrock.name} in Wildwood sleeps up to ${shamrock.guests} guests, and ${buttercup.name} in Wildwood Crest and ${central.name} in North Wildwood each sleep up to ${buttercup.guests} in ${numberWord(buttercup.bedrooms)} bedrooms.`,
    heroImage: image(central.property, "/images/central-ave/29.webp"),
    propertySlugs: [shamrock.slug, central.slug, buttercup.slug],
    tableCaption: "Large group vacation rentals in the Wildwoods compared",
    extraRows: [{ label: "Places to gather", values: {
      [shamrock.slug]: "Four living rooms, ground-floor flex space, two decks",
      [central.slug]: "Open living area, second lounge, poolside bonus room",
      [buttercup.slug]: "Open living spaces, game room, covered patio",
    } }],
    fitHeading: "Which home suits your group?",
    fits: [
      { propertySlug: shamrock.slug, heading: `For groups of ${buttercup.guests + 1} to ${shamrock.guests}`, body: `${shamrock.name} is the only home in our collection that sleeps more than ${buttercup.guests}. You get ${shamrock.bedrooms} bedrooms, ${shamrock.beds} beds, ${shamrock.bathrooms} baths, four living rooms, two decks, and parking for ${shamrock.parkingCars} cars. It has no pool or hot tub.` },
      { propertySlug: central.slug, heading: `For up to ${central.guests} friends who want more beds`, body: `${central.name} has ${central.beds} beds across ${central.bedrooms} bedrooms, ${central.beds - buttercup.beds} more beds than ${buttercup.name}, along with a heated private pool, a hot tub, and a fully fenced backyard. Parking is for ${central.parkingCars} cars, so plan to carpool.` },
      { propertySlug: buttercup.slug, heading: "For groups who want a game room", body: `${buttercup.name} has a game room with a foosball table, a heated private pool, an eight-person hot tub, and parking for ${buttercup.parkingCars} cars plus street parking. It has ${buttercup.beds} beds for up to ${buttercup.guests} guests, so plan on some shared beds.` },
    ],
    notesHeading: "Three things to compare before you book",
    notes: [
      { title: "Count beds, not only bedrooms", body: `${buttercup.name} and ${central.name} both have ${buttercup.bedrooms} bedrooms and sleep ${buttercup.guests}, but ${buttercup.name} has ${buttercup.beds} beds and ${central.name} has ${central.beds}.` },
      { title: "Plan the cars early", body: `${shamrock.name} parks ${shamrock.parkingCars} cars, ${buttercup.name} parks ${buttercup.parkingCars}, and ${central.name} parks ${central.parkingCars}. Big groups usually need to carpool.` },
      { title: "Decide if the pool matters", body: `${listOf(poolHomes.map((stay) => stay.name))} have heated private pools and hot tubs. ${shamrock.name} trades those for more room, with space for up to ${shamrock.guests}.` },
    ],
    faqs: faqList("large-group", [
      ["Which vacation homes in the Wildwoods sleep 20 or more?", `${shamrock.name} sleeps up to ${shamrock.guests} guests in Wildwood. ${buttercup.name} in Wildwood Crest and ${central.name} in North Wildwood each sleep up to ${buttercup.guests}.`],
      ["Are there seven-bedroom vacation homes for rent in the Wildwoods?", `Yes. ${buttercup.name} in Wildwood Crest and ${central.name} in North Wildwood each have ${numberWord(buttercup.bedrooms)} bedrooms and sleep up to ${buttercup.guests} guests.`],
      ["Which large group rental has a game room?", `${buttercup.name} in Wildwood Crest has a dedicated game room with a foosball table. ${shamrock.name} has a large ground-floor flex space for games and group events.`],
      ["Can I book a large vacation home directly with the owner?", `Yes. Ray and Meghan DeLuca own and host these homes, and you can book each one on its page here. ${bookDirect}`],
    ]),
    defaultGuests: 20,
    seoTitle: "Large Group Vacation Rentals in the Wildwoods, NJ",
    seoDescription: `Compare three Wildwoods vacation homes that sleep ${smallestCapacity} to ${shamrock.guests} guests, with bedrooms, beds, baths, parking, pools, and dog rules side by side.`,
  },
  {
    slug: "family-reunion-vacation-rentals",
    navLabel: "Family reunions",
    navSummary: "Room for every generation, from shared meals to the family dog.",
    inFooter: true,
    eyebrow: "Family reunions and multigenerational stays",
    title: "Family reunion rentals",
    titleEmphasis: "in the Wildwoods.",
    answer: `A family reunion of 20 fits in any of the ${numberWord(everyHome.length)} Utopia Homes in the Wildwoods. For a multigenerational trip, ${buttercup.name} in Wildwood Crest was designed around grandparents, parents, and children staying together, and ${shamrock.name} in Wildwood has room for up to ${shamrock.guests} when the whole extended family comes.`,
    heroImage: image(buttercup.property, "/images/buttercup/25.webp"),
    propertySlugs: [buttercup.slug, central.slug, shamrock.slug],
    tableCaption: "Family reunion and multigenerational rentals in the Wildwoods compared",
    extraRows: [
      { label: "Shared meals", values: {
        [buttercup.slug]: "Long dining table, kitchen island seating for five, covered outdoor dining",
        [central.slug]: "Open dining space between the kitchen and living room, poolside bar seating",
        [shamrock.slug]: "Kitchen island seating and backyard picnic tables",
      } },
      { label: "Fenced yard", values: {
        [buttercup.slug]: buttercup.fencedYard ?? "None listed",
        [central.slug]: central.fencedYard ?? "None listed",
        [shamrock.slug]: shamrock.fencedYard ?? "None listed",
      } },
    ],
    fitHeading: "Which home suits your family?",
    fits: [
      { propertySlug: buttercup.slug, heading: "For three generations under one roof", body: `Meghan designed ${buttercup.name} around multigenerational hosting, with a large central living area and seating throughout the house. There is a game room and a heated pool for the kids, a first-floor powder room, and a few stairs at the entrance.` },
      { propertySlug: central.slug, heading: "For several households and their dogs", body: `${central.name} was designed with multiple living areas, so a large family can gather together or settle into separate spaces. The fully fenced backyard has a heated private pool, a hot tub, patio seating, and a fire pit.` },
      { propertySlug: shamrock.slug, heading: "For the whole extended family", body: `${shamrock.name} sleeps up to ${shamrock.guests} in ${shamrock.bedrooms} bedrooms, with ${shamrock.bathrooms} baths, four living rooms, and two decks. It is about two blocks from the boardwalk. It has no pool or hot tub.` },
    ],
    notesHeading: "Planning for every age",
    notes: [
      { title: "Talk to us about stairs and access", body: `${buttercup.name} has a few stairs at the entrance. For any home, contact us before booking so we can talk through specific accessibility needs.` },
      { title: "Pack lighter for a longer stay", body: "Every home has a washer and dryer, which helps when a family stays for more than a weekend." },
      { title: "Bring the family dog", body: `All ${numberWord(everyHome.length)} homes welcome up to ${dogLimit} dogs with no pet fee. Cats are not allowed.` },
    ],
    faqs: faqList("family-reunion", [
      ["Where can a family reunion of 20 stay in the Wildwoods?", `${buttercup.name} in Wildwood Crest, ${central.name} in North Wildwood, and ${shamrock.name} in Wildwood all sleep more than 20 guests.`],
      ["Is there a multigenerational rental with a fenced yard for dogs?", `Yes. ${buttercup.name} has a large fenced backyard and ${central.name} has a fully fenced backyard. Each welcomes up to ${dogLimit} dogs with no pet fee.`],
      ["Where can a large family with dogs stay in North Wildwood?", `${central.name} is in North Wildwood. It sleeps up to ${central.guests} guests in ${central.bedrooms} bedrooms, has a fully fenced backyard, and welcomes dogs of all sizes, up to ${central.maxDogs} dogs with no pet fee.`],
      ["Are the homes accessible for older relatives?", `${buttercup.name} has a few stairs at the entrance. Please contact us before booking any home to discuss specific accessibility needs.`],
    ]),
    defaultGuests: 20,
    seoTitle: "Family Reunion Rentals in the Wildwoods, NJ",
    seoDescription: `Compare Wildwoods vacation homes for family reunions and multigenerational trips, sleeping ${smallestCapacity} to ${shamrock.guests} guests, with shared spaces, fenced yards, and dog rules.`,
  },
  {
    slug: "dog-friendly-vacation-rentals",
    navLabel: "Dog-friendly stays",
    navSummary: "Dog rules, fenced yards, and the right home for your pack.",
    inFooter: true,
    eyebrow: "Dogs welcome · The Wildwoods, NJ",
    title: "Dog-friendly vacation rentals",
    titleEmphasis: "in the Wildwoods.",
    answer: `All ${numberWord(everyHome.length)} Utopia Homes in the Wildwoods welcome dogs, up to ${dogLimit} per stay, with no pet fee. If you want a pool too, ${buttercup.name} in Wildwood Crest and ${central.name} in North Wildwood each have a heated private pool, a hot tub, and a fenced backyard. ${shamrock.name} welcomes dogs but has no pool.`,
    heroImage: image(shamrock.property, "/images/shamrock/gallery/10.webp"),
    propertySlugs: [buttercup.slug, central.slug, shamrock.slug],
    tableCaption: "Dog-friendly vacation rentals in the Wildwoods compared",
    extraRows: [{ label: "Fenced yard", values: {
      [buttercup.slug]: buttercup.fencedYard ?? "None listed",
      [central.slug]: central.fencedYard ?? "None listed",
      [shamrock.slug]: shamrock.fencedYard ?? "None listed",
    } }],
    fitHeading: "Which home suits your pack?",
    fits: [
      { propertySlug: buttercup.slug, heading: "For a big fenced yard in Wildwood Crest", body: `${buttercup.name} has a large fenced backyard with a heated private pool and an eight-person hot tub. Dogs of any size are welcome, and the home sleeps up to ${buttercup.guests} guests.` },
      { propertySlug: central.slug, heading: "For a large family in North Wildwood", body: `${central.name} has a fully fenced backyard with a heated private pool and a hot tub, and it is about a five-minute walk to Albert I. Allen Memorial Park. Dogs of all sizes are welcome.` },
      { propertySlug: shamrock.slug, heading: "For the biggest group, dogs included", body: `${shamrock.name} sleeps up to ${shamrock.guests} guests and welcomes dogs of all shapes and sizes. It has no pool, and we don’t list a fenced yard here, so ask us about the outdoor space if your dog needs one.` },
    ],
    notesHeading: "The dog rules, plainly",
    notes: [
      { title: `Up to ${dogLimit} dogs, any size`, body: `Every home welcomes up to ${dogLimit} dogs of any size.` },
      { title: "No pet fee", body: "There is no pet fee at any Utopia home." },
      { title: "Dogs only", body: "Cats are not allowed at any of our homes." },
    ],
    faqs: faqList("dog-friendly", [
      ["Which Wildwood vacation rentals allow dogs and have a pool?", `${buttercup.name} in Wildwood Crest and ${central.name} in North Wildwood both welcome dogs and have a heated private pool and a hot tub.`],
      ["Is there a pet fee?", "No. There is no pet fee at any Utopia home."],
      ["How many dogs can we bring?", `Up to ${dogLimit} dogs at each home, and dogs of any size are welcome.`],
      ["Which dog-friendly homes have a fenced yard?", `${buttercup.name} has a large fenced backyard and ${central.name} has a fully fenced backyard.`],
      ["Are cats allowed?", "No. Our homes welcome dogs, but not cats."],
    ]),
    seoTitle: "Dog-Friendly Vacation Rentals in the Wildwoods, NJ",
    seoDescription: `All three Utopia Homes in the Wildwoods welcome up to ${dogLimit} dogs with no pet fee. Compare fenced yards, heated private pools, and space for your group.`,
  },
  {
    slug: "private-pool-vacation-rentals",
    navLabel: "Private pool homes",
    navSummary: "Heated private pools and hot tubs, side by side.",
    inFooter: false,
    eyebrow: "Heated pool and hot tub · The Wildwoods, NJ",
    title: "Private pool rentals",
    titleEmphasis: "in the Wildwoods.",
    answer: `Two Utopia Homes have a heated private pool and a hot tub: ${buttercup.name} in Wildwood Crest and ${central.name} in North Wildwood. Each has ${numberWord(buttercup.bedrooms)} bedrooms and sleeps up to ${buttercup.guests} guests, so a group of ${buttercup.guests} can have the pool to itself at the Jersey Shore.`,
    heroImage: image(central.property, "/images/central-ave/01.webp"),
    propertySlugs: [buttercup.slug, central.slug],
    tableCaption: "Private pool vacation rentals in the Wildwoods compared",
    extraRows: [{ label: "Outdoor space", values: {
      [buttercup.slug]: "Large fenced backyard, covered patio, grill, covered dining, outdoor sectional",
      [central.slug]: "Fully fenced backyard, patio seating, fire pit, poolside bar seating, upper deck",
    } }],
    fitHeading: "Which pool home suits your group?",
    fits: [
      { propertySlug: buttercup.slug, heading: "For Wildwood Crest and long days outside", body: `${buttercup.name} pairs its heated private pool with an eight-person hot tub, poolside loungers, a grill, and covered dining beside the hot tub. Inside, there is a game room for when everyone comes in from the sun.` },
      { propertySlug: central.slug, heading: "For North Wildwood and evenings outdoors", body: `${central.name} has a heated private pool, a hot tub, a fire pit, poolside bar seating, and an upper deck overlooking the pool. It has ${central.beds} beds across ${central.bedrooms} bedrooms.` },
    ],
    notesHeading: "Before you book for the pool",
    notes: [
      { title: "Ask about pool dates", body: `The pool at ${buttercup.name} is seasonal. If your trip falls outside the summer, ask us about pool dates at either home before you book.` },
      { title: `Need room for more than ${buttercup.guests}?`, body: `${shamrock.name} sleeps up to ${shamrock.guests} guests, but it has no pool or hot tub.` },
    ],
    faqs: faqList("private-pool", [
      ["Which Wildwood Crest rentals have a heated pool and hot tub?", `${buttercup.name} in Wildwood Crest has a heated private pool and a private eight-person hot tub.`],
      ["Are there Jersey Shore rentals with a private pool that sleep 22?", `Yes. ${buttercup.name} in Wildwood Crest and ${central.name} in North Wildwood each have a heated private pool and sleep up to ${buttercup.guests} guests.`],
      ["Does The Shamrock have a pool?", `No. ${shamrock.name} does not have a pool or hot tub. Our two pool homes are ${buttercup.name} and ${central.name}.`],
      ["Can dogs come to the pool homes?", `Yes. ${buttercup.name} and ${central.name} each welcome up to ${dogLimit} dogs with no pet fee, and both backyards are fenced.`],
    ]),
    seoTitle: "Private Pool and Hot Tub Rentals in the Wildwoods, NJ",
    seoDescription: `Compare two Wildwoods vacation homes with a heated private pool and hot tub, each with ${buttercup.bedrooms} bedrooms and space for up to ${buttercup.guests} guests.`,
  },
];

export const stayGuides: StayGuide[] = validateCollection(stayGuideSchema, records, "stay guides");
