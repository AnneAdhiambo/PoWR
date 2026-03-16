import type { NextConfig } from "next";

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
};

export default nextConfig;
