import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    useTypeScriptCli: false
  },
  transpilePackages: ["@ej-ledger/core", "@ej-ledger/proof", "@ej-ledger/sdk"]
};

export default nextConfig;
