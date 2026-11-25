// Invisible markers that carry a wording key through the edit build (PUBLIC_EDIT_MODE=1).
// A marked value is START, the key, SEPARATOR, the value, END. Everything here is private-use
// Unicode, so it survives templates, joins and case changes and can be removed completely afterward.

const START = "";
const SEPARATOR = "";
const END = "";
const KEY_BASE = 0xe100;

const anyMarker = /[--]/;
const allMarkers = /[--]/g;
const markedValue = /([-]+)([^-]*)/g;
const leftoverKey = /([-]+)/g;

const encodeKey = (key) => Array.from(key, (character) => String.fromCharCode(KEY_BASE + character.charCodeAt(0))).join("");
const decodeKey = (encoded) => Array.from(encoded, (character) => String.fromCharCode(character.charCodeAt(0) - KEY_BASE)).join("");

export const hasMarkers = (text) => anyMarker.test(text);
export const stripMarkers = (text) => text.replace(allMarkers, "");
export const mark = (key, value) => `${START}${encodeKey(key)}${SEPARATOR}${value}${END}`;

/** The manifest key for a place in a content file: file name, then the JSON path joined by dots. */
export const itemKey = (file, pointer) => [file, ...pointer].join(".");

/**
 * Splits text into plain parts and marked parts. Keys whose markers were cut apart, for example by
 * slice or split, come back in `broken`: their text stays on the page but they cannot be edited there.
 */
export function splitMarked(text) {
  const parts = [];
  const broken = [];
  let cursor = 0;
  const plain = (piece) => {
    for (const [, encoded] of piece.matchAll(leftoverKey)) broken.push(decodeKey(encoded));
    const clean = stripMarkers(piece);
    if (clean) parts.push({ text: clean });
  };
  for (const match of text.matchAll(markedValue)) {
    plain(text.slice(cursor, match.index));
    parts.push({ key: decodeKey(match[1]), text: match[2] });
    cursor = match.index + match[0].length;
  }
  plain(text.slice(cursor));
  return { parts, broken };
}

let guardsInstalled = false;

/**
 * Code that asks about a string's wording must get the same answer as in the normal build. BaseLayout,
 * for one, checks whether a page title already starts with the site name. Only the edit build runs this.
 */
export function installStringGuards() {
  if (guardsInstalled) return;
  guardsInstalled = true;
  for (const method of ["startsWith", "endsWith", "includes"]) {
    const original = String.prototype[method];
    String.prototype[method] = function guarded(search, ...rest) {
      const self = String(this);
      if (typeof search === "string" && (hasMarkers(self) || hasMarkers(search))) {
        return original.call(stripMarkers(self), stripMarkers(search), ...rest);
      }
      return original.call(self, search, ...rest);
    };
  }
}

/** Returns a copy of validated content with every string marked with its manifest key. */
export function markContent(file, data) {
  installStringGuards();
  const walk = (value, pointer) => {
    if (typeof value === "string") return mark(itemKey(file, pointer), value);
    if (Array.isArray(value)) return value.map((item, index) => walk(item, [...pointer, index]));
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, walk(item, [...pointer, name])]));
    }
    return value;
  };
  return walk(data, []);
}
