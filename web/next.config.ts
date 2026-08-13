import type { NextConfig } from "next";
import path from "node:path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseHostname: string | undefined;
if (supabaseUrl) {
  try {
    supabaseHostname = new URL(supabaseUrl).hostname;
  } catch {
    supabaseHostname = undefined;
  }
}

const nextConfig: NextConfig = {
  transpilePackages: ["@lobehub/ui"],
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      ...(supabaseHostname ? [{ protocol: "https" as const, hostname: supabaseHostname }] : []),
    ],
  },
  experimental: {
    optimizePackageImports: [
      "motion",
      "gsap",
      "@gsap/react",
      "recharts",
      "lucide-react",
      "react-markdown",
      "@lobehub/ui",
    ],
  },
};

export default withNextIntl(nextConfig);
