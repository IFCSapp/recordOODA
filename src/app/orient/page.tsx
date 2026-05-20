import Link from "next/link";
import { createHypothesesAction } from "@/app/actions";
import { HypothesisCountPrompt } from "@/components/HypothesisCountPrompt";
import { OodaCurrentStepPlate } from "@/components/OodaCurrentStepPlate";
import { OrientDepthPreview } from "@/components/OrientDepthPreview";
import { EmptyState, Label, Notice, PageHeader, Section, Select, SubmitButton, Tag, Textarea } from "@/components/ui";
import { HYPOTHESIS_CATEGORIES, HYPOTHESIS_STATUSES } from "@/lib/constants";
import { csvToTags, formatDateTime } from "@/lib/format";
import { formErrorMessage } from "@/lib/form-errors";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OrientPage({ searchParams }: { searchParams?: { observationId?: string; error?: string } }) {
  const observations = await prisma.observation.findMany({
    include: {
      case: true,
      hypotheses: {
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: { observedAt: "desc" },
    take: 20
  });

  const selected = observations.find((observation) => observation.id === searchParams?.observationId) ?? observations[0];
  const selectedRef = selected ? `${selected.id}|${selected.caseId}` : "";
  const selectedTags = selected ? csvToTags(selected.behaviorTags) : [];
  const errorMessage = formErrorMessage(searchParams?.error);

  return (
    <>
      <PageHeader
        title="Orient"
        description="事実を土台に置き、複数の可能性を奥行きとして並べ、反証・未確認点を確認面として残します。"
        image={{ src: "/illustrations/orient.png", alt: "複数の仮説を表す小さな図" }}
        action={<OodaCurrentStepPlate step="02" stage="Orient" tone="orient" />}
      />

      <Section title="見立ての立体マップ" description="入力中の仮説が、上のマップに反映されます。考え方の位置関係を見ながら整理できます。">
        {observations.length === 0 ? (
          <EmptyState>
            観察がまだありません。<Link href="/observe" className="font-medium text-skyline">Observeを作成</Link>してください。
          </EmptyState>
        ) : (
          <form action={createHypothesesAction} className="grid gap-5">
            {errorMessage ? <Notice tone="warn">{errorMessage}</Notice> : null}
            <div className="rounded-md border border-ink/10 bg-white p-4 shadow-sm">
              <Label>
                根拠にする観察
                <Select name="observationRef" defaultValue={selectedRef} required>
                  {observations.map((observation) => (
                    <option key={observation.id} value={`${observation.id}|${observation.caseId}`}>
                      {observation.case.displayName} / {formatDateTime(observation.observedAt)} / {observation.programName}
                    </option>
                  ))}
                </Select>
              </Label>
            </div>

            {selected ? (
              <OrientDepthPreview
                observation={{
                  caseName: selected.case.displayName,
                  programName: selected.programName,
                  timing: selected.timing,
                  factMemo: selected.factMemo,
                  antecedent: selected.antecedent,
                  consequence: selected.consequence,
                  behaviorTags: selectedTags
                }}
              />
            ) : null}

            <HypothesisCountPrompt />
            <div className="grid gap-4 xl:grid-cols-3">
              {[0, 1, 2].map((index) => (
                <HypothesisEditor key={index} index={index} />
              ))}
            </div>

            <Notice>
              仮説は診断名ではありません。根拠、反証、未確認点、追加で見る点を残し、反応を見ながら更新します。
            </Notice>

            <SubmitButton>仮説を保存して、支援を決める</SubmitButton>
          </form>
        )}
      </Section>

      <Section title="既存の仮説">
        {observations.flatMap((observation) => observation.hypotheses).length === 0 ? (
          <EmptyState>仮説はまだありません。</EmptyState>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {observations.flatMap((observation) =>
              observation.hypotheses.map((hypothesis) => (
                <Link key={hypothesis.id} href={`/decide?hypothesisId=${hypothesis.id}`} className="rounded-md border border-ink/10 bg-white p-4 shadow-sm transition hover:border-skyline">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong>{observation.case.displayName}</strong>
                    <Tag>{hypothesis.status}</Tag>
                  </div>
                  <p className="mt-2 text-sm font-medium text-skyline">{hypothesis.category}</p>
                  <p className="mt-2 text-sm leading-6 text-ink/75">{hypothesis.statement}</p>
                  <p className="mt-2 text-xs leading-5 text-ink/55">反証・未確認: {hypothesis.counterEvidence || hypothesis.unknowns || "未入力"}</p>
                </Link>
              ))
            )}
          </div>
        )}
      </Section>
    </>
  );
}

function HypothesisEditor({ index }: { index: number }) {
  return (
    <fieldset className={`rounded-md border border-ink/10 bg-white p-4 shadow-sm hypothesis-input-card hypothesis-input-card-${index + 1}`}>
      <legend className="px-1 text-sm font-semibold text-ink">仮説 {index + 1}</legend>
      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-md bg-skyline/10 px-2 py-1 text-skyline">可能性の層</span>
        <span className="rounded-md bg-moss/10 px-2 py-1 text-moss">根拠</span>
        <span className="rounded-md bg-clay/10 px-2 py-1 text-clay">反証</span>
        <span className="rounded-md bg-field px-2 py-1 text-ink/60">未確認</span>
      </div>
      <div className="grid gap-3">
        <Label>
          見立てカテゴリー
          <Select name={`category-${index}`} defaultValue={HYPOTHESIS_CATEGORIES[index] ?? HYPOTHESIS_CATEGORIES[0]}>
            {HYPOTHESIS_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
        </Label>
        <Label>
          仮説文
          <Textarea name={`statement-${index}`} rows={3} data-hypothesis-statement="true" placeholder="〜が影響している可能性がある" required={index === 0} />
        </Label>
        <Label>
          根拠となる観察
          <Textarea name={`evidence-${index}`} rows={3} placeholder="どの事実からそう考えたか" required={index === 0} />
        </Label>
        <Label>
          反証または別解釈
          <Textarea name={`counterEvidence-${index}`} rows={2} placeholder="別の可能性、合わない事実" />
        </Label>
        <Label>
          未確認点
          <Textarea name={`unknowns-${index}`} rows={2} placeholder="まだ分からない点" />
        </Label>
        <Label>
          追加で見る点
          <Textarea name={`nextObservationPoints-${index}`} rows={2} placeholder="次回どこを見るか" />
        </Label>
        <Label>
          確信度
          <input name={`confidence-${index}`} type="range" min="0" max="100" defaultValue="50" className="mt-2 w-full accent-skyline" />
        </Label>
        <Label>
          ステータス
          <Select name={`status-${index}`} defaultValue="未検証">
            {HYPOTHESIS_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </Label>
      </div>
    </fieldset>
  );
}
