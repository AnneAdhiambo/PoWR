import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Prevent pino / thread-stream (pulled in by @stacks/connect → @walletconnect)
  // from being bundled during SSR — they are Node.js-only packages that contain
  // test files which require devDependencies (tape, tap, desm) not present in prod.
  serverExternalPackages: [
    "pino",
    "pino-abstract-transport",
    "pino-std-serializers",
    "thread-stream",
    "@walletconnect/universal-provider",
    "@walletconnect/logger",
  ],

  turbopack: {
    // Pin the workspace root so Turbopack doesn't confuse sibling lockfiles.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
