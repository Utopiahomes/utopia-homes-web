// How each section comes into view as a visitor scrolls (Ray, 2026-11-25: the old WordPress site's
// pieces rose and faded in; "per section, build it for CB Wilkinson first"). The owner picks a
// section's effect in the editor's Sections tab or by asking Lucy; it is saved in layout.json as
// layout.<page>.motion.<section>. Sections with nothing saved use defaultMotion below, which matches
// the old site: text and cards rise, wide photo bands fade.
//
// It plays once per section. The words are always in the page; nothing moves for visitors whose
// device asks for reduced motion, and the edit copy shows everything still.

export const motionEffects = ["rise", "fade", "left", "right", "none"] as const;
export type Motion = (typeof motionEffects)[number];

export const motionLabels: Record<Motion, string> = {
  rise: "Rises in",
  fade: "Fades in",
  left: "Slides in from the left",
  right: "Slides in from the right",
  none: "Still",
};

/** A section's effect when the owner hasn't chosen one: photo bands fade, everything else rises. */
export function defaultMotion(markup: string): Motion {
  const root = markup.match(/^\s*<[a-zA-Z][\w-]*[^>]*>/)?.[0] ?? "";
  return /class="[^"]*\b(?:photo-band|leadership|image-field)\b/.test(root) ? "fade" : "rise";
}
