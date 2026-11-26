/* Stoin site building block "talk-to-lucy" (perpetual, royalty-free license for this website's
   own use). A button that opens a Stoin Spaces meeting with Lucy in a panel on the page: the
   app's /talk page starts it (signed in: in the visitor's own company, Lucy told who they are
   and which page they were on; signed out: sign in or talk as a guest). Closing the panel
   leaves the meeting. The app must allow this site in its frame-ancestors.
   Ray, 2026-11-16: the button shows Lucy herself (her moving face, "Online now") and says
   "Talk with Lucy", like walking up to a saleswoman, not opening a chatbot. Signed out, the
   visitor goes straight to her, one-on-one; what they tell her about themselves is kept for
   Stoin's team to follow up (sales_leads.py); the page and the site that sent them go along.
   Ray, 2026-11-18: on a company's own website, data-site names the site: the visitor talks with
   that company's synth and the company gets the lead (site_rooms.py).
   Ray, 2026-11-18: her face covered his footer, so data-position="top-right" puts the button
   under the element named by data-below (the site's header).
   Ray, 2026-11-18 (later): at the top right her face was far too small (40px), and she is the thing
   Stoin sells: 104px on a wide screen, the 76px bottom size below 1200px so she stays clear of
   centred headlines, 56px on a phone.
   Ray, 2026-11-26: top right is the default on every site (more visible, and the synth is what a
   Stoin Site sells); data-position="bottom-right" keeps the old corner. data-below defaults to
   the page's header. */
