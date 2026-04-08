import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // 显式设置项目根目录，防止被父目录的 package-lock.json 干扰
  outputFileTracingRoot: path.join(__dirname),
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
