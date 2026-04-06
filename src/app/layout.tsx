import type { Metadata, Viewport } from "next";
import Providers from "@/components/common/Providers";
import DesktopHeader from "@/components/common/DesktopHeader";
import Footer from "@/components/common/Footer";
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
        <DesktopHeader />
        <div className="max-w-[430px] lg:max-w-none mx-auto bg-white lg:bg-gray-50 w-full min-h-dvh shadow-xl lg:shadow-none lg:pt-[112px]">
          {children}
        </div>
        <Footer />
        <Providers />
      </body>
    </html>
  );
}
