import Link from "next/link";
import { createObservationAction } from "@/app/actions";
import { FactMemoWarning } from "@/components/FactMemoWarning";
import { OodaCurrentStepPlate } from "@/components/OodaCurrentStepPlate";
import { EmptyState, Input, Label, Notice, PageHeader, Section, Select, SubmitButton, Tag, Textarea } from "@/components/ui";
import { BEHAVIOR_TAGS, BODY_PSYCH_TAGS, ENVIRONMENT_TAGS, INTERPERSONAL_TAGS } from "@/lib/constants";
import { csvToTags, formatDateTime, toDateTimeLocal } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ObservePage({ searchParams }: { searchParams?: { caseId?: string } }) {
  const [cases, observations] = await Promise.all([
    prisma.case.findMany({ where: { isActive: true }, orderBy: { updatedAt: "desc" } }),
    prisma.observation.findMany({
      include: { case: true },
      orderBy: { observedAt: "desc" },
      take: 8
    })
  ]);

  return (
    <>
      <PageHeader
        title="Observe"
        description="最初に自由記述で場面を置き、続いて事実、未確認、不明を分けます。評価語が入っても保存は止めず、観察された行動への書き換えを促します。"
        image={{ src: "/illustrations/observe.png", alt: "観察メモを表す小さな図" }}
        action={<OodaCurrentStepPlate step="01" stage="Observe" tone="observe" />}
      />

      <Section title="観察を入力" description="60〜90秒で残せるよう、短い入力とチェックを中心にしています。">
        {cases.length === 0 ? (
          <EmptyState>
            ケースがまだありません。<Link href="/cases" className="font-medium text-skyline">先にケースを作成</Link>してください。
          </EmptyState>
        ) : (
          <form action={createObservationAction} className="grid gap-5 rounded-md border border-ink/10 bg-white p-4 shadow-sm">
            <div>
              <Label>
                自由記述
                <Textarea name="freeText" rows={3} placeholder="まず、見えた流れをそのまま短く置く" />
              </Label>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Label>
                ケース
                <Select name="caseId" required defaultValue={searchParams?.caseId ?? cases[0]?.id}>
                  {cases.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.displayName}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label>
                日時
                <Input name="observedAt" type="datetime-local" defaultValue={toDateTimeLocal()} required />
              </Label>
              <Label>
                場所
                <Input name="location" placeholder="作業室、休憩スペースなど" required />
              </Label>
              <Label>
                プログラム名
                <Input name="programName" placeholder="PC課題、面談、清掃など" required />
              </Label>
              <Label>
                タイミング
                <Select name="timing" required defaultValue="開始前">
                  {["開始前", "開始直後", "実施中", "終了前", "終了後", "休憩後", "予定変更後", "未確認", "不明"].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label>
                直前の出来事
                <Input name="antecedent" placeholder="指示、予定変更、移動、休憩終了など" required />
              </Label>
            </div>

            <div>
              <Label>
                事実メモ
                <Textarea id="factMemo" name="factMemo" rows={4} placeholder="見えた行動、時間、場面、直前直後の変化で書く" required />
              </Label>
              <FactMemoWarning fieldId="factMemo" />
            </div>

            <CheckboxGroup name="behaviorTags" title="行動タグ" options={[...BEHAVIOR_TAGS, "未確認", "不明"]} />

            <div className="grid gap-4 md:grid-cols-2">
              <Label>
                直後の結果
                <Textarea name="consequence" rows={3} placeholder="職員の反応、周囲の変化、本人の次の行動など" required />
              </Label>
              <Label>
                不明、未確認メモ
                <Textarea name="unknownMemo" rows={3} placeholder="まだ分からない点、次に確認する点" />
              </Label>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <Label>
                開始までの時間（秒）
                <Input name="startLatencySeconds" type="number" min="0" />
              </Label>
              <Label>
                止まった時間（秒）
                <Input name="stoppedDurationSeconds" type="number" min="0" />
              </Label>
              <Label>
                声かけ回数
                <Input name="promptCount" type="number" min="0" />
              </Label>
              <Label>
                再開までの時間（秒）
                <Input name="resumeLatencySeconds" type="number" min="0" />
              </Label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Label>
                作業条件
                <Textarea name="workCondition" rows={3} placeholder="新規/既知、工程数、時間制限、難易度など" />
              </Label>
              <Label>
                保護因子・好み
                <Textarea name="protectiveFactors" rows={3} placeholder="うまくいった支援、好む声かけ、静かな場所など" />
              </Label>
              <Label>
                リスク・緊急度
                <Textarea name="riskUrgency" rows={3} placeholder="緊急度低/中/高、通常フロー外の対応が必要な場合など" />
              </Label>
            </div>

            <CheckboxGroup name="environmentSensory" title="環境・感覚" options={[...ENVIRONMENT_TAGS, "未確認", "不明"]} />
            <CheckboxGroup name="interpersonalContext" title="対人文脈" options={[...INTERPERSONAL_TAGS, "未確認", "不明"]} />
            <CheckboxGroup name="bodyPsych" title="身体・心理の手掛かり" options={[...BODY_PSYCH_TAGS, "未確認", "不明"]} />

            <Notice>
              診断名や性格評価ではなく、見えた事実、直前の出来事、直後の結果、未確認点を分けて保存します。
            </Notice>

            <SubmitButton>Observeを保存してOrientへ</SubmitButton>
          </form>
        )}
      </Section>

      <Section title="最近の観察">
        {observations.length === 0 ? (
          <EmptyState>まだ観察はありません。</EmptyState>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {observations.map((observation) => (
              <Link key={observation.id} href={`/orient?observationId=${observation.id}`} className="rounded-md border border-ink/10 bg-white p-4 shadow-sm transition hover:border-skyline">
                <div className="flex items-center justify-between gap-3">
                  <strong>{observation.case.displayName}</strong>
                  <span className="text-xs text-ink/55">{formatDateTime(observation.observedAt)}</span>
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-ink/70">{observation.factMemo}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {csvToTags(observation.behaviorTags).map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}

function CheckboxGroup({ title, name, options }: { title: string; name: string; options: readonly string[] }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-ink/80">{title}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-2 rounded-md border border-ink/10 bg-field px-3 py-2 text-sm text-ink/75">
            <input type="checkbox" name={name} value={option} className="h-4 w-4 rounded border-ink/20" />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
