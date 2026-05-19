import Link from "next/link";
import { createActReviewAction } from "@/app/actions";
import { OodaCurrentStepPlate } from "@/components/OodaCurrentStepPlate";
import { EmptyState, Input, Label, Notice, PageHeader, Section, Select, SubmitButton, Tag, Textarea } from "@/components/ui";
import { HYPOTHESIS_STATUSES, IMPLEMENTATION_STATUSES } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ActPage({ searchParams }: { searchParams?: { experimentId?: string } }) {
  const experiments = await prisma.smallExperiment.findMany({
    include: {
      case: true,
      hypothesis: true,
      actReviews: {
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: { reviewDueAt: "asc" },
    take: 30
  });

  const selected = experiments.find((experiment) => experiment.id === searchParams?.experimentId) ?? experiments[0];
  const selectedRef = selected ? `${selected.id}|${selected.caseId}|${selected.hypothesisId}` : "";

  return (
    <>
      <PageHeader
        title="Act"
        description="実施内容と反応を記録し、仮説が強まった、弱まった、保留のいずれかで更新します。"
        image={{ src: "/illustrations/act.png", alt: "反応の変化を表す小さな図" }}
        action={<OodaCurrentStepPlate step="04" stage="Act" tone="act" />}
      />

      <Section title="実施結果を記録">
        {experiments.length === 0 ? (
          <EmptyState>
            小さな支援がまだありません。<Link href="/decide" className="font-medium text-skyline">Decideで支援を一つ登録</Link>してください。
          </EmptyState>
        ) : (
          <form action={createActReviewAction} className="grid gap-5 rounded-md border border-ink/10 bg-white p-4 shadow-sm">
            <Label>
              実験カード
              <Select name="experimentRef" defaultValue={selectedRef} required>
                {experiments.map((experiment) => (
                  <option key={experiment.id} value={`${experiment.id}|${experiment.caseId}|${experiment.hypothesisId}`}>
                    {experiment.case.displayName} / {experiment.metric} / {experiment.support}
                  </option>
                ))}
              </Select>
            </Label>

            {selected ? (
              <div className="rounded-md border border-skyline/20 bg-skyline/10 p-4 text-sm leading-6 text-ink/75">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-ink">{selected.case.displayName}</strong>
                  <Tag>{selected.status}</Tag>
                  <Tag>{selected.metric}</Tag>
                  <Tag>期限 {formatDateTime(selected.reviewDueAt)}</Tag>
                </div>
                <p className="mt-2">支援: {selected.support}</p>
                <p className="mt-1 text-ink/55">仮説: {selected.hypothesis.statement}</p>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <Label>
                実施内容
                <Textarea name="implementation" rows={4} placeholder="実際に行った支援。予定との差もここに書く" required />
              </Label>
              <Label>
                直後反応
                <Textarea name="immediateResponse" rows={4} placeholder="直後に見えた反応、時間、行動" required />
              </Label>
              <Label>
                後続反応
                <Textarea name="laterResponse" rows={3} placeholder="少し後に見えた変化" />
              </Label>
              <Label>
                次に見る点
                <Textarea name="nextObservationPoint" rows={3} placeholder="次回確認したい点" />
              </Label>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Label>
                実施状況
                <Select name="implementationStatus" required defaultValue="予定通り">
                  {IMPLEMENTATION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label>
                指標の実測値
                <Input name="measuredValue" placeholder="開始まで40秒、離席0回など" />
              </Label>
              <Label>
                事前値との比較
                <Input name="comparison" placeholder="前回3分から短縮など" />
              </Label>
              <Label>
                仮説更新
                <Select name="hypothesisUpdate" required defaultValue="保留">
                  {HYPOTHESIS_STATUSES.filter((status) => ["強まった", "弱まった", "保留"].includes(status)).map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Select>
              </Label>
            </div>

            <Label>
              次に試す候補
              <Textarea name="nextTryCandidate" rows={3} placeholder="同時に実施せず、次の小さな試行候補として残す" />
            </Label>

            <Notice>
              保存すると関連する仮説カードのステータスを更新します。反応が見えない場合は、保留のまま次に見る点を残します。
            </Notice>

            <SubmitButton>Actを保存してチームレビューへ</SubmitButton>
          </form>
        )}
      </Section>

      <Section title="最近のAct記録">
        {experiments.flatMap((experiment) => experiment.actReviews).length === 0 ? (
          <EmptyState>Act記録はまだありません。</EmptyState>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {experiments.flatMap((experiment) =>
              experiment.actReviews.map((review) => (
                <article key={review.id} className="rounded-md border border-ink/10 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong>{experiment.case.displayName}</strong>
                    <Tag>{review.hypothesisUpdate}</Tag>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-ink/75">{review.immediateResponse}</p>
                  <p className="mt-2 text-xs leading-5 text-ink/55">{review.comparison || review.measuredValue}</p>
                </article>
              ))
            )}
          </div>
        )}
      </Section>
    </>
  );
}
