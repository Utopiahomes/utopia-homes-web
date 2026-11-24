// Invisible markers that carry a wording key through the edit copy (SITE_EDIT_MODE=1), the same
// scheme as the Stoin Sites built on Astro (raymonddeluca.com, srp-site). A marked value is START,
// the key, SEPARATOR, the value, END, all private-use Unicode, so it survives React rendering. In the
// browser, public/_stoin/mark.js turns marked text into elements with data-stoin-key and removes
// every marker before the Stoin editor's bridge starts. The public site never marks anything.

const START = "";
const SEPARATOR = "";
const END = "";
const KEY_BASE = 0xe100;

const anyMarker = /[--]/;
const allMarkers = /[--]/g;

const encodeKey = (key: string) => Array.from(key, (character) => String.fromCharCode(KEY_BASE + character.charCodeAt(0))).join("");

export const hasMarkers = (text: string) => anyMarker.test(text);
export const stripMarkers = (text: string) => text.replace(allMarkers, "");
export const mark = (key: string, value: string) => `${START}${encodeKey(key)}${SEPARATOR}${value}${END}`;

/** The manifest key for a place in a wording file: file name, then the JSON path joined by dots. */
export const itemKey = (file: string, pointer: (string | number)[]) => [file, ...pointer].join(".");

let guardsInstalled = false;

/** Code that asks about a string's wording gets the same answer as in the public build. */
function installStringGuards() {
  if (guardsInstalled) return;
  guardsInstalled = true;
  for (const method of ["startsWith", "endsWith", "includes"] as const) {
    const original = String.prototype[method] as (this: string, search: string, ...rest: unknown[]) => boolean;
    (String.prototype as unknown as Record<string, unknown>)[method] = function guarded(this: string, search: unknown, ...rest: unknown[]) {
      const self = String(this);
      if (typeof search === "string" && (hasMarkers(self) || hasMarkers(search))) {
        return original.call(stripMarkers(self), stripMarkers(search), ...rest);
      }
      return original.call(self, search as string, ...rest);
    };
  }
}

/** A copy of the wording with every string marked with its manifest key. */
export function markContent<T>(file: string, data: T): T {
  installStringGuards();
  const walk = (value: unknown, pointer: (string | number)[]): unknown => {
    if (typeof value === "string") return mark(itemKey(file, pointer), value);
    if (Array.isArray(value)) return value.map((item, index) => walk(item, [...pointer, index]));
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, walk(item, [...pointer, name])]));
    }
    return value;
  };
  return walk(data, []) as T;
}
