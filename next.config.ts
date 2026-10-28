import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 상품 카드 사진 색 뽑기(lib/image-tone)가 /_next/image 로 작게 받아 읽는다
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
