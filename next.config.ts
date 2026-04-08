import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack 配置
  experimental: {
    turbo: {
      // 解决 Turbopack 处理中文时的崩溃问题
      resolveAlias: {},
    },
  },
  // 忽略 Turbopack root 警告
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
