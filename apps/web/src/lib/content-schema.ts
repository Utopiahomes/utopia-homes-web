import { z } from "astro/zod";
import { iconNames } from "./icons";
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
  {
    type: "icons",
    label: "Icon grid",
    fields: [{ name: "title", kind: "text", optional: true }, { name: "body", kind: "text", optional: true }],
    items: {
      label: "Item",
      min: 1,
      max: 12,
      fields: [{ name: "icon", kind: "icon", choices: iconNames }, { name: "title", kind: "text" }, { name: "body", kind: "text", optional: true }],
      sample: { icon: "star", title: "A new point", body: "Say what this point means." },
    },
    sample: {
      type: "icons",
      title: "What we do",
      items: [
        { id: "r1001", icon: "home", title: "First point", body: "Say what this point means." },
        { id: "r1002", icon: "people", title: "Second point", body: "Say what this point means." },
        { id: "r1003", icon: "growth", title: "Third point", body: "Say what this point means." },
      ],
    },
  },
  {
    type: "steps",
    label: "Numbered steps",
    fields: [{ name: "title", kind: "text" }, { name: "body", kind: "text", optional: true }],
    items: {
      label: "Step",
      min: 1,
      max: 12,
      fields: [{ name: "title", kind: "text" }, { name: "body", kind: "text", optional: true }],
      sample: { title: "A new step", body: "Say what happens in this step." },
    },
    sample: {
      type: "steps",
      title: "How it works",
      items: [
        { id: "r2001", title: "First step", body: "Say what happens first." },
        { id: "r2002", title: "Second step", body: "Say what happens next." },
        { id: "r2003", title: "Third step", body: "Say how it ends." },
      ],
    },
  },
  {
    type: "checklist",
    label: "Checklist",
    fields: [{ name: "title", kind: "text" }, { name: "body", kind: "text", optional: true }],
    items: {
      label: "Point",
      min: 1,
      max: 16,
      fields: [{ name: "text", kind: "text" }],
      sample: { text: "A new point" },
    },
    sample: {
      type: "checklist",
      title: "What you get",
      items: [
        { id: "r3001", text: "First point" },
        { id: "r3002", text: "Second point" },
        { id: "r3003", text: "Third point" },
      ],
    },
  },
  {
    type: "faq",
    label: "Questions and answers",
    fields: [{ name: "title", kind: "text" }],
    items: {
      label: "Question",
      min: 1,
      max: 20,
      fields: [{ name: "question", kind: "text" }, { name: "answer", kind: "text" }],
      sample: { question: "A new question?", answer: "Its answer." },
    },
    sample: {
      type: "faq",
      title: "Questions",
      items: [
        { id: "r4001", question: "A question people ask?", answer: "Its answer." },
        { id: "r4002", question: "Another question?", answer: "Its answer." },
      ],
    },
  },
  {
    type: "cards",
    label: "Cards with photos",
    fields: [{ name: "title", kind: "text", optional: true }, { name: "body", kind: "text", optional: true }],
    items: {
      label: "Card",
      min: 1,
      max: 9,
      fields: [{ name: "photo", kind: "photo" }, { name: "photoAlt", kind: "text" }, { name: "title", kind: "text" }, { name: "body", kind: "text", optional: true }, { name: "link", kind: "link", optional: true }],
      sample: { photo: "/images/home/wildwoods-beach-summer.jpg", photoAlt: "Describe the photo", title: "A new card", body: "Say what this card is about." },
    },
    sample: {
      type: "cards",
      title: "Featured",
      items: [
        { id: "r5001", photo: "/images/home/wildwoods-beach-summer.jpg", photoAlt: "Describe the photo", title: "First card", body: "Say what this card is about." },
        { id: "r5002", photo: "/images/home/wildwoods-beach-summer.jpg", photoAlt: "Describe the photo", title: "Second card", body: "Say what this card is about." },
        { id: "r5003", photo: "/images/home/wildwoods-beach-summer.jpg", photoAlt: "Describe the photo", title: "Third card", body: "Say what this card is about." },
      ],
    },
  },
  {
    type: "gallery",
    label: "Photo gallery",
    fields: [{ name: "title", kind: "text", optional: true }],
    items: {
      label: "Photo",
      min: 1,
      max: 16,
      fields: [{ name: "photo", kind: "photo" }, { name: "photoAlt", kind: "text" }],
      sample: { photo: "/images/home/wildwoods-beach-summer.jpg", photoAlt: "Describe the photo" },
    },
    sample: {
      type: "gallery",
      title: "Gallery",
      items: [
        { id: "r6001", photo: "/images/home/wildwoods-beach-summer.jpg", photoAlt: "Describe the photo" },
        { id: "r6002", photo: "/images/home/wildwoods-beach-summer.jpg", photoAlt: "Describe the photo" },
        { id: "r6003", photo: "/images/home/wildwoods-beach-summer.jpg", photoAlt: "Describe the photo" },
      ],
    },
  },
  {
    type: "team",
    label: "Team",
    fields: [{ name: "title", kind: "text" }],
    items: {
      label: "Person",
      min: 1,
      max: 12,
      fields: [{ name: "photo", kind: "photo" }, { name: "photoAlt", kind: "text" }, { name: "name", kind: "text" }, { name: "role", kind: "text", optional: true }, { name: "body", kind: "text", optional: true }],
      sample: { photo: "/images/home/wildwoods-beach-summer.jpg", photoAlt: "Portrait", name: "A new person", role: "Their role" },
    },
    sample: {
      type: "team",
      title: "Our team",
      items: [{ id: "r7001", photo: "/images/home/wildwoods-beach-summer.jpg", photoAlt: "Portrait", name: "Name", role: "Role", body: "A line about them." }],
    },
  },
] as const;

