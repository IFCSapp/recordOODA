import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState, LinkButton, PageHeader, Section, Tag } from "@/components/ui";
import { csvToTags, formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CaseDetailPage({ params }: { params: { id: string } }) {
  const item = await prisma.case.findUnique({
    where: { id: params.id },
    include: {
      observations: {
        include: {
          hypotheses: {
            include: {
              smallExperiments: {
                include: { actReviews: true },
                orderBy: { createdAt: "desc" }
              }
            },
            orderBy: { createdAt: "desc" }
          }
        },
        orderBy: { observedAt: "desc" }
      }
    }
  });

  if (!item) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title={item.displayName}
        description={item.memo || "ケースのメモはまだありません。本名ではなく表示名で管理します。"}
        image={{ src: "/illustrations/cases.png", alt: "ケース詳細を表す小さな図" }}
        action={<LinkButton href={`/observe?caseId=${item.id}`}>観察を追加</LinkButton>}
      />

      <Section title="ケース情報">
        <div className="grid gap-3 rounded-md border border-ink/10 bg-white p-4 text-sm text-ink/70 md:grid-cols-4">
          <Info label="ケースID" value={item.id} />
          <Info label="状態" value={item.isActive ? "アクティブ" : "停止中"} />
          <Info label="作成日" value={formatDateTime(item.createdAt)} />
          <Info label="更新日" value={formatDateTime(item.updatedAt)} />
        </div>
      </Section>

      <Section title="OODA履歴" description="Observe、Orient、Decide、Actを同じ行で見て、事実と見立てを混ぜずに確認します。">
        {item.observations.length === 0 ? (
          <EmptyState>このケースの観察はまだありません。</EmptyState>
        ) : (
          <div className="grid gap-4">
            {item.observations.map((observation) => (
              <article key={observation.id} className="rounded-md border border-ink/10 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{observation.programName} / {observation.timing}</h2>
                    <p className="text-xs text-ink/55">{formatDateTime(observation.observedAt)}・{observation.location}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {csvToTags(observation.behaviorTags).map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </div>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-4">
                  <Stage title="事実" href={`/orient?observationId=${observation.id}`}>
                    {observation.factMemo}
                  </Stage>
                  <Stage title="仮説" href={`/decide?observationId=${observation.id}`}>
                    {observation.hypotheses.length > 0
                      ? observation.hypotheses.map((hypothesis) => hypothesis.statement).join(" / ")
                      : "未作成"}
                  </Stage>
                  <Stage title="支援" href="/decide">
                    {observation.hypotheses.flatMap((hypothesis) => hypothesis.smallExperiments).map((experiment) => experiment.support).join(" / ") || "未作成"}
                  </Stage>
                  <Stage title="反応" href="/act">
                    {observation.hypotheses
                      .flatMap((hypothesis) => hypothesis.smallExperiments)
                      .flatMap((experiment) => experiment.actReviews)
                      .map((review) => review.immediateResponse)
                      .join(" / ") || "未記録"}
                  </Stage>
                </div>
              </article>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-ink/45">{label}</div>
      <div className="mt-1 font-medium text-ink">{value}</div>
    </div>
  );
}

function Stage({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-skyline/40 pl-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-skyline">{title}</h3>
        <Link href={href} className="text-xs text-ink/50 hover:text-skyline">
          開く
        </Link>
      </div>
      <p className="mt-2 text-sm leading-6 text-ink/70">{children}</p>
    </div>
  );
}
