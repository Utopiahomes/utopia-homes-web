// Elementor's motion effects, sticky and background slideshow, for the WordPress sites we rebuild
// (Ray, 2026-11-25: "one to one feature parity" for the site builder, then "Yes, build them" for
// scroll effects and sticky). Everything is set by attributes in the site's markup; README "Motion"
// lists them with examples.
//
//   data-scroll="y 4; x -2; fade in-out; blur out 7; rotate 1; scale in 4"
//       Changes with the element's place on the screen as the visitor scrolls (Elementor's
//       Scrolling Effects). y: drifts up as you scroll (negative: down), x: drifts right
//       (negative: left), rotate: turns clockwise (negative: anticlockwise), each with a speed
//       0-10. fade / blur / scale: in (arrives), out (leaves), in-out, out-in, then a level
//       (fade 0-10, default 10; blur px, default 7; scale 0-10, default 4). scale up / down: grows
//       or shrinks past its size.
//   data-scroll-range="20 80"   the part of the trip across the screen it plays over, in %
//       (Elementor's Viewport; default 0 100, or 20 80 for in-out and out-in).
//   data-scroll-relative="page" follows the whole page's scroll instead of the element's trip.
//   data-mouse="track 1; tilt 4"   follows the mouse (negative: the opposite way); tilt leans in 3D.
//   data-on="desktop tablet"       devices it plays on (default all); also for data-sticky.
//
//   data-sticky="top" | "bottom"  stays on screen once scrolled to (Elementor's Sticky);
//       data-sticky-offset="20" (px from the edge), data-sticky-effects="90" (px scrolled after it
//       sticks before it gets class "sticky-effects", for a smaller or shaded header), data-sticky-in
//       (stays inside its own box, Elementor's "Stay in column"). Gets class "is-stuck" while stuck.
//
//   data-slideshow="5000"         its photos cross-fade, one every 5 s (Elementor's background
//       slideshow); data-kenburns="in" | "out" on it, or on any photo, slowly zooms (Ken Burns),
//       data-kenburns-duration="20000" for a lone photo.
//
// Scroll, mouse, slideshow and Ken Burns play only with motion on (not with reduced motion, not in
// the edit copy); sticky works with reduced motion too, but not in the edit copy.

const TABLET = "(max-width: 1024px)";
const MOBILE = "(max-width: 767px)";

function device(): "desktop" | "tablet" | "mobile" {
  if (window.matchMedia(MOBILE).matches) return "mobile";
  if (window.matchMedia(TABLET).matches) return "tablet";
  return "desktop";
}

function playsHere(element: HTMLElement): boolean {
  const on = element.dataset.on?.trim();
  return !on || on.split(/[\s,]+/).includes(device());
}

type Effect = { name: string; mode: string; amount: number };

/** "y 4; fade in-out 8" -> [{name:"y", mode:"", amount:4}, {name:"fade", mode:"in-out", amount:8}] */
function parse(spec: string | undefined): Effect[] {
  const effects: Effect[] = [];
  for (const part of (spec ?? "").split(";")) {
    const words = part.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    const [name, ...rest] = words;
    const mode = rest.find((word) => Number.isNaN(Number(word))) ?? "";
    const number = rest.find((word) => !Number.isNaN(Number(word)));
    effects.push({ name, mode, amount: number === undefined ? NaN : Number(number) });
  }
  return effects;
}

const clamp = (value: number, low = 0, high = 1) => Math.min(Math.max(value, low), high);

/** How much of itself the element shows, 0-1, for in / out / in-out / out-in at trip point p (0-1). */
function presence(mode: string, p: number, start: number, end: number): number {
  const span = (value: number) => clamp((value - start) / Math.max(end - start, 0.001));
  if (mode === "out") return 1 - span(p);
  if (mode === "in-out" || mode === "out-in") {
    const shown = p < start ? p / Math.max(start, 0.001) : p > end ? (1 - p) / Math.max(1 - end, 0.001) : 1;
    return mode === "in-out" ? clamp(shown) : 1 - clamp(shown);
  }
  return span(p); // in
}

type Mover = {
  element: HTMLElement;
  scroll: Effect[];
  mouse: Effect[];
  range: [number, number] | null;
  page: boolean;
};