// A row's id: made by Stoin's editor when the row is added (site_editor_kinds.new_row_id).
const rowId = z.string().regex(/^r[0-9a-f]{4,12}$/, "must be a row id like r1a2b3c");
const icon = z.string().regex(/^[a-z][a-z0-9-]{0,30}$/, "must be an icon name");
const rows = <Shape extends z.ZodRawShape>(shape: Shape, max: number) =>
  z.array(group({ id: rowId, ...shape })).min(1, "must keep at least one row").max(max, `must have up to ${max} rows`);

const addedBlock = z.discriminatedUnion("type", [
  group({ type: z.literal("text"), eyebrow: optionalText, title: text, body: text }),
  group({ type: z.literal("photo"), photo, photoAlt: text, eyebrow: optionalText, title: text, body: text }),
  group({ type: z.literal("quote"), quote: text, attribution: optionalText }),
  group({ type: z.literal("cta"), title: text, body: text, button: text, link }),
  group({ type: z.literal("video"), video, title: text, body: optionalText }),
  group({ type: z.literal("icons"), title: optionalText, body: optionalText, items: rows({ icon, title: text, body: optionalText }, 12) }),
  group({ type: z.literal("steps"), title: text, body: optionalText, items: rows({ title: text, body: optionalText }, 12) }),
  group({ type: z.literal("checklist"), title: text, body: optionalText, items: rows({ text }, 16) }),
  group({ type: z.literal("faq"), title: text, items: rows({ question: text, answer: text }, 20) }),
  group({ type: z.literal("cards"), title: optionalText, body: optionalText, items: rows({ photo, photoAlt: text, title: text, body: optionalText, link: link.optional() }, 9) }),
  group({ type: z.literal("gallery"), title: optionalText, items: rows({ photo, photoAlt: text }, 16) }),
  group({ type: z.literal("team"), title: text, items: rows({ photo, photoAlt: text, name: text, role: optionalText, body: optionalText }, 12) }),
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

// Pages the owner added in the editor (Ray, 2026-11-27: "Start step 3"). A new page starts as a
// draft: built only in the editing copy until its status is "live". "removed" keeps its address
// taken. Its sections live in layout.json under "page-<slug>".
export const pageSlug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be a page address like our-team").min(2).max(60);
const ownerPage = group({ slug: pageSlug, title: text, description: text, status: z.enum(["draft", "live", "removed"]), menu: z.enum(["yes", "no"]) });

export const contentSchemas = {
  "pages": group({ pages: z.array(ownerPage).max(40) }),
  "layout": z.record(z.string().regex(/^[\w-]+$/), pageLayout),
  // Ordered lists the owner or Lucy can reorder (none on this site yet; the editor reads the file).
  "lists": z.record(z.string().regex(/^[\w-]+$/), z.array(z.string().regex(/^[\w-]+$/))),
  "site": group({
    skipLink: text,
    // Where the synth's box sits (2026-11-26): editable in the editor's Page details tab.
    talkPosition: z.enum(["top-right", "bottom-right"]),
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
