// Plays each section's motion (lib/motion.ts) once, as its pieces scroll into view. Runs only when
// the start script in BaseLayout turned motion on (not in the edit copy, not with reduced motion).

// Never moved on their own: hidden or behind-the-scenes things.
const SKIP = "script, template, dialog, style, [aria-hidden='true'], .sr-only";
// Photos laid behind a section's words stay put while the words rise or slide.
const MEDIA = "img, picture, video, iframe";
// Rows of cards, steps, people or columns: each one comes in on its own, a beat after the last.
const GROUPS = "ul, ol, dl, .cards, .team, .steps, .two-col, .split, [class*='grid'], [class*='-row']";
const STAGGER_MS = 140;
const DURATION_MS = 900;

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

export function startMotion(): void {
  const root = document.documentElement;
  if (!root.classList.contains("motion")) return;
  (window as unknown as { stoinMotion: boolean }).stoinMotion = true;

  // Checked on every scroll frame rather than with an IntersectionObserver: a fast fling or a menu
  // jump (/#projects) can carry a piece from below the screen to above it between two observations,
  // and it would then stay invisible. Anything whose top is above the lower edge of the screen comes in.
  const waiting = new Set<HTMLElement>();
  const arrive = (piece: HTMLElement, delay: number) => {
    waiting.delete(piece);
    piece.style.setProperty("--m-delay", `${delay}ms`);
    piece.classList.add("m-in");
    // Once it has arrived, it goes back to being an ordinary part of the page (hover effects etc.).
    window.setTimeout(() => {
      piece.classList.remove("m-piece", "m-in", "m-rise", "m-fade", "m-left", "m-right");
      piece.style.removeProperty("--m-delay");
    }, delay + DURATION_MS + 100);
  };
  let queued = false;
  const check = () => {
    queued = false;
    const line = window.innerHeight * 0.88;
    let count = 0;
    for (const piece of [...waiting]) {
      const box = piece.getBoundingClientRect();
      if (box.top >= line) continue;
      // Pieces already scrolled past arrive at once; those coming into view arrive a beat apart.
      arrive(piece, box.bottom < 0 ? 0 : Math.min(count++, 4) * STAGGER_MS);
    }
    if (!waiting.size) {
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
    }
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(check);
  };

  document.querySelectorAll<HTMLElement>("main [data-motion]").forEach((section) => {
    const effect = section.dataset.motion ?? "none";
    if (effect !== "none") {
      // A fade brings in the whole section, photo and all; the others move its words and cards.
      const pieces = effect === "fade" ? [section] : piecesOf(section);
      for (const piece of pieces) {
        piece.classList.add("m-piece", `m-${effect}`);
        waiting.add(piece as HTMLElement);
      }
    }
    section.dataset.armed = "";
  });
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue, { passive: true });
  // A frame later, so the starting positions are drawn and the first pieces visibly rise.
  window.requestAnimationFrame(queue);
}
