"use client";

import { useEffect } from "react";

// The edit copy only (SITE_EDIT_MODE=1): once React has hydrated, marks the editable wording
// (editor/mark.js), then starts the Stoin editor's frame bridge, the same bridge the Astro sites use.
// The scripts load after hydration because changing the page before it would make React redraw it.
export function EditBridge({ parent }: { parent?: string }) {
  useEffect(() => {
    if (document.documentElement.hasAttribute("data-stoin-bridge")) return;
    document.documentElement.setAttribute("data-stoin-bridge", "");
    for (const name of ["mark.js", "markdown-inline.js", "bridge.js"]) {
      const script = document.createElement("script");
      script.src = `/_stoin/${name}`;
      script.async = false;
      if (parent && name === "bridge.js") script.setAttribute("data-parent", parent);
      document.body.appendChild(script);
    }
  }, [parent]);
  return null;
}
