import type { Metadata, Viewport } from "next";
import Providers from "@/components/common/Providers";
import LayoutShell from "@/components/common/LayoutShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "마이닥 - 치과·의료 플랫폼",
  description: "내 주변 치과, 성형외과, 피부과 시술 검색 및 예약 플랫폼",
  verification: {
    google: "g5fXpPqLrcWbFRErOiBPqIWhUqO4JCIXt19f5x28OBo",
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // iOS 앱 웹뷰는 상태바·홈 인디케이터 영역까지 그린다. cover여야 env(safe-area-inset-*)에
  // 실제 값이 들어와 각 화면 머리·하단바가 그만큼 여백을 준다(안드로이드 앱은 0으로 들어옴).
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="bg-gray-50">
        <Providers>
          <LayoutShell>{children}</LayoutShell>
        </Providers>
      </body>
    </html>
  );
}
