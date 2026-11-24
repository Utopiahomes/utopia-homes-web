import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The Stoin owner editor reads /_stoin/manifest.json and the bridge scripts from the edit copy
  // (app/stoin-edit, 404 on the public site). Folders starting with _ are private in the App Router.
  async rewrites() {
    return [{ source: "/_stoin/:file", destination: "/stoin-edit/:file" }];
  },
  outputFileTracingIncludes: { "/stoin-edit/**": ["./editor/*.js"] },
};

export default nextConfig;
