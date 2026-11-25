import { createHash } from "node:crypto";
import { hasMarkers, splitMarked, stripMarkers } from "./markers.mjs";

// Turns marked text in one built page into editable elements and removes every other marker.
// Astro writes well-formed HTML, so a small tokenizer is enough and the build gains no dependency.

const rawTextElements = new Set(["script", "style", "title", "textarea"]);
const entities = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

export const sha256 = (text) => `sha256-${createHash("sha256").update(text).digest("base64")}`;

export function decodeEntities(text) {
  return text.replace(/&(?:#(\d+)|#x([\da-f]+)|(amp|lt|gt|quot|apos));/gi, (whole, decimal, hex, name) => {
    if (decimal) return String.fromCodePoint(Number(decimal));
    if (hex) return String.fromCodePoint(Number.parseInt(hex, 16));
    return entities[name.toLowerCase()] ?? whole;
  });
}

function tagEnd(html, start) {
  let quote = "";
  for (let index = start; index < html.length; index += 1) {
    const character = html[index];
    if (quote) {
      if (character === quote) quote = "";
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === ">") {
      return index;
    }
  }
  return html.length - 1;
}

/**
 * @param {string} html
 * @param {object} hooks
 * @param {(key: string) => string | undefined} hooks.valueOf published wording for a key
 * @param {(key: string, kind: "text" | "attribute" | "meta") => void} hooks.onUse
 * @param {(key: string, reason: string) => void} hooks.onLost
 * @param {(key: string, src: string) => void} [hooks.onBlock] a Markdown block tagged with its source
 * @returns {{ html: string, hashes: Map<string, string> }} `hashes` maps old inline hashes to new ones
 */
export function transformHtml(html, { valueOf, onUse, onLost, onBlock = () => {}, onPhoto = () => {} }) {
  const out = [];
  const hashes = new Map();
  let svgDepth = 0;
  let optionTag = -1;

  // Records every key in a value that is not page text, and reports any that cannot be trusted.
  const recordKeys = (text, kind) => {
    const { parts, broken } = splitMarked(text);
    for (const key of broken) onLost(key, "markers were cut apart");
    for (const part of parts) {
      if (!part.key) continue;
      if (decodeEntities(part.text) === valueOf(part.key)) onUse(part.key, kind);
      else onLost(part.key, "wording was changed by the template");
    }
  };

  const writeText = (text) => {
    if (!hasMarkers(text)) {
      out.push(text);
      return;
    }
    const { parts, broken } = splitMarked(text);
    for (const key of broken) onLost(key, "markers were cut apart");
    for (const part of parts) {
      if (!part.key) {
        out.push(part.text);
      } else if (decodeEntities(part.text) !== valueOf(part.key)) {
        onLost(part.key, "wording was changed by the template");
        out.push(part.text);
      } else if (svgDepth > 0) {
        onLost(part.key, "wording inside an SVG drawing cannot be edited");
        out.push(part.text);
      } else if (optionTag >= 0) {
        // A <select> option cannot hold other elements, so the option itself carries the key.
        if (parts.length === 1) {
          out[optionTag] = out[optionTag].replace(/>$/, ` data-stoin-key="${part.key}">`);
          onUse(part.key, "text");
        } else {
          onLost(part.key, "shares a menu option with other wording");
        }
        out.push(part.text);
      } else {
        onUse(part.key, "text");
        out.push(`<span data-stoin-key="${part.key}">${part.text}</span>`);
      }
    }
  };

  const writeTag = (tag, name) => {
    if (!hasMarkers(tag)) return tag;
    const kind = name === "meta" ? "meta" : "attribute";
    let photo = "";
    for (const [, attribute, value] of tag.matchAll(/([\w:-]+)\s*=\s*("[^"]*"|'[^']*')/g)) {
      if (!hasMarkers(value)) continue;
      // A photo whose whole address is one content value can be replaced in the editor.
      if (name === "img" && attribute.toLowerCase() === "src") {
        const { parts, broken } = splitMarked(value.slice(1, -1));
        if (!broken.length && parts.length === 1 && parts[0].key && decodeEntities(parts[0].text) === valueOf(parts[0].key)) {
          photo = parts[0].key;
          onUse(photo, "image");
          continue;
        }
      }
      recordKeys(value.slice(1, -1), kind);
    }
    const clean = stripMarkers(tag);
    if (photo) {
      // What Lucy needs to place a photo here (2026-11-24): the alt text's key, so a new photo gets a
      // description of itself, the spot's shape, and whether it is fitted (a logo) or cropped to fill.
      const attributes = new Map([...tag.matchAll(/\s([\w:-]+)\s*=\s*("[^"]*"|'[^']*')/g)].map(([, name, value]) => [name.toLowerCase(), value.slice(1, -1)]));
      const attr = (attribute) => attributes.get(attribute) ?? "";
      const altParts = splitMarked(attr("alt")).parts;
      const alt = altParts.length === 1 && altParts[0].key ? altParts[0].key : "";
      const number = (value) => Number(stripMarkers(value)) || 0;
      onPhoto(photo, { alt, width: number(attr("width")), height: number(attr("height")), fit: attr("data-stoin-fit") === "contain" ? "contain" : "cover" });
    }
    return photo ? clean.replace(/^<img/i, `<img data-stoin-image="${photo}"`) : clean;
  };

  // Article and legal paragraphs arrive with their key and source place; the place never ships.
  const blockTag = (tag) => {
    const src = tag.match(/\sdata-stoin-src="([^"]*)"/);
    if (!src) return tag;
    const key = tag.match(/\sdata-stoin-key="([^"]*)"/)?.[1];
    if (key) onBlock(key, decodeEntities(src[1]));
    return tag.replace(src[0], "");
  };

  let cursor = 0;
  while (cursor < html.length) {
    const open = html.indexOf("<", cursor);
    if (open === -1) {
      writeText(html.slice(cursor));
      break;
    }
    if (open > cursor) writeText(html.slice(cursor, open));

    if (html.startsWith("<!--", open)) {
      const close = html.indexOf("-->", open);
      const end = close === -1 ? html.length : close + 3;
      out.push(stripMarkers(html.slice(open, end)));
      cursor = end;
      continue;
    }

    const end = tagEnd(html, open);
    const tag = html.slice(open, end + 1);
    const name = tag.match(/^<\/?([a-zA-Z][^\s/>]*)/)?.[1]?.toLowerCase() ?? "";
    cursor = end + 1;

    if (tag.startsWith("</")) {
      if (name === "svg") svgDepth = Math.max(0, svgDepth - 1);
      if (name === "option") optionTag = -1;
      out.push(tag);
      continue;
    }

    out.push(writeTag(blockTag(tag), name));
    if (tag.endsWith("/>")) continue;
    if (name === "svg") svgDepth += 1;
    if (name === "option") optionTag = out.length - 1;

    if (rawTextElements.has(name)) {
      const closeAt = html.toLowerCase().indexOf(`</${name}`, cursor);
      const bodyEnd = closeAt === -1 ? html.length : closeAt;
      const body = html.slice(cursor, bodyEnd);
      if (hasMarkers(body)) {
        recordKeys(body, name === "textarea" ? "attribute" : "meta");
        const clean = stripMarkers(body);
        if (name === "script" || name === "style") hashes.set(sha256(body), sha256(clean));
        out.push(clean);
      } else {
        out.push(body);
      }
      cursor = bodyEnd;
    }
  }

  return { html: out.join(""), hashes };
}
