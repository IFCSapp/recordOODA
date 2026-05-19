import Link from "next/link";
import { createSmallExperimentAction } from "@/app/actions";
import { MultipleSupportWarning } from "@/components/MultipleSupportWarning";
import { OodaCurrentStepPlate } from "@/components/OodaCurrentStepPlate";
import { EmptyState, Input, Label, Notice, PageHeader, Section, Select, SubmitButton, Tag, Textarea } from "@/components/ui";
import { EXPERIMENT_STATUSES, METRIC_OPTIONS } from "@/lib/constants";
import { formatDateTime, toDateTimeLocal } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DecidePage({ searchParams }: { searchParams?: { hypothesisId?: string; observationId?: string } }) {
  const hypotheses = await prisma.hypothesis.findMany({
    where: searchParams?.observationId ? { observationId: searchParams.observationId } : undefined,
    include: {
      case: true,
      observation: true,
      smallExperiments: {
        include: { actReviews: true },
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: { updatedAt: "desc" },
    take: 30
  });

  const selected = hypotheses.find((hypothesis) => hypothesis.id === searchParams?.hypothesisId) ?? hypotheses[0];
  const selectedRef = selected ? `${selected.id}|${selected.caseId}` : "";
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return (
    <>
      <PageHeader
        title="Decide"
        description="次に試す小さな支援を一つだけ決めます。支援を絞るほど、反応と仮説の関係を見やすくなります。"
        image={{ src: "/illustrations/decide.png", alt: "小さな支援を一つ選ぶ図" }}
        action={<OodaCurrentStepPlate step="03" stage="Decide" tone="decide" />}
      />

      <Section title="小さな支援を登録">
        {hypotheses.length === 0 ? (
          <EmptyState>
            仮説がまだありません。<Link href="/orient" className="font-medium text-skyline">Orientで仮説を作成</Link>してください。
          </EmptyState>
        ) : (
          <form action={createSmallExperimentAction} className="grid gap-5 rounded-md border border-ink/10 bg-white p-4 shadow-sm">
            <Label>
              対象仮説
              <Select name="hypothesisRef" defaultValue={selectedRef} required>
                {hypotheses.map((hypothesis) => (
                  <option key={hypothesis.id} value={`${hypothesis.id}|${hypothesis.caseId}`}>
                    {hypothesis.case.displayName} / {hypothesis.category} / {hypothesis.statement}
                  </option>
                ))}
              </Select>
            </Label>

            {selected ? (
              <div className="rounded-md border border-moss/25 bg-moss/10 p-4 text-sm leading-6 text-ink/75">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-ink">{selected.case.displayName}</strong>
                  <Tag>{selected.category}</Tag>
                  <Tag>{selected.status}</Tag>
                </div>
                <p className="mt-2">{selected.statement}</p>
                <p className="mt-2 text-ink/55">根拠: {selected.evidence}</p>
              </div>
            ) : null}

            <MultipleSupportWarning />

            <div className="grid gap-4 lg:grid-cols-3">
              <Label>
                試す支援
                <Textarea name="support" rows={5} data-support-option="true" placeholder="次に一つだけ試す支援" required />
              </Label>
              <Label>
                支援案2（比較用メモ）
                <Textarea rows={5} data-support-option="true" placeholder="同時に実施せず、必要なら次回候補へ" />
              </Label>
              <Label>
                支援案3（比較用メモ）
                <Textarea rows={5} data-support-option="true" placeholder="同時に実施せず、必要なら次回候補へ" />
              </Label>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Label>
                支援カテゴリー
                <Select name="supportCategory" required defaultValue="見通し支援">
                  {["見通し支援", "環境調整", "課題調整", "声かけ調整", "休憩・回復", "援助要請支援", "選択肢提示", "その他"].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label>
                測定指標
                <Select name="metric" required defaultValue="開始までの時間">
                  {METRIC_OPTIONS.map((metric) => (
                    <option key={metric} value={metric}>
                      {metric}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label>
                実施予定日
                <Input name="plannedAt" type="datetime-local" defaultValue={toDateTimeLocal(tomorrow)} required />
              </Label>
              <Label>
                観察期限
                <Input name="reviewDueAt" type="datetime-local" defaultValue={toDateTimeLocal(nextWeek)} required />
              </Label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Label>
                狙う変化
                <Textarea name="targetChange" rows={3} placeholder="何がどう変わると見立ての確認になるか" required />
              </Label>
              <Label>
                注意点
                <Textarea name="cautions" rows={3} placeholder="支援を増やしすぎない、声かけを短くする等" />
              </Label>
              <Label>
                ステータス
                <Select name="status" defaultValue="予定">
                  {EXPERIMENT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Select>
              </Label>
            </div>

            <Notice tone="warn">複数の支援を同時に実施すると、どの条件で反応が変わったか見えにくくなります。</Notice>

            <SubmitButton>支援を一つ保存してActへ</SubmitButton>
          </form>
        )}
      </Section>

      <Section title="登録済みの支援">
        {hypotheses.flatMap((hypothesis) => hypothesis.smallExperiments).length === 0 ? (
          <EmptyState>小さな支援はまだ登録されていません。</EmptyState>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {hypotheses.flatMap((hypothesis) =>
              hypothesis.smallExperiments.map((experiment) => (
                <Link key={experiment.id} href={`/act?experimentId=${experiment.id}`} className="rounded-md border border-ink/10 bg-white p-4 shadow-sm transition hover:border-skyline">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong>{hypothesis.case.displayName}</strong>
                    <Tag>{experiment.status}</Tag>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-ink/75">{experiment.support}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Tag>{experiment.metric}</Tag>
                    <Tag>期限 {formatDateTime(experiment.reviewDueAt)}</Tag>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </Section>
    </>
  );
}
