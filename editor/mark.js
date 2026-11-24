// Utopia Homes edit copy only (SITE_EDIT_MODE=1). Runs after React has hydrated, before the Stoin
// frame bridge: turns the invisible markers lib/edit/markers.ts put around each editable string into
// elements with data-stoin-key, and removes every marker from text, attributes and the title.
// Ray, 2026-11-23: the Astro sites do this at build time over static HTML; a Next.js page is
// rendered by React, so it happens in the browser, and again when React renders something new.
(function () {
  "use strict";
  var marked = /([-]+)([^-]*)/g;
  var anyMarker = /[--]/;
  var allMarkers = /[--]/g;

  function decode(encoded) {
    var key = "";
    for (var i = 0; i < encoded.length; i += 1) key += String.fromCharCode(encoded.charCodeAt(i) - 0xe100);
    return key;
  }

  function strip(text) {
    return text.replace(allMarkers, "");
  }

  // True when the text node is all its parent holds (apart from React's comment nodes and spaces).
  function alone(parent, node) {
    for (var child = parent.firstChild; child; child = child.nextSibling) {
      if (child === node || child.nodeType === 8) continue;
      if (child.nodeType === 3 && !child.nodeValue.trim()) continue;
      return false;
    }
    return true;
  }

  function markText(node) {
    var text = node.nodeValue;
    var parent = node.parentNode;
    if (!parent || !anyMarker.test(text)) return;
    var parts = [];
    var cursor = 0;
    var match;
    marked.lastIndex = 0;
    while ((match = marked.exec(text))) {
      if (match.index > cursor) parts.push({ text: strip(text.slice(cursor, match.index)) });
      parts.push({ key: decode(match[1]), text: match[2] });
      cursor = match.index + match[0].length;
    }
    if (cursor < text.length) parts.push({ text: strip(text.slice(cursor)) });
    var keyed = parts.filter(function (part) { return part.key; });
    var onlyKey = keyed.length === 1 && parts.every(function (part) { return part.key || !part.text.trim(); });
    if (!keyed.length) {
      node.nodeValue = strip(text);
      return;
    }
    if (onlyKey && parent.nodeType === 1 && parent !== document.body && !parent.hasAttribute("data-stoin-key") && alone(parent, node)) {
      node.nodeValue = parts.map(function (part) { return part.text; }).join("");
      parent.setAttribute("data-stoin-key", keyed[0].key);
      return;
    }
    var pieces = document.createDocumentFragment();
    parts.forEach(function (part) {
      if (part.key) {
        var span = document.createElement("span");
        span.setAttribute("data-stoin-key", part.key);
        span.textContent = part.text;
        pieces.appendChild(span);
      } else if (part.text) {
        pieces.appendChild(document.createTextNode(part.text));
      }
    });
    parent.replaceChild(pieces, node);
  }

  function markAll(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var parent = node.parentNode;
        if (parent && /^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT)$/.test(parent.nodeName)) return NodeFilter.FILTER_REJECT;
        return anyMarker.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      },
    });
    var found = [];
    while (walker.nextNode()) found.push(walker.currentNode);
    found.forEach(markText);
    var elements = root.querySelectorAll ? root.querySelectorAll("*") : [];
    Array.prototype.forEach.call(elements, function (element) {
      if (element.nodeName === "SCRIPT") return;
      Array.prototype.forEach.call(element.attributes, function (attribute) {
        if (anyMarker.test(attribute.value)) element.setAttribute(attribute.name, strip(attribute.value));
      });
    });
    if (anyMarker.test(document.title)) document.title = strip(document.title);
  }

  markAll(document.body);
  document.documentElement.setAttribute("data-stoin-marked", "");
  var pending = false;
  new MutationObserver(function () {
    if (pending) return;
    pending = true;
    setTimeout(function () {
      pending = false;
      markAll(document.body);
    }, 50);
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
})();
