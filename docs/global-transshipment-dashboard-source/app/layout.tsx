import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: "Global Transshipment Control Tower",
  description:
    "글로벌 환적 지연, 외부 이벤트, 영향물동과 조치 우선순위를 통합한 물류 리스크 관제 대시보드",
  openGraph: {
    title: "Global Transshipment Control Tower",
    description: "Sense · Decide · Act — 글로벌 환적 리스크 관제",
    images: [{ url: "/og.png", width: 1680, height: 945 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Global Transshipment Control Tower",
    description: "Sense · Decide · Act — 글로벌 환적 리스크 관제",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
