import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The isolated browser runner simulates exactly one extension origin.
  // Ordinary development and production builds keep the default protections.
  ...(process.env.GITHUB_ACTIONS==="true"&&process.env.CI==="true"&&process.env.PEDIDO_BROWSER_ASSISTANCE_QA==="true"
    ?{allowedDevOrigins:["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]}:{}),
};

export default nextConfig;
