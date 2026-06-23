import type { Metadata, Viewport } from "next";
import Providers from "@/components/common/Providers";
import LayoutShell from "@/components/common/LayoutShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "마이닥 - 치과·의료 플랫폼",
  description: "내 주변 치과, 성형외과, 피부과 시술 검색 및 예약 플랫폼",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="bg-gray-50">
        {/* 390px 미만 좁은 기기는 뷰포트를 390 기준으로 고정해 콘텐츠를 축소(zoom-out).
            head의 viewport 메타가 파싱된 직후, body 레이아웃 전에 동기 실행되어 깜빡임 없음. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var w=window.innerWidth||(window.screen&&window.screen.width);if(w&&w<390){var m=document.querySelector('meta[name=\"viewport\"]');if(m)m.setAttribute('content','width=390, user-scalable=no');}}catch(e){}})();",
          }}
        />
        <Providers>
          <LayoutShell>{children}</LayoutShell>
        </Providers>
      </body>
    </html>
  );
}
