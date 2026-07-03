import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 이미지는 next/image로 최적화(WebP 변환·리사이즈) — 2MB PNG 원본 전송 방지
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