function startMovers(): void {
  const movers: Mover[] = [];
  for (const element of document.querySelectorAll<HTMLElement>("[data-scroll], [data-mouse]")) {
    const range = element.dataset.scrollRange?.trim().split(/[\s,]+/).map(Number);
    movers.push({
      element,
      scroll: parse(element.dataset.scroll),
      mouse: parse(element.dataset.mouse),
      range: range && range.length === 2 && range.every((n) => !Number.isNaN(n)) ? [range[0] / 100, range[1] / 100] : null,
      page: element.dataset.scrollRelative === "page",
    });
  }
  if (!movers.length) return;

  let mouseX = 0.5;
  let mouseY = 0.5;
  const draw = () => {
    const height = window.innerHeight;
    const pageTrip = clamp(window.scrollY / Math.max(document.documentElement.scrollHeight - height, 1));
    for (const mover of movers) {
      const style = mover.element.style;
      if (!playsHere(mover.element)) {
        style.translate = style.rotate = style.scale = style.opacity = style.filter = style.transform = "";
        continue;
      }
      // Where the element is on its trip across the screen: 0 as its top comes up from below, 1 as
      // its bottom leaves at the top. The box with the effect undone would be steadier, but
      // Elementor measures the moving element too.
      const box = mover.element.getBoundingClientRect();
      const trip = mover.page ? pageTrip : clamp((height - box.top) / (height + box.height));
      let x = 0, y = 0, turn = 0, size = 1, opacity = 1, blur = 0, tiltX = 0, tiltY = 0;
      for (const effect of mover.scroll) {
        const twoWay = effect.mode === "in-out" || effect.mode === "out-in";
        const [start, end] = mover.range ?? (twoWay ? [0.2, 0.8] : [0, 1]);
        const along = clamp((trip - start) / Math.max(end - start, 0.001));
        const speed = Number.isNaN(effect.amount) ? 4 : effect.amount;
        if (effect.name === "y") y += (0.5 - along) * speed * 40;
        else if (effect.name === "x") x += (along - 0.5) * speed * 40;
        else if (effect.name === "rotate") turn += (along - 0.5) * (Number.isNaN(effect.amount) ? 1 : effect.amount) * 36;
        else if (effect.name === "fade") opacity = 1 - (1 - presence(effect.mode, trip, start, end)) * (Number.isNaN(effect.amount) ? 10 : effect.amount) / 10;
        else if (effect.name === "blur") blur = (1 - presence(effect.mode, trip, start, end)) * (Number.isNaN(effect.amount) ? 7 : effect.amount);
        else if (effect.name === "scale") {
          if (effect.mode === "up") size = 1 + along * speed / 10;
          else if (effect.mode === "down") size = 1 - along * speed / 10;
          else size = 1 - (1 - presence(effect.mode || "in", trip, start, end)) * speed / 10;
        }
      }
      for (const effect of mover.mouse) {
        const speed = Number.isNaN(effect.amount) ? (effect.name === "tilt" ? 4 : 1) : effect.amount;
        if (effect.name === "track") {
          x += (mouseX - 0.5) * speed * 40;
          y += (mouseY - 0.5) * speed * 40;
        } else if (effect.name === "tilt") {
          tiltX = (0.5 - mouseY) * speed * 4;
          tiltY = (mouseX - 0.5) * speed * 4;
        }
      }
      // Separate properties, so an entrance (which animates transform) and Ken Burns (scale on a
      // photo inside) still play alongside.
      style.translate = x || y ? `${x.toFixed(1)}px ${y.toFixed(1)}px` : "";
      style.rotate = turn ? `${turn.toFixed(2)}deg` : "";
      style.scale = size !== 1 ? size.toFixed(3) : "";
      style.opacity = opacity !== 1 ? clamp(opacity).toFixed(3) : "";
      style.filter = blur > 0.05 ? `blur(${blur.toFixed(1)}px)` : "";
      style.transform = tiltX || tiltY ? `perspective(1000px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)` : "";
    }
  };

  let queued = false;
  const queue = () => {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(() => {
      queued = false;
      draw();
    });
  };
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue, { passive: true });
  if (movers.some((mover) => mover.mouse.length)) {
    window.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "mouse") return;
      mouseX = event.clientX / window.innerWidth;
      mouseY = event.clientY / window.innerHeight;
      queue();
    }, { passive: true });
  }
  queue();
}

