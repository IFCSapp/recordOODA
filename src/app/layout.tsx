import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "recordOODA",
  description: "個人のOODAループをブラウザ内で記録するlocal-firstアプリ"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="record-app-body min-h-screen antialiased">{children}</body>
    </html>
  );
}
