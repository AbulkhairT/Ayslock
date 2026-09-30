import localFont from "next/font/local";

// Self-hosted (from @fontsource), so builds never depend on a font CDN.
export const serif = localFont({
  src: [
    { path: "../../../node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2", style: "normal", weight: "400" },
    { path: "../../../node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2", style: "italic", weight: "400" },
  ],
  variable: "--font-serif",
  display: "swap",
});