(function () {
  "use strict";
  var host = document.querySelector('[data-stoin-block="talk-to-lucy"]');
  if (!host || window.__stoinTalk) return;
  window.__stoinTalk = true;
  var app = (host.getAttribute("data-app") || "https://app.stoin.ai").replace(/\/$/, "");
  var site = host.getAttribute("data-site") || "";
  var topRight = host.getAttribute("data-position") !== "bottom-right";
  var below = host.getAttribute("data-below") || "header";
  var label = host.getAttribute("data-label") || "Talk with Lucy";
  var status = host.getAttribute("data-status") || "Online now";
  var face = host.getAttribute("data-face") || app + "/synths/lucy/idle-01.mp4";
  var still = host.getAttribute("data-still") || app + "/synths/lucy/still.jpg";

  var CSS =
    ".st-btn{position:fixed;right:18px;bottom:18px;z-index:2147483000;border:0;border-radius:999px;" +
    "padding:7px 26px 7px 7px;font:600 18px/1.15 system-ui,-apple-system,'Segoe UI',sans-serif;background:#0f5e57;" +
    "color:#fff;box-shadow:0 6px 24px rgba(0,0,0,.3);cursor:pointer;display:flex;align-items:center;gap:14px;" +
    "text-align:left;transition:transform .15s ease,box-shadow .15s ease}" +
    ".st-btn:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(0,0,0,.35)}" +
    ".st-face{position:relative;flex:none;width:76px;height:76px;border-radius:50%;overflow:hidden;" +
    "background:#0b4741;box-shadow:0 0 0 2px rgba(255,255,255,.85)}" +
    ".st-face img,.st-face video{position:absolute;height:134px;width:auto;max-width:none;left:-82px;top:-23px}" +
    ".st-words{display:flex;flex-direction:column;gap:5px}" +
    ".st-words small{font-weight:400;font-size:14px;opacity:.92;display:flex;align-items:center;gap:6px}" +
    ".st-btn i{width:8px;height:8px;border-radius:50%;background:#7ef0c3;box-shadow:0 0 0 3px rgba(126,240,195,.25)}" +
    ".st-panel{position:fixed;right:18px;bottom:18px;z-index:2147483001;width:min(520px,calc(100vw - 36px));" +
    "height:min(760px,calc(100vh - 36px));background:#111;border-radius:16px;overflow:hidden;" +
    "box-shadow:0 16px 48px rgba(0,0,0,.45);display:flex;flex-direction:column}" +
    ".st-bar{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#0f5e57;" +
    "color:#fff;font:600 13px system-ui,-apple-system,'Segoe UI',sans-serif;gap:10px}" +
    ".st-bar a{color:#fff;font-weight:400;opacity:.9}" +
    ".st-bar button{background:none;border:0;color:#fff;font-size:22px;line-height:1;cursor:pointer}" +
    ".st-panel iframe{flex:1;border:0;width:100%;background:#fff}" +
    ".st-wide{width:min(1100px,calc(100vw - 36px))}" +
    "@media (max-width:600px){.st-panel{inset:0;width:auto;height:auto;border-radius:0}.st-btn{right:12px;bottom:12px;font-size:16px;padding:6px 20px 6px 6px;gap:11px}.st-face{width:60px;height:60px}.st-face img,.st-face video{height:106px;left:-65px;top:-18px}}" +
    ".st-top.st-btn{top:var(--st-top,96px);right:18px;bottom:auto;padding:7px 30px 7px 7px;font-size:21px;gap:16px}" +
    ".st-top .st-face{width:104px;height:104px}.st-top .st-face img,.st-top .st-face video{height:183px;left:-112px;top:-32px}" +
    ".st-top .st-words{gap:6px}.st-top .st-words small{font-size:16px}" +
    ".st-panel.st-top{top:var(--st-top,96px);bottom:auto;height:min(760px,calc(100vh - var(--st-top,96px) - 18px))}" +
    "@media (max-width:1200px){.st-top.st-btn{padding:7px 26px 7px 7px;font-size:18px;gap:14px}.st-top .st-face{width:76px;height:76px}" +
    ".st-top .st-face img,.st-top .st-face video{height:134px;left:-82px;top:-23px}.st-top .st-words{gap:5px}.st-top .st-words small{font-size:14px}}" +
    "@media (max-width:600px){.st-top.st-btn{right:10px;font-size:16px;padding:5px 18px 5px 5px;gap:11px}.st-top .st-face{width:56px;height:56px}" +
    ".st-top .st-face img,.st-top .st-face video{height:99px;left:-60px;top:-17px}.st-top .st-words small{font-size:13px}}";

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  }

  var style = el("style");
  style.textContent = CSS;
  document.head.appendChild(style);
  var button = el("button", "st-btn");
  button.type = "button";
  button.setAttribute("aria-label", label);
  var round = el("span", "st-face");
  var picture = el("img");
  picture.src = still;
  picture.alt = "";
  round.appendChild(picture);
  // Her face moves (a few-second loop, muted), unless the visitor asked for less motion.
  var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!calm) {
    var moving = el("video");
    moving.muted = true;
    moving.loop = true;
    moving.autoplay = true;
    moving.playsInline = true;
    moving.setAttribute("playsinline", "");
    moving.setAttribute("aria-hidden", "true");
    moving.preload = "auto";
    moving.src = face;
    round.appendChild(moving);
  }
  var words = el("span", "st-words");
  words.appendChild(el("span", "", label));
  var line = el("small");
  line.appendChild(el("i"));
  line.appendChild(document.createTextNode(status));
  words.appendChild(line);
  button.appendChild(round);
  button.appendChild(words);
  document.body.appendChild(button);
  var panel = null;

  function place() {
    var bar = below ? document.querySelector(below) : null;
    var top = bar ? Math.max(0, bar.getBoundingClientRect().bottom) + 10 : 96;
    document.documentElement.style.setProperty("--st-top", Math.round(top) + "px");
  }

  if (topRight) {
    button.classList.add("st-top");
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { passive: true });
  }

  function talkUrl() {
    var query = "page=" + encodeURIComponent(location.href) + "&title=" + encodeURIComponent(document.title || "") +
      "&ref=" + encodeURIComponent(document.referrer || "");
    if (site) query += "&site=" + encodeURIComponent(site);
    return app + "/talk?" + query;
  }

  // Safari and phones can't keep a meeting going in a panel from another website: they get a tab.
  function needsOwnTab() {
    if (!site) return false;
    var agent = navigator.userAgent;
    var safari = /Safari/.test(agent) && !/Chrome|Chromium|CriOS|Android|Edg/.test(agent);
    return safari || /iPad|iPhone|iPod|Android/.test(agent) || window.innerWidth <= 600;
  }

  function close() {
    if (panel) panel.remove();
    panel = null;
    button.hidden = false;
  }

  function open() {
    if (panel) return;
    if (needsOwnTab()) {
      window.open(talkUrl(), "_blank", "noopener");
      return;
    }
    panel = el("div", "st-panel");
    if (topRight) panel.classList.add("st-top");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", label);
    var bar = el("div", "st-bar");
    bar.appendChild(el("span", "", label));
    var tools = el("span");
    var signin = el("a", "", "Sign in");
    signin.href = app + "/studio/organizer";
    signin.target = "_blank";
    signin.rel = "noopener";
    signin.title = "Have an account? Sign in, then press " + label + " again and she'll know your account";
    var wide = el("a", "", "Bigger");
    wide.href = "#";
    wide.addEventListener("click", function (event) {
      event.preventDefault();
      panel.classList.toggle("st-wide");
      wide.textContent = panel.classList.contains("st-wide") ? "Smaller" : "Bigger";
    });
    var own = el("a", "", "Own tab");
    own.href = talkUrl();
    own.target = "_blank";
    own.rel = "noopener";
    own.addEventListener("click", close);
    var x = el("button", "", "\u00d7");
    x.type = "button";
    x.setAttribute("aria-label", "Close and leave the meeting");
    x.addEventListener("click", close);
    if (!site) {
      tools.appendChild(signin);
      tools.appendChild(document.createTextNode("  "));
    }
    tools.appendChild(wide);
    tools.appendChild(document.createTextNode("  "));
    tools.appendChild(own);
    tools.appendChild(document.createTextNode("  "));
    tools.appendChild(x);
    bar.appendChild(tools);
    var frame = el("iframe");
    frame.src = talkUrl();
    frame.title = label;
    frame.allow = "microphone; camera; display-capture; autoplay; fullscreen; clipboard-write";
    panel.appendChild(bar);
    panel.appendChild(frame);
    document.body.appendChild(panel);
    button.hidden = true;
  }

  button.addEventListener("click", open);
})();
