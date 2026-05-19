import Link from "next/link";
import { createCaseAction } from "@/app/actions";
import { EmptyState, Input, Label, PageHeader, Section, SubmitButton, Tag } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { CSSProperties } from "react";

export const dynamic = "force-dynamic";

export default async function CasesPage() {
  const cases = await prisma.case.findMany({
    include: {
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
    orderBy: { updatedAt: "desc" }
  });

  return (
    <>
      <PageHeader
        title="ケース"
        description="本名ではなく、ケースA、利用者001のような表示名で扱います。カードから次にすることへ直接進めます。"
        image={{ src: "/illustrations/cases.png", alt: "ケースカードを表す小さな図" }}
      />

      <Section title="まずはここから" description="ケースを選び、観察を書く。そこから仮説、支援、反応確認へ進みます。">
        <div className="case-operation-flow">
          <GuideCard step="1" title="ケースを選ぶ" body="既存ケースのカードを見るか、新しい表示名を追加します。" />
          <GuideCard step="2" title="観察を書く" body="見えた事実、直前、直後、不明点を短く残します。" />
          <GuideCard step="3" title="次の一手へ" body="カード上のおすすめボタンから、仮説やActへ進みます。" />
        </div>
      </Section>

      <Section title="ケース一覧" description="進み具合を見て、次に必要な作業を一つ選びます。">
        {cases.length === 0 ? (
          <EmptyState>まだケースがありません。下のフォームから最初のケースを追加してください。</EmptyState>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {cases.map((item) => {
              const nextAction = getNextAction(item);

              return (
                <article key={item.id} className="case-record-card rounded-md border border-ink/10 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold">{item.displayName}</h2>
                        <Tag>{item.isActive ? "アクティブ" : "停止中"}</Tag>
                      </div>
                      <p className="mt-1 text-xs text-ink/55">作成 {formatDate(item.createdAt)} / 更新 {formatDate(item.updatedAt)}</p>
                    </div>
                    <div className="flex flex-col items-start gap-3 sm:items-end">
                      <CaseProgressPlates counts={item._count} />
                    </div>
                  </div>

                  <p className="mt-3 min-h-12 text-sm leading-6 text-ink/70">{item.memo || "メモはまだありません。"}</p>

                  <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs text-ink/65">
                    <ProgressCount label="観察" value={item._count.observations} done={item._count.observations > 0} />
                    <ProgressCount label="仮説" value={item._count.hypotheses} done={item._count.hypotheses > 0} />
                    <ProgressCount label="支援" value={item._count.smallExperiments} done={item._count.smallExperiments > 0} />
                    <ProgressCount label="反応" value={item._count.actReviews} done={item._count.actReviews > 0} />
                  </div>

                  <div className="case-next-action-panel">
                    <div className="text-xs font-semibold text-skyline">次の一手</div>
                    <p className="mt-1 text-sm leading-6 text-ink/75">{nextAction.reason}</p>
                    <Link href={nextAction.href} className="case-primary-action">
                      {nextAction.label}
                    </Link>
                  </div>

                  <details className="case-secondary-actions">
                    <summary>関連操作</summary>
                    <div>
                    <ActionLink href={`/cases/${item.id}`}>履歴を見る</ActionLink>
                    <ActionLink href={`/observe?caseId=${item.id}`}>観察を書く</ActionLink>
                    <ActionLink href={`/team-review?caseId=${item.id}`}>チーム確認</ActionLink>
                    <ActionLink href={`/search?caseId=${item.id}`}>似た場面を探す</ActionLink>
                    </div>
                  </details>
                </article>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="新しいケースを追加" description="本名でなく、現場で共有しやすい表示名を使います。">
        <details className="rounded-md border border-ink/10 bg-white p-4 shadow-sm" open={cases.length === 0}>
          <summary className="cursor-pointer text-sm font-semibold text-ink">入力欄を開く</summary>
          <form action={createCaseAction} className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <Label>
              表示名
              <Input name="displayName" placeholder="ケースA、利用者001など" required />
            </Label>
            <Label>
              メモ
              <Input name="memo" placeholder="運用上の補足" />
            </Label>
            <label className="flex items-center gap-2 text-sm text-ink/75">
              <input name="isActive" type="checkbox" defaultChecked className="h-4 w-4 rounded border-ink/20" />
              アクティブ
            </label>
            <div className="md:col-span-3">
              <SubmitButton>ケースを作成</SubmitButton>
            </div>
          </form>
        </details>
      </Section>
    </>
  );
}

function GuideCard({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <div className="case-operation-step">
      <span>{step}</span>
      <strong>{title}</strong>
      <small>{body}</small>
    </div>
  );
}

function ProgressCount({ label, value, done }: { label: string; value: number; done: boolean }) {
  return (
    <div className={`rounded-md p-2 ${done ? "bg-moss/10 text-moss" : "bg-field text-ink/55"}`}>
      <div className="text-base font-semibold">{value}</div>
      <div>{label}</div>
    </div>
  );
}

const progressPlateStages = [
  { key: "observe", label: "Observe" },
  { key: "orient", label: "Orient" },
  { key: "decide", label: "Decide" },
  { key: "act", label: "Act" }
];

function CaseProgressPlates({
  counts
}: {
  counts: {
    observations: number;
    hypotheses: number;
    smallExperiments: number;
    actReviews: number;
  };
}) {
  const values = [counts.observations, counts.hypotheses, counts.smallExperiments, counts.actReviews];

  return (
    <div className="case-progress-visual" aria-hidden="true">
      <div className="case-progress-stage">
        {progressPlateStages.map((stage, index) => {
          const value = values[index] ?? 0;

          return (
            <span
              key={stage.key}
              className={`case-progress-plate case-progress-plate-${stage.key} ${value > 0 ? "is-filled" : ""}`}
              style={
                {
                  "--plate-x": `${index * 10}px`,
                  "--plate-y": `${index * -14}px`,
                  "--plate-z": `${index * 13}px`
                } as CSSProperties
              }
            >
              <span className="case-progress-plate-label">{stage.label}</span>
              <span className="case-progress-plate-count">{value}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function ActionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm font-medium text-ink transition hover:border-skyline hover:text-skyline">
      {children}
    </Link>
  );
}

function getNextAction(item: {
  id: string;
  observations: { id: string }[];
  hypotheses: { id: string }[];
  smallExperiments: { id: string }[];
  _count: {
    observations: number;
    hypotheses: number;
    smallExperiments: number;
    actReviews: number;
  };
}) {
  if (item._count.observations === 0) {
    return {
      label: "観察を書く",
      href: `/observe?caseId=${item.id}`,
      reason: "まずは見えた事実を1件残すと、仮説づくりに進めます。"
    };
  }

  if (item._count.hypotheses === 0) {
    return {
      label: "仮説を立てる",
      href: item.observations[0] ? `/orient?observationId=${item.observations[0].id}` : "/orient",
      reason: "観察があります。次は別の可能性も含めて、仮説を1〜3個考えます。"
    };
  }

  if (item._count.smallExperiments === 0) {
    return {
      label: "支援を決める",
      href: item.hypotheses[0] ? `/decide?hypothesisId=${item.hypotheses[0].id}` : "/decide",
      reason: "仮説があります。次に試す小さな支援を一つに絞ります。"
    };
  }

  if (item._count.actReviews === 0) {
    return {
      label: "反応を記録",
      href: item.smallExperiments[0] ? `/act?experimentId=${item.smallExperiments[0].id}` : "/act",
      reason: "支援が決まっています。実施後の反応を記録して見立てを更新します。"
    };
  }

  return {
    label: "履歴を見る",
    href: `/cases/${item.id}`,
    reason: "OODAが一巡しています。履歴から次に見る点を確認できます。"
  };
}
