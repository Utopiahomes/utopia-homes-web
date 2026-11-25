// A sliding row, like the WordPress site's Elementor carousel (Ray, 2026-11-25: "pages would move up
// or shift to the sides"; CB Wilkinson's portfolio glides sideways one project every 2 s, forever).
// Put it on any list:
//
//   <ul data-carousel data-per-view="5" data-per-view-tablet="3" data-per-view-mobile="1"
//       data-speed="2000" data-delay="0" data-gap="15">
//
// per-view: items showing at once (tablet up to 1024 px wide, mobile up to 767 px, as Elementor);
// speed: one step's glide in ms (ease, as Swiper); delay: the pause between steps in ms (0 = none,
// Elementor's "-1"); gap: the space between items in px. It loops forever and stops for good once a visitor drags it, as the original
// did. Without motion (reduced motion asked for, the edit copy, or no script) the list stays the
// plain swipeable row its own CSS gives it.

const TABLET = "(max-width: 1024px)";
const MOBILE = "(max-width: 767px)";

function perView(list: HTMLElement): number {
  const pick = window.matchMedia(MOBILE).matches
    ? list.dataset.perViewMobile
    : window.matchMedia(TABLET).matches
      ? list.dataset.perViewTablet
      : list.dataset.perView;
  return Math.max(1, Number(pick ?? list.dataset.perView ?? 1) || 1);
}

function startCarousel(list: HTMLElement): void {
  const originals = Array.from(list.children).filter((item) => item.tagName === "LI") as HTMLElement[];
  const count = originals.length;
  if (count < 2) return;
  const speed = Number(list.dataset.speed ?? 2000) || 2000;
  const pause = Math.max(0, Number(list.dataset.delay ?? 0) || 0);
  const gap = Math.max(0, Number(list.dataset.gap ?? 0) || 0);

  const viewport = document.createElement("div");
  viewport.className = "carousel-viewport";
  list.before(viewport);
  viewport.append(list);
  list.classList.add("carousel-on");
  // Copies of the whole row after it, so the loop never shows a gap; screen readers and the
  // keyboard only meet the real items.
  for (const item of originals) {
    const copy = item.cloneNode(true) as HTMLElement;
    copy.setAttribute("aria-hidden", "true");
    copy.inert = true;
    copy.removeAttribute("id");
    list.append(copy);
  }

  let index = 0;
  let stopped = false;
  let timer = 0;
  const place = (glide: boolean, offsetPx = 0) => {
    list.style.setProperty("--carousel-speed", glide ? `${speed}ms` : "0ms");
    // One step is one item plus one gap: (row width + gap) / items showing.
    list.style.transform = `translate3d(calc(${-index / perView(list)} * (100% + ${gap}px) + ${offsetPx}px), 0, 0)`;
  };
  const sizes = () => {
    list.style.setProperty("--per-view", String(perView(list)));
    list.style.setProperty("--carousel-gap", `${gap}px`);
  };
  const next = () => {
    if (stopped) return;
    index += 1;
    place(true);
  };
  list.addEventListener("transitionend", (event) => {
    if (event.target !== list || event.propertyName !== "transform") return;
    if (index >= count) {
      // Past the real items: jump back to the same picture at the start, without a glide.
      index -= count;
      place(false);
      void list.offsetWidth;
    }
    if (!stopped) timer = window.setTimeout(next, pause);
  });

  // Dragging moves the row by hand and stops the autoplay for good (Swiper's disableOnInteraction).
  let dragFrom: number | null = null;
  list.addEventListener("pointerdown", (event) => {
    stopped = true;
    window.clearTimeout(timer);
    if (index >= count) index -= count;
    dragFrom = event.clientX;
    place(false);
    list.setPointerCapture(event.pointerId);
  });
  list.addEventListener("pointermove", (event) => {
    if (dragFrom !== null) place(false, event.clientX - dragFrom);
  });
  const release = (event: PointerEvent) => {
    if (dragFrom === null) return;
    const step = (list.clientWidth + gap) / perView(list);
    const moved = Math.round((dragFrom - event.clientX) / step);
    dragFrom = null;
    index = Math.min(Math.max(index + moved, 0), count);
    place(true);
  };
  list.addEventListener("pointerup", release);
  list.addEventListener("pointercancel", release);

  window.addEventListener("resize", () => {
    sizes();
    place(false);
  });
  sizes();
  place(false);
  timer = window.setTimeout(next, Math.max(pause, 400));
}

/** Starts every carousel on the page, or leaves them as plain rows when motion is off. */
export function startCarousels(animate: boolean): void {
  if (!animate) return;
  for (const list of document.querySelectorAll<HTMLElement>("[data-carousel]")) startCarousel(list);
}
