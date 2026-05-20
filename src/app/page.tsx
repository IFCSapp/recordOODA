import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { EmptyState, LinkButton, PageHeader, Section, Tag } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const [unreviewedObservations, activeHypotheses, dueExperiments, recentSuccesses] = await Promise.all([
    prisma.observation.findMany({
      where: {
        observedAt: { gte: todayStart, lte: todayEnd },
        hypotheses: { none: {} }
      },
      include: { case: true },
      orderBy: { observedAt: "desc" },
      take: 4
    }),
    prisma.hypothesis.findMany({
      where: { status: { in: ["未検証", "検証中"] } },
      include: { case: true },
      orderBy: { updatedAt: "desc" },
      take: 4
    }),
    prisma.smallExperiment.findMany({
      where: {
        status: { in: ["予定", "実施中"] },
        reviewDueAt: { lte: now }
      },
      include: { case: true, hypothesis: true },
      orderBy: { reviewDueAt: "asc" },
      take: 4
    }),
    prisma.actReview.findMany({
      where: { hypothesisUpdate: "強まった" },
      include: { case: true, experiment: true, hypothesis: true },
      orderBy: { createdAt: "desc" },
      take: 4
    })
  ]);

  return (
    <>
      <PageHeader
        title="今日のOODA"
        description="公式記録や診断の代替ではなく、観察、仮説、小さな試行、反応の確認を分けて残すための補助ツールです。"
        image={{ src: "/illustrations/home.png", alt: "OODAの流れを表す小さな図" }}
        action={<LinkButton href="/observe">観察を追加</LinkButton>}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <DashboardBlock title="今日の未レビュー観察" href="/orient">
          {unreviewedObservations.length === 0 ? (
            <EmptyState>今日の未レビュー観察はありません。</EmptyState>
          ) : (
            unreviewedObservations.map((observation) => (
              <LinkCard key={observation.id} href={`/orient?observationId=${observation.id}`}>
                <div className="flex items-center justify-between gap-3">
                  <strong>{observation.case.displayName}</strong>
                  <span className="text-xs text-ink/55">{formatDateTime(observation.observedAt)}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/70">{observation.factMemo}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Tag>{observation.programName}</Tag>
                  <Tag>{observation.timing}</Tag>
                </div>
              </LinkCard>
            ))
          )}
        </DashboardBlock>

        <DashboardBlock title="試行中の仮説" href="/decide">
          {activeHypotheses.length === 0 ? (
            <EmptyState>未検証または検証中の仮説はありません。</EmptyState>
          ) : (
            activeHypotheses.map((hypothesis) => (
              <LinkCard key={hypothesis.id} href={`/decide?hypothesisId=${hypothesis.id}`}>
                <div className="flex items-center justify-between gap-3">
                  <strong>{hypothesis.case.displayName}</strong>
                  <Tag>{hypothesis.status}</Tag>
                </div>
                <p className="mt-2 text-sm font-medium text-skyline">{hypothesis.category}</p>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink/70">{hypothesis.statement}</p>
              </LinkCard>
            ))
          )}
        </DashboardBlock>

        <DashboardBlock title="期限が来た見直し" href="/act">
          {dueExperiments.length === 0 ? (
            <EmptyState>期限が来た見直しはありません。</EmptyState>
          ) : (
            dueExperiments.map((experiment) => (
              <LinkCard key={experiment.id} href={`/act?experimentId=${experiment.id}`}>
                <div className="flex items-center justify-between gap-3">
                  <strong>{experiment.case.displayName}</strong>
                  <span className="text-xs text-clay">{formatDateTime(experiment.reviewDueAt)} まで</span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/70">{experiment.support}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Tag>{experiment.metric}</Tag>
                  <Tag>{experiment.status}</Tag>
                </div>
              </LinkCard>
            ))
          )}
        </DashboardBlock>

        <DashboardBlock title="最近の成功条件" href="/search">
          {recentSuccesses.length === 0 ? (
            <EmptyState>強まった仮説のAct記録はまだありません。</EmptyState>
          ) : (
            recentSuccesses.map((review) => (
              <LinkCard key={review.id} href={`/search?caseId=${review.caseId}`}>
                <div className="flex items-center justify-between gap-3">
                  <strong>{review.case.displayName}</strong>
                  <Tag>{review.experiment.metric}</Tag>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/70">{review.measuredValue || review.immediateResponse}</p>
                <p className="mt-2 text-xs leading-5 text-ink/55">{review.experiment.support}</p>
              </LinkCard>
            ))
          )}
        </DashboardBlock>
      </div>
    </>
  );
}

function DashboardBlock({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <Section title={title}>
      <div className="mb-3 flex justify-end">
        <Link href={href} className="text-sm font-medium text-skyline hover:underline">
          詳細へ
        </Link>
      </div>
      <div className="grid min-h-80 gap-3">{children}</div>
    </Section>
  );
}

function LinkCard({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="record-link-card rounded-md border border-ink/10 bg-white p-4 shadow-sm transition hover:border-skyline hover:bg-field/60">
      {children}
    </Link>
  );
}
