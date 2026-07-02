import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 데모 이미지는 /api/assets 라우트로 서빙되며 로컬 파일이므로 최적화 파이프라인 없이 그대로 사용
    unoptimized: true,
  },
};

export default nextConfig;
