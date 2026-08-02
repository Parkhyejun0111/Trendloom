import type { Metadata } from "next";
import localFont from "next/font/local";
import { Splash } from "@/components/splash";
import "./globals.css";

/**
 * 에스코어 드림 — 본문은 3(Light), 보조 문구는 2(ExtraLight).
 * 강조가 필요한 자리만 5·6 을 쓴다. 9단계 중 필요한 4개만 실어
 * 폰트 트래픽을 줄였다(각 OTF 717KB → woff2 약 230KB).
 */
const scdream = localFont({
  src: [
    { path: "./fonts/SCDream2.woff2", weight: "200", style: "normal" },
    { path: "./fonts/SCDream3.woff2", weight: "300", style: "normal" },
    { path: "./fonts/SCDream5.woff2", weight: "500", style: "normal" },
    { path: "./fonts/SCDream6.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-scdream",
  display: "swap",
  fallback: [
    "Pretendard Variable",
    "Pretendard",
    "Apple SD Gothic Neo",
    "Noto Sans KR",
    "sans-serif",
  ],
});

export const metadata: Metadata = {
  title: "Trendloom — 패션 MD를 위한 AI 상품기획 도구",
  description:
    "네이버 쇼핑 실데이터와 AI로 트렌드를 읽고, 가격대를 잡고, 상품 속성과 카피까지 한 번에.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${scdream.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Splash />
        {children}
      </body>
    </html>
  );
}