function startSticky(element: HTMLElement): void {
  const bottom = element.dataset.sticky === "bottom";
  const offset = Number(element.dataset.stickyOffset) || 0;
  const effectsAfter = Number(element.dataset.stickyEffects) || 0;

  if (element.hasAttribute("data-sticky-in")) {
    // Inside its own box: the browser's sticky does exactly that.
    const check = () => {
      const on = playsHere(element);
      element.style.position = on ? "sticky" : "";
      element.style.top = on && !bottom ? `${offset}px` : "";
      element.style.bottom = on && bottom ? `${offset}px` : "";
      element.style.zIndex = on ? "50" : "";
      const box = element.getBoundingClientRect();
      const stuck = on && (bottom ? Math.abs(window.innerHeight - offset - box.bottom) < 1 : Math.abs(box.top - offset) < 1);
      element.classList.toggle("is-stuck", stuck);
      element.classList.toggle("sticky-effects", stuck && window.scrollY >= effectsAfter);
    };
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check, { passive: true });
    check();
    return;
  }

  // Across the whole page: when it reaches the edge it is pinned there, and a spacer the same
  // size keeps its place so nothing below jumps.
  let spacer: HTMLElement | null = null;
  let stuckAt = 0;
  const release = () => {
    if (!spacer) return;
    spacer.remove();
    spacer = null;
    for (const property of ["position", "top", "bottom", "left", "width", "zIndex"] as const) element.style[property] = "";
    element.classList.remove("is-stuck", "sticky-effects");
  };
  const check = () => {
    if (!playsHere(element)) return release();
    const place = (spacer ?? element).getBoundingClientRect();
    const reached = bottom ? place.bottom > window.innerHeight - offset : place.top < offset;
    if (reached && !spacer) {
      spacer = document.createElement("div");
      spacer.setAttribute("aria-hidden", "true");
      spacer.style.height = `${element.offsetHeight}px`;
      const margins = getComputedStyle(element);
      spacer.style.margin = margins.margin;
      element.before(spacer);
      stuckAt = window.scrollY;
      element.style.position = "fixed";
      element.style.zIndex = "99";
      element.classList.add("is-stuck");
    } else if (!reached && spacer) {
      return release();
    }
    if (spacer) {
      const room = spacer.getBoundingClientRect();
      element.style.left = `${room.left}px`;
      element.style.width = `${room.width}px`;
      element.style.top = bottom ? "" : `${offset}px`;
      element.style.bottom = bottom ? `${offset}px` : "";
      element.classList.toggle("sticky-effects", Math.abs(window.scrollY - stuckAt) >= effectsAfter);
    }
  };
  window.addEventListener("scroll", check, { passive: true });
  window.addEventListener("resize", () => {
    release();
    check();
  }, { passive: true });
  check();
}

function startSlideshow(box: HTMLElement): void {
  const slides = Array.from(box.children).filter((child) => !child.matches("script, template")) as HTMLElement[];
  if (slides.length < 2) return;
  const every = Math.max(1000, Number(box.dataset.slideshow) || 5000);
  box.classList.add("slideshow-on");
  box.style.setProperty("--slide-time", `${every + 500}ms`);
  let current = 0;
  slides[0].classList.add("is-current");
  window.setInterval(() => {
    slides[current].classList.remove("is-current");
    current = (current + 1) % slides.length;
    // Restart the slow zoom on the photo coming in.
    void slides[current].offsetWidth;
    slides[current].classList.add("is-current");
  }, every);
}

/** Sticky elements: run whatever the visitor's motion setting, but not in the edit copy. */
export function startStickies(): void {
  if (document.documentElement.hasAttribute("data-edit")) return;
  for (const element of document.querySelectorAll<HTMLElement>("[data-sticky]")) startSticky(element);
}

/** Scroll and mouse effects, slideshows and Ken Burns: only with motion on. */
export function startEffects(): void {
  for (const photo of document.querySelectorAll<HTMLElement>("[data-kenburns-duration]")) {
    photo.style.setProperty("--kenburns-time", `${Number(photo.dataset.kenburnsDuration) || 20000}ms`);
  }
  for (const box of document.querySelectorAll<HTMLElement>("[data-slideshow]")) startSlideshow(box);
  startMovers();
}
