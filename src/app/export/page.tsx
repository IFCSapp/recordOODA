import { createExportSummaryAction } from "@/app/actions";
import { EmptyState, Label, Notice, PageHeader, Section, Select, SubmitButton, Tag, Textarea } from "@/components/ui";
import { EXPORT_NOTICE } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { generateExportSummary } from "@/lib/domain";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ExportPage({ searchParams }: { searchParams?: { observationId?: string; saved?: string } }) {
  const observations = await prisma.observation.findMany({
    include: {
      case: true,
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
    orderBy: { observedAt: "desc" },
    take: 30
  });

  const selected = observations.find((observation) => observation.id === searchParams?.observationId) ?? observations[0];
  const hypothesis = selected?.hypotheses[0];
  const experiment = hypothesis?.smallExperiments[0];
  const summary = selected
    ? generateExportSummary({
        scene: `${selected.location}の${selected.programName}`,
        fact: selected.factMemo,
        antecedent: selected.antecedent,
        consequence: selected.consequence,
        hypothesis: hypothesis?.statement ?? "未整理の仮説",
        support: experiment?.support ?? "次に決める小さな支援",
        metric: experiment?.metric ?? "観察した指標"
      })
    : "";

  const savedSummaries = await prisma.exportSummary.findMany({
    include: { case: true, observation: true },
    orderBy: { createdAt: "desc" },
    take: 8
  });

  return (
    <>
      <PageHeader
        title="エクスポート要約"
        description="既存システムへ転記しやすい一段落の材料を作ります。事実、仮説、小さな支援、見る指標を分けたまま短くまとめます。"
        image={{ src: "/illustrations/export.png", alt: "一段落要約を表す小さな図" }}
      />

      <Notice tone="warn">{EXPORT_NOTICE}</Notice>

      <Section title="要約を生成">
        {observations.length === 0 || !selected ? (
          <EmptyState>要約できる観察がまだありません。</EmptyState>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
            <form className="rounded-md border border-ink/10 bg-white p-4 shadow-sm">
              <Label>
                観察
                <Select name="observationId" defaultValue={selected.id}>
                  {observations.map((observation) => (
                    <option key={observation.id} value={observation.id}>
                      {observation.case.displayName} / {formatDateTime(observation.observedAt)} / {observation.programName}
                    </option>
                  ))}
                </Select>
              </Label>
              <div className="mt-3">
                <SubmitButton>表示</SubmitButton>
              </div>
            </form>

            <form action={createExportSummaryAction} className="rounded-md border border-ink/10 bg-white p-4 shadow-sm">
              <input type="hidden" name="caseId" value={selected.caseId} />
              <input type="hidden" name="observationId" value={selected.id} />
              <input type="hidden" name="hypothesisId" value={hypothesis?.id ?? ""} />
              <input type="hidden" name="experimentId" value={experiment?.id ?? ""} />
              <Label>
                一段落要約
                <Textarea name="summary" rows={7} defaultValue={summary} required />
              </Label>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <SubmitButton>要約を保存</SubmitButton>
                {searchParams?.saved ? <Tag>保存しました</Tag> : null}
              </div>
            </form>
          </div>
        )}
      </Section>

      <Section title="保存済み要約">
        {savedSummaries.length === 0 ? (
          <EmptyState>保存済み要約はまだありません。</EmptyState>
        ) : (
          <div className="grid gap-4">
            {savedSummaries.map((item) => (
              <article key={item.id} className="rounded-md border border-ink/10 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{item.case.displayName}</strong>
                  <Tag>{formatDateTime(item.createdAt)}</Tag>
                </div>
                <p className="mt-3 text-sm leading-6 text-ink/75">{item.summary}</p>
              </article>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
