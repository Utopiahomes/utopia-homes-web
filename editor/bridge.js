// Stoin Sites frame bridge, version 2. Loaded only by the edit build, after markdown-inline.js.
// Lets the owner click and retype wording, pick photos and sections, and talks to the Stoin editor
// through postMessage. Version 2 (2026-11-19) adds photos, article and legal paragraphs, and sections.
(function () {
  "use strict";

  var script = document.currentScript;
  var parentOrigin = (script && script.getAttribute("data-parent")) || "https://app.stoin.ai";
  var keySelector = "[data-stoin-key]";
  var photoSelector = "img[data-stoin-image]";
  var md = window.StoinMarkdown;

  var published = new Map();
  var photos = new Map();
  var selected = null;
  var baseline = "";
  var dirty = false;
  var forwarding = false;
  var outline = null;
  var template = null;
  var fixedSections = new Map();
  var publishedOrder = [];
  var draftImages = {};
  // A new post (/_stoin/post): the editor sends the whole draft; nothing of it is in the page.
  var postRoot = null;
  var readonly = false;
  var POST_TAGS = { p: "p", h2: "h2", h3: "h3", quote: "blockquote", li: "li" };

  var sheet = new CSSStyleSheet();
  sheet.replaceSync(
    "span[data-stoin-key]{all:unset!important}" +
      "[data-stoin-key]:hover,img[data-stoin-image]:hover{outline:1px solid rgba(37,99,235,.6)!important;outline-offset:1px!important;cursor:text!important}" +
      "img[data-stoin-image]:hover{cursor:pointer!important}" +
      "[data-stoin-key][data-stoin-highlight],[data-stoin-section][data-stoin-highlight]{outline:2px solid rgba(37,99,235,.75)!important;outline-offset:2px!important}" +
      "[data-stoin-key][data-stoin-selected],img[data-stoin-image][data-stoin-selected]{outline:2px solid #2563eb!important;outline-offset:2px!important}" +
      "[data-stoin-key][data-stoin-selected]{white-space:pre-wrap!important;cursor:text!important}" +
      "[data-stoin-section][hidden]{display:none!important}" +
      "[data-stoin-post] [data-stoin-key]:empty::before{content:attr(data-placeholder);opacity:.4}" +
      "[data-stoin-post]:not([data-stoin-readonly]) [data-stoin-key]{min-height:1.2em}" +
      "[data-stoin-post] img[data-stoin-image]:not([src]){display:block;width:100%;aspect-ratio:1200/630;background:rgba(127,127,127,.18)}" +
      "[data-stoin-readonly] [data-stoin-key]:hover,[data-stoin-readonly] img:hover{outline:none!important;cursor:auto!important}",
  );
  document.adoptedStyleSheets = document.adoptedStyleSheets.concat(sheet);

  function send(type, fields) {
    if (window.parent === window) return;
    try {
      window.parent.postMessage(Object.assign({ stoin: "edit", type: type }, fields), parentOrigin);
    } catch (error) {
      // The page keeps working when no editor is listening.
    }
  }

  function matching(selector, attribute, key) {
    return Array.prototype.filter.call(document.querySelectorAll(selector), function (element) {
      return element.getAttribute(attribute) === key;
    });
  }
  function elementsFor(key) {
    return matching(keySelector, "data-stoin-key", key);
  }

  function isMarkdown(element) {
    return element.getAttribute("data-stoin-format") === "markdown";
  }
  function marksOf(element) {
    return element.getAttribute("data-stoin-marks") || "inline";
  }
  function valueOf(element) {
    return isMarkdown(element) ? md.toMarkdown(md.fromElement(element), marksOf(element)) : element.textContent;
  }

  function setText(key, value) {
    elementsFor(key).forEach(function (element) {
      if (element === selected || valueOf(element) === value) return;
      if (isMarkdown(element)) {
        var nodes = md.parse(value, marksOf(element));
        md.render(element, nodes || [{ type: "text", value: value }]);
      } else {
        element.textContent = value;
      }
    });
  }

  function setPhoto(key, src) {
    matching(photoSelector, "data-stoin-image", key).forEach(function (image) {
      if (image.getAttribute("src") !== src) image.setAttribute("src", src);
      image.removeAttribute("srcset");
    });
  }

  function sectionOf(element) {
    var section = element && element.closest("[data-stoin-section]");
    return section ? section.getAttribute("data-stoin-section") : "";
  }

  function announce() {
    send("ready", {
      path: location.pathname,
      title: document.title,
      keys: Array.from(published.keys()),
      page: outline ? outline.page : "",
      post: Boolean(postRoot),
    });
  }

  // ---- A new post -------------------------------------------------------------------------------

  function postBlock(block) {
    var tag = POST_TAGS[block.kind];
    if (!tag || typeof block.id !== "string" || !/^[\w-]{1,40}$/.test(block.id)) return null;
    var element = document.createElement(tag);
    var target = element;
    if (block.kind === "quote") {
      target = document.createElement("p");
      element.appendChild(target);
    }
    target.setAttribute("data-stoin-key", "post.b." + block.id);
    target.setAttribute("data-stoin-format", "markdown");
    target.setAttribute("data-stoin-marks", "inline");
    target.setAttribute("data-placeholder", block.kind === "p" ? "Write here…" : block.kind === "li" ? "List item" : block.kind === "quote" ? "Quote" : "Heading");
    var text = typeof block.text === "string" ? block.text : "";
    var nodes = md.parse(text, "inline");
    md.render(target, nodes || [{ type: "text", value: text }]);
    return element;
  }

  function renderPost(post, focusKey) {
    // Never under the owner's fingers: what they are typing is the newest version.
    // A selected photo isn't typing: its new picture is shown at once.
    if (selected && selected.hasAttribute("data-stoin-key") && postRoot.contains(selected) && !focusKey) return;
    finish(false);
    var title = postRoot.querySelector('[data-stoin-key="post.title"]');
    var subtitle = postRoot.querySelector('[data-stoin-key="post.subtitle"]');
    var meta = postRoot.querySelector("[data-stoin-post-meta]");
    if (title) title.textContent = typeof post.title === "string" ? post.title : "";
    if (subtitle) {
      subtitle.textContent = typeof post.subtitle === "string" ? post.subtitle : "";
      subtitle.hidden = readonly && !subtitle.textContent;
    }
    if (meta) meta.textContent = typeof post.meta === "string" ? post.meta : "";
    var figure = postRoot.querySelector("[data-stoin-post-photo]");
    var image = figure && figure.querySelector("img");
    var photo = typeof post.photo === "string" && /^(?:data:image\/(?:webp|jpeg|png);|\/images\/)/.test(post.photo) ? post.photo : "";
    if (image) {
      if (photo) image.setAttribute("src", photo);
      else image.removeAttribute("src");
    }
    if (figure) figure.hidden = readonly && !photo;
    var body = postRoot.querySelector("[data-stoin-post-body]");
    while (body.firstChild) body.removeChild(body.firstChild);
    var list = null;
    (Array.isArray(post.blocks) ? post.blocks : []).forEach(function (block) {
      var element = block && typeof block === "object" ? postBlock(block) : null;
      if (!element) return;
      if (block.kind === "li") {
        if (!list) {
          list = document.createElement("ul");
          body.appendChild(list);
        }
        list.appendChild(element);
        return;
      }
      list = null;
      body.appendChild(element);
    });
    if (focusKey && !readonly) {
      var focus = elementsFor(focusKey)[0];
      if (focus) {
        select(focus);
        var range = document.createRange();
        range.selectNodeContents(focus);
        range.collapse(false);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }

  function remember(root) {
    root.querySelectorAll(keySelector).forEach(function (element) {
      var key = element.getAttribute("data-stoin-key");
      if (!published.has(key)) published.set(key, valueOf(element));
    });
    root.querySelectorAll(photoSelector).forEach(function (image) {
      var key = image.getAttribute("data-stoin-image");
      if (!photos.has(key)) photos.set(key, image.getAttribute("src"));
    });
  }

  function start() {
    postRoot = document.querySelector("[data-stoin-post]");
    template = document.querySelector("template[data-stoin-layout]");
    if (template) {
      try {
        outline = JSON.parse(template.getAttribute("data-stoin-layout"));
      } catch (error) {
        outline = null;
      }
      document.querySelectorAll("[data-stoin-section]").forEach(function (section) {
        var id = section.getAttribute("data-stoin-section");
        if (!section.hidden) publishedOrder.push(id);
        if (!section.hasAttribute("data-stoin-added")) fixedSections.set(id, section);
      });
    }
    remember(document);
    announce();
  }

  // ---- Typing ---------------------------------------------------------------------------------

  function finish(commit) {
    var element = selected;
    if (!element) return;
    var changed = dirty;
    selected = null;
    dirty = false;
    element.removeAttribute("contenteditable");
    element.removeAttribute("data-stoin-selected");
    if (commit && changed && element.hasAttribute("data-stoin-key")) {
      send("commit", { key: element.getAttribute("data-stoin-key"), value: valueOf(element) });
    }
  }

  function placeCaret(event) {
    if (!event || !document.caretRangeFromPoint) return;
    var range = document.caretRangeFromPoint(event.clientX, event.clientY);
    if (!range || !selected || !selected.contains(range.startContainer)) return;
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function boxOf(element) {
    var box = element.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  }

  function select(element, event) {
    if (element === selected) return;
    finish(true);
    selected = element;
    baseline = valueOf(element);
    dirty = false;
    element.setAttribute("data-stoin-selected", "");
    if (element.tagName !== "OPTION") {
      // Paragraphs keep their bold, italics and links while typing; other wording is plain text.
      element.setAttribute("contenteditable", isMarkdown(element) ? "true" : "plaintext-only");
      element.focus({ preventScroll: true });
      placeCaret(event);
    }
    send("select", {
      key: element.getAttribute("data-stoin-key"),
      rect: boxOf(element),
      format: isMarkdown(element) ? "markdown" : "text",
      section: sectionOf(element),
    });
  }

  function selectPhoto(image) {
    finish(true);
    selected = image;
    image.setAttribute("data-stoin-selected", "");
    var width = Number(image.getAttribute("width")) || image.naturalWidth || image.width;
    var height = Number(image.getAttribute("height")) || image.naturalHeight || image.height;
    send("select", {
      key: image.getAttribute("data-stoin-image"),
      rect: boxOf(image),
      photo: true,
      width: width,
      height: height,
      section: sectionOf(image),
    });
  }

  function clearHighlight() {
    document.querySelectorAll("[data-stoin-highlight]").forEach(function (element) {
      element.removeAttribute("data-stoin-highlight");
    });
  }

  function ownText(element) {
    var text = Array.prototype.filter
      .call(element.childNodes, function (node) {
        return node.nodeType === Node.TEXT_NODE;
      })
      .map(function (node) {
        return node.textContent;
      })
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    return (text || element.getAttribute("alt") || element.getAttribute("aria-label") || "").slice(0, 300);
  }

  document.addEventListener(
    "click",
    function (event) {
      if (forwarding) return;
      var target = event.target instanceof Element ? event.target : event.target.parentElement;
      if (!target) return;

      var marked = target.closest(keySelector);
      var photo = target.closest(photoSelector);
      var link = target.closest("a[href]");

      // The review copy only shows the post.
      if (readonly) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (photo && !marked) {
        event.preventDefault();
        event.stopPropagation();
        selectPhoto(photo);
        return;
      }

      if (marked) {
        if (link) {
          event.preventDefault();
          event.stopPropagation();
        }
        // A label would move focus to its control and end the typing, so its control is switched here.
        var label = target.closest("label");
        if (label && label.control) {
          event.preventDefault();
          forwarding = true;
          label.control.click();
          forwarding = false;
        }
        select(marked, event);
        return;
      }

      if (link) {
        event.preventDefault();
        event.stopPropagation();
        var url = new URL(link.href, location.href);
        if (url.origin !== location.origin) return;
        send("navigate", { path: url.pathname + url.search + url.hash });
        location.assign(url.href);
        return;
      }

      finish(true);
      if (selected) selected.removeAttribute("data-stoin-selected");
      selected = null;
      send("unmapped", { path: location.pathname, text: ownText(target), section: sectionOf(target) });
    },
    true,
  );

  document.addEventListener(
    "auxclick",
    function (event) {
      if (event.target instanceof Element && event.target.closest("a[href]")) event.preventDefault();
    },
    true,
  );

  document.addEventListener(
    "submit",
    function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true,
  );

  function typingIn(event) {
    return Boolean(selected && selected.hasAttribute("data-stoin-key") && (event.target === selected || selected.contains(event.target)));
  }

  document.addEventListener(
    "keydown",
    function (event) {
      if (!typingIn(event)) return;
      event.stopPropagation();
      var postKey = postRoot && postRoot.contains(selected) ? selected.getAttribute("data-stoin-key") : "";
      if (event.key === "Enter") {
        event.preventDefault();
        finish(true);
        // In a post, Enter after a paragraph starts the next one.
        if (postKey) send("enter", { key: postKey });
      } else if (event.key === "Backspace" && postKey.indexOf("post.b.") === 0 && selected.textContent === "") {
        event.preventDefault();
        finish(false);
        send("remove", { key: postKey });
      } else if (event.key === "Escape") {
        event.preventDefault();
        var key = selected.getAttribute("data-stoin-key");
        var wasDirty = dirty;
        finish(false);
        setText(key, baseline);
        if (wasDirty) send("input", { key: key, value: baseline });
      }
    },
    true,
  );

  // A space typed into a button or menu heading is wording, not a press of that control.
  document.addEventListener(
    "keyup",
    function (event) {
      if (typingIn(event) && event.key === " ") event.preventDefault();
    },
    true,
  );

  document.addEventListener(
    "beforeinput",
    function (event) {
      if (!typingIn(event)) return;
      if (event.inputType === "insertParagraph" || event.inputType === "insertLineBreak") event.preventDefault();
      // Legal pages have links only, so bold and italics can't be added there.
      if (/^format/.test(event.inputType) && marksOf(selected) === "links") event.preventDefault();
    },
    true,
  );

  document.addEventListener(
    "paste",
    function (event) {
      if (!typingIn(event)) return;
      event.preventDefault();
      var text = (event.clipboardData ? event.clipboardData.getData("text/plain") : "").replace(/\s*[\r\n]+\s*/g, " ");
      document.execCommand("insertText", false, text);
    },
    true,
  );

  document.addEventListener(
    "drop",
    function (event) {
      if (typingIn(event)) event.preventDefault();
    },
    true,
  );

  document.addEventListener(
    "input",
    function (event) {
      if (!typingIn(event)) return;
      var key = selected.getAttribute("data-stoin-key");
      var value = valueOf(selected);
      dirty = true;
      setText(key, value);
      send("input", { key: key, value: value });
    },
    true,
  );

  document.addEventListener(
    "focusout",
    function (event) {
      if (!selected || !selected.hasAttribute("data-stoin-key")) return;
      if (event.relatedTarget && selected.contains(event.relatedTarget)) return;
      if (event.target === selected || selected.contains(event.target)) finish(true);
    },
    true,
  );

  // ---- Sections -------------------------------------------------------------------------------

  function fillAdded(section, page, id, block) {
    var prefix = "layout." + page + ".added." + id + ".";
    section.querySelectorAll("[data-stoin-key]").forEach(function (element) {
      var field = element.getAttribute("data-stoin-key").split(".").pop();
      element.setAttribute("data-stoin-key", prefix + field);
      var value = typeof block[field] === "string" ? block[field] : "";
      if (element !== selected && element.textContent !== value) element.textContent = value;
      element.hidden = value === "";
    });
    section.querySelectorAll("img[data-stoin-image]").forEach(function (image) {
      var field = image.getAttribute("data-stoin-image").split(".").pop();
      image.setAttribute("data-stoin-image", prefix + field);
      var value = typeof block[field] === "string" ? block[field] : "";
      var src = draftImages[prefix + field] || (value.indexOf("/images/") === 0 ? value : "");
      if (src && image.getAttribute("src") !== src) image.setAttribute("src", src);
      if (typeof block.photoAlt === "string") image.setAttribute("alt", block.photoAlt);
    });
    section.querySelectorAll("a.button").forEach(function (link) {
      if (typeof block.link === "string" && md.safeHref(block.link)) link.setAttribute("href", block.link);
    });
  }

  function addedSection(id, block) {
    var existing = document.querySelector('[data-stoin-added][data-stoin-section="' + CSS.escape(id) + '"]');
    if (existing && existing.getAttribute("data-stoin-type") === block.type) return existing;
    if (existing) existing.remove();
    var sample = template && template.content.querySelector('[data-stoin-sample="' + CSS.escape(block.type) + '"]');
    if (!sample) return null;
    var section = sample.cloneNode(true);
    section.removeAttribute("data-stoin-sample");
    section.setAttribute("data-stoin-section", id);
    section.setAttribute("data-stoin-added", "");
    section.setAttribute("data-stoin-type", block.type);
    return section;
  }

  function applyLayout(layout) {
    if (!outline || !template) return;
    var page = outline.page;
    var plan = layout && Array.isArray(layout.order) ? layout : { order: publishedOrder, hidden: [], added: {} };
    var hidden = Array.isArray(plan.hidden) ? plan.hidden : [];
    var added = plan.added && typeof plan.added === "object" ? plan.added : {};
    var parent = template.parentNode;
    var keep = new Set();
    plan.order.forEach(function (id) {
      var section = fixedSections.get(id);
      if (!section && added[id] && typeof added[id] === "object") {
        section = addedSection(id, added[id]);
        if (section) {
          fillAdded(section, page, id, added[id]);
          remember(section);
        }
      }
      if (!section) return;
      keep.add(section);
      section.hidden = hidden.indexOf(id) !== -1;
      parent.insertBefore(section, template);
    });
    // Sections no longer in the plan: added ones go, written ones stay hidden until restored.
    document.querySelectorAll("[data-stoin-section]").forEach(function (section) {
      if (keep.has(section)) return;
      if (section.hasAttribute("data-stoin-added")) section.remove();
      else section.hidden = true;
    });
  }

  // ---- Messages from the editor ---------------------------------------------------------------

  window.addEventListener("message", function (event) {
    if (event.origin !== parentOrigin || event.source !== window.parent) return;
    var message = event.data;
    if (!message || typeof message !== "object" || message.stoin !== "edit") return;

    if (message.type === "post") {
      if (!postRoot || !message.post || typeof message.post !== "object") return;
      readonly = message.readonly === true;
      if (readonly) postRoot.setAttribute("data-stoin-readonly", "");
      else postRoot.removeAttribute("data-stoin-readonly");
      renderPost(message.post, typeof message.focus === "string" ? message.focus : "");
    } else if (message.type === "apply") {
      var edits = message.edits;
      if (!edits || typeof edits !== "object" || Array.isArray(edits) || postRoot) return;
      draftImages = message.images && typeof message.images === "object" ? message.images : {};
      var layouts = message.layouts && typeof message.layouts === "object" ? message.layouts : {};
      if (outline) applyLayout(layouts[outline.page]);
      published.forEach(function (text, key) {
        if (key.indexOf("layout.") === 0) return;
        var edited = Object.prototype.hasOwnProperty.call(edits, key) && typeof edits[key] === "string";
        setText(key, edited ? edits[key] : text);
      });
      photos.forEach(function (src, key) {
        if (key.indexOf("layout.") === 0) return;
        var draft = draftImages[key];
        setPhoto(key, typeof draft === "string" && /^(?:data:image\/(?:webp|jpeg|png);|\/images\/)/.test(draft) ? draft : src);
      });
    } else if (message.type === "highlight") {
      if (typeof message.key !== "string") return;
      clearHighlight();
      var matches = elementsFor(message.key);
      matches.forEach(function (element) {
        element.setAttribute("data-stoin-highlight", "");
      });
      if (matches[0]) matches[0].scrollIntoView({ block: "center", behavior: "smooth" });
    } else if (message.type === "highlight-section") {
      if (typeof message.section !== "string") return;
      clearHighlight();
      var section = document.querySelector('[data-stoin-section="' + CSS.escape(message.section) + '"]');
      if (section && !section.hidden) {
        section.setAttribute("data-stoin-highlight", "");
        section.scrollIntoView({ block: "start", behavior: "smooth" });
      }
    } else if (message.type === "clear") {
      finish(false);
      if (selected) selected.removeAttribute("data-stoin-selected");
      selected = null;
      clearHighlight();
    }
  });

  window.addEventListener("pageshow", function (event) {
    if (event.persisted) announce();
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
