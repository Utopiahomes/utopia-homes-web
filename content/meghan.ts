import type { ContentImage } from "@/types/content";

/**
 * Meghan DeLuca's about page. Every fact comes from her own Airbnb host record (export of
 * 2026-09-24): listing titles, towns, sizes, and the first and last guest review for each home.
 * Guest impressions are paraphrased and anonymous, like the rest of the site; guest names and
 * street addresses are never used. Pending Meghan's review before publication.
 */

export interface HostingChapter {
  id: string;
  years: string;
  title: string;
  place: string;
  paragraphs: string[];
  guestsSaid: string;
  reviews: number;
  images: ContentImage[];
}

const img = (slug: string, alt: string): ContentImage => ({ src: `/images/about/meghan/${slug}.webp`, alt });

export const meghanStats = [
  { value: "2014", label: "First guests welcomed" },
  { value: "17", label: "Airbnb listings hosted" },
  { value: "494", label: "Written guest reviews" },
  { value: "4.88", label: "Average guest rating" },
];

export const meghanIntro = {
  eyebrow: "Owner · Utopia Homes · Utopia Design",
  lead:
    "Meghan has been welcoming guests to the Jersey Shore since 2014. Nearly 500 reviews later, guests mention the same two things again and again: a home that feels thoughtfully put together, and a host who answers right away.",
  statement:
    "Before Utopia Homes had a name, it was Meghan's hosting: one condo, then a whole building, then homes from the shore to the mountains.",
};

export const hostingChapters: HostingChapter[] = [
  {
    id: "north-wildwood",
    years: "2014 – 2020",
    title: "It started with one condo.",
    place: "North Wildwood",
    paragraphs: [
      "It began with a three-bedroom condo a block and a half from the beach, near the first of Morey's Piers, where families, friends, and their dogs were all welcome.",
    ],
    guestsSaid:
      "Guests remembered the responsiveness most. One family wrote that when the power went out, Meghan had someone at the door within fifteen minutes.",
    reviews: 83,
    images: [img("north-wildwood-condo", "Open living room and kitchen of the North Wildwood condo")],
  },
  {
    id: "wildwood-crest-condos",
    years: "2018 – 2020",
    title: "Nine units, nine personalities.",
    place: "Wildwood Crest",
    paragraphs: [
      "Near the end of the Wildwood boardwalk, a nine-unit building became a collection: studios, lofts, and two- and three-bedroom condos, each styled with its own identity. Our Oasis by the Sea. Farmhouse Chic by the Shore. Luxury Loft by the Beach. Modern, Clean, and by the Beautiful Sea.",
      "Meghan designed and decorated every unit, ran the building as a mini motel for several seasons, and then saw it through to its sale.",
    ],
    guestsSaid:
      "Across more than 200 reviews, the words repeat: stylish, thoughtfully decorated, the finishing touches.",
    reviews: 217,
    images: [
      img("crest-oasis", "Living room of Our Oasis by the Sea, with navy accents and a patterned rug"),
      img("crest-farmhouse-chic", "Farmhouse Chic by the Shore living room with a charcoal sectional"),
      img("crest-luxury-loft", "Luxury Loft by the Beach, with a tufted navy sofa and gallery wall"),
      img("crest-rooftop-deck", "Sunny shared deck with red loungers above Wildwood Crest"),
    ],
  },
  {
    id: "poconos",
    years: "2021 – 2026",
    title: "Up to the mountains.",
    place: "Arrowhead Lake, Pocono Mountains",
    paragraphs: [
      "An all-season, five-bedroom home in the Arrowhead Lake community, made for big families: two levels of living space, a game room, a sunroom, a hot tub by the fire pit, and room for dogs of every size.",
    ],
    guestsSaid:
      "Guests called it cozy and said the small touches brought the whole house together, and that everyone felt at home right away.",
    reviews: 79,
    images: [
      img("poconos-lake-house", "The Arrowhead Lake house in the snow, framed by bare winter trees"),
      img("poconos-dining", "Long farmhouse dining table beneath a pendant light"),
    ],
  },
  {
    id: "bayside",
    years: "2023",
    title: "A summer on the bay.",
    place: "Lower Township",
    paragraphs: [
      "An open, light-filled bayside house with a fenced yard for kids and dogs, a pool, a big hot tub, and a short walk to the water.",
    ],
    guestsSaid: "Guests described it as welcoming and warm, and loved the walk to the bay.",
    reviews: 14,
    images: [
      img("bayside-living", "Open living room of the bayside house, in soft neutrals with navy pillows"),
      img("bayside-beach", "Quiet bay beach a short walk from the house"),
    ],
  },
];

export const meghanBeyondRentals = {
  title: "Designing for the sale, too.",
  text:
    "Meghan has been the lead designer and decorator on five flips and twenty property sales, preparing each home to get the most value, whether it was headed for guests or for a buyer.",
  stats: [
    { value: "5", label: "Flips designed" },
    { value: "20", label: "Property sales" },
  ],
};

export const meghanTodayIntro =
  "Today Meghan designs and hosts the Utopia Homes collection: large-group homes where the design starts with how people actually spend time together.";
