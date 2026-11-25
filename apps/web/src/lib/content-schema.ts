import { z } from "astro/zod";
import { motionEffects } from "./motion";
import { videoEmbed } from "./video";

// The shape of every wording file in src/site-content. Keys and list lengths are locked here;
// only the wording itself can change without a code change.

const text = z
  .string({ error: (issue) => (issue.input === undefined ? "is missing" : "must be wording in quotes") })
  .min(1, "must not be empty")
  .refine((value) => !/[<>]/.test(value), "must be plain wording without < or >");

// A photo on the page: a file in public/images. The owner's editor replaces it by uploading a new one.
const photo = z
  .string({ error: (issue) => (issue.input === undefined ? "is missing" : "must be a photo path in quotes") })
  .regex(/^\/images\/[\w\-./]+\.(?:jpe?g|png|webp)$/, "must be a photo in /images, like /images/home/wildwoods-beach-summer.jpg");

// A link on a button the owner adds: a page on this site, a web address, or an email address.
const link = z
  .string({ error: (issue) => (issue.input === undefined ? "is missing" : "must be a link in quotes") })
  .regex(/^(?:\/(?!\/)[\w\-./#?=&]*|https:\/\/[^\s<>"]+|mailto:[^\s<>"]+)$/, "must start with /, https:// or mailto:");
const optionalText = text.optional();
// A video: a YouTube, Vimeo or Loom link (lib/video.ts). Empty until the owner pastes one.
const video = z
  .string()
  .refine((value) => value === "" || videoEmbed(value) !== "", "must be a YouTube, Vimeo or Loom link")
  .optional();
const sectionId = z.string().regex(/^[a-z][\w-]{0,40}$/, "must be a short section name");

const group = <Shape extends z.ZodRawShape>(shape: Shape) => z.strictObject(shape);

const list = <Item extends z.ZodType>(item: Item, length: number) =>
  z.array(item).length(length, `must keep exactly ${length} items`);

// Sections the owner can add in the editor. Stoin's editor reads this list from the edit copy, so the
// catalog lives here with the site: fields are text, photo or link.
export const blockCatalog = [
  {
    type: "text",
    label: "Heading and text",
    fields: [{ name: "eyebrow", kind: "text", optional: true }, { name: "title", kind: "text" }, { name: "body", kind: "text" }],
    sample: { type: "text", eyebrow: "New section", title: "A new heading", body: "Write what this section should say." },
  },
  {
    type: "photo",
    label: "Photo with text",
    fields: [{ name: "photo", kind: "photo" }, { name: "photoAlt", kind: "text" }, { name: "eyebrow", kind: "text", optional: true }, { name: "title", kind: "text" }, { name: "body", kind: "text" }],
    sample: { type: "photo", photo: "/images/home/wildwoods-beach-summer.jpg", photoAlt: "Describe the photo", eyebrow: "New section", title: "A new heading", body: "Write what this section should say." },
  },
  {
    type: "quote",
    label: "Quote",
    fields: [{ name: "quote", kind: "text" }, { name: "attribution", kind: "text", optional: true }],
    sample: { type: "quote", quote: "A sentence worth remembering.", attribution: "Who said it" },
  },
  {
    type: "video",
    label: "Video",
    fields: [{ name: "video", kind: "video", optional: true }, { name: "title", kind: "text" }, { name: "body", kind: "text", optional: true }],
    sample: { type: "video", video: "", title: "A short video", body: "Say what the video shows." },
  },
  {
    type: "cta",
    label: "Call to action",
    fields: [{ name: "title", kind: "text" }, { name: "body", kind: "text" }, { name: "button", kind: "text" }, { name: "link", kind: "link" }],
    sample: { type: "cta", title: "Ready to talk?", body: "Tell people what happens next.", button: "Get in touch", link: "/#contact-info" },
  },
] as const;

const addedBlock = z.discriminatedUnion("type", [
  group({ type: z.literal("text"), eyebrow: optionalText, title: text, body: text }),
  group({ type: z.literal("photo"), photo, photoAlt: text, eyebrow: optionalText, title: text, body: text }),
  group({ type: z.literal("quote"), quote: text, attribution: optionalText }),
  group({ type: z.literal("cta"), title: text, body: text, button: text, link }),
  group({ type: z.literal("video"), video, title: text, body: optionalText }),
]);
export type AddedBlock = z.infer<typeof addedBlock>;

const pageLayout = group({
  order: z.array(sectionId).max(40),
  hidden: z.array(sectionId).max(40),
  added: z.record(sectionId, addedBlock),
  // How each section comes into view (lib/motion.ts); sections not listed use their default.
  motion: z.record(sectionId, z.enum(motionEffects)).optional(),
});

// Utopia Homes' wording the owner or Lucy can change. Facts code reads (names, guests, parking, pets,
// prices, photos of each house) stay in content/*.ts at the repository root.
const stayWording = group({
  shortDescription: text,
  fullDescription: text,
  uniqueFeatures: z.array(text).min(1).max(8),
  designerNote: group({
    headline: text,
    paragraphs: z.array(text).min(1).max(8),
  }),
  accessibility: text,
});

export const contentSchemas = {
  "layout": z.record(z.string().regex(/^[\w-]+$/), pageLayout),
  // Ordered lists the owner or Lucy can reorder (none on this site yet; the editor reads the file).
  "lists": z.record(z.string().regex(/^[\w-]+$/), z.array(z.string().regex(/^[\w-]+$/))),
  "site": group({
    skipLink: text,
    talkLabel: text,
    talkStatus: text,
  }),
  "home": group({
    hero: group({
      kicker: text,
      titleLine1: text,
      titleLine2: text,
    }),
    belief: group({
      kicker: text,
      title: text,
    }),
    featured: group({
      eyebrow: text,
      titleLine1: text,
      titleLine2: text,
      allStays: text,
      viewHome: text,
    }),
    gathering: group({
      eyebrow: text,
      titleLine1: text,
      titleLine2: text,
    }),
    owners: group({
      eyebrow: text,
      title: text,
      text: text,
      link: text,
    }),
    design: group({
      eyebrow: text,
      title: text,
      link: text,
    }),
  }),
  "house-page": group({
    story: group({
      eyebrow: text,
      titleLine1: text,
      titleLine2: text,
    }),
    features: group({
      eyebrow: text,
    }),
    amenities: group({
      eyebrow: text,
      titleLine1: text,
      titleLine2: text,
    }),
    notes: group({
      eyebrow: text,
    }),
    book: group({
      eyebrow: text,
      text: text,
    }),
  }),
  // Each house's own wording, joined with its facts in content/properties.ts.
  "stays": group({
    "buttercup-beauty": stayWording,
    "central-ave-socialization": stayWording,
    "the-shamrock": stayWording,
  }),
};

export type ContentFile = keyof typeof contentSchemas;
