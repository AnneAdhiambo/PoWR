import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pino / thread-stream are Node.js-only packages that may appear as transitive
  // deps and cannot be bundled for SSR. @walletconnect is no longer a dependency
  // of @stacks/connect v8 so those entries have been removed.
  serverExternalPackages: [
    "pino",
    "pino-abstract-transport",
    "pino-std-serializers",
    "thread-stream",
  ],
};

export default nextConfig;
