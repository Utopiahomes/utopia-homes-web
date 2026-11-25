// Inline Markdown for editable article and legal paragraphs (Stoin Sites editor, 2026-11-19).
// Only one way of writing each mark is used, so an untouched paragraph always turns back into the
// exact text it came from: **bold**, *italic*, `code` and [text](address). Legal pages use links only.
// Loaded by the frame bridge in the browser and by the build's tests in Node.
(function (scope) {
  "use strict";

  var ESCAPED = /[\\*`[\]]/g;

  function safeHref(href) {
    return /^(?:https:\/\/|mailto:|tel:|\/(?!\/)|#)[^\s()<>]*$/.test(href);
  }

  /** Splits canonical inline Markdown into nodes. Returns null for text that isn't canonical. */
  function parse(text, mode) {
    var links = mode === "links";
    var index = 0;

    function readUntil(stop) {
      var nodes = [];
      var buffer = "";
      function flush() {
        if (buffer) nodes.push({ type: "text", value: buffer });
        buffer = "";
      }
      while (index < text.length) {
        if (stop && text.startsWith(stop, index)) {
          flush();
          index += stop.length;
          return nodes;
        }
        var character = text[index];
        if (!links && character === "\\" && index + 1 < text.length) {
          buffer += text[index + 1];
          index += 2;
        } else if (!links && text.startsWith("**", index)) {
          flush();
          index += 2;
          var strong = readUntil("**");
          if (strong === null) return null;
          nodes.push({ type: "strong", children: strong });
        } else if (!links && character === "*") {
          flush();
          index += 1;
          var emphasis = readUntil("*");
          if (emphasis === null) return null;
          nodes.push({ type: "emphasis", children: emphasis });
        } else if (!links && character === "`") {
          flush();
          var close = text.indexOf("`", index + 1);
          if (close === -1) return null;
          nodes.push({ type: "code", value: text.slice(index + 1, close) });
          index = close + 1;
        } else if (character === "[") {
          var label = text.indexOf("](", index);
          var end = label === -1 ? -1 : text.indexOf(")", label);
          if (label === -1 || end === -1) {
            buffer += character;
            index += 1;
            continue;
          }
          var href = text.slice(label + 2, end);
          if (!safeHref(href)) return null;
          flush();
          var inner = text.slice(index + 1, label);
          var children = parse(inner, mode);
          if (children === null) return null;
          nodes.push({ type: "link", href: href, children: children });
          index = end + 1;
        } else {
          buffer += character;
          index += 1;
        }
      }
      if (stop) return null;
      flush();
      return nodes;
    }

    return readUntil("");
  }

  function toMarkdown(nodes, mode) {
    var links = mode === "links";
    return nodes
      .map(function (node) {
        if (node.type === "text") return links ? node.value : node.value.replace(ESCAPED, "\\$&");
        if (node.type === "link") return safeHref(node.href) ? "[" + toMarkdown(node.children, mode) + "](" + node.href + ")" : toMarkdown(node.children, mode);
        if (links) return node.type === "code" ? node.value : toMarkdown(node.children || [], mode);
        if (node.type === "strong") return "**" + toMarkdown(node.children, mode) + "**";
        if (node.type === "emphasis") return "*" + toMarkdown(node.children, mode) + "*";
        if (node.type === "code") return "`" + node.value.replace(/`/g, "") + "`";
        return "";
      })
      .join("");
  }

  /** Reads an edited element back into nodes. Anything other than the four marks becomes text. */
  function fromElement(element) {
    var nodes = [];
    element.childNodes.forEach(function (child) {
      if (child.nodeType === 3) {
        var value = child.textContent.replace(/\s+/g, " ");
        var last = nodes[nodes.length - 1];
        if (last && last.type === "text") last.value += value;
        else if (value) nodes.push({ type: "text", value: value });
        return;
      }
      if (child.nodeType !== 1) return;
      var tag = child.tagName.toLowerCase();
      if (tag === "br") return nodes.push({ type: "text", value: " " });
      var inner = fromElement(child);
      if (tag === "strong" || tag === "b") nodes.push({ type: "strong", children: inner });
      else if (tag === "em" || tag === "i") nodes.push({ type: "emphasis", children: inner });
      else if (tag === "code") nodes.push({ type: "code", value: child.textContent });
      else if (tag === "a" && child.getAttribute("href")) nodes.push({ type: "link", href: child.getAttribute("href"), children: inner });
      else inner.forEach(function (node) { nodes.push(node); });
    });
    return nodes;
  }

  /** Writes nodes into an element with DOM calls only: no HTML string is ever parsed. */
  function render(element, nodes) {
    var document = element.ownerDocument;
    while (element.firstChild) element.removeChild(element.firstChild);
    nodes.forEach(function (node) {
      if (node.type === "text") return element.appendChild(document.createTextNode(node.value));
      var tag = { strong: "strong", emphasis: "em", code: "code", link: "a" }[node.type];
      if (!tag) return;
      var child = document.createElement(tag);
      if (node.type === "code") child.textContent = node.value;
      else render(child, node.children);
      if (node.type === "link") child.setAttribute("href", node.href);
      element.appendChild(child);
    });
  }

  scope.StoinMarkdown = { parse: parse, toMarkdown: toMarkdown, fromElement: fromElement, render: render, safeHref: safeHref };
})(typeof window !== "undefined" ? window : globalThis);
