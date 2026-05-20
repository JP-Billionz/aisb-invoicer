import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["jspdf", "jspdf-autotable"],
  },
  // Defensively register the @/* alias in webpack as well as tsconfig.
  // Some Render builds were failing to honor the tsconfig "paths" entry
  // even with baseUrl set; configuring webpack directly removes that
  // resolution path from the equation.
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@": path.resolve(__dirname, "src"),
    };
    return config;
  },
};

export default nextConfig;
