import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { DM_Mono, Manrope, Noto_Sans_KR } from "next/font/google";
import { siteCopy } from "../components/copy";
import "./globals.css";

// next/font는 빌드할 때 글꼴을 내려받아 같이 배포한다. 방문자 브라우저가 Google 글꼴 서버에 요청하지 않는다.
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-mono", display: "swap" });
const notoSansKr = Noto_Sans_KR({ variable: "--font-noto-kr", display: "swap", preload: false });

export const metadata: Metadata = {
  title: siteCopy.ko.title,
  description: "사진이나 스크린샷에 모자이크, 블러, 불투명 가리기를 적용하고 PNG로 저장하세요. 가입이나 설치 없이 브라우저에서 편집하고, 사진은 서버로 보내지 않습니다.",
  applicationName: "PixelCover",
  verification: { google: "l9QSstiae9THZ5_1HPALXMNGrXLa7Etg3SYmV3_1FHk" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0d10",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={`${manrope.variable} ${dmMono.variable} ${notoSansKr.variable}`}>
      <body>{children}</body>
    </html>
  );
}
