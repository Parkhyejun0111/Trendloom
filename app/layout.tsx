import type { Metadata } from "next";
import { Splash } from "@/components/splash";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trendloom — Consumer Trend Intelligence",
  description:
    "연령·성별별 검색 관심 데이터를 분석하고 관련 키워드와 시각적 레퍼런스를 연결해, 요즘 어떤 스타일에 관심이 모이고 있는지 탐색합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">
        <div className="app-shell">
          <div className="app-frame">
            <div className="app-frame-scroll flex min-h-full flex-col">
              <Splash />
              {children}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
