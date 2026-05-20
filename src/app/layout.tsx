import type { Metadata } from "next";
import Link from "next/link";
import { OodaWorkflowMenu, type OodaCaseDockData } from "@/components/OodaWorkflowMenu";
import { ReviewNav } from "@/components/ReviewNav";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import "./globals.css";

export const metadata: Metadata = {
  title: "recordOODA",
  description: "OODA型ケース見立て支援ツール"
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const caseDock = await getCaseDockData();

  return (
    <html lang="ja">
      <body className="record-app-body min-h-screen antialiased">
        <div className="app-top-shell">
          <div className="app-top-container mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4">
            <div className="app-command-row flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <Link href="/" className="brand-link flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="brand-mark text-xl font-bold tracking-normal text-ink">recordOODA</span>
                <span className="text-sm text-ink/60">観察から、小さく試して見立てを更新する</span>
              </Link>
              <ReviewNav />
            </div>

            <OodaWorkflowMenu caseDock={caseDock} />
          </div>
        </div>
        <main className="record-main mx-auto w-full max-w-7xl px-5 py-7">{children}</main>
      </body>
    </html>
  );
}

async function getCaseDockData(): Promise<OodaCaseDockData> {
  const [items, totalCount, activeCount] = await Promise.all([
    prisma.case.findMany({
      select: {
        id: true,
        displayName: true,
        memo: true,
        isActive: true,
        updatedAt: true,
        observations: {
          select: { id: true },
          orderBy: { observedAt: "desc" },
          take: 1
        },
        hypotheses: {
          select: { id: true },
          orderBy: { updatedAt: "desc" },
          take: 1
        },
        smallExperiments: {
          select: { id: true },
          orderBy: { updatedAt: "desc" },
          take: 1
        },
        _count: {
          select: {
            observations: true,
            hypotheses: true,
            smallExperiments: true,
            actReviews: true
          }
        }
      },
      orderBy: { updatedAt: "desc" },
      take: 4
    }),
    prisma.case.count(),
    prisma.case.count({ where: { isActive: true } })
  ]);

  return {
    totalCount,
    activeCount,
    items: items.map((item) => ({
      id: item.id,
      displayName: item.displayName,
      memo: item.memo,
      isActive: item.isActive,
      updatedAt: formatDateTime(item.updatedAt),
      latestObservationId: item.observations[0]?.id ?? null,
      latestHypothesisId: item.hypotheses[0]?.id ?? null,
      latestExperimentId: item.smallExperiments[0]?.id ?? null,
      counts: item._count
    }))
  };
}
