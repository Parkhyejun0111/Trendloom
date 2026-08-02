import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trendloom — 패션 MD를 위한 AI 상품기획 도구",
  description:
    "네이버 쇼핑 실데이터와 AI로 트렌드를 읽고, 가격대를 잡고, 상품 속성과 카피까지 한 번에.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
