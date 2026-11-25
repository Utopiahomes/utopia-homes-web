// Plays entrances (lib/motion.ts, styles/animations.css) once, as elements scroll into view, the way
// Elementor did on the WordPress sites we rebuild: an element waits hidden, and when its top reaches
// the screen it gets "animated <name>" after its delay. Runs only when BaseLayout's start script
// turned motion on (not in the edit copy, not with reduced motion). Also starts carousels
// (lib/carousel.ts).
import { startCarousels } from "./carousel";

// Never moved on their own: hidden or behind-the-scenes things.
const SKIP = "script, template, dialog, style, [aria-hidden='true'], .sr-only";
// Photos laid behind a section's words stay put while the words rise or slide.
const MEDIA = "img, picture, video, iframe";
// Rows of cards, steps, people or columns: each one comes in on its own, a beat after the last.
const GROUPS = "ul, ol, dl, .cards, .team, .steps, .two-col, .split, [class*='grid'], [class*='-row']";
const STAGGER_MS = 140;
// The owner's choice for a whole section, as the Elementor entrance it plays.
const SECTION_EFFECT: Record<string, string> = { rise: "fadeInUp", fade: "fadeIn", left: "fadeInLeft", right: "fadeInRight", zoom: "zoomIn" };

function piecesOf(box: Element): Element[] {
  const found: Element[] = [];
  const movable = Array.from(box.children).filter((child) => !child.matches(SKIP) && !child.matches(MEDIA));
  // A section whose words sit in one wrapper (a shell or inner box): its heading, text and cards
  // come in one after another, not the whole wrapper at once.
  if (movable.length === 1 && movable[0].tagName === "DIV" && movable[0].children.length > 1 && !movable[0].matches(GROUPS)) {
    return piecesOf(movable[0]);
  }
  for (const child of movable) {
    if (child.matches(GROUPS)) {
      found.push(...Array.from(child.children).filter((item) => !item.matches(SKIP)));
    } else if (Array.from(child.children).some((item) => item.matches(MEDIA)) && child.children.length > 1) {
      // A banner: a photo with words over it. The words move; the photo stays.
      found.push(...piecesOf(child));
    } else {
      found.push(child);
    }
  }
  return found;
}

type Entrance = { element: HTMLElement; name: string; delay: number; speed: string; stagger: boolean };

export function startMotion(): void {
  const root = document.documentElement;
  if (!root.classList.contains("motion")) {
    startCarousels(false);
    return;
  }
  (window as unknown as { stoinMotion: boolean }).stoinMotion = true;

  let waiting: Entrance[] = [];
  const add = (element: HTMLElement, name: string, delay = 0, speed = "", stagger = false) => {
    element.classList.add("m-wait");
    waiting.push({ element, name, delay, speed, stagger });
  };

  const sections = Array.from(document.querySelectorAll<HTMLElement>("main [data-motion]"));
  for (const section of sections) {
    const effect = section.dataset.motion ?? "none";
    const designed = Array.from(section.querySelectorAll<HTMLElement>("[data-anim]"));
    if (section.matches("[data-anim]")) designed.unshift(section);
    if (effect === "designed" && designed.length) {
      for (const element of designed) add(element, element.dataset.anim!, Number(element.dataset.animDelay) || 0, element.dataset.animSpeed ?? "");
    } else if (effect !== "none" && !(effect === "designed" && section.hasAttribute("data-still"))) {
      // The owner's one effect for the section (or "As designed" with nothing designed: it rises).
      const name = SECTION_EFFECT[effect] ?? "fadeInUp";
      const pieces = name === "fadeIn" ? [section] : piecesOf(section);
      for (const piece of pieces) add(piece as HTMLElement, name, 0, "", true);
    }
  }
  // Designed entrances outside the page's sections (the footer, as on the WordPress site).
  for (const element of document.querySelectorAll<HTMLElement>("[data-anim]")) {
    if (sections.some((section) => section.contains(element))) continue;
    add(element, element.dataset.anim!, Number(element.dataset.animDelay) || 0, element.dataset.animSpeed ?? "");
  }

  const play = (entrance: Entrance, extra: number) => {
    const start = () => {
      entrance.element.classList.remove("m-wait");
      entrance.element.classList.add("animated", entrance.name, ...(entrance.speed ? [`animated-${entrance.speed}`] : []));
    };
    const delay = entrance.delay + extra;
    if (delay > 0) window.setTimeout(start, delay);
    else start();
  };

  // Checked on every scroll frame: a fast fling or a menu jump (/#projects) can carry an element from
  // below the screen to above it between two checks; anything already above comes in at once.
  let queued = false;
  const check = () => {
    queued = false;
    let count = 0;
    const still: Entrance[] = [];
    for (const entrance of waiting) {
      const box = entrance.element.getBoundingClientRect();
      if (box.top >= window.innerHeight) {
        still.push(entrance);
      } else if (box.bottom < 0) {
        entrance.element.classList.remove("m-wait");
      } else {
        play(entrance, entrance.stagger ? Math.min(count++, 4) * STAGGER_MS : 0);
      }
    }
    waiting = still;
    if (!waiting.length) {
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
    }
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(check);
  };

  root.classList.add("m-armed");
  for (const section of sections) section.dataset.armed = "";
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue, { passive: true });
  window.requestAnimationFrame(queue);
  startCarousels(true);
}
