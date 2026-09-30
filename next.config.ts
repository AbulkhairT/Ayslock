import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (local demo database) ships WASM and must be loaded by Node at runtime.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  poweredByHeader: false,
  // Short profile links: ayslock.app/@marco opens the same page as /u/marco.
  async rewrites() {
    return [{ source: "/@:username", destination: "/u/:username" }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      // Manage links carry the token in the path; never leak it via Referer.
      { source: "/b/:path*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
    ];
  },
};

export default nextConfig;
