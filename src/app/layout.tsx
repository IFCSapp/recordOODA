import type { Metadata } from "next";
import Link from "next/link";
import { OodaWorkflowMenu } from "@/components/OodaWorkflowMenu";
import { ReviewNav } from "@/components/ReviewNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "recordOODA",
  description: "OODA型ケース見立て支援ツール"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen antialiased">
        <div className="border-b border-ink/10 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <Link href="/" className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-xl font-bold tracking-normal text-ink">recordOODA</span>
                <span className="text-sm text-ink/60">観察から、小さく試して見立てを更新する</span>
              </Link>
              <ReviewNav />
            </div>

            <OodaWorkflowMenu />
          </div>
        </div>
        <main className="mx-auto w-full max-w-7xl px-5 py-7">{children}</main>
      </body>
    </html>
  );
}
