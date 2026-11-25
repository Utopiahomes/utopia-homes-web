// How each section comes into view as a visitor scrolls (Ray, 2026-11-25: per section, then "one to
// one feature parity" with the old WordPress/Elementor site). Two layers:
//
// - As designed: the site's code marks each element with its own entrance, as Elementor did per
//   widget: data-anim="fadeInUp" (styles/animations.css lists every name), data-anim-delay="316",
//   data-anim-speed="slow" | "fast". A section designed to stay still says data-still.
// - The owner's choice per section, in the editor's Sections tab or by asking Lucy, saved in
//   layout.json as layout.<page>.motion.<section>: one effect for the whole section's pieces
//   instead, or still.
//
// It plays once per element. The words are always in the page; nothing moves for visitors whose
// device asks for reduced motion, and the edit copy shows everything still.

export const motionEffects = ["designed", "rise", "fade", "left", "right", "zoom", "none"] as const;
export type Motion = (typeof motionEffects)[number];

export const motionLabels: Record<Motion, string> = {
  designed: "As designed",
  rise: "Rises in",
  fade: "Fades in",
  left: "Slides in from the left",
  right: "Slides in from the right",
  zoom: "Zooms in",
  none: "Still",
};

/** A section's effect when the owner hasn't chosen one: its own design when its code has one;
 * otherwise photo bands fade and everything else rises. */
export function defaultMotion(markup: string): Motion {
  if (/\sdata-(?:anim="|still[\s>=])/.test(markup)) return "designed";
  const root = markup.match(/^\s*<[a-zA-Z][\w-]*[^>]*>/)?.[0] ?? "";
  return /class="[^"]*\b(?:photo-band|leadership|image-field)\b/.test(root) ? "fade" : "rise";
}
