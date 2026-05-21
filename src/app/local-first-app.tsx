"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { OodaOrbitMenu } from "@/components/OodaOrbitMenu";
import { OrientDepthPreview } from "@/components/OrientDepthPreview";

export type LocalFirstView = "home" | "cases" | "observe" | "orient" | "decide" | "act" | "reflect" | "search" | "export" | "files";

type OodaCase = {
  id: string;
  displayName: string;
  memo: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type ObservationRecord = {
  id: string;
  caseId: string;
  observedAt: string;
  location: string;
  programName: string;
  timing: string;
  freeText: string;
  factMemo: string;
  behaviorTags: string[];
  antecedent: string;
  consequence: string;
  unknownMemo: string;
  createdAt: string;
  updatedAt: string;
};

type HypothesisRecord = {
  id: string;
  caseId: string;
  observationId: string;
  category: string;
  statement: string;
  evidence: string;
  counterEvidence: string;
  unknowns: string;
  nextObservationPoints: string;
  confidence: number;
  status: HypothesisStatus;
  createdAt: string;
  updatedAt: string;
};

type SmallExperimentRecord = {
  id: string;
  caseId: string;
  hypothesisId: string;
  support: string;
  supportCategory: string;
  targetChange: string;
  metric: string;
  plannedAt: string;
  reviewDueAt: string;
  cautions: string;
  nextTryCandidate: string;
  status: ExperimentStatus;
  createdAt: string;
  updatedAt: string;
};

type ActReviewRecord = {
  id: string;
  caseId: string;
  experimentId: string;
  hypothesisId: string;
  implementation: string;
  implementationStatus: ImplementationStatus;
  immediateResponse: string;
  laterResponse: string;
  measuredValue: string;
  comparison: string;
  hypothesisUpdate: HypothesisStatus;
  nextObservationPoint: string;
  nextTryCandidate: string;
  createdAt: string;
  updatedAt: string;
};

type ReflectionMemo = {
  id: string;
  caseId: string;
  targetRef: string;
  columnKey: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

type AppData = {
  version: 1;
  savedAt: string;
  settings: {
    currentCaseId: string;
    storageNote: string;
  };
  cases: OodaCase[];
  observations: ObservationRecord[];
  hypotheses: HypothesisRecord[];
  experiments: SmallExperimentRecord[];
  actReviews: ActReviewRecord[];
  reflectionMemos: ReflectionMemo[];
};

type CaseCounts = {
  observations: number;
  hypotheses: number;
  experiments: number;
  actReviews: number;
};

type CaseDockItem = OodaCase & {
  counts: CaseCounts;
  latestObservationId: string | null;
  latestHypothesisId: string | null;
  latestExperimentId: string | null;
};

type HypothesisStatus = "未検証" | "検証中" | "強まった" | "弱まった" | "保留";
type ExperimentStatus = "予定" | "実施中" | "完了" | "中止";
type ImplementationStatus = "予定通り" | "一部変更" | "未実施";

const STORAGE_KEY = "recordooda.local.v1";
const BEHAVIOR_TAGS = ["開始できない", "手が止まる", "席を離れる", "返事のみ", "質問しない", "確認を繰り返す", "表情が硬い", "自分から話す"];
const HYPOTHESIS_CATEGORIES = ["予定変更への弱さ", "理解・段取り負荷", "感覚・環境負荷", "対人・評価負荷", "疲労・体調", "援助要求の難しさ", "好み・価値とのずれ"];
const HYPOTHESIS_STATUSES: HypothesisStatus[] = ["未検証", "検証中", "強まった", "弱まった", "保留"];
const EXPERIMENT_STATUSES: ExperimentStatus[] = ["予定", "実施中", "完了", "中止"];
const IMPLEMENTATION_STATUSES: ImplementationStatus[] = ["予定通り", "一部変更", "未実施"];
const METRIC_OPTIONS = ["開始までの時間", "再開までの時間", "停止回数", "声かけ回数", "継続時間", "質問回数", "離席回数", "本人の楽さ", "その他"];
const SUPPORT_CATEGORIES = ["見通し支援", "環境調整", "課題調整", "声かけ調整", "休憩・回復", "援助要求支援", "選択肢提示", "その他"];

const stageLinks = [
  { href: "/observe", stage: "Observe", label: "観察を書く", helper: "事実を残す", tone: "observe" },
  { href: "/orient", stage: "Orient", label: "仮説を立てる", helper: "見方をほぐす", tone: "orient" },
  { href: "/decide", stage: "Decide", label: "支援を決める", helper: "一つ選ぶ", tone: "decide" },
  { href: "/act", stage: "Act", label: "反応を見る", helper: "結果で更新", tone: "act" }
] as const;

const topNavItems = [
  { href: "/", label: "ホーム" },
  { href: "/cases", label: "ケース一覧" },
  { href: "/search", label: "類似場面" },
  { href: "/reflect", label: "振り返り" },
  { href: "/files", label: "保存先" },
  { href: "/export", label: "要約" }
] as const;

const emptyData: AppData = {
  version: 1,
  savedAt: "",
  settings: {
    currentCaseId: "",
    storageNote: ""
  },
  cases: [],
  observations: [],
  hypotheses: [],
  experiments: [],
  actReviews: [],
  reflectionMemos: []
};

export default function LocalFirstApp({ view }: { view: LocalFirstView }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [data, setData] = useState<AppData>(emptyData);
  const [isReady, setIsReady] = useState(false);
  const caseItems = useMemo(() => buildCaseDockItems(data), [data]);
  const selectedCaseId = searchParams.get("caseId") || data.settings.currentCaseId || caseItems[0]?.id || "";
  const selectedCase = data.cases.find((item) => item.id === selectedCaseId) ?? data.cases[0] ?? null;
  const isTaskPage = view === "observe" || view === "orient" || view === "decide" || view === "act";

  useEffect(() => {
    setData(loadData());
    setIsReady(true);
  }, []);

  function commit(updater: (current: AppData) => AppData) {
    setData((current) => {
      const next = stampData(updater(current));
      saveData(next);
      return next;
    });
  }

  function navigate(href: string) {
    router.push(href);
  }

  function setCurrentCase(caseId: string) {
    commit((current) => ({
      ...current,
      settings: {
        ...current.settings,
        currentCaseId: caseId
      }
    }));
  }

  function createQuickCase(displayName: string, memo: string) {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      window.alert("ケース名を入力してください。");
      return;
    }
    const now = nowIso();
    const newCase: OodaCase = {
      id: newId("case"),
      displayName: trimmedName,
      memo: memo.trim(),
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
    commit((current) => ({
      ...current,
      settings: { ...current.settings, currentCaseId: newCase.id },
      cases: [newCase, ...current.cases]
    }));
  }

  return (
    <div className="min-h-screen">
      <div className="app-top-shell">
        <div className="app-top-container mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4">
          <div className="app-command-row flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Link href="/" className="brand-link flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="brand-mark text-xl font-bold tracking-normal text-ink">recordOODA</span>
              <span className="text-sm text-ink/60">個人の観察から、小さく試して見立てを更新する</span>
            </Link>
            <ReviewNav pathname={pathname} />
          </div>

          {isTaskPage ? (
            <CompactWorkflowBar
              items={caseItems}
              selectedCaseId={selectedCase?.id ?? ""}
              currentPath={pathname}
              onCaseChange={(caseId) => setCurrentCase(caseId)}
            />
          ) : (
            <WorkflowMenu
              items={caseItems}
              selectedCaseId={selectedCase?.id ?? ""}
              currentPath={pathname}
              onCaseChange={(caseId) => setCurrentCase(caseId)}
              onCreateCase={createQuickCase}
            />
          )}
        </div>
      </div>

      <main className="record-main mx-auto w-full max-w-7xl px-5 py-7">
        {!isReady ? (
          <EmptyState>読み込み中です。</EmptyState>
        ) : view === "home" ? (
          <HomeView data={data} selectedCase={selectedCase} onNavigate={navigate} />
        ) : view === "cases" ? (
          <CasesView data={data} commit={commit} onNavigate={navigate} />
        ) : view === "observe" ? (
          <ObserveView data={data} selectedCaseId={selectedCase?.id ?? ""} commit={commit} onNavigate={navigate} />
        ) : view === "orient" ? (
          <OrientView data={data} commit={commit} onNavigate={navigate} />
        ) : view === "decide" ? (
          <DecideView data={data} commit={commit} onNavigate={navigate} />
        ) : view === "act" ? (
          <ActView data={data} commit={commit} onNavigate={navigate} />
        ) : view === "reflect" ? (
          <ReflectView data={data} selectedCaseId={selectedCase?.id ?? ""} commit={commit} onNavigate={navigate} />
        ) : view === "search" ? (
          <SearchView data={data} />
        ) : view === "export" ? (
          <ExportView data={data} />
        ) : (
          <FilesView data={data} commit={commit} onImport={(next) => commit(() => next)} />
        )}
      </main>
    </div>
  );
}

function ReviewNav({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="主要ナビゲーション" className="flex flex-wrap gap-2 text-sm">
      {topNavItems.map((item) => {
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

function CompactWorkflowBar({
  items,
  selectedCaseId,
  currentPath,
  onCaseChange
}: {
  items: CaseDockItem[];
  selectedCaseId: string;
  currentPath: string;
  onCaseChange: (caseId: string) => void;
}) {
  const selected = items.find((item) => item.id === selectedCaseId) ?? items[0] ?? null;
  const currentStep = stageLinks.find((item) => currentPath.startsWith(item.href)) ?? stageLinks[0];
  const nextAction = selected ? getCaseNextAction(selected) : null;

  return (
    <section className={`task-context-bar ooda-tone-${currentStep.tone}`} aria-label="現在の作業">
      <div className="task-context-main">
        <span className="task-context-index">{currentStep.stage}</span>
        <div>
          <span>現在のステップ</span>
          <strong>{currentStep.label}</strong>
          <small>{currentStep.helper}</small>
        </div>
      </div>

      <label className="task-context-case">
        <span>対象ケース</span>
        <select value={selected?.id ?? ""} onChange={(event) => onCaseChange(event.target.value)} disabled={items.length === 0}>
          {items.length === 0 ? (
            <option value="">未作成</option>
          ) : (
            items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.displayName}
              </option>
            ))
          )}
        </select>
      </label>

      <div className="task-context-action">
        <span>{nextAction?.reason ?? "最初の対象を作ると、観察から始められます。"}</span>
        <Link href={nextAction?.href ?? "/cases"}>{nextAction ? `次: ${nextAction.label}` : "ケースを作る"}</Link>
      </div>

      <div className="task-context-jump" aria-label="OODAステップ移動">
        {stageLinks.map((item) => (
          <Link key={item.href} href={item.href} aria-current={currentPath.startsWith(item.href) ? "step" : undefined}>
            {item.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

function WorkflowMenu({
  items,
  selectedCaseId,
  currentPath,
  onCaseChange,
  onCreateCase
}: {
  items: CaseDockItem[];
  selectedCaseId: string;
  currentPath: string;
  onCaseChange: (caseId: string) => void;
  onCreateCase: (displayName: string, memo: string) => void;
}) {
  const selected = items.find((item) => item.id === selectedCaseId) ?? items[0] ?? null;
  const nextAction = selected ? getCaseNextAction(selected) : null;
  const totalCount = items.length;
  const activeCount = items.filter((item) => item.isActive).length;

  return (
    <nav aria-label="OODAの流れ" className="workflow-menu-shell">
      <section className="case-entry-card case-dock ooda-tone-case" aria-label="ケース操作">
        <div className="case-dock-head">
          <span className="ooda-orbit-number">{totalCount}</span>
          <div className="case-dock-title">
            <span className="ooda-orbit-stage">Case</span>
            <strong className="ooda-orbit-label">ケース</strong>
            <small>{activeCount}件アクティブ</small>
          </div>
          <Link href="/cases" className="case-dock-text-link">
            一覧
          </Link>
        </div>

        <label className="case-dock-picker">
          <span>対象</span>
          <select value={selected?.id ?? ""} onChange={(event) => onCaseChange(event.target.value)} disabled={items.length === 0}>
            {items.length === 0 ? (
              <option value="">未作成</option>
            ) : (
              items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.displayName}
                </option>
              ))
            )}
          </select>
        </label>

        {selected ? (
          <>
            <div className="case-dock-status">
              <span>{selected.isActive ? "アクティブ" : "停止中"}</span>
              <span>更新 {formatShortDateTime(selected.updatedAt)}</span>
            </div>
            <p className="case-dock-memo">{selected.memo || "メモはまだありません。"}</p>
            <div className="case-dock-progress" aria-label="OODA記録数">
              <span className={selected.counts.observations > 0 ? "is-filled" : ""}>
                <b>{selected.counts.observations}</b>
                <small>観察</small>
              </span>
              <span className={selected.counts.hypotheses > 0 ? "is-filled" : ""}>
                <b>{selected.counts.hypotheses}</b>
                <small>仮説</small>
              </span>
              <span className={selected.counts.experiments > 0 ? "is-filled" : ""}>
                <b>{selected.counts.experiments}</b>
                <small>支援</small>
              </span>
              <span className={selected.counts.actReviews > 0 ? "is-filled" : ""}>
                <b>{selected.counts.actReviews}</b>
                <small>反応</small>
              </span>
            </div>
            <p className="case-dock-next-reason">{nextAction?.reason}</p>
            <div className="case-dock-actions">
              <Link href={nextAction?.href ?? "/cases"} className="case-dock-primary">
                次: {nextAction?.label ?? "ケース作成"}
              </Link>
              <Link href={`/observe?caseId=${selected.id}`}>観察</Link>
              <Link href={`/reflect?caseId=${selected.id}`}>履歴</Link>
            </div>
          </>
        ) : (
          <div className="case-dock-empty">
            <p>まずケースを一つ作ると、OODAを始められます。</p>
            <QuickCaseForm onCreateCase={onCreateCase} submitLabel="作成して選択" />
          </div>
        )}

        {selected ? (
          <details className="case-dock-new">
            <summary>新しいケース</summary>
            <QuickCaseForm onCreateCase={onCreateCase} submitLabel="作成" />
          </details>
        ) : null}
      </section>

      <OodaOrbitMenu items={stageLinks} currentPath={currentPath} />
    </nav>
  );
}

function QuickCaseForm({
  onCreateCase,
  submitLabel
}: {
  onCreateCase: (displayName: string, memo: string) => void;
  submitLabel: string;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onCreateCase(text(form, "displayName"), text(form, "memo"));
    event.currentTarget.reset();
  }

  return (
    <form onSubmit={handleSubmit} className="case-dock-form">
      <input name="displayName" placeholder="ケース名" required />
      <input name="memo" placeholder="メモ" />
      <button type="submit">{submitLabel}</button>
    </form>
  );
}

function HomeView({ data, selectedCase, onNavigate }: { data: AppData; selectedCase: OodaCase | null; onNavigate: (href: string) => void }) {
  const caseItems = buildCaseDockItems(data);
  const selectedItem = selectedCase ? caseItems.find((item) => item.id === selectedCase.id) ?? null : null;
  const action = selectedItem ? getCaseNextAction(selectedItem) : { href: "/cases", label: "ケースを作る", reason: "最初の対象を作ると、Observeから始められます。" };
  const recentObservations = [...data.observations].sort(byNewest).slice(0, 4);
  const activeHypotheses = data.hypotheses.filter((item) => item.status === "未検証" || item.status === "検証中").sort(byUpdated).slice(0, 4);
  const dueExperiments = data.experiments.filter((item) => item.status === "予定" || item.status === "実施中").sort((a, b) => a.reviewDueAt.localeCompare(b.reviewDueAt)).slice(0, 4);
  const recentReviews = [...data.actReviews].sort(byNewest).slice(0, 4);

  return (
    <>
      <PageHeader
        title="今日のOODA"
        description="記録を増やす画面ではなく、観察、見立て、支援、反応を一巡させるための画面です。"
        image="home.png"
        action={
          <button type="button" className="case-primary-action" onClick={() => onNavigate(action.href)}>
            {action.label}
          </button>
        }
      />

      <section className="today-loop-panel" aria-label="今日のOODA">
        <div className="today-loop-action">
          <span>次に動かすOODA</span>
          <strong>{action.reason}</strong>
          <Link href={action.href} className="case-primary-action">
            {action.label}
          </Link>
        </div>
        <div className="today-loop-rail">
          {stageLinks.map((item, index) => (
            <Link key={item.href} href={item.href} className={`today-loop-step today-loop-step-${item.tone}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <small>{item.stage}</small>
                <strong>{item.label}</strong>
                <em>{item.helper}</em>
              </div>
              <b>{countForStage(data, item.stage)}</b>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <DashboardBlock title="最近の観察" href="/observe" actionLabel="観察を書く">
          {recentObservations.length === 0 ? (
            <EmptyState>まだ観察はありません。</EmptyState>
          ) : (
            recentObservations.map((item) => (
              <LinkCard key={item.id} href={`/orient?observationId=${item.id}`}>
                <CardTop title={caseName(data, item.caseId)} meta={formatShortDateTime(item.observedAt)} />
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/70">{item.factMemo}</p>
                <TagRow tags={[item.programName, item.timing, ...item.behaviorTags.slice(0, 2)]} />
              </LinkCard>
            ))
          )}
        </DashboardBlock>

        <DashboardBlock title="見直す仮説" href="/orient" actionLabel="仮説を見る">
          {activeHypotheses.length === 0 ? (
            <EmptyState>未検証の仮説はありません。</EmptyState>
          ) : (
            activeHypotheses.map((item) => (
              <LinkCard key={item.id} href={`/decide?hypothesisId=${item.id}`}>
                <CardTop title={caseName(data, item.caseId)} meta={item.status} />
                <p className="mt-2 text-sm font-medium text-skyline">{item.category}</p>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink/70">{item.statement}</p>
              </LinkCard>
            ))
          )}
        </DashboardBlock>

        <DashboardBlock title="反応を見る支援" href="/act" actionLabel="反応を記録">
          {dueExperiments.length === 0 ? (
            <EmptyState>実施待ちの支援はありません。</EmptyState>
          ) : (
            dueExperiments.map((item) => (
              <LinkCard key={item.id} href={`/act?experimentId=${item.id}`}>
                <CardTop title={caseName(data, item.caseId)} meta={`期限 ${formatShortDate(item.reviewDueAt)}`} />
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/70">{item.support}</p>
                <TagRow tags={[item.metric, item.status]} />
              </LinkCard>
            ))
          )}
        </DashboardBlock>

        <DashboardBlock title="最近の反応" href="/reflect" actionLabel="振り返る">
          {recentReviews.length === 0 ? (
            <EmptyState>反応の記録はまだありません。</EmptyState>
          ) : (
            recentReviews.map((item) => (
              <LinkCard key={item.id} href={`/reflect?caseId=${item.caseId}`}>
                <CardTop title={caseName(data, item.caseId)} meta={item.hypothesisUpdate} />
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/70">{item.immediateResponse}</p>
                <p className="mt-2 text-xs leading-5 text-ink/55">{item.nextObservationPoint || item.nextTryCandidate}</p>
              </LinkCard>
            ))
          )}
        </DashboardBlock>
      </div>
    </>
  );
}

function CasesView({ data, commit, onNavigate }: { data: AppData; commit: Commit; onNavigate: (href: string) => void }) {
  function handleCreateCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const displayName = requiredText(form, "displayName");
    if (!displayName) return alert("表示名を入力してください。");
    const now = nowIso();
    const newCase: OodaCase = {
      id: newId("case"),
      displayName,
      memo: text(form, "memo"),
      isActive: form.get("isActive") !== null,
      createdAt: now,
      updatedAt: now
    };
    commit((current) => ({
      ...current,
      settings: { ...current.settings, currentCaseId: newCase.id },
      cases: [newCase, ...current.cases]
    }));
    event.currentTarget.reset();
    onNavigate(`/observe?caseId=${newCase.id}`);
  }

  const caseItems = buildCaseDockItems(data);

  return (
    <>
      <PageHeader title="ケース" description="個人で見返しやすい単位を一つ作り、OODAを回します。" image="cases.png" action={<LinkButton href="/observe">観察を書く</LinkButton>} />

      <Section title="OODAの回し方">
        <div className="case-operation-flow">
          <GuideCard step="1" title="観察" body="見えた事実だけ残す" />
          <GuideCard step="2" title="見立て" body="別の可能性も置く" />
          <GuideCard step="3" title="支援" body="一つだけ試す" />
          <GuideCard step="4" title="反応" body="結果で更新する" />
        </div>
      </Section>

      <Section title="ケース一覧">
        {caseItems.length === 0 ? (
          <EmptyState>まだケースはありません。下のフォームから最初のケースを作ります。</EmptyState>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {caseItems.map((item) => {
              const nextAction = getCaseNextAction(item);
              return (
                <article key={item.id} className="case-record-card rounded-md border border-ink/10 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold">{item.displayName}</h2>
                        <Tag>{item.isActive ? "アクティブ" : "停止中"}</Tag>
                      </div>
                      <p className="mt-1 text-xs text-ink/55">作成 {formatShortDate(item.createdAt)} / 更新 {formatShortDate(item.updatedAt)}</p>
                    </div>
                  </div>
                  <p className="mt-3 min-h-12 text-sm leading-6 text-ink/70">{item.memo || "メモはまだありません。"}</p>
                  <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs text-ink/65">
                    <ProgressCount label="観察" value={item.counts.observations} done={item.counts.observations > 0} />
                    <ProgressCount label="仮説" value={item.counts.hypotheses} done={item.counts.hypotheses > 0} />
                    <ProgressCount label="支援" value={item.counts.experiments} done={item.counts.experiments > 0} />
                    <ProgressCount label="反応" value={item.counts.actReviews} done={item.counts.actReviews > 0} />
                  </div>
                  <div className="case-next-action-panel">
                    <div className="text-xs font-semibold text-skyline">次の一手</div>
                    <p className="mt-1 text-sm leading-6 text-ink/75">{nextAction.reason}</p>
                    <Link href={nextAction.href} className="case-primary-action">
                      {nextAction.label}
                    </Link>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <ActionLink href={`/observe?caseId=${item.id}`}>観察</ActionLink>
                    <ActionLink href={`/reflect?caseId=${item.id}`}>履歴</ActionLink>
                    <ActionLink href={`/search?caseId=${item.id}`}>類似場面</ActionLink>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="新しいケースを追加">
        <form onSubmit={handleCreateCase} className="grid gap-4 rounded-md border border-ink/10 bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_auto] md:items-end">
          <Label>
            表示名
            <Input name="displayName" placeholder="ケースA、利用者01など" required />
          </Label>
          <Label>
            メモ
            <Input name="memo" placeholder="自分が後で見返しやすい補足" />
          </Label>
          <label className="flex items-center gap-2 text-sm text-ink/75">
            <input name="isActive" type="checkbox" defaultChecked className="h-4 w-4 rounded border-ink/20" />
            アクティブ
          </label>
          <div className="md:col-span-3">
            <SubmitButton>ケースを作る</SubmitButton>
          </div>
        </form>
      </Section>
    </>
  );
}

function ObserveView({
  data,
  selectedCaseId,
  commit,
  onNavigate
}: {
  data: AppData;
  selectedCaseId: string;
  commit: Commit;
  onNavigate: (href: string) => void;
}) {
  const [formError, setFormError] = useState("");

  function handleCreateObservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const caseId = requiredText(form, "caseId");
    if (!caseId) return setFormError("ケースを選んでください。");
    const factMemo = requiredText(form, "factMemo");
    if (!factMemo) return setFormError("事実メモを入力してください。");
    const now = nowIso();
    const observation: ObservationRecord = {
      id: newId("obs"),
      caseId,
      observedAt: toIsoFromLocal(text(form, "observedAt")) || now,
      location: requiredText(form, "location"),
      programName: requiredText(form, "programName"),
      timing: requiredText(form, "timing"),
      freeText: text(form, "freeText"),
      factMemo,
      behaviorTags: allText(form, "behaviorTags"),
      antecedent: requiredText(form, "antecedent"),
      consequence: requiredText(form, "consequence"),
      unknownMemo: text(form, "unknownMemo"),
      createdAt: now,
      updatedAt: now
    };
    if (!observation.location || !observation.programName || !observation.timing || !observation.antecedent || !observation.consequence) {
      const missing = [
        !observation.location ? "場所" : "",
        !observation.programName ? "活動" : "",
        !observation.timing ? "タイミング" : "",
        !observation.antecedent ? "直前の出来事" : "",
        !observation.consequence ? "直後の結果" : ""
      ].filter(Boolean);
      return setFormError(`必須項目を入力してください: ${missing.join("、")}`);
    }
    setFormError("");
    commit((current) => ({
      ...current,
      settings: { ...current.settings, currentCaseId: caseId },
      cases: touchCase(current.cases, caseId),
      observations: [observation, ...current.observations]
    }));
    onNavigate(`/orient?observationId=${observation.id}`);
  }

  const recentObservations = [...data.observations].sort(byNewest).slice(0, 8);

  return (
    <>
      <PageHeader title="観察を書く" description="評価や解釈の前に、見えた事実を短く残します。" image="observe.png" action={<StepPlate step="01" stage="Observe" tone="observe" />} />

      <Section title="観察を入力">
        {data.cases.length === 0 ? (
          <EmptyState>
            ケースがまだありません。<Link href="/cases" className="font-medium text-skyline">先にケースを作成</Link>してください。
          </EmptyState>
        ) : (
          <form onSubmit={handleCreateObservation} className="grid gap-5 rounded-md border border-ink/10 bg-white p-4 shadow-sm" noValidate>
            {formError ? (
              <p className="record-form-error" role="alert">
                {formError}
              </p>
            ) : null}

            <Label>
              自由記述
              <Textarea name="freeText" rows={3} placeholder="まず、見えた流れをそのまま短く置く" />
            </Label>

            <div className="observe-minimum-group">
              <div className="observe-minimum-head">
                <span>まずここだけ</span>
                <p>60〜90秒で、対象、場面、事実、直前直後を先に残します。</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Label>
                  ケース <RequiredMark />
                  <Select name="caseId" required defaultValue={selectedCaseId || data.cases[0]?.id}>
                    {data.cases.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.displayName}
                      </option>
                    ))}
                  </Select>
                </Label>
                <Label>
                  日時 <RequiredMark />
                  <Input name="observedAt" type="datetime-local" defaultValue={toDateTimeLocal()} required />
                </Label>
                <Label>
                  場所 <RequiredMark />
                  <Input name="location" placeholder="作業室、休憩スペースなど" required />
                </Label>
                <Label>
                  活動 <RequiredMark />
                  <Input name="programName" placeholder="PC課題、面談、清掃など" required />
                </Label>
                <Label>
                  タイミング <RequiredMark />
                  <Select name="timing" required defaultValue="開始前">
                    {["開始前", "開始直後", "実施中", "終了前", "終了後", "休憩後", "予定変更後", "未確認"].map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </Select>
                </Label>
                <Label>
                  直前の出来事 <RequiredMark />
                  <Input name="antecedent" placeholder="指示、予定変更、移動、休憩終了など" required />
                </Label>
              </div>

              <Label>
                事実メモ <RequiredMark />
                <Textarea name="factMemo" rows={4} placeholder="見えた行動、時間、場面、直前直後の変化として書く" required />
              </Label>

              <Label>
                直後の結果 <RequiredMark />
                <Textarea name="consequence" rows={3} placeholder="自分の対応、周囲の変化、本人の次の行動など" required />
              </Label>
            </div>

            <CheckboxGroup name="behaviorTags" title="行動タグ" options={BEHAVIOR_TAGS} />

            <Label>
              未確認メモ
              <Textarea name="unknownMemo" rows={3} placeholder="まだ分からない点、次に確認する点" />
            </Label>

            <SubmitButton>観察を保存して、仮説を立てる</SubmitButton>
          </form>
        )}
      </Section>

      <Section title="最近の観察">
        {recentObservations.length === 0 ? (
          <EmptyState>まだ観察はありません。</EmptyState>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {recentObservations.map((observation) => (
              <LinkCard key={observation.id} href={`/orient?observationId=${observation.id}`}>
                <CardTop title={caseName(data, observation.caseId)} meta={formatShortDateTime(observation.observedAt)} />
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-ink/70">{observation.factMemo}</p>
                <TagRow tags={observation.behaviorTags} />
              </LinkCard>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}

function OrientView({ data, commit, onNavigate }: { data: AppData; commit: Commit; onNavigate: (href: string) => void }) {
  const searchParams = useSearchParams();
  const observations = [...data.observations].sort(byNewest);
  const selected = observations.find((item) => item.id === searchParams.get("observationId")) ?? observations[0] ?? null;

  function handleCreateHypotheses(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const observationId = requiredText(form, "observationId");
    const observation = data.observations.find((item) => item.id === observationId);
    if (!observation) return alert("観察を選んでください。");
    const now = nowIso();
    const created: HypothesisRecord[] = [];
    for (let index = 0; index < 3; index += 1) {
      const statement = text(form, `statement-${index}`);
      if (!statement) continue;
      const hypothesis: HypothesisRecord = {
        id: newId("hyp"),
        caseId: observation.caseId,
        observationId: observation.id,
        category: text(form, `category-${index}`) || HYPOTHESIS_CATEGORIES[0],
        statement,
        evidence: requiredText(form, `evidence-${index}`),
        counterEvidence: text(form, `counterEvidence-${index}`),
        unknowns: text(form, `unknowns-${index}`),
        nextObservationPoints: text(form, `nextObservationPoints-${index}`),
        confidence: Number(text(form, `confidence-${index}`) || 50),
        status: parseHypothesisStatus(text(form, `status-${index}`)),
        createdAt: now,
        updatedAt: now
      };
      if (!hypothesis.evidence) return alert("根拠となる観察を入力してください。");
      created.push(hypothesis);
    }
    if (created.length === 0) return alert("仮説を一つ以上入力してください。");
    commit((current) => ({
      ...current,
      settings: { ...current.settings, currentCaseId: observation.caseId },
      cases: touchCase(current.cases, observation.caseId),
      hypotheses: [...created, ...current.hypotheses]
    }));
    onNavigate(`/decide?hypothesisId=${created[0].id}`);
  }

  const hypotheses = [...data.hypotheses].sort(byUpdated);

  return (
    <>
      <PageHeader title="仮説を立てる" description="一つの説明に寄せすぎず、複数の可能性と反証を並べます。" image="orient.png" action={<StepPlate step="02" stage="Orient" tone="orient" />} />

      <Section title="観察から可能性を分ける">
        {observations.length === 0 ? (
          <EmptyState>
            観察がまだありません。<Link href="/observe" className="font-medium text-skyline">Observeを作成</Link>してください。
          </EmptyState>
        ) : (
          <form onSubmit={handleCreateHypotheses} className="grid gap-5">
            <div className="rounded-md border border-ink/10 bg-white p-4 shadow-sm">
              <Label>
                根拠にする観察
                <Select name="observationId" defaultValue={selected?.id} required>
                  {observations.map((observation) => (
                    <option key={observation.id} value={observation.id}>
                      {caseName(data, observation.caseId)} / {formatShortDateTime(observation.observedAt)} / {observation.programName}
                    </option>
                  ))}
                </Select>
              </Label>
            </div>

            {selected ? (
              <OrientDepthPreview
                observation={{
                  caseName: caseName(data, selected.caseId),
                  programName: selected.programName,
                  timing: selected.timing,
                  factMemo: selected.factMemo,
                  antecedent: selected.antecedent,
                  consequence: selected.consequence,
                  behaviorTags: selected.behaviorTags
                }}
              />
            ) : null}

            <Notice>仮説が一つだけだと、見立てが固定されやすくなります。少なくとも別案を一つ置けるか確認します。</Notice>
            <div className="orient-entry-layout">
              <HypothesisEditor index={0} role="primary" />
              <HypothesisEditor index={1} role="alternate" />
              <details className="optional-hypothesis-details">
                <summary>もう一つ置く</summary>
                <HypothesisEditor index={2} role="optional" />
              </details>
            </div>

            <SubmitButton>仮説を保存して、支援を決める</SubmitButton>
          </form>
        )}
      </Section>

      <Section title="既存の仮説">
        {hypotheses.length === 0 ? (
          <EmptyState>仮説はまだありません。</EmptyState>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {hypotheses.map((hypothesis) => (
              <LinkCard key={hypothesis.id} href={`/decide?hypothesisId=${hypothesis.id}`}>
                <CardTop title={caseName(data, hypothesis.caseId)} meta={hypothesis.status} />
                <p className="mt-2 text-sm font-medium text-skyline">{hypothesis.category}</p>
                <p className="mt-2 text-sm leading-6 text-ink/75">{hypothesis.statement}</p>
                <p className="mt-2 text-xs leading-5 text-ink/55">反証・未確認: {hypothesis.counterEvidence || hypothesis.unknowns || "未入力"}</p>
              </LinkCard>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}

function DecideView({ data, commit, onNavigate }: { data: AppData; commit: Commit; onNavigate: (href: string) => void }) {
  const searchParams = useSearchParams();
  const hypotheses = [...data.hypotheses].sort(byUpdated);
  const selected = hypotheses.find((item) => item.id === searchParams.get("hypothesisId")) ?? hypotheses[0] ?? null;

  function handleCreateExperiment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const hypothesisId = requiredText(form, "hypothesisId");
    const hypothesis = data.hypotheses.find((item) => item.id === hypothesisId);
    if (!hypothesis) return alert("仮説を選んでください。");
    const support = requiredText(form, "support");
    if (!support) return alert("試す支援を入力してください。");
    const now = nowIso();
    const experiment: SmallExperimentRecord = {
      id: newId("exp"),
      caseId: hypothesis.caseId,
      hypothesisId: hypothesis.id,
      support,
      supportCategory: text(form, "supportCategory") || SUPPORT_CATEGORIES[0],
      targetChange: requiredText(form, "targetChange"),
      metric: text(form, "metric") || METRIC_OPTIONS[0],
      plannedAt: toIsoFromLocal(text(form, "plannedAt")) || now,
      reviewDueAt: toIsoFromLocal(text(form, "reviewDueAt")) || now,
      cautions: text(form, "cautions"),
      nextTryCandidate: text(form, "nextTryCandidate"),
      status: parseExperimentStatus(text(form, "status")),
      createdAt: now,
      updatedAt: now
    };
    if (!experiment.targetChange) return alert("狙う変化を入力してください。");
    commit((current) => ({
      ...current,
      settings: { ...current.settings, currentCaseId: hypothesis.caseId },
      cases: touchCase(current.cases, hypothesis.caseId),
      hypotheses: current.hypotheses.map((item) => (item.id === hypothesis.id ? { ...item, status: "検証中", updatedAt: now } : item)),
      experiments: [experiment, ...current.experiments]
    }));
    onNavigate(`/act?experimentId=${experiment.id}`);
  }

  const experiments = [...data.experiments].sort(byUpdated);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return (
    <>
      <PageHeader title="支援を決める" description="今回は一つだけ試します。反応が見える小ささに絞ります。" image="decide.png" action={<StepPlate step="03" stage="Decide" tone="decide" />} />

      <Section title="小さな支援を登録">
        {hypotheses.length === 0 ? (
          <EmptyState>
            仮説がまだありません。<Link href="/orient" className="font-medium text-skyline">Orientで仮説を作成</Link>してください。
          </EmptyState>
        ) : (
          <form onSubmit={handleCreateExperiment} className="grid gap-5 rounded-md border border-ink/10 bg-white p-4 shadow-sm">
            <Label>
              対象仮説
              <Select name="hypothesisId" defaultValue={selected?.id} required>
                {hypotheses.map((hypothesis) => (
                  <option key={hypothesis.id} value={hypothesis.id}>
                    {caseName(data, hypothesis.caseId)} / {hypothesis.category} / {hypothesis.statement}
                  </option>
                ))}
              </Select>
            </Label>

            {selected ? (
              <div className="rounded-md border border-moss/25 bg-moss/10 p-4 text-sm leading-6 text-ink/75">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-ink">{caseName(data, selected.caseId)}</strong>
                  <Tag>{selected.category}</Tag>
                  <Tag>{selected.status}</Tag>
                </div>
                <p className="mt-2">{selected.statement}</p>
                <p className="mt-2 text-ink/55">根拠: {selected.evidence}</p>
              </div>
            ) : null}

            <Label>
              試す支援 <RequiredMark />
              <Textarea name="support" rows={5} placeholder="次に一つだけ試す支援" required />
            </Label>
            <details className="secondary-field-details">
              <summary>今は試さない候補を残す</summary>
              <div className="mt-3">
                <Label>
                  次回候補
                  <Textarea name="nextTryCandidate" rows={4} placeholder="今回は実施せず、次に試す候補として残す" />
                </Label>
              </div>
            </details>
            <Notice>ここでは支援を一つに絞ります。複数を同時に変えると、反応を見立てに戻しにくくなります。</Notice>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Label>
                支援カテゴリー
                <Select name="supportCategory" required defaultValue={SUPPORT_CATEGORIES[0]}>
                  {SUPPORT_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label>
                測定指標
                <Select name="metric" required defaultValue={METRIC_OPTIONS[0]}>
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
                狙う変化 <RequiredMark />
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

            <SubmitButton>支援を保存して、反応を見る</SubmitButton>
          </form>
        )}
      </Section>

      <Section title="登録済みの支援">
        {experiments.length === 0 ? (
          <EmptyState>小さな支援はまだ登録されていません。</EmptyState>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {experiments.map((experiment) => (
              <LinkCard key={experiment.id} href={`/act?experimentId=${experiment.id}`}>
                <CardTop title={caseName(data, experiment.caseId)} meta={experiment.status} />
                <p className="mt-2 text-sm leading-6 text-ink/75">{experiment.support}</p>
                <TagRow tags={[experiment.metric, `期限 ${formatShortDate(experiment.reviewDueAt)}`]} />
              </LinkCard>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}

function ActView({ data, commit, onNavigate }: { data: AppData; commit: Commit; onNavigate: (href: string) => void }) {
  const searchParams = useSearchParams();
  const experiments = [...data.experiments].sort((a, b) => a.reviewDueAt.localeCompare(b.reviewDueAt));
  const selected = experiments.find((item) => item.id === searchParams.get("experimentId")) ?? experiments[0] ?? null;
  const selectedHypothesis = selected ? data.hypotheses.find((item) => item.id === selected.hypothesisId) ?? null : null;

  function handleCreateActReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const experimentId = requiredText(form, "experimentId");
    const experiment = data.experiments.find((item) => item.id === experimentId);
    if (!experiment) return alert("支援を選んでください。");
    const immediateResponse = requiredText(form, "immediateResponse");
    if (!immediateResponse) return alert("直後反応を入力してください。");
    const now = nowIso();
    const review: ActReviewRecord = {
      id: newId("act"),
      caseId: experiment.caseId,
      experimentId: experiment.id,
      hypothesisId: experiment.hypothesisId,
      implementation: requiredText(form, "implementation"),
      implementationStatus: parseImplementationStatus(text(form, "implementationStatus")),
      immediateResponse,
      laterResponse: text(form, "laterResponse"),
      measuredValue: text(form, "measuredValue"),
      comparison: text(form, "comparison"),
      hypothesisUpdate: parseHypothesisStatus(text(form, "hypothesisUpdate")),
      nextObservationPoint: text(form, "nextObservationPoint"),
      nextTryCandidate: text(form, "nextTryCandidate"),
      createdAt: now,
      updatedAt: now
    };
    if (!review.implementation) return alert("実施内容を入力してください。");
    commit((current) => ({
      ...current,
      settings: { ...current.settings, currentCaseId: experiment.caseId },
      cases: touchCase(current.cases, experiment.caseId),
      hypotheses: current.hypotheses.map((item) => (item.id === experiment.hypothesisId ? { ...item, status: review.hypothesisUpdate, updatedAt: now } : item)),
      experiments: current.experiments.map((item) =>
        item.id === experiment.id ? { ...item, status: review.implementationStatus === "未実施" ? "中止" : "完了", updatedAt: now } : item
      ),
      actReviews: [review, ...current.actReviews]
    }));
    onNavigate(`/reflect?caseId=${experiment.caseId}`);
  }

  return (
    <>
      <PageHeader title="反応を見る" description="支援の良し悪しではなく、反応から見立てを更新します。" image="act.png" action={<StepPlate step="04" stage="Act" tone="act" />} />

      <Section title="反応を記録">
        {experiments.length === 0 ? (
          <EmptyState>
            支援がまだありません。<Link href="/decide" className="font-medium text-skyline">Decideで支援を作成</Link>してください。
          </EmptyState>
        ) : (
          <form onSubmit={handleCreateActReview} className="grid gap-5 rounded-md border border-ink/10 bg-white p-4 shadow-sm">
            <Label>
              対象支援
              <Select name="experimentId" defaultValue={selected?.id} required>
                {experiments.map((experiment) => (
                  <option key={experiment.id} value={experiment.id}>
                    {caseName(data, experiment.caseId)} / {experiment.support}
                  </option>
                ))}
              </Select>
            </Label>

            {selected ? (
              <div className="rounded-md border border-lemon/45 bg-lemon/15 p-4 text-sm leading-6 text-ink/75">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-ink">{caseName(data, selected.caseId)}</strong>
                  <Tag>{selected.metric}</Tag>
                  <Tag>{selected.status}</Tag>
                </div>
                <p className="mt-2">{selected.support}</p>
                <p className="mt-2 text-ink/55">仮説: {selectedHypothesis?.statement ?? "未確認"}</p>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <Label>
                実施内容
                <Textarea name="implementation" rows={4} placeholder="実際に行った支援。予定から変えた点も書く" required />
              </Label>
              <Label>
                直後反応
                <Textarea name="immediateResponse" rows={4} placeholder="支援後すぐの行動、時間、表情、次の行動" required />
              </Label>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Label>
                実施状況
                <Select name="implementationStatus" defaultValue="予定通り">
                  {IMPLEMENTATION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label>
                測定値
                <Input name="measuredValue" placeholder="例: 40秒、声かけ1回" />
              </Label>
              <Label>
                以前との比較
                <Input name="comparison" placeholder="短くなった、変わらない等" />
              </Label>
              <Label>
                仮説の更新
                <Select name="hypothesisUpdate" defaultValue="保留">
                  {HYPOTHESIS_STATUSES.filter((status) => status !== "未検証" && status !== "検証中").map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Select>
              </Label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Label>
                後から見えた反応
                <Textarea name="laterResponse" rows={3} placeholder="時間を置いて見えた変化" />
              </Label>
              <Label>
                次に見る点
                <Textarea name="nextObservationPoint" rows={3} placeholder="次回のObserveで見る点" />
              </Label>
              <Label>
                次に試す候補
                <Textarea name="nextTryCandidate" rows={3} placeholder="続ける、弱める、別案など" />
              </Label>
            </div>

            <SubmitButton>反応を保存して、振り返る</SubmitButton>
          </form>
        )}
      </Section>
    </>
  );
}

function ReflectView({
  data,
  selectedCaseId,
  commit,
  onNavigate
}: {
  data: AppData;
  selectedCaseId: string;
  commit: Commit;
  onNavigate: (href: string) => void;
}) {
  const caseId = selectedCaseId || data.cases[0]?.id || "";
  const selectedCase = data.cases.find((item) => item.id === caseId) ?? null;
  const rows = buildReflectionRows(data, caseId);
  const memos = data.reflectionMemos.filter((memo) => memo.caseId === caseId).sort(byNewest);

  function handleCreateMemo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = requiredText(form, "body");
    if (!caseId) return alert("ケースを選んでください。");
    if (!body) return alert("メモを入力してください。");
    const now = nowIso();
    const memo: ReflectionMemo = {
      id: newId("memo"),
      caseId,
      targetRef: text(form, "targetRef"),
      columnKey: text(form, "columnKey") || "next",
      body,
      createdAt: now,
      updatedAt: now
    };
    commit((current) => ({
      ...current,
      settings: { ...current.settings, currentCaseId: caseId },
      cases: touchCase(current.cases, caseId),
      reflectionMemos: [memo, ...current.reflectionMemos]
    }));
    event.currentTarget.reset();
  }

  return (
    <>
      <PageHeader title="OODA振り返り" description="一人で、事実、仮説、支援、反応、次に見る点を並べて確認します。" image="reflect.png" action={<LinkButton href="/observe">次の観察</LinkButton>} />

      {data.cases.length === 0 ? (
        <EmptyState>
          ケースがまだありません。<Link href="/cases" className="font-medium text-skyline">ケースを作成</Link>してください。
        </EmptyState>
      ) : (
        <>
          <Section title="ケース選択">
            <div className="rounded-md border border-ink/10 bg-white p-4 shadow-sm">
              <Label>
                ケース
                <Select value={caseId} onChange={(event) => onNavigate(`/reflect?caseId=${event.target.value}`)}>
                  {data.cases.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.displayName}
                    </option>
                  ))}
                </Select>
              </Label>
            </div>
          </Section>

          <Section title="OODAの一巡" description={selectedCase?.memo || undefined}>
            {rows.length === 0 ? (
              <EmptyState>このケースのOODA記録はまだありません。</EmptyState>
            ) : (
              <div className="overflow-x-auto rounded-md border border-ink/10 bg-white shadow-sm">
                <table className="min-w-[1040px] text-left text-sm">
                  <thead className="bg-field/80 text-xs text-ink/60">
                    <tr>
                      <th className="px-3 py-3">事実</th>
                      <th className="px-3 py-3">仮説</th>
                      <th className="px-3 py-3">根拠</th>
                      <th className="px-3 py-3">反証・未確認</th>
                      <th className="px-3 py-3">試した支援</th>
                      <th className="px-3 py-3">反応</th>
                      <th className="px-3 py-3">次に見る点</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/10">
                    {rows.map((row) => (
                      <tr key={row.id} className="align-top">
                        <td className="w-56 px-3 py-3">{row.fact}</td>
                        <td className="w-56 px-3 py-3">{row.hypothesis}</td>
                        <td className="w-48 px-3 py-3">{row.evidence}</td>
                        <td className="w-48 px-3 py-3">{row.counter}</td>
                        <td className="w-56 px-3 py-3">{row.support}</td>
                        <td className="w-56 px-3 py-3">{row.response}</td>
                        <td className="w-48 px-3 py-3">{row.next}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section title="振り返りメモ">
            <form onSubmit={handleCreateMemo} className="grid gap-4 rounded-md border border-ink/10 bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr]">
              <Label>
                対象
                <Select name="targetRef">
                  <option value="">ケース全体</option>
                  {rows.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.label}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label>
                見る列
                <Select name="columnKey" defaultValue="next">
                  <option value="fact">事実</option>
                  <option value="hypothesis">仮説</option>
                  <option value="support">支援</option>
                  <option value="response">反応</option>
                  <option value="next">次に見る点</option>
                </Select>
              </Label>
              <div className="md:col-span-2">
                <Label>
                  メモ
                  <Textarea name="body" rows={4} placeholder="次に見る点、見立ての揺れ、支援を弱める条件など" required />
                </Label>
              </div>
              <div className="md:col-span-2">
                <SubmitButton>メモを保存</SubmitButton>
              </div>
            </form>

            <div className="mt-4 grid gap-3">
              {memos.length === 0 ? (
                <EmptyState>振り返りメモはまだありません。</EmptyState>
              ) : (
                memos.map((memo) => (
                  <article key={memo.id} className="rounded-md border border-ink/10 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-ink/55">
                      <Tag>{memo.columnKey}</Tag>
                      <span>{formatShortDateTime(memo.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-ink/75">{memo.body}</p>
                  </article>
                ))
              )}
            </div>
          </Section>
        </>
      )}
    </>
  );
}

function SearchView({ data }: { data: AppData }) {
  const searchParams = useSearchParams();
  const initial = searchParams.get("q") || "";
  const [query, setQuery] = useState(initial);
  const normalized = query.trim().toLowerCase();
  const observations = [...data.observations]
    .filter((item) => !normalized || [caseName(data, item.caseId), item.factMemo, item.antecedent, item.consequence, item.behaviorTags.join(" ")].join(" ").toLowerCase().includes(normalized))
    .sort(byNewest);

  return (
    <>
      <PageHeader title="類似場面" description="過去の観察を探し、同じ原因だと決めつけずに材料として使います。" image="search.png" action={<LinkButton href="/observe">観察を書く</LinkButton>} />

      <Section title="検索">
        <div className="rounded-md border border-ink/10 bg-white p-4 shadow-sm">
          <Label>
            キーワード
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="場所、活動、行動タグ、事実メモ" />
          </Label>
        </div>
      </Section>

      <Section title="見つかった場面">
        {observations.length === 0 ? (
          <EmptyState>一致する観察はありません。</EmptyState>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {observations.map((observation) => {
              const relatedHypotheses = data.hypotheses.filter((item) => item.observationId === observation.id);
              return (
                <LinkCard key={observation.id} href={`/reflect?caseId=${observation.caseId}`}>
                  <CardTop title={caseName(data, observation.caseId)} meta={formatShortDateTime(observation.observedAt)} />
                  <p className="mt-2 text-sm leading-6 text-ink/75">{observation.factMemo}</p>
                  <TagRow tags={[observation.programName, observation.timing, ...observation.behaviorTags]} />
                  {relatedHypotheses.length > 0 ? <p className="mt-2 text-xs leading-5 text-ink/55">仮説: {relatedHypotheses[0].statement}</p> : null}
                </LinkCard>
              );
            })}
          </div>
        )}
      </Section>
    </>
  );
}

function ExportView({ data }: { data: AppData }) {
  const observations = [...data.observations].sort(byNewest);
  const [selectedId, setSelectedId] = useState(observations[0]?.id ?? "");
  const selected = observations.find((item) => item.id === selectedId) ?? observations[0] ?? null;
  const summary = selected ? buildSummary(data, selected) : "";

  useEffect(() => {
    if (!selectedId && observations[0]?.id) {
      setSelectedId(observations[0].id);
    }
  }, [observations, selectedId]);

  return (
    <>
      <PageHeader title="要約" description="転記用の短い文章を作ります。公式記録や診断の代替ではありません。" image="export.png" action={<LinkButton href="/reflect">振り返り</LinkButton>} />

      <Section title="要約する観察">
        {observations.length === 0 ? (
          <EmptyState>
            観察がまだありません。<Link href="/observe" className="font-medium text-skyline">Observeを作成</Link>してください。
          </EmptyState>
        ) : (
          <div className="grid gap-4 rounded-md border border-ink/10 bg-white p-4 shadow-sm">
            <Label>
              観察
              <Select value={selected?.id ?? ""} onChange={(event) => setSelectedId(event.target.value)}>
                {observations.map((observation) => (
                  <option key={observation.id} value={observation.id}>
                    {caseName(data, observation.caseId)} / {formatShortDateTime(observation.observedAt)} / {observation.programName}
                  </option>
                ))}
              </Select>
            </Label>
            <Label>
              要約
              <Textarea value={summary} readOnly rows={8} />
            </Label>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="case-primary-action" onClick={() => downloadText(summary, `recordooda-summary-${dateStamp()}.txt`)}>
                TXTを書き出す
              </button>
              <button type="button" className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm font-medium text-ink transition hover:border-skyline hover:text-skyline" onClick={() => void navigator.clipboard?.writeText(summary)}>
                クリップボードにコピー
              </button>
            </div>
          </div>
        )}
      </Section>
    </>
  );
}

function FilesView({ data, commit, onImport }: { data: AppData; commit: Commit; onImport: (data: AppData) => void }) {
  function handleStorageNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    commit((current) => ({
      ...current,
      settings: {
        ...current.settings,
        storageNote: text(form, "storageNote")
      }
    }));
  }

  async function handleImport(file: File | null) {
    if (!file) return;
    const content = await file.text();
    const parsed = normalizeData(JSON.parse(content));
    onImport(parsed);
  }

  function clearLocalData() {
    if (!window.confirm("このブラウザ内のrecordOODAデータを削除します。JSONバックアップがないと戻せません。")) return;
    localStorage.removeItem(STORAGE_KEY);
    onImport(emptyData);
  }

  return (
    <>
      <PageHeader title="保存先" description="GitHub Pages版では、記録はこのブラウザ内に保存されます。必要な時にJSONで書き出します。" image="export.png" action={<LinkButton href="/cases">ケース</LinkButton>} />

      <section className="storage-flow-hero" aria-label="local-first保存">
        <div className="storage-flow-copy">
          <span className="storage-flow-kicker">LOCAL FIRST</span>
          <h2>サーバを持たず、手元のブラウザでOODAを回す</h2>
          <p>スマホやPCのブラウザに保存し、TeamsやSharePointにはJSONバックアップとして置きます。</p>
        </div>
        <div className="storage-rail" aria-hidden="true">
          <div className="storage-rail-node is-active">
            <span>1</span>
            <strong>ブラウザ保存</strong>
            <small>入力直後にlocalStorageへ保存</small>
          </div>
          <div className="storage-rail-node">
            <span>2</span>
            <strong>JSON書き出し</strong>
            <small>必要なタイミングでバックアップ</small>
          </div>
          <div className="storage-rail-node">
            <span>3</span>
            <strong>Teamsへ配置</strong>
            <small>共有フォルダへ手動で保管</small>
          </div>
        </div>
      </section>

      <Section title="データ操作">
        <div className="storage-console-panel">
          <div className="storage-console-main">
            <div className="grid gap-4">
              <div className="grid gap-3 rounded-md border border-ink/10 bg-white p-4">
                <div className="flex flex-wrap gap-2">
                  <Tag>ケース {data.cases.length}</Tag>
                  <Tag>観察 {data.observations.length}</Tag>
                  <Tag>仮説 {data.hypotheses.length}</Tag>
                  <Tag>支援 {data.experiments.length}</Tag>
                  <Tag>反応 {data.actReviews.length}</Tag>
                </div>
                <p className="text-sm leading-6 text-ink/65">最終保存: {data.savedAt ? formatShortDateTime(data.savedAt) : "未保存"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="case-primary-action" onClick={() => downloadJson(data)}>
                  JSONを書き出す
                </button>
                <label className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm font-medium text-ink transition hover:border-skyline hover:text-skyline">
                  JSONを読み込む
                  <input type="file" accept="application/json,.json" className="sr-only" onChange={(event) => void handleImport(event.target.files?.[0] ?? null)} />
                </label>
                <button type="button" className="storage-clear-button" onClick={clearLocalData}>
                  ブラウザ内データを削除
                </button>
              </div>
            </div>

            <form onSubmit={handleStorageNote} className="grid gap-3 rounded-md border border-ink/10 bg-white p-4">
              <Label>
                保存先メモ
                <Textarea name="storageNote" rows={5} defaultValue={data.settings.storageNote} placeholder="例: Teams > 支援記録 > recordOODAバックアップ" />
              </Label>
              <SubmitButton>保存先メモを保存</SubmitButton>
            </form>
          </div>
        </div>
      </Section>
    </>
  );
}

function PageHeader({ title, description, image, action }: { title: string; description: string; image?: string; action?: ReactNode }) {
  return (
    <div className="record-page-header mb-6 flex flex-col gap-4 border-b border-ink/10 pb-5 md:flex-row md:items-center md:justify-between">
      <div className="record-page-copy">
        <h1 className="record-page-title text-3xl font-bold tracking-normal text-ink">{title}</h1>
        <p className="record-page-description mt-2 max-w-3xl text-sm leading-6 text-ink/70">{description}</p>
      </div>
      {(image || action) ? (
        <div className="record-page-aside flex flex-col items-start gap-3 md:items-end">
          {image ? (
            <Image
              src={`/illustrations/${image}`}
              alt=""
              width={144}
              height={96}
              priority
              className="record-page-illustration h-24 w-36 rounded-md border border-ink/10 bg-white object-cover shadow-sm"
            />
          ) : null}
          {action}
        </div>
      ) : null}
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="record-section mb-8">
      <div className="record-section-heading mb-3">
        <h2 className="record-section-title text-lg font-semibold text-ink">{title}</h2>
        {description ? <p className="record-section-description mt-1 text-sm leading-6 text-ink/65">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function DashboardBlock({ title, href, actionLabel, children }: { title: string; href: string; actionLabel: string; children: ReactNode }) {
  return (
    <Section title={title}>
      <div className="mb-3 flex justify-end">
        <Link href={href} className="text-sm font-medium text-skyline hover:underline">
          {actionLabel}
        </Link>
      </div>
      <div className="grid min-h-80 gap-3">{children}</div>
    </Section>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <label className="record-label block text-sm font-medium text-ink/80">{children}</label>;
}

function RequiredMark() {
  return <span className="record-required-mark">必須</span>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`record-field focus-ring mt-1 w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm shadow-sm ${props.className ?? ""}`} />;
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`record-field focus-ring mt-1 w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm shadow-sm ${props.className ?? ""}`} />;
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`record-field focus-ring mt-1 w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm leading-6 shadow-sm ${props.className ?? ""}`} />;
}

function SubmitButton({ children }: { children: ReactNode }) {
  return (
    <button type="submit" className="record-submit-button focus-ring rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-skyline">
      {children}
    </button>
  );
}

function LinkButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="record-link-button focus-ring rounded-md border border-ink/15 bg-white px-3 py-2 text-sm font-medium text-ink transition hover:border-skyline hover:text-skyline">
      {children}
    </Link>
  );
}

function ActionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm font-medium text-ink transition hover:border-skyline hover:text-skyline">
      {children}
    </Link>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <div className="record-empty-state rounded-md border border-dashed border-ink/20 px-4 py-8 text-center text-sm text-ink/60">{children}</div>;
}

function Notice({ children }: { children: ReactNode }) {
  return <div className="record-notice rounded-md border border-skyline/30 bg-skyline/10 px-4 py-3 text-sm leading-6 text-skyline">{children}</div>;
}

function Tag({ children }: { children: ReactNode }) {
  return <span className="record-tag inline-flex rounded-md bg-field px-2 py-1 text-xs font-medium text-ink/70">{children}</span>;
}

function TagRow({ tags }: { tags: string[] }) {
  const filtered = tags.filter(Boolean);
  if (filtered.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {filtered.map((tag) => (
        <Tag key={tag}>{tag}</Tag>
      ))}
    </div>
  );
}

function LinkCard({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="record-link-card rounded-md border border-ink/10 bg-white p-4 shadow-sm transition hover:border-skyline hover:bg-field/60">
      {children}
    </Link>
  );
}

function CardTop({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <strong>{title}</strong>
      <span className="text-xs text-ink/55">{meta}</span>
    </div>
  );
}

function StepPlate({ step, stage, tone }: { step: string; stage: string; tone: string }) {
  return (
    <div className={`ooda-current-step-plate ooda-current-step-plate-${tone}`} aria-hidden="true">
      <span className="ooda-current-step-number">{step}</span>
      <span className="ooda-current-step-stage">{stage}</span>
      <span className="ooda-current-step-caption">OODA LOOP</span>
    </div>
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

function HypothesisEditor({ index, role }: { index: number; role: "primary" | "alternate" | "optional" }) {
  const title = role === "primary" ? "仮説 1" : role === "alternate" ? "別案" : "もう一つの可能性";
  const badge = role === "primary" ? "主入力" : role === "alternate" ? "任意" : "追加";
  const isRequired = index === 0;

  return (
    <fieldset className={`rounded-md border border-ink/10 bg-white p-4 shadow-sm hypothesis-input-card hypothesis-input-card-${index + 1} hypothesis-input-card-${role}`}>
      <legend className="px-1 text-sm font-semibold text-ink">
        {title} <span className="hypothesis-role-badge">{badge}</span>
      </legend>
      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-md bg-skyline/10 px-2 py-1 text-skyline">可能性</span>
        <span className="rounded-md bg-moss/10 px-2 py-1 text-moss">根拠</span>
        <span className="rounded-md bg-clay/10 px-2 py-1 text-clay">反証</span>
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
          仮説文 {isRequired ? <RequiredMark /> : null}
          <Textarea name={`statement-${index}`} rows={3} placeholder="何が影響している可能性があるか" required={isRequired} />
        </Label>
        <Label>
          根拠となる観察 {isRequired ? <RequiredMark /> : null}
          <Textarea name={`evidence-${index}`} rows={3} placeholder="どの事実からそう考えたか" required={isRequired} />
        </Label>
        <Label>
          反証または別解釈
          <Textarea name={`counterEvidence-${index}`} rows={2} placeholder="合わない事実、別の可能性" />
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

type Commit = (updater: (current: AppData) => AppData) => void;

function loadData() {
  if (typeof window === "undefined") return emptyData;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeData(JSON.parse(raw)) : emptyData;
  } catch {
    return emptyData;
  }
}

function saveData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function normalizeData(value: unknown): AppData {
  if (!isRecord(value)) return emptyData;
  const parsed = value as Partial<AppData>;
  return {
    version: 1,
    savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : "",
    settings: {
      currentCaseId: isRecord(parsed.settings) && typeof parsed.settings.currentCaseId === "string" ? parsed.settings.currentCaseId : "",
      storageNote: isRecord(parsed.settings) && typeof parsed.settings.storageNote === "string" ? parsed.settings.storageNote : ""
    },
    cases: Array.isArray(parsed.cases) ? (parsed.cases as OodaCase[]) : [],
    observations: Array.isArray(parsed.observations) ? (parsed.observations as ObservationRecord[]) : [],
    hypotheses: Array.isArray(parsed.hypotheses) ? (parsed.hypotheses as HypothesisRecord[]) : [],
    experiments: Array.isArray(parsed.experiments) ? (parsed.experiments as SmallExperimentRecord[]) : [],
    actReviews: Array.isArray(parsed.actReviews) ? (parsed.actReviews as ActReviewRecord[]) : [],
    reflectionMemos: Array.isArray(parsed.reflectionMemos) ? (parsed.reflectionMemos as ReflectionMemo[]) : []
  };
}

function stampData(data: AppData): AppData {
  return {
    ...data,
    version: 1,
    savedAt: nowIso()
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function buildCaseDockItems(data: AppData): CaseDockItem[] {
  return data.cases
    .map((item) => {
      const observations = data.observations.filter((record) => record.caseId === item.id).sort(byNewest);
      const hypotheses = data.hypotheses.filter((record) => record.caseId === item.id).sort(byUpdated);
      const experiments = data.experiments.filter((record) => record.caseId === item.id).sort(byUpdated);
      const actReviews = data.actReviews.filter((record) => record.caseId === item.id).sort(byNewest);
      return {
        ...item,
        counts: {
          observations: observations.length,
          hypotheses: hypotheses.length,
          experiments: experiments.length,
          actReviews: actReviews.length
        },
        latestObservationId: observations[0]?.id ?? null,
        latestHypothesisId: hypotheses[0]?.id ?? null,
        latestExperimentId: experiments[0]?.id ?? null
      };
    })
    .sort(byUpdated);
}

function getCaseNextAction(item: CaseDockItem) {
  if (item.counts.observations === 0) {
    return { label: "観察を書く", href: `/observe?caseId=${item.id}`, reason: "まず事実を一件残します。" };
  }
  if (item.counts.hypotheses === 0) {
    return { label: "仮説を立てる", href: item.latestObservationId ? `/orient?observationId=${item.latestObservationId}` : "/orient", reason: "観察があります。次は見立てを分けます。" };
  }
  if (item.counts.experiments === 0) {
    return { label: "支援を決める", href: item.latestHypothesisId ? `/decide?hypothesisId=${item.latestHypothesisId}` : "/decide", reason: "仮説があります。試す支援を一つ選びます。" };
  }
  if (item.counts.actReviews === 0) {
    return { label: "反応を見る", href: item.latestExperimentId ? `/act?experimentId=${item.latestExperimentId}` : "/act", reason: "支援があります。反応から見立てを更新します。" };
  }
  return { label: "振り返る", href: `/reflect?caseId=${item.id}`, reason: "OODAが一巡しています。次に見る点を整理します。" };
}

function buildReflectionRows(data: AppData, caseId: string) {
  return data.observations
    .filter((observation) => observation.caseId === caseId)
    .sort(byNewest)
    .flatMap((observation) => {
      const hypotheses = data.hypotheses.filter((hypothesis) => hypothesis.observationId === observation.id);
      if (hypotheses.length === 0) {
        return [
          {
            id: observation.id,
            label: `${formatShortDate(observation.observedAt)} 観察`,
            fact: observation.factMemo,
            hypothesis: "未入力",
            evidence: observation.antecedent,
            counter: observation.unknownMemo || "未入力",
            support: "未入力",
            response: observation.consequence,
            next: observation.unknownMemo || "次の観察で確認"
          }
        ];
      }
      return hypotheses.map((hypothesis) => {
        const experiment = data.experiments.find((item) => item.hypothesisId === hypothesis.id);
        const review = experiment ? data.actReviews.find((item) => item.experimentId === experiment.id) : undefined;
        return {
          id: `${observation.id}-${hypothesis.id}`,
          label: `${formatShortDate(observation.observedAt)} ${hypothesis.category}`,
          fact: observation.factMemo,
          hypothesis: hypothesis.statement,
          evidence: hypothesis.evidence,
          counter: hypothesis.counterEvidence || hypothesis.unknowns || "未入力",
          support: experiment?.support ?? "未入力",
          response: review?.immediateResponse ?? observation.consequence,
          next: review?.nextObservationPoint || hypothesis.nextObservationPoints || observation.unknownMemo || "次の観察で確認"
        };
      });
    });
}

function buildSummary(data: AppData, observation: ObservationRecord) {
  const hypothesis = data.hypotheses.find((item) => item.observationId === observation.id);
  const experiment = hypothesis ? data.experiments.find((item) => item.hypothesisId === hypothesis.id) : undefined;
  const review = experiment ? data.actReviews.find((item) => item.experimentId === experiment.id) : undefined;
  const scene = `${observation.location}の${observation.programName}`;
  const hypothesisText = hypothesis?.statement ?? "仮説は未入力";
  const support = experiment?.support ?? "支援は未入力";
  const response = review?.immediateResponse ?? observation.consequence;
  return `本日は${scene}で、「${observation.factMemo}」が見られた。直前には「${observation.antecedent}」があり、直後には「${observation.consequence}」があった。「${hypothesisText}」の可能性を置き、次に「${support}」を試す。反応として「${response}」を確認し、次回は「${review?.nextObservationPoint || hypothesis?.nextObservationPoints || observation.unknownMemo || "未確認点"}」を見る。`;
}

function countForStage(data: AppData, stage: string) {
  if (stage === "Observe") return `${data.observations.length}件`;
  if (stage === "Orient") return `${data.hypotheses.length}件`;
  if (stage === "Decide") return `${data.experiments.length}件`;
  return `${data.actReviews.length}件`;
}

function caseName(data: AppData, caseId: string) {
  return data.cases.find((item) => item.id === caseId)?.displayName ?? "未設定ケース";
}

function touchCase(cases: OodaCase[], caseId: string) {
  const now = nowIso();
  return cases.map((item) => (item.id === caseId ? { ...item, updatedAt: now } : item));
}

function byNewest(a: { createdAt?: string; observedAt?: string }, b: { createdAt?: string; observedAt?: string }) {
  return (b.observedAt ?? b.createdAt ?? "").localeCompare(a.observedAt ?? a.createdAt ?? "");
}

function byUpdated(a: { updatedAt: string }, b: { updatedAt: string }) {
  return b.updatedAt.localeCompare(a.updatedAt);
}

function text(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function requiredText(form: FormData, key: string) {
  return text(form, key);
}

function allText(form: FormData, key: string) {
  return form
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseHypothesisStatus(value: string): HypothesisStatus {
  return HYPOTHESIS_STATUSES.includes(value as HypothesisStatus) ? (value as HypothesisStatus) : "未検証";
}

function parseExperimentStatus(value: string): ExperimentStatus {
  return EXPERIMENT_STATUSES.includes(value as ExperimentStatus) ? (value as ExperimentStatus) : "予定";
}

function parseImplementationStatus(value: string): ImplementationStatus {
  return IMPLEMENTATION_STATUSES.includes(value as ImplementationStatus) ? (value as ImplementationStatus) : "予定通り";
}

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `${prefix}_${random}`;
}

function toDateTimeLocal(value = new Date()) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIsoFromLocal(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function formatShortDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10).replaceAll("-", "");
}

function downloadJson(data: AppData) {
  downloadText(JSON.stringify(stampData(data), null, 2), `recordooda-backup-${dateStamp()}.json`, "application/json");
}

function downloadText(content: string, filename: string, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
