import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "121분의 1 · 캠퍼스의 신호",
  description:
    "오늘은, 다른 전공으로. 고려대학교에서 영감을 받은 3D 캠퍼스를 탐험하며 여섯 개의 신호를 되찾는 오픈월드 어드벤처.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#173e35",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" href="/fonts/fonts.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
