"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const reviewNavItems = [
  { href: "/", label: "ホーム" },
  { href: "/search", label: "類似場面" },
  { href: "/reflect", label: "振り返り" },
  { href: "/files", label: "保存先" },
  { href: "/export", label: "要約" }
];

export function ReviewNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="OODAの振り返り" className="flex flex-wrap gap-2 text-sm">
      {reviewNavItems.map((item) => {
        const isCurrent = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isCurrent ? "page" : undefined}
            className="review-nav-link rounded-md border border-ink/10 bg-white px-3 py-2 text-ink/75 transition hover:border-skyline hover:text-skyline"
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
