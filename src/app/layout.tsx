import type { Metadata } from "next";
import Link from "next/link";
import { OodaWorkflowMenu } from "@/components/OodaWorkflowMenu";
import "./globals.css";

export const metadata: Metadata = {
  title: "recordOODA",
  description: "OODA型ケース見立て支援ツール"
};

const reviewNavItems = [
  { href: "/", label: "ホーム" },
  { href: "/search", label: "類似場面" },
  { href: "/team-review", label: "チーム確認" },
  { href: "/export", label: "要約" }
];

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
              <nav aria-label="振り返りと共有" className="flex flex-wrap gap-2 text-sm">
                {reviewNavItems.map((item) => (
                  <NavLink key={item.href} href={item.href}>
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>

            <OodaWorkflowMenu />
          </div>
        </div>
        <main className="mx-auto w-full max-w-7xl px-5 py-7">{children}</main>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md border border-ink/10 bg-white px-3 py-2 text-ink/75 transition hover:border-skyline hover:text-skyline"
    >
      {children}
    </Link>
  );
}
