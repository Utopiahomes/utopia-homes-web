import { defineConfig } from "vitest/config";
import path from "node:path";

// Tests for the shared code at the repository root (lib/, content/) and the Vercel functions in
// api/. The *.test.tsx files render the old Next.js React components; the root no longer installs
// React or Testing Library, so they are not run here.
export default defineConfig({ test: { environment: "jsdom", include: ["tests/**/*.test.ts"] }, resolve: { alias: { "@": path.resolve(import.meta.dirname, ".") } } });
