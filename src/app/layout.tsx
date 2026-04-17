import type { Metadata, Viewport } from "next";
import Providers from "@/components/common/Providers";
import LayoutShell from "@/components/common/LayoutShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "키닥터 - 치과·의료 플랫폼",
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
        <Providers>
          <LayoutShell>{children}</LayoutShell>
        </Providers>
      </body>
    </html>
  );
}
