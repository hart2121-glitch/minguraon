import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "유천당 — 2인 협력 괴이 어드벤처",
  description: "둘이 함께 보는 것이 다르다. 종로 3가, 보이지 않는 것들의 세계.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
