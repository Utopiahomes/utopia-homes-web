import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import { fileURLToPath } from "node:url";

const environment =
  process.env.IS_PULL_REQUEST === "true"
    ? "preview"
    : (process.env.PUBLIC_ENVIRONMENT ?? (process.env.VERCEL_ENV === "production" ? "production" : "local"));
// The private editing copy of the site. It builds into its own folder so it can never be mistaken for
// the public site, and the normal build does not load any of this code.
const editMode = process.env.PUBLIC_EDIT_MODE === "1";
const editIntegrations = editMode ? [(await import("./editor/integration.mjs")).stoinEditBuild()] : [];

// The site's own address, from the same setting the Next.js site read. A value that isn't a full web
// address (the Vercel preview setting, 2026-11-25) falls back, as lib/site-url.ts does.
function siteUrl() {
  try {
    return new URL(process.env.PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").origin;
  } catch {
    return "http://localhost:4321";
  }
}

export default defineConfig({
  output: "static",
  ...(editMode ? { outDir: "./dist-edit" } : {}),
  site: siteUrl(),
  trailingSlash: "never",
  // /sitemap.xml comes from src/pages/sitemap.xml.ts (the same URLs the Next.js site listed).
  integrations: [
    mdx(),
    react(),
    ...editIntegrations,
  ],
  markdown: {
    syntaxHighlight: "prism",
  },
  vite: {
    // Shared code at the repository root (content/, lib/) that the Vercel functions in api/ use too.
    // The React parts from the Next.js site keep their next/* imports; these stand-ins answer them.
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("../../", import.meta.url)),
        "next/link": fileURLToPath(new URL("./src/next-shims/link.tsx", import.meta.url)),
        "next/image": fileURLToPath(new URL("./src/next-shims/image.tsx", import.meta.url)),
        "next/navigation": fileURLToPath(new URL("./src/next-shims/navigation.ts", import.meta.url)),
      },
      // Code at the repository root resolves React from this app, so there is one copy.
      dedupe: ["react", "react-dom"],
    },
    define: {
      "import.meta.env.PUBLIC_ENVIRONMENT": JSON.stringify(environment),
      "import.meta.env.PUBLIC_EDIT_MODE": JSON.stringify(editMode ? "1" : ""),
    },
  },
  // No Content-Security-Policy yet: the Next.js site had none, and its React parts set inline styles.
});
