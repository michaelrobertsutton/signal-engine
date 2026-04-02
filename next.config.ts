import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse and pdfjs-dist use Node.js-specific features and have browser-side
  // globals that crash when webpack/Turbopack inlines them into the server bundle.
  // Mark them external so they load via native require() at runtime instead.
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist'],
};

export default nextConfig;
