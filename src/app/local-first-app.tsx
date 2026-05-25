"use client";

/* eslint-disable @next/next/no-img-element -- Public PNGs need explicit GitHub Pages paths on mobile Safari. */
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { OodaOrbitMenu } from "@/components/OodaOrbitMenu";

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
  userBehavior: string;
  consequence: string;
  unknownMemo: string;
  observationChecklist: string[];
  personWords: string;
  consentScope: string;
  shareScope: string;
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
  valueDirection: string;
  avoidancePattern: string;
  fusedStory: string;
  smallStep: string;
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
  decisionChecks: string[];
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

type ReflectionRow = {
  id: string;
  observationId: string;
  hypothesisId: string | null;
  label: string;
  fact: string;
  hypothesis: string;
  evidence: string;
  counter: string;
  support: string;
  response: string;
  next: string;
  loopStatus: "complete" | "incomplete";
  orientationUpdate: string;
  supportAdjustment: string;
  sourceFact: string;
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
const PUBLIC_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function publicAssetPath(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${PUBLIC_BASE_PATH}${normalizedPath}`;
}
const BEHAVIOR_TAGS = ["開始できない", "手が止まる", "席を離れる", "返事のみ", "質問しない", "確認を繰り返す", "表情が硬い", "自分から話す"];
const OBSERVATION_CHECK_ITEMS = ["行動", "表情・身体", "環境変化", "本人の言葉", "直前の支援者行動", "安全リスク"];
const HYPOTHESIS_CATEGORIES = ["予定変更への弱さ", "理解・段取り負荷", "感覚・環境負荷", "対人・評価負荷", "疲労・体調", "援助要求の難しさ", "好み・価値とのずれ"];
const HYPOTHESIS_STATUSES: HypothesisStatus[] = ["未検証", "検証中", "強まった", "弱まった", "保留"];
const EXPERIMENT_STATUSES: ExperimentStatus[] = ["予定", "実施中", "完了", "中止"];
const IMPLEMENTATION_STATUSES: ImplementationStatus[] = ["予定通り", "一部変更", "未実施"];
const METRIC_OPTIONS = ["開始までの時間", "再開までの時間", "停止回数", "声かけ回数", "継続時間", "質問回数", "離席回数", "本人の楽さ", "その他"];
const SUPPORT_CATEGORIES = ["見通し支援", "環境調整", "課題調整", "声かけ調整", "休憩・回復", "援助要求支援", "選択肢提示", "その他"];
const DECISION_CHECK_ITEMS = ["本人の価値に沿う", "後戻りできる", "当日中に試せる", "失敗しても再挑戦できる"];

const stageLinks = [
  { href: "/observe", stage: "Observe", stageLabel: "観察", label: "観察を入力", helper: "事実を残す", tone: "observe" },
  { href: "/orient", stage: "Orient", stageLabel: "見立て", label: "見立てを入力", helper: "見方を整理", tone: "orient" },
  { href: "/decide", stage: "Decide", stageLabel: "支援", label: "支援を選ぶ", helper: "1つ選ぶ", tone: "decide" },
  { href: "/act", stage: "Act", stageLabel: "反応", label: "反応を入力", helper: "反応で更新", tone: "act" }
] as const;

const topNavItems = [
  { href: "/", label: "今日の入力" },
  { href: "/cases", label: "ケース" },
  { href: "/reflect", label: "OODAを更新" },
  { href: "/search", label: "似た場面" },
  { href: "/export", label: "要約を作る" },
  { href: "/files", label: "バックアップ" }
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
  const isHomePage = view === "home";
  const shouldShowWorkflowMenu = view === "cases" && caseItems.length > 0;
  const shouldCompactNav = isTaskPage || (isHomePage && caseItems.length === 0);
  const shouldCompactNavOnMobile = isHomePage && caseItems.length > 0;

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
            <Link href="/" className="brand-link">
              <span className="brand-title-line">
                <span className="brand-mark text-xl font-bold tracking-normal text-ink">recordOODA</span>
                <span className="brand-purpose">支援OODAメモ</span>
              </span>
              <span className={`record-brand-subtitle text-sm text-ink/60 ${isTaskPage ? "record-brand-subtitle-task" : ""}`}>観察から小さな支援まで、今日の一手を残す</span>
            </Link>
            <ReviewNav
              pathname={pathname}
              compact={shouldCompactNav}
              compactOnMobile={shouldCompactNavOnMobile}
              menuLabel="記録・確認"
            />
          </div>

          {isTaskPage ? (
            <CompactWorkflowBar
              items={caseItems}
              selectedCaseId={selectedCase?.id ?? ""}
              currentPath={pathname}
              onCaseChange={(caseId) => setCurrentCase(caseId)}
            />
          ) : isHomePage && caseItems.length === 0 ? (
            <HomeStartBar
              items={caseItems}
              selectedCaseId={selectedCase?.id ?? ""}
              onCaseChange={(caseId) => setCurrentCase(caseId)}
              onCreateCase={createQuickCase}
            />
          ) : isHomePage ? null : shouldShowWorkflowMenu ? (
            <WorkflowMenu
              items={caseItems}
              selectedCaseId={selectedCase?.id ?? ""}
              currentPath={pathname}
              onCaseChange={(caseId) => setCurrentCase(caseId)}
              onCreateCase={createQuickCase}
            />
          ) : null}
        </div>
      </div>

      <main className="record-main mx-auto w-full max-w-7xl px-5 py-7">
        {!isReady ? (
          <EmptyState>読み込み中です。</EmptyState>
        ) : view === "home" ? (
          <HomeView data={data} selectedCaseId={selectedCase?.id ?? ""} onCaseChange={setCurrentCase} />
        ) : view === "cases" ? (
          <CasesView data={data} />
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

function ReviewNav({
  pathname,
  compact = false,
  compactOnMobile = false,
  menuLabel = "記録を見る",
}: {
  pathname: string;
  compact?: boolean;
  compactOnMobile?: boolean;
  menuLabel?: string;
}) {
  const primaryCount = compact ? 1 : 2;
  const primaryItems = topNavItems.slice(0, primaryCount);
  const menuItems = topNavItems.slice(primaryCount);
  const currentMenuItem = menuItems.find((item) => pathname.startsWith(item.href));
  const menuHasCurrent = Boolean(currentMenuItem);

  return (
    <nav aria-label="主要ナビゲーション" className={`review-nav flex flex-wrap gap-2 text-sm ${compactOnMobile ? "review-nav-responsive-compact" : ""}`}>
      {primaryItems.map((item, index) => {
        const isCurrent = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isCurrent ? "page" : undefined}
            className={`review-nav-link rounded-md border border-ink/10 bg-white px-3 py-2 text-ink/75 transition hover:border-skyline hover:text-skyline ${compactOnMobile && index > 1 ? "review-nav-mobile-secondary" : ""}`}
          >
            {item.label}
          </Link>
        );
      })}
      {menuItems.length > 0 ? (
        <details className="review-nav-menu">
          <summary
            className="review-nav-link rounded-md border px-3 py-2 text-ink/75 transition hover:border-skyline hover:text-skyline"
            data-current={menuHasCurrent ? "true" : undefined}
          >
            {currentMenuItem?.label ?? menuLabel}
          </summary>
          <div className="review-nav-menu-list">
            {menuItems.map((item) => {
              const isCurrent = pathname.startsWith(item.href);

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
          </div>
        </details>
      ) : null}
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
  const hasCases = items.length > 0;
  const selected = items.find((item) => item.id === selectedCaseId) ?? items[0] ?? null;
  const currentStep = stageLinks.find((item) => currentPath.startsWith(item.href)) ?? stageLinks[0];
  const nextAction = selected ? getCaseNextAction(selected) : null;
  const nextActionPath = nextAction?.href.split("?")[0] ?? "";
  const actionIsCurrentStep = Boolean(nextAction && nextActionPath && currentPath.startsWith(nextActionPath));
  const showAction = !hasCases;
  const showStepSummary = !hasCases;
  const actionHref = nextAction?.href ?? "/cases";
  const actionCopy = nextAction?.reason ?? "ケースを作ると、観察から始められます。";
  const actionLabel = nextAction?.label ?? "ケースを作る";

  return (
    <section className={`task-context-bar ${actionIsCurrentStep ? "task-context-bar-current" : ""} ${hasCases ? "task-context-bar-utility" : ""} ${showAction ? "task-context-bar-with-action" : ""} ooda-tone-${hasCases ? currentStep.tone : "case"}`} aria-label="現在の作業">
      {showStepSummary ? (
        <div className="task-context-main">
          <span className="task-context-index">準備</span>
          <div>
            <span>現在のステップ</span>
            <strong>ケースを作る</strong>
            <small>まずケースを用意</small>
          </div>
        </div>
      ) : null}

      {!hasCases ? (
        <div className="task-context-case task-context-case-empty" aria-label="ケース">
          <span>状態</span>
          <strong>ケースなし</strong>
        </div>
      ) : (
        <label className="task-context-case">
          <span>ケース</span>
          <select value={selected?.id ?? ""} onChange={(event) => onCaseChange(event.target.value)}>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.displayName}
              </option>
            ))}
          </select>
        </label>
      )}

      {showAction ? (
        <div className="task-context-action">
          <span>{actionCopy}</span>
          <Link href={actionHref}>{actionLabel}</Link>
        </div>
      ) : null}

      {hasCases ? (
        <nav className="task-context-step-links" aria-label="OODAステップ移動">
          {stageLinks.map((item) => (
            <Link key={item.href} href={item.href} aria-current={currentPath.startsWith(item.href) ? "step" : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </section>
  );
}

function HomeStartBar({
  items,
  selectedCaseId,
  onCaseChange,
  onCreateCase
}: {
  items: CaseDockItem[];
  selectedCaseId: string;
  onCaseChange: (caseId: string) => void;
  onCreateCase: (displayName: string, memo: string) => void;
}) {
  const selected = items.find((item) => item.id === selectedCaseId) ?? items[0] ?? null;
  const nextAction = selected ? getCaseNextAction(selected) : null;

  return (
    <section className="home-start-bar" aria-label="今日の開始">
      <div className={`home-start-main ${selected && nextAction ? "home-start-main-action-only" : ""}`}>
        {selected && nextAction ? (
          <Link href={nextAction.href} className="case-primary-action">
            {nextAction.label}
          </Link>
        ) : (
          <>
            <span>今日の一手</span>
            <strong>ケースを作る</strong>
          </>
        )}
      </div>
      <div className="home-start-case">
        {selected ? (
          <>
            <label className="case-dock-picker">
              <span>ケース</span>
              <select value={selected.id} onChange={(event) => onCaseChange(event.target.value)}>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.displayName}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <>
            <QuickCaseForm onCreateCase={onCreateCase} submitLabel="ケースを作る" />
            <details className="home-start-alternative">
              <summary>新しいケース</summary>
              <Link href="/cases" className="home-start-secondary-link">
                ケース画面を開く
              </Link>
            </details>
          </>
        )}
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
  const isCasesPage = currentPath.startsWith("/cases");
  const showDockProgress = !isCasesPage;

  return (
    <nav aria-label="OODAの流れ" className={`workflow-menu-shell ${isCasesPage ? "workflow-menu-shell-cases" : ""}`}>
      <section className={`case-entry-card case-dock ooda-tone-case ${isCasesPage ? "case-dock-page-title" : ""}`} aria-label={isCasesPage ? "ケース選択" : "選択中のケース"}>
        <div className="case-dock-head">
          {!isCasesPage ? <span className="ooda-orbit-number">{totalCount}</span> : null}
          <div className="case-dock-title">
            {!isCasesPage ? <span className="ooda-orbit-stage">現在の対象</span> : null}
            {isCasesPage ? <h1 className="ooda-orbit-label">使うケースを選ぶ</h1> : <strong className="ooda-orbit-label">選択中のケース</strong>}
            <small>{isCasesPage ? "必要なときだけ追加できます。" : `利用中 ${activeCount}件`}</small>
          </div>
          {!isCasesPage ? (
            <Link href="/cases" className="case-dock-text-link">
              ケース選択
            </Link>
          ) : null}
        </div>

        <label className="case-dock-picker">
          <span>{isCasesPage ? "選択中" : "使うケース"}</span>
          <select value={selected?.id ?? ""} onChange={(event) => onCaseChange(event.target.value)} disabled={items.length === 0}>
            {items.length === 0 ? (
              <option value="">ケースなし</option>
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
            {showDockProgress ? <CaseProgressRail item={selected} currentPath={currentPath} dense /> : null}
            {!isCasesPage ? (
              <div className="case-dock-actions">
                <Link href={nextAction?.href ?? "/cases"} className="case-dock-primary">
                  {nextAction?.label ?? "ケース作成"}
                </Link>
                <Link href={`/reflect?caseId=${selected.id}`}>履歴</Link>
              </div>
            ) : null}
          </>
        ) : (
          <div className="case-dock-empty">
            <p>まずケースを作ると、OODAを始められます。</p>
            <QuickCaseForm onCreateCase={onCreateCase} submitLabel="ケースを作る" />
          </div>
        )}

        {selected ? (
          <details className="case-dock-new">
            <summary>{isCasesPage ? "新しいケースを追加" : "新しいケース"}</summary>
            <QuickCaseForm onCreateCase={onCreateCase} submitLabel={isCasesPage ? "作って選択" : "ケースを作る"} />
          </details>
        ) : null}
      </section>

      {!isCasesPage ? <OodaOrbitMenu items={stageLinks} currentPath={currentPath} /> : null}
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
  const [formError, setFormError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const displayName = text(form, "displayName");
    if (!displayName) {
      setFormError("ケース名を入力してください。");
      return;
    }
    setFormError("");
    onCreateCase(displayName, text(form, "memo"));
    event.currentTarget.reset();
  }

  return (
    <form onSubmit={handleSubmit} className="case-dock-form" noValidate>
      {formError ? (
        <p className="case-dock-form-error" role="alert">
          {formError}
        </p>
      ) : null}
      <label>
        <span>
          ケース名 <RequiredMark />
        </span>
        <input name="displayName" placeholder="Aさん、午前の作業など" required />
      </label>
      <label>
        <span>
          メモ <OptionalMark />
        </span>
        <input name="memo" placeholder="後で見返す補足" />
      </label>
      <button type="submit">{submitLabel}</button>
    </form>
  );
}

function CaseProgressRail({
  item,
  currentPath,
  dense = false
}: {
  item: CaseDockItem | null;
  currentPath?: string;
  dense?: boolean;
}) {
  const nextStageIndex = item ? getNextStageIndex(item) : 0;

  return (
    <div className={`case-progress-rail ${dense ? "case-progress-rail-dense" : ""}`} aria-label="OODA進捗">
      {stageLinks.map((stage, index) => {
        const count = item ? countForCaseStage(item, stage.stage) : 0;
        const isDone = count > 0;
        const isNext = nextStageIndex === index;
        const isCurrent = Boolean(currentPath && currentPath.startsWith(stage.href));
        const stateLabel = isCurrent ? "現在" : isNext ? "次" : String(count);
        const className = [
          "case-progress-step",
          `case-progress-step-${stage.tone}`,
          isDone ? "is-done" : "",
          isNext ? "is-next" : "",
          isCurrent ? "is-current" : "",
          item ? "" : "is-disabled"
        ]
          .filter(Boolean)
          .join(" ");
        const content = (
          <>
            <span className="case-progress-step-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="case-progress-step-copy">
              <strong>{stage.stageLabel}</strong>
              <small>{stateLabel}</small>
            </span>
          </>
        );

        return item ? (
          <Link key={stage.href} href={hrefForCaseStage(item, stage.href)} aria-current={isCurrent ? "step" : undefined} className={className}>
            {content}
          </Link>
        ) : (
          <span key={stage.href} className={className}>
            {content}
          </span>
        );
      })}
    </div>
  );
}

function HomeView({
  data,
  selectedCaseId,
  onCaseChange
}: {
  data: AppData;
  selectedCaseId: string;
  onCaseChange: (caseId: string) => void;
}) {
  const hasCases = data.cases.length > 0;
  const caseItems = buildCaseDockItems(data);
  const selectedCase = caseItems.find((item) => item.id === selectedCaseId) ?? caseItems[0] ?? null;
  const recentObservations = [...data.observations].sort(byNewest).slice(0, 4);
  const activeHypotheses = data.hypotheses.filter((item) => item.status === "未検証" || item.status === "検証中").sort(byUpdated).slice(0, 4);
  const dueExperiments = data.experiments.filter((item) => item.status === "予定" || item.status === "実施中").sort((a, b) => a.reviewDueAt.localeCompare(b.reviewDueAt)).slice(0, 4);
  const recentReviews = [...data.actReviews].sort(byNewest).slice(0, 4);

  return (
    <>
      <HomeFlowHeader caseItems={caseItems} selectedCase={selectedCase} hasCases={hasCases} onCaseChange={onCaseChange} />

      {hasCases ? (
        <div className="grid gap-5 lg:grid-cols-2">
        <DashboardBlock title="観察" href="/observe" actionLabel="観察画面へ">
          {recentObservations.length === 0 ? (
            <EmptyState>観察はまだありません。</EmptyState>
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

        <DashboardBlock title="見立て" href="/orient" actionLabel="見立てを入力">
          {activeHypotheses.length === 0 ? (
            <EmptyState>見立てはまだありません。</EmptyState>
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

        <DashboardBlock title="支援" href="/decide" actionLabel="支援を選ぶ">
          {dueExperiments.length === 0 ? (
            <EmptyState>支援はまだありません。</EmptyState>
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

        <DashboardBlock title="反応" href="/act" actionLabel="反応を入力">
          {recentReviews.length === 0 ? (
            <EmptyState>反応はまだありません。</EmptyState>
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
      ) : null}
    </>
  );
}

function HomeFlowHeader({
  caseItems,
  selectedCase,
  hasCases,
  onCaseChange
}: {
  caseItems: CaseDockItem[];
  selectedCase: CaseDockItem | null;
  hasCases: boolean;
  onCaseChange: (caseId: string) => void;
}) {
  const nextStageIndex = selectedCase ? getNextStageIndex(selectedCase) : 0;
  const nextAction = selectedCase ? getCaseNextAction(selectedCase) : null;
  const caseSummary = selectedCase
    ? selectedCase.memo
      ? `メモ: ${selectedCase.memo}`
      : `記録: 観察 ${selectedCase.counts.observations} / 見立て ${selectedCase.counts.hypotheses} / 支援 ${selectedCase.counts.experiments} / 反応 ${selectedCase.counts.actReviews}`
    : "ケース未選択";
  const primaryActionLabel = selectedCase && nextAction ? `このケースで${nextAction.label}` : "ケースを作る";

  return (
    <section className="home-flow-header" aria-label="今日のOODA">
      <h1 className="sr-only">今日のOODA</h1>
      <div className={`home-current-case ${selectedCase ? "" : "home-current-case-empty"}`} aria-label="今日の入力先">
        <div className="home-current-case-copy">
          <span>今日の入力先</span>
          <strong>{selectedCase?.displayName ?? "ケース未選択"}</strong>
          <small>{caseSummary}</small>
        </div>

        {selectedCase ? (
          <details className="home-current-case-change">
            <summary>変更</summary>
            <label className="home-current-case-picker">
              <span>入力先を選ぶ</span>
              <select value={selectedCase.id} onChange={(event) => onCaseChange(event.target.value)} aria-label="入力先を変更">
                {caseItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.displayName}
                  </option>
                ))}
              </select>
            </label>
          </details>
        ) : null}

        <Link href={nextAction?.href ?? "/cases"} className="home-current-case-action">
          {primaryActionLabel}
        </Link>
      </div>
      <div className="ooda-flow-map" aria-label={selectedCase ? `${selectedCase.displayName}のOODAステップ` : "OODAステップ"}>
        {stageLinks.map((item, index) => {
          const count = selectedCase ? countForCaseStage(selectedCase, item.stage) : 0;
          const isComplete = Boolean(selectedCase && count > 0);
          const isCurrent = Boolean(hasCases && selectedCase && nextStageIndex === index);
          const className = [
            "ooda-flow-node",
            `ooda-flow-node-${item.tone}`,
            isComplete ? "is-complete" : "",
            isCurrent ? "is-current" : "",
            selectedCase ? "" : "is-disabled"
          ]
            .filter(Boolean)
            .join(" ");
          const nodeContent = (
            <>
              <span className="ooda-flow-dot">{String(index + 1).padStart(2, "0")}</span>
              <strong>{item.stageLabel}</strong>
              <small>{count}</small>
            </>
          );

          return selectedCase ? (
            <Link
              key={item.href}
              href={hrefForCaseStage(selectedCase, item.href)}
              className={className}
              aria-label={`${item.label} ${count}件${isCurrent ? " 現在の作業" : ""}`}
            >
              {nodeContent}
            </Link>
          ) : (
            <div key={item.href} className={className} aria-label={item.label}>
              {nodeContent}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CaseMiniFlow({ item }: { item: CaseDockItem }) {
  const nextStageIndex = getNextStageIndex(item);

  return (
    <div className="case-mini-flow" aria-label={`${item.displayName}のOODAステップ`}>
      {stageLinks.map((stage, index) => {
        const count = countForCaseStage(item, stage.stage);
        const isComplete = count > 0;
        const isCurrent = nextStageIndex === index;
        const className = [
          "case-mini-flow-node",
          `case-mini-flow-node-${stage.tone}`,
          isComplete ? "is-complete" : "",
          isCurrent ? "is-current" : ""
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <Link
            key={stage.href}
            href={hrefForCaseStage(item, stage.href)}
            aria-current={isCurrent ? "step" : undefined}
            aria-label={`${stage.label} ${count}件${isCurrent ? " 現在の作業" : ""}`}
            className={className}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{stage.stageLabel}</strong>
            <small>{count}</small>
          </Link>
        );
      })}
    </div>
  );
}

function CasesView({ data }: { data: AppData }) {
  const caseItems = buildCaseDockItems(data);

  return (
    <>
      {caseItems.length === 0 ? null : (
        <Section title="ケース一覧">
          <div className="grid gap-4 lg:grid-cols-2">
            {caseItems.map((item) => {
              const nextAction = getCaseNextAction(item);
              return (
                <article key={item.id} className="case-record-card rounded-md border border-ink/10 bg-white p-4 shadow-sm">
                  <div className="case-record-head">
                    <div className="case-record-title-block">
                      <div className="case-record-title-copy">
                        <div className="case-record-title-row">
                          <h2 className="case-record-title">{item.displayName}</h2>
                          <Tag>{item.isActive ? "利用中" : "停止中"}</Tag>
                        </div>
                        <p className="case-record-meta">作成 {formatShortDate(item.createdAt)} / 更新 {formatShortDate(item.updatedAt)}</p>
                      </div>
                    </div>
                  </div>
                  <p className="case-record-memo">{item.memo || "メモはまだありません。"}</p>
                  <CaseMiniFlow item={item} />
                  <div className="case-next-action-panel">
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
        </Section>
      )}

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
    const factMemo = text(form, "factMemo");
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
      userBehavior: requiredText(form, "userBehavior"),
      consequence: requiredText(form, "consequence"),
      unknownMemo: text(form, "unknownMemo"),
      observationChecklist: allText(form, "observationChecklist"),
      personWords: text(form, "personWords"),
      consentScope: text(form, "consentScope"),
      shareScope: text(form, "shareScope"),
      createdAt: now,
      updatedAt: now
    };
    if (!observation.location || !observation.programName || !observation.timing || !observation.antecedent || !observation.userBehavior || !observation.consequence) {
      const missing = [
        !observation.location ? "場所" : "",
        !observation.programName ? "活動" : "",
        !observation.timing ? "タイミング" : "",
        !observation.antecedent ? "直前の環境" : "",
        !observation.userBehavior ? "利用者の行動" : "",
        !observation.consequence ? "直後の環境の変化" : ""
      ].filter(Boolean);
      return setFormError(`必須項目を入力してください: ${missing.join("、")}`);
    }
    if (!factMemo) return setFormError("事実メモを入力してください。");
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
  const hasCases = data.cases.length > 0;
  const observationCaseId = selectedCaseId || data.cases[0]?.id || "";

  return (
    <>
      <PageHeader title="観察を入力" description={hasCases ? "評価や解釈と分けて、見えたことだけ先に残します。" : "まずケースを作ると、この画面を使えます。"} image="observe.png" action={<StepPlate step="01" stage="Observe" tone="observe" />} compact />

      <Section title="事実と前後">
        {!hasCases ? (
          <EmptyState>まだ入力できません。</EmptyState>
        ) : (
          <form id="task-form" onSubmit={handleCreateObservation} className="observe-form-shell" noValidate>
            {formError ? <FormError>{formError}</FormError> : null}
            <input type="hidden" name="caseId" value={observationCaseId} readOnly />

            <div className="observe-minimum-group">
              <div className="observe-minimum-head">
                <p>場面、直前の環境、行動、直後の環境の変化を区切ってから、事実メモにまとめます。</p>
                <div className="observe-core-flow" aria-label="入力の流れ">
                  {["場面", "環境", "行動", "変化", "まとめ"].map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                  直前の環境 <RequiredMark />
                  <Input name="antecedent" placeholder="指示、予定変更、場所の変化、周囲の声かけなど" required />
                </Label>
              </div>

              <Label>
                利用者の行動 <RequiredMark />
                <Textarea name="userBehavior" rows={3} placeholder="手が止まった、席を離れた、質問せず画面を見ていたなど" required />
              </Label>

              <Label>
                直後の環境の変化 <RequiredMark />
                <Textarea name="consequence" rows={3} placeholder="支援者の対応、周囲の変化、本人の次の行動など" required />
              </Label>

              <Label>
                事実メモ（まとめ） <RequiredMark />
                <Textarea name="factMemo" rows={4} placeholder="上の項目を見ながら、見えたことを一文でまとめる" required />
              </Label>
            </div>

            <div className="observe-form-actions">
              <SubmitButton>保存して見立てへ</SubmitButton>
              <span>任意項目は空欄でも保存できます。</span>
            </div>

            <details className="observe-disclosure">
              <summary>
                <span>迷ったら見るチェック</span>
                <small>行動、表情、環境、安全など</small>
              </summary>
              <div className="observe-disclosure-body">
                <CheckboxGroup name="observationChecklist" title="今回見たもの" options={OBSERVATION_CHECK_ITEMS} />
              </div>
            </details>

            <details className="observe-disclosure">
              <summary>
                <span>必要なら補足</span>
                <small>本人の言葉、タグ、未確認点</small>
              </summary>
              <div className="observe-disclosure-body">
                <Label>
                  本人の言葉・反応の言い方 <OptionalMark />
                  <Textarea name="personWords" rows={3} placeholder="本人が言った言葉、沈黙、首振り、表情の変化など" />
                </Label>

                <Label>
                  一行メモ <OptionalMark />
                  <Textarea name="freeText" rows={3} placeholder="見えた流れを一行で置く" />
                </Label>

                <CheckboxGroup name="behaviorTags" title="行動タグ" options={BEHAVIOR_TAGS} />

                <Label>
                  未確認メモ <OptionalMark />
                  <Textarea name="unknownMemo" rows={3} placeholder="まだ分からない点、次に確認する点" />
                </Label>
              </div>
            </details>

            <details className="observe-disclosure observe-disclosure-ethics">
              <summary>
                <span>共有前の確認</span>
                <small>扱う範囲、共有範囲</small>
              </summary>
              <div className="observe-disclosure-body observe-disclosure-grid">
                <Label>
                  扱ってよい範囲 <OptionalMark />
                  <Input name="consentScope" placeholder="例: 本人に確認済み / 次回確認する" />
                </Label>
                <Label>
                  共有範囲 <OptionalMark />
                  <Input name="shareScope" placeholder="例: 支援チーム内のみ / 記録者のみ" />
                </Label>
              </div>
            </details>
          </form>
        )}
      </Section>

      {hasCases ? (
        <Section title="最近の観察">
          {recentObservations.length === 0 ? (
            <EmptyState>まだ観察はありません。</EmptyState>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {recentObservations.map((observation) => (
                <LinkCard key={observation.id} href={`/orient?observationId=${observation.id}`}>
                  <CardTop title={caseName(data, observation.caseId)} meta={formatShortDateTime(observation.observedAt)} />
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-ink/70">{observation.factMemo}</p>
                  {observation.userBehavior ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink/55">行動: {observation.userBehavior}</p> : null}
                  <TagRow tags={observation.behaviorTags} />
                </LinkCard>
              ))}
            </div>
          )}
        </Section>
      ) : null}
    </>
  );
}

function OrientView({ data, commit, onNavigate }: { data: AppData; commit: Commit; onNavigate: (href: string) => void }) {
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState("");
  const observations = [...data.observations].sort(byNewest);
  const requestedObservationId = searchParams.get("observationId") ?? "";
  const [selectedObservationId, setSelectedObservationId] = useState(requestedObservationId);
  const selected = observations.find((item) => item.id === selectedObservationId) ?? observations.find((item) => item.id === requestedObservationId) ?? observations[0] ?? null;

  useEffect(() => {
    if (requestedObservationId && requestedObservationId !== selectedObservationId) {
      setSelectedObservationId(requestedObservationId);
    }
  }, [requestedObservationId, selectedObservationId]);

  function handleCreateHypotheses(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const observationId = requiredText(form, "observationId");
    const observation = data.observations.find((item) => item.id === observationId);
    if (!observation) {
      setFormError("根拠にする観察を選んでください。");
      return;
    }
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
        valueDirection: text(form, `valueDirection-${index}`),
        avoidancePattern: text(form, `avoidancePattern-${index}`),
        fusedStory: text(form, `fusedStory-${index}`),
        smallStep: text(form, `smallStep-${index}`),
        confidence: Number(text(form, `confidence-${index}`) || 50),
        status: parseHypothesisStatus(text(form, `status-${index}`)),
        createdAt: now,
        updatedAt: now
      };
      if (!hypothesis.evidence) {
        setFormError(`${hypothesisEntryLabel(index)}の根拠となる観察を入力してください。`);
        return;
      }
      created.push(hypothesis);
    }
    if (created.length === 0) {
      setFormError("見立て文を一つ以上入力してください。");
      return;
    }
    setFormError("");
    commit((current) => ({
      ...current,
      settings: { ...current.settings, currentCaseId: observation.caseId },
      cases: touchCase(current.cases, observation.caseId),
      hypotheses: [...created, ...current.hypotheses]
    }));
    onNavigate(`/decide?hypothesisId=${created[0].id}`);
  }

  const accumulatedHypotheses = selected ? data.hypotheses.filter((hypothesis) => hypothesis.caseId === selected.caseId).sort(byUpdated) : [...data.hypotheses].sort(byUpdated);
  const hasCases = data.cases.length > 0;

  return (
    <>
      <PageHeader title="見立てを1つ置く" description={hasCases ? "観察から考えられる説明を仮置きし、根拠と合わない点を分けます。" : "まずケースを作ると、この画面を使えます。"} image="orient.png" action={<StepPlate step="02" stage="Orient" tone="orient" />} compact />

      <Section title="主な見立て">
        {observations.length === 0 ? (
          <EmptyState>
            {!hasCases ? (
              <>まだ入力できません。</>
            ) : (
              <>
                観察がまだありません。<Link href="/observe" className="font-medium text-skyline">観察を入力</Link>から始めてください。
              </>
            )}
          </EmptyState>
        ) : (
          <form onSubmit={handleCreateHypotheses} className="grid gap-5" noValidate>
            <div className="orient-observation-card">
              <Label>
                根拠にする観察
                <Select name="observationId" value={selected?.id ?? ""} onChange={(event) => setSelectedObservationId(event.target.value)} required>
                  {observations.map((observation) => (
                    <option key={observation.id} value={observation.id}>
                      {caseName(data, observation.caseId)} / {formatShortDateTime(observation.observedAt)} / {observation.programName}
                    </option>
                  ))}
                </Select>
              </Label>
              {selected ? <SelectedObservationFocus observation={selected} caseLabel={caseName(data, selected.caseId)} /> : null}
            </div>

            {formError ? <FormError>{formError}</FormError> : null}

            <div className="orient-workbench">
              <div className="orient-input-panel">
                <p className="orient-form-note">まず主な見立てだけを入力します。別方向からの見立てとACT軸は必要な時だけ開けます。</p>
                <div id="task-form" className="orient-entry-layout">
                  <HypothesisEditor index={0} role="primary" />
                  <details className="optional-hypothesis-details">
                    <summary>別方向からの見立て 1</summary>
                    <HypothesisEditor index={1} role="alternate" />
                  </details>
                  <details className="optional-hypothesis-details">
                    <summary>別方向からの見立て 2</summary>
                    <HypothesisEditor index={2} role="optional" />
                  </details>
                </div>
              </div>
            </div>

            <SubmitButton>保存して、支援へ</SubmitButton>
          </form>
        )}
      </Section>

      {observations.length > 0 ? (
        <Section title="積み重ねた見立て" description="このケースで残してきた見立てを、今回の観察との関係が分かるように並べます。">
          {accumulatedHypotheses.length === 0 ? (
            <EmptyState>このケースの見立てはまだありません。</EmptyState>
          ) : (
            <div className="orient-hypothesis-history">
              {accumulatedHypotheses.map((hypothesis) => {
                const relatedMemos = reflectionMemosForHypothesis(data.reflectionMemos, hypothesis);
                const latestMemo = relatedMemos[0];
                const sourceObservation = data.observations.find((observation) => observation.id === hypothesis.observationId);
                const isCurrentObservation = selected ? hypothesis.observationId === selected.id : false;

                return (
                  <LinkCard key={hypothesis.id} href={`/decide?hypothesisId=${hypothesis.id}`}>
                    <div className="orient-history-card-head">
                      <div>
                        <span>{sourceObservation ? `${formatShortDate(sourceObservation.observedAt)} / ${sourceObservation.programName}` : caseName(data, hypothesis.caseId)}</span>
                        <strong>{hypothesis.category}</strong>
                      </div>
                      <Tag>{isCurrentObservation ? "今回の観察" : hypothesis.status}</Tag>
                    </div>
                    <p className="orient-history-statement">{hypothesis.statement}</p>
                    {sourceObservation ? <p className="orient-history-source">材料: {sourceObservation.factMemo || sourceObservation.userBehavior || "観察メモ"}</p> : null}
                    <p className="orient-history-note">反証・未確認: {hypothesis.counterEvidence || hypothesis.unknowns || "未記録"}</p>
                    {latestMemo ? <p className="orient-history-note">見立てへの追記: {latestMemo.body}</p> : null}
                  </LinkCard>
                );
              })}
            </div>
          )}
        </Section>
      ) : null}
    </>
  );
}

function DecideView({ data, commit, onNavigate }: { data: AppData; commit: Commit; onNavigate: (href: string) => void }) {
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState("");
  const hypotheses = [...data.hypotheses].sort(byUpdated);
  const selected = hypotheses.find((item) => item.id === searchParams.get("hypothesisId")) ?? hypotheses[0] ?? null;

  function handleCreateExperiment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const hypothesisId = requiredText(form, "hypothesisId");
    const hypothesis = data.hypotheses.find((item) => item.id === hypothesisId);
    if (!hypothesis) {
      setFormError("見立てを選んでください。");
      return;
    }
    const support = requiredText(form, "support");
    if (!support) {
      setFormError("試す支援を入力してください。");
      return;
    }
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
      decisionChecks: allText(form, "decisionChecks"),
      status: parseExperimentStatus(text(form, "status")),
      createdAt: now,
      updatedAt: now
    };
    if (!experiment.targetChange) {
      setFormError("狙う変化を入力してください。");
      return;
    }
    setFormError("");
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
      <PageHeader title="支援を選ぶ" description="今回は一つだけ試します。反応が見える小ささに絞ります。" image="decide.png" action={<StepPlate step="03" stage="Decide" tone="decide" />} compact />

      <Section title="小さな支援を登録">
        {hypotheses.length === 0 ? (
          <EmptyState>
            見立てがまだありません。<Link href="/orient" className="font-medium text-skyline">見立てを入力</Link>から始めてください。
          </EmptyState>
        ) : (
          <form id="task-form" onSubmit={handleCreateExperiment} className="grid gap-5 rounded-md border border-ink/10 bg-white p-4 shadow-sm" noValidate>
            {formError ? <FormError>{formError}</FormError> : null}

            <Label>
              見立て
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
                {selected.valueDirection || selected.avoidancePattern || selected.smallStep ? (
                  <div className="decision-context-strip">
                    {selected.valueDirection ? <span>大事な方向: {selected.valueDirection}</span> : null}
                    {selected.avoidancePattern ? <span>回避: {selected.avoidancePattern}</span> : null}
                    {selected.smallStep ? <span>小さな一歩: {selected.smallStep}</span> : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            <Label>
              試す支援 <RequiredMark />
              <Textarea name="support" rows={5} placeholder="今回試す支援を1つ" required />
            </Label>
            <details className="secondary-field-details">
              <summary>今は試さない候補を残す</summary>
              <div className="mt-3">
                <Label>
                  次回候補
                  <Textarea name="nextTryCandidate" rows={4} placeholder="次回候補として残す" />
                </Label>
              </div>
            </details>
            <Notice>ここでは支援を一つに絞ります。複数を同時に変えると、反応を見立てに戻しにくくなります。</Notice>

            <div className="record-context-panel record-context-panel-decision">
              <div className="record-context-panel-head">
                <strong>小さく試す条件</strong>
                <span>価値に沿い、戻せて、当日試せる単位にする</span>
              </div>
              <CheckboxGroup name="decisionChecks" title="今回満たす条件" options={DECISION_CHECK_ITEMS} />
            </div>

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

            <SubmitButton>保存して、反応へ</SubmitButton>
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
  const [formError, setFormError] = useState("");
  const experiments = [...data.experiments].sort((a, b) => a.reviewDueAt.localeCompare(b.reviewDueAt));
  const selected = experiments.find((item) => item.id === searchParams.get("experimentId")) ?? experiments[0] ?? null;
  const selectedHypothesis = selected ? data.hypotheses.find((item) => item.id === selected.hypothesisId) ?? null : null;

  function handleCreateActReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const experimentId = requiredText(form, "experimentId");
    const experiment = data.experiments.find((item) => item.id === experimentId);
    if (!experiment) {
      setFormError("支援を選んでください。");
      return;
    }
    const immediateResponse = requiredText(form, "immediateResponse");
    if (!immediateResponse) {
      setFormError("直後反応を入力してください。");
      return;
    }
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
    if (!review.implementation) {
      setFormError("実施内容を入力してください。");
      return;
    }
    setFormError("");
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
      <PageHeader title="反応を入力" description="支援の良し悪しではなく、反応から見立てを更新します。" image="act.png" action={<StepPlate step="04" stage="Act" tone="act" />} compact />

      <Section title="反応を記録">
        {experiments.length === 0 ? (
          <EmptyState>
            支援がまだありません。<Link href="/decide" className="font-medium text-skyline">支援を選ぶ</Link>から始めてください。
          </EmptyState>
        ) : (
          <form id="task-form" onSubmit={handleCreateActReview} className="grid gap-5 rounded-md border border-ink/10 bg-white p-4 shadow-sm" noValidate>
            {formError ? <FormError>{formError}</FormError> : null}

            <Label>
              支援
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
                <p className="mt-2 text-ink/55">見立て: {selectedHypothesis?.statement ?? "未確認"}</p>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <Label>
                実施内容 <RequiredMark />
                <Textarea name="implementation" rows={4} placeholder="実際に行った支援。予定から変えた点も入力" required />
              </Label>
              <Label>
                直後反応 <RequiredMark />
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
                見立ての更新
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
                <Textarea name="nextObservationPoint" rows={3} placeholder="次回の観察ポイント" />
              </Label>
              <Label>
                次に試す候補
                <Textarea name="nextTryCandidate" rows={3} placeholder="続ける、弱める、別案など" />
              </Label>
            </div>

            <SubmitButton>保存して、履歴へ</SubmitButton>
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
  const [formError, setFormError] = useState("");
  const caseId = selectedCaseId || data.cases[0]?.id || "";
  const selectedCase = data.cases.find((item) => item.id === caseId) ?? null;
  const rows = buildReflectionRows(data, caseId);
  const completedRows = rows.filter((row) => row.loopStatus === "complete");
  const inProgressRows = rows.filter((row) => row.loopStatus !== "complete");
  const memos = data.reflectionMemos.filter((memo) => memo.caseId === caseId).sort(byNewest);
  const memoTargetRows = rows.filter((row) => row.hypothesisId);
  const unplacedMemos = memos.filter((memo) => !rows.some((row) => reflectionMemoTargetsRow(memo, row)));
  const nextObserveHref = caseId ? `/observe?caseId=${caseId}` : "/observe";

  function handleCreateMemo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = requiredText(form, "body");
    if (!caseId) {
      setFormError("ケースを選んでください。");
      return;
    }
    if (!body) {
      setFormError("追記メモを入力してください。");
      return;
    }
    const targetRef = text(form, "targetRef");
    if (!targetRef) {
      setFormError("追記する見立てを選んでください。");
      return;
    }
    const now = nowIso();
    const memo: ReflectionMemo = {
      id: newId("memo"),
      caseId,
      targetRef,
      columnKey: text(form, "columnKey") || "orientation",
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
    setFormError("");
    event.currentTarget.reset();
  }

  return (
    <>
      <PageHeader title="OODAを更新" description="反応から見立てと支援を見直し、次に見る一点へ戻します。" image="reflect.png" action={<LinkButton href={nextObserveHref}>次の観察へ</LinkButton>} />

      {data.cases.length === 0 ? (
        <EmptyState>
          ケースがまだありません。<Link href="/cases" className="font-medium text-skyline">ケースを作る</Link>と振り返りを始められます。
        </EmptyState>
      ) : (
        <>
          <Section title="対象ケース">
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

          <Section title="ループ更新" description={selectedCase?.memo || "反応を材料にして、次の観察で見る一点を決めます。"}>
            {completedRows.length === 0 ? (
              <EmptyState>
                {rows.length === 0
                  ? "まだ更新できるOODA記録はありません。観察から始めて、支援後の反応まで入るとここで更新できます。"
                  : "反応まで入ると、見立ての更新と次に見る一点をここで整理できます。"}
              </EmptyState>
            ) : (
              <div className="loop-update-grid">
                {completedRows.map((row) => {
                  const rowMemos = memos.filter((memo) => reflectionMemoTargetsRow(memo, row));

                  return (
                    <article key={row.id} className="loop-update-card rounded-md border border-ink/10 bg-white p-4 shadow-sm">
                      <div className="loop-update-card-head">
                        <span>反応から更新</span>
                        <strong>{row.label}</strong>
                      </div>
                      <dl className="loop-update-points">
                        <div>
                          <dt>反応</dt>
                          <dd>{row.response}</dd>
                        </div>
                        <div>
                          <dt>見立ての更新</dt>
                          <dd>{row.orientationUpdate}</dd>
                        </div>
                        <div>
                          <dt>支援の扱い</dt>
                          <dd>{row.supportAdjustment}</dd>
                        </div>
                        <div className="loop-update-next-point">
                          <dt>次に見る一点</dt>
                          <dd>{row.next}</dd>
                        </div>
                      </dl>
                      {rowMemos.length > 0 ? (
                        <div className="loop-update-note-stack" aria-label="見立てへの追記">
                          <strong>見立てへの追記</strong>
                          {rowMemos.map((memo) => (
                            <article key={memo.id} className="loop-update-note">
                              <div>
                                <Tag>{reflectionColumnLabel(memo.columnKey)}</Tag>
                                <span>{formatShortDateTime(memo.createdAt)}</span>
                              </div>
                              <p>{memo.body}</p>
                            </article>
                          ))}
                        </div>
                      ) : null}
                      <p className="loop-update-source">材料: {row.sourceFact}</p>
                      <Link href={nextObserveHref} className="loop-update-next-link focus-ring">
                        次の観察へ
                      </Link>
                    </article>
                  );
                })}
              </div>
            )}
            {inProgressRows.length > 0 ? <p className="loop-update-progress-note">進行中の一巡が{inProgressRows.length}件あります。支援後の反応まで入ると、更新対象として表示されます。</p> : null}
          </Section>

          {rows.length > 0 ? (
            <Section title="一巡の材料">
              <details className="reflection-source-details rounded-md border border-ink/10 bg-white p-4 shadow-sm">
                <summary>事実から反応までを見る</summary>
                <div className="mt-4 overflow-x-auto rounded-md border border-ink/10 bg-white">
                  <table className="min-w-[1040px] text-left text-sm">
                    <thead className="bg-field/80 text-xs text-ink/60">
                      <tr>
                        <th className="px-3 py-3">事実</th>
                        <th className="px-3 py-3">見立て</th>
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
                          <td className="w-56 whitespace-pre-line px-3 py-3">{row.fact}</td>
                          <td className="w-56 whitespace-pre-line px-3 py-3">{row.hypothesis}</td>
                          <td className="w-48 whitespace-pre-line px-3 py-3">{row.evidence}</td>
                          <td className="w-48 whitespace-pre-line px-3 py-3">{row.counter}</td>
                          <td className="w-56 whitespace-pre-line px-3 py-3">{row.support}</td>
                          <td className="w-56 whitespace-pre-line px-3 py-3">{row.response}</td>
                          <td className="w-48 whitespace-pre-line px-3 py-3">{row.next}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </Section>
          ) : null}

          <Section title="見立てへの追記" description="反応から気づいたことを、選んだ見立てに残します。">
            {memoTargetRows.length === 0 ? (
              <EmptyState>追記できる見立てはまだありません。</EmptyState>
            ) : (
              <form onSubmit={handleCreateMemo} className="grid gap-4 rounded-md border border-ink/10 bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr]" noValidate>
                {formError ? (
                  <div className="md:col-span-2">
                    <FormError>{formError}</FormError>
                  </div>
                ) : null}

                <Label>
                  追記する見立て
                  <Select name="targetRef">
                    {memoTargetRows.map((row) => (
                      <option key={row.id} value={reflectionRowTargetRef(row)}>
                        {row.label}
                      </option>
                    ))}
                  </Select>
                </Label>
                <Label>
                  追記先
                  <Select name="columnKey" defaultValue="orientation">
                    <option value="orientation">見立ての更新</option>
                    <option value="next">次に見る一点</option>
                    <option value="support">支援の調整</option>
                    <option value="share">チーム共有</option>
                  </Select>
                </Label>
                <div className="md:col-span-2">
                  <Label>
                    追記メモ <RequiredMark />
                    <Textarea name="body" rows={4} placeholder="反応から変える見立て、次に見る一点、支援の弱め方など" required />
                  </Label>
                </div>
                <div className="md:col-span-2">
                  <SubmitButton>見立てに追記</SubmitButton>
                </div>
              </form>
            )}

            {unplacedMemos.length > 0 ? (
              <div className="mt-4 grid gap-3">
                <h3 className="text-sm font-semibold text-ink">ケース全体の追記</h3>
                {unplacedMemos.map((memo) => (
                  <article key={memo.id} className="rounded-md border border-ink/10 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-ink/55">
                      <Tag>{reflectionColumnLabel(memo.columnKey)}</Tag>
                      <span>{formatShortDateTime(memo.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-ink/75">{memo.body}</p>
                  </article>
                ))}
              </div>
            ) : null}
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
    .filter((item) => !normalized || [caseName(data, item.caseId), item.factMemo, item.antecedent, item.userBehavior, item.consequence, item.behaviorTags.join(" ")].join(" ").toLowerCase().includes(normalized))
    .sort(byNewest);

  return (
    <>
      <PageHeader title="類似場面" description="過去の観察を探し、同じ原因だと決めつけずに材料として使います。" image="search.png" />

      <Section title="検索">
        <div className="rounded-md border border-ink/10 bg-white p-4 shadow-sm">
          <Label>
            キーワード
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="場所、活動、利用者の行動、行動タグ、事実メモ" />
          </Label>
        </div>
      </Section>

      <Section title="見つかった場面">
        {observations.length === 0 ? (
          <EmptyState>
            {data.observations.length === 0 ? (
              <>
                まだ探せる観察がありません。<Link href="/" className="font-medium text-skyline">今日の入力</Link>から観察を残すと、ここに場面が並びます。
              </>
            ) : (
              <>一致する観察はありません。</>
            )}
          </EmptyState>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {observations.map((observation) => {
              const relatedHypotheses = data.hypotheses.filter((item) => item.observationId === observation.id);
              return (
                <LinkCard key={observation.id} href={`/reflect?caseId=${observation.caseId}`}>
                  <CardTop title={caseName(data, observation.caseId)} meta={formatShortDateTime(observation.observedAt)} />
                  <p className="mt-2 text-sm leading-6 text-ink/75">{observation.factMemo}</p>
                  <TagRow tags={[observation.programName, observation.timing, ...observation.behaviorTags]} />
                  {relatedHypotheses.length > 0 ? <p className="mt-2 text-xs leading-5 text-ink/55">見立て: {relatedHypotheses[0].statement}</p> : null}
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
      <PageHeader title="要約" description="転記用の短い文章を作ります。公式記録や診断の代替ではありません。" image="export.png" action={<LinkButton href={data.cases.length === 0 ? "/cases" : "/reflect"}>{data.cases.length === 0 ? "ケースを作る" : "振り返り"}</LinkButton>} />

      <Section title="要約する観察">
        {observations.length === 0 ? (
          <EmptyState>
            観察がまだありません。<Link href={data.cases.length === 0 ? "/cases" : "/observe"} className="font-medium text-skyline">{data.cases.length === 0 ? "ケースを作る" : "観察を入力"}</Link>から始めてください。
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
    if (!window.confirm("このブラウザ内のrecordOODAデータを削除します。バックアップがないと戻せません。")) return;
    localStorage.removeItem(STORAGE_KEY);
    onImport(emptyData);
  }

  return (
    <>
      <PageHeader title="バックアップ" description="このブラウザ内の記録を、必要な時にバックアップファイルとして書き出します。" image="export.png" action={<LinkButton href="/cases">ケース</LinkButton>} />

      <section className="storage-flow-hero" aria-label="local-first保存">
        <div className="storage-flow-copy">
          <span className="storage-flow-kicker">ブラウザ保存</span>
          <h2>この端末に保存し、必要な時だけ書き出す</h2>
          <p>記録はこのブラウザ内に残ります。共有前にバックアップファイルを作ります。</p>
        </div>
        <div className="storage-rail" aria-hidden="true">
          <div className="storage-rail-node is-active">
            <span>1</span>
            <strong>ブラウザ保存</strong>
            <small>入力直後にこのブラウザへ保存</small>
          </div>
          <div className="storage-rail-node">
            <span>2</span>
            <strong>バックアップ作成</strong>
            <small>必要な時にJSONファイルで保存</small>
          </div>
          <div className="storage-rail-node">
            <span>3</span>
            <strong>共有フォルダへ保管</strong>
            <small>チームで使う場所へ手動で配置</small>
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
                  <Tag>見立て {data.hypotheses.length}</Tag>
                  <Tag>支援 {data.experiments.length}</Tag>
                  <Tag>反応 {data.actReviews.length}</Tag>
                </div>
                <p className="text-sm leading-6 text-ink/65">最終保存: {data.savedAt ? formatShortDateTime(data.savedAt) : "未保存"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="case-primary-action" onClick={() => downloadJson(data)}>
                  バックアップを書き出す
                </button>
                <label className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm font-medium text-ink transition hover:border-skyline hover:text-skyline">
                  バックアップを読み込む
                  <input type="file" accept="application/json,.json" className="sr-only" onChange={(event) => void handleImport(event.target.files?.[0] ?? null)} />
                </label>
                <button type="button" className="storage-clear-button" onClick={clearLocalData}>
                  ブラウザ内データを削除
                </button>
              </div>
            </div>

            <form onSubmit={handleStorageNote} className="grid gap-3 rounded-md border border-ink/10 bg-white p-4">
              <Label>
                バックアップ先メモ
                <Textarea name="storageNote" rows={5} defaultValue={data.settings.storageNote} placeholder="例: Teams > 支援記録 > recordOODAバックアップ" />
              </Label>
              <SubmitButton>バックアップ先メモを保存</SubmitButton>
            </form>
          </div>
        </div>
      </Section>
    </>
  );
}

function PageHeader({
  title,
  description,
  image,
  action,
  compact = false,
  imageClassName = "",
}: {
  title: string;
  description: string;
  image?: string;
  action?: ReactNode;
  compact?: boolean;
  imageClassName?: string;
}) {
  return (
    <div className={`record-page-header mb-6 border-b border-ink/10 pb-5 ${compact ? "record-page-header-task" : ""}`}>
      <div className="record-page-main">
        {image ? (
          <img
            src={publicAssetPath(`/illustrations/${image}`)}
            alt=""
            width={144}
            height={96}
            loading={compact ? "eager" : "lazy"}
            decoding="async"
            className={`record-page-illustration h-24 w-36 rounded-md border border-ink/10 bg-white object-cover shadow-sm ${imageClassName}`}
          />
        ) : null}
        <div className="record-page-copy">
          <h1 className="record-page-title text-3xl font-bold tracking-normal text-ink">{title}</h1>
          <p className="record-page-description mt-2 max-w-3xl text-sm leading-6 text-ink/70">{description}</p>
        </div>
      </div>
      {action ? (
        <div className="record-page-aside">
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
    <section className="record-section dashboard-block mb-8">
      <div className="record-section-heading dashboard-block-heading mb-3">
        <h2 className="record-section-title text-lg font-semibold text-ink">{title}</h2>
        <Link href={href} className="dashboard-block-action">
          {actionLabel}
        </Link>
      </div>
      <div className="dashboard-block-list grid min-h-80 gap-3">{children}</div>
    </section>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <label className="record-label block text-sm font-medium text-ink/80">{children}</label>;
}

function RequiredMark() {
  return <span className="record-required-mark">必須</span>;
}

function OptionalMark() {
  return <span className="record-optional-mark">任意</span>;
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

function FormError({ children }: { children: ReactNode }) {
  return (
    <p className="record-form-error" role="alert">
      {children}
    </p>
  );
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
    <div className="record-card-top">
      <strong className="record-card-title">{title}</strong>
      <span className="record-card-meta">{meta}</span>
    </div>
  );
}

function StepPlate({ step, stage, tone }: { step: string; stage: string; tone: string }) {
  const stageLabel = stage === "Observe" ? "観察" : stage === "Orient" ? "見立て" : stage === "Decide" ? "支援" : stage === "Act" ? "反応" : stage;

  return (
    <div className={`ooda-current-step-plate ooda-current-step-plate-${tone}`} aria-hidden="true">
      <span className="ooda-current-step-number">{step}</span>
      <span className="ooda-current-step-stage">{stageLabel}</span>
      <span className="ooda-current-step-caption">現在の段階</span>
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

function SelectedObservationFocus({ observation, caseLabel }: { observation: ObservationRecord; caseLabel: string }) {
  return (
    <div className="orient-observation-summary" aria-label="根拠にする観察の要点">
      <div className="orient-observation-summary-head">
        <strong>{caseLabel}</strong>
        <span>
          {formatShortDateTime(observation.observedAt)} / {observation.programName}
        </span>
      </div>
      <p>{observation.factMemo || observation.userBehavior || "観察メモは未記録です。"}</p>
      {observation.userBehavior ? <small>行動: {observation.userBehavior}</small> : null}
      <details className="orient-observation-detail">
        <summary>直前・行動・直後を見る</summary>
        <dl>
          <div>
            <dt>直前の環境</dt>
            <dd>{observation.antecedent || "未記録"}</dd>
          </div>
          <div>
            <dt>利用者の行動</dt>
            <dd>{observation.userBehavior || "未記録"}</dd>
          </div>
          <div>
            <dt>直後の環境の変化</dt>
            <dd>{observation.consequence || "未記録"}</dd>
          </div>
        </dl>
      </details>
    </div>
  );
}

function HypothesisEditor({ index, role }: { index: number; role: "primary" | "alternate" | "optional" }) {
  const title = hypothesisEntryLabel(index);
  const badge = role === "primary" ? "主入力" : "任意";
  const isRequired = index === 0;

  return (
    <fieldset className={`rounded-md border border-ink/10 bg-white p-4 shadow-sm hypothesis-input-card hypothesis-input-card-${index + 1} hypothesis-input-card-${role}`}>
      <legend className="px-1 text-sm font-semibold text-ink">
        {title} <span className="hypothesis-role-badge">{badge}</span>
      </legend>
      <input type="hidden" name={`confidence-${index}`} defaultValue="50" />
      <input type="hidden" name={`status-${index}`} defaultValue="未検証" />
      {role === "primary" ? <p className="hypothesis-input-guide">必須は、カテゴリー、見立て文、根拠の3つです。</p> : null}
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
        <details className="secondary-field-details hypothesis-support-details hypothesis-act-details">
          <summary>ACTの補助軸</summary>
          <div className="record-context-grid mt-3">
            <Label>
              大事な方向 <OptionalMark />
              <Textarea name={`valueDirection-${index}`} rows={2} placeholder="本人が大事にしたいこと、向かいたい方向" />
            </Label>
            <Label>
              避けたい体験 <OptionalMark />
              <Textarea name={`avoidancePattern-${index}`} rows={2} placeholder="不安、失敗感、刺激、評価など避けていそうな体験" />
            </Label>
            <Label>
              強く働く考え <OptionalMark />
              <Textarea name={`fusedStory-${index}`} rows={2} placeholder="こうしないといけない、無理、失敗できない等" />
            </Label>
            <Label>
              今できる小さな一歩 <OptionalMark />
              <Textarea name={`smallStep-${index}`} rows={2} placeholder="その場で試せる最小の行動" />
            </Label>
          </div>
        </details>
        <Label>
          見立て文 {isRequired ? <RequiredMark /> : null}
          <Textarea name={`statement-${index}`} rows={3} placeholder="何が影響している可能性があるか" required={isRequired} />
        </Label>
        <Label>
          根拠となる観察 {isRequired ? <RequiredMark /> : null}
          <Textarea name={`evidence-${index}`} rows={3} placeholder="どの事実からそう考えたか" required={isRequired} />
        </Label>
        <details className="secondary-field-details hypothesis-support-details">
          <summary>反証・未確認点を残す</summary>
          <div className="mt-3 grid gap-3">
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
          </div>
        </details>
      </div>
    </fieldset>
  );
}

function hypothesisEntryLabel(index: number) {
  if (index === 0) return "主な見立て";
  return `別方向からの見立て ${index}`;
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
    cases: Array.isArray(parsed.cases) ? parsed.cases.map(normalizeCase).filter(isDefined) : [],
    observations: Array.isArray(parsed.observations) ? parsed.observations.map(normalizeObservation).filter(isDefined) : [],
    hypotheses: Array.isArray(parsed.hypotheses) ? parsed.hypotheses.map(normalizeHypothesis).filter(isDefined) : [],
    experiments: Array.isArray(parsed.experiments) ? parsed.experiments.map(normalizeExperiment).filter(isDefined) : [],
    actReviews: Array.isArray(parsed.actReviews) ? parsed.actReviews.map(normalizeActReview).filter(isDefined) : [],
    reflectionMemos: Array.isArray(parsed.reflectionMemos) ? parsed.reflectionMemos.map(normalizeReflectionMemo).filter(isDefined) : []
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

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function stringField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function booleanField(record: Record<string, unknown>, key: string, fallback = false) {
  const value = record[key];
  return typeof value === "boolean" ? value : fallback;
}

function numberField(record: Record<string, unknown>, key: string, fallback: number) {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringArrayField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeCase(value: unknown): OodaCase | null {
  if (!isRecord(value)) return null;
  const id = stringField(value, "id");
  if (!id) return null;
  return {
    id,
    displayName: stringField(value, "displayName"),
    memo: stringField(value, "memo"),
    isActive: booleanField(value, "isActive", true),
    createdAt: stringField(value, "createdAt"),
    updatedAt: stringField(value, "updatedAt")
  };
}

function normalizeObservation(value: unknown): ObservationRecord | null {
  if (!isRecord(value)) return null;
  const id = stringField(value, "id");
  const caseId = stringField(value, "caseId");
  if (!id || !caseId) return null;
  return {
    id,
    caseId,
    observedAt: stringField(value, "observedAt"),
    location: stringField(value, "location"),
    programName: stringField(value, "programName"),
    timing: stringField(value, "timing"),
    freeText: stringField(value, "freeText"),
    factMemo: stringField(value, "factMemo"),
    behaviorTags: stringArrayField(value, "behaviorTags"),
    antecedent: stringField(value, "antecedent"),
    userBehavior: stringField(value, "userBehavior"),
    consequence: stringField(value, "consequence"),
    unknownMemo: stringField(value, "unknownMemo"),
    observationChecklist: stringArrayField(value, "observationChecklist"),
    personWords: stringField(value, "personWords"),
    consentScope: stringField(value, "consentScope"),
    shareScope: stringField(value, "shareScope"),
    createdAt: stringField(value, "createdAt"),
    updatedAt: stringField(value, "updatedAt")
  };
}

function normalizeHypothesis(value: unknown): HypothesisRecord | null {
  if (!isRecord(value)) return null;
  const id = stringField(value, "id");
  const caseId = stringField(value, "caseId");
  const observationId = stringField(value, "observationId");
  if (!id || !caseId || !observationId) return null;
  return {
    id,
    caseId,
    observationId,
    category: stringField(value, "category") || HYPOTHESIS_CATEGORIES[0],
    statement: stringField(value, "statement"),
    evidence: stringField(value, "evidence"),
    counterEvidence: stringField(value, "counterEvidence"),
    unknowns: stringField(value, "unknowns"),
    nextObservationPoints: stringField(value, "nextObservationPoints"),
    valueDirection: stringField(value, "valueDirection"),
    avoidancePattern: stringField(value, "avoidancePattern"),
    fusedStory: stringField(value, "fusedStory"),
    smallStep: stringField(value, "smallStep"),
    confidence: numberField(value, "confidence", 50),
    status: parseHypothesisStatus(stringField(value, "status")),
    createdAt: stringField(value, "createdAt"),
    updatedAt: stringField(value, "updatedAt")
  };
}

function normalizeExperiment(value: unknown): SmallExperimentRecord | null {
  if (!isRecord(value)) return null;
  const id = stringField(value, "id");
  const caseId = stringField(value, "caseId");
  const hypothesisId = stringField(value, "hypothesisId");
  if (!id || !caseId || !hypothesisId) return null;
  return {
    id,
    caseId,
    hypothesisId,
    support: stringField(value, "support"),
    supportCategory: stringField(value, "supportCategory") || SUPPORT_CATEGORIES[0],
    targetChange: stringField(value, "targetChange"),
    metric: stringField(value, "metric") || METRIC_OPTIONS[0],
    plannedAt: stringField(value, "plannedAt"),
    reviewDueAt: stringField(value, "reviewDueAt"),
    cautions: stringField(value, "cautions"),
    nextTryCandidate: stringField(value, "nextTryCandidate"),
    decisionChecks: stringArrayField(value, "decisionChecks"),
    status: parseExperimentStatus(stringField(value, "status")),
    createdAt: stringField(value, "createdAt"),
    updatedAt: stringField(value, "updatedAt")
  };
}

function normalizeActReview(value: unknown): ActReviewRecord | null {
  if (!isRecord(value)) return null;
  const id = stringField(value, "id");
  const caseId = stringField(value, "caseId");
  const experimentId = stringField(value, "experimentId");
  const hypothesisId = stringField(value, "hypothesisId");
  if (!id || !caseId || !experimentId || !hypothesisId) return null;
  return {
    id,
    caseId,
    experimentId,
    hypothesisId,
    implementation: stringField(value, "implementation"),
    implementationStatus: parseImplementationStatus(stringField(value, "implementationStatus")),
    immediateResponse: stringField(value, "immediateResponse"),
    laterResponse: stringField(value, "laterResponse"),
    measuredValue: stringField(value, "measuredValue"),
    comparison: stringField(value, "comparison"),
    hypothesisUpdate: parseHypothesisStatus(stringField(value, "hypothesisUpdate")),
    nextObservationPoint: stringField(value, "nextObservationPoint"),
    nextTryCandidate: stringField(value, "nextTryCandidate"),
    createdAt: stringField(value, "createdAt"),
    updatedAt: stringField(value, "updatedAt")
  };
}

function normalizeReflectionMemo(value: unknown): ReflectionMemo | null {
  if (!isRecord(value)) return null;
  const id = stringField(value, "id");
  const caseId = stringField(value, "caseId");
  if (!id || !caseId) return null;
  return {
    id,
    caseId,
    targetRef: stringField(value, "targetRef"),
    columnKey: stringField(value, "columnKey"),
    body: stringField(value, "body"),
    createdAt: stringField(value, "createdAt"),
    updatedAt: stringField(value, "updatedAt")
  };
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
    return { label: "観察を入力", href: `/observe?caseId=${item.id}`, reason: "見立てる材料がまだないため、先に観察を残します。" };
  }
  if (item.counts.hypotheses === 0) {
    return { label: "見立てを入力", href: item.latestObservationId ? `/orient?observationId=${item.latestObservationId}` : "/orient", reason: "観察があります。見立てを整理します。" };
  }
  if (item.counts.experiments === 0) {
    return { label: "支援を選ぶ", href: item.latestHypothesisId ? `/decide?hypothesisId=${item.latestHypothesisId}` : "/decide", reason: "見立てがあります。試す支援を1つ選びます。" };
  }
  if (item.counts.actReviews === 0) {
    return { label: "反応を入力", href: item.latestExperimentId ? `/act?experimentId=${item.latestExperimentId}` : "/act", reason: "支援があります。反応から見立てを更新します。" };
  }
  return { label: "振り返る", href: `/reflect?caseId=${item.id}`, reason: "OODAが一巡しています。次に見る点を整理します。" };
}

function getNextStageIndex(item: CaseDockItem) {
  if (item.counts.observations === 0) return 0;
  if (item.counts.hypotheses === 0) return 1;
  if (item.counts.experiments === 0) return 2;
  if (item.counts.actReviews === 0) return 3;
  return -1;
}

function countForCaseStage(item: CaseDockItem, stage: string) {
  if (stage === "Observe") return item.counts.observations;
  if (stage === "Orient") return item.counts.hypotheses;
  if (stage === "Decide") return item.counts.experiments;
  return item.counts.actReviews;
}

function hrefForCaseStage(item: CaseDockItem, href: string) {
  if (href === "/observe") return `/observe?caseId=${item.id}`;
  if (href === "/orient" && item.latestObservationId) return `/orient?observationId=${item.latestObservationId}`;
  if (href === "/decide" && item.latestHypothesisId) return `/decide?hypothesisId=${item.latestHypothesisId}`;
  if (href === "/act" && item.latestExperimentId) return `/act?experimentId=${item.latestExperimentId}`;
  return href;
}

function compactLines(lines: Array<string | false | null | undefined>) {
  return lines.filter((line): line is string => typeof line === "string" && line.trim().length > 0).map((line) => line.trim());
}

function labeledLine(label: string, value: string | undefined) {
  return value?.trim() ? `${label}: ${value.trim()}` : "";
}

function listLine(label: string, values: string[] | undefined) {
  return values && values.length > 0 ? `${label}: ${values.join(" / ")}` : "";
}

function observationFactText(observation: ObservationRecord) {
  return compactLines([
    observation.factMemo,
    labeledLine("利用者の行動", observation.userBehavior),
    listLine("確認", observation.observationChecklist),
    labeledLine("本人の言葉", observation.personWords),
    labeledLine("扱える範囲", observation.consentScope),
    labeledLine("共有", observation.shareScope)
  ]).join("\n");
}

function hypothesisContextText(hypothesis: HypothesisRecord) {
  return compactLines([
    hypothesis.statement,
    labeledLine("大事な方向", hypothesis.valueDirection),
    labeledLine("避けたい体験", hypothesis.avoidancePattern),
    labeledLine("強く働く考え", hypothesis.fusedStory),
    labeledLine("小さな一歩", hypothesis.smallStep)
  ]).join("\n");
}

function experimentSupportText(experiment: SmallExperimentRecord | undefined) {
  if (!experiment) return "未記録";
  return compactLines([experiment.support, listLine("条件", experiment.decisionChecks)]).join("\n");
}

function reflectionColumnLabel(key: string) {
  switch (key) {
    case "orientation":
    case "hypothesis":
      return "見立ての更新";
    case "support":
      return "支援の調整";
    case "response":
      return "反応";
    case "share":
      return "チーム共有";
    case "fact":
      return "材料";
    case "next":
    default:
      return "次に見る一点";
  }
}

function hypothesisMemoTargetRef(hypothesisId: string) {
  return `hypothesis:${hypothesisId}`;
}

function reflectionRowTargetRef(row: ReflectionRow) {
  return row.hypothesisId ? hypothesisMemoTargetRef(row.hypothesisId) : `observation:${row.observationId}`;
}

function reflectionMemoTargetsRow(memo: ReflectionMemo, row: ReflectionRow) {
  return memo.targetRef === reflectionRowTargetRef(row) || memo.targetRef === row.id || (!row.hypothesisId && memo.targetRef === row.observationId);
}

function reflectionMemosForHypothesis(memos: ReflectionMemo[], hypothesis: HypothesisRecord) {
  const currentTarget = hypothesisMemoTargetRef(hypothesis.id);
  const legacyTarget = `${hypothesis.observationId}-${hypothesis.id}`;
  return memos.filter((memo) => memo.targetRef === currentTarget || memo.targetRef === legacyTarget).sort(byNewest);
}

function orientationUpdateText(review: ActReviewRecord | undefined) {
  if (!review) return "反応待ち";
  if (review.hypothesisUpdate === "強まった") return "この見立てを強めて、同じ方向で次を見る";
  if (review.hypothesisUpdate === "弱まった") return "この見立てを弱めて、別の説明も見る";
  if (review.hypothesisUpdate === "保留") return "見立ては保留し、次の観察で確かめる";
  return `見立ては${review.hypothesisUpdate}`;
}

function supportAdjustmentText(experiment: SmallExperimentRecord | undefined, review: ActReviewRecord | undefined) {
  if (!experiment) return "支援未選択";
  if (!review) return "支援後の反応を入れてから調整";
  const direction =
    review.hypothesisUpdate === "強まった"
      ? "続ける候補"
      : review.hypothesisUpdate === "弱まった"
        ? "変える候補"
        : "保留して次に見る";
  return (
    compactLines([
      direction,
      labeledLine("実施", review.implementationStatus),
      labeledLine("次回候補", review.nextTryCandidate || experiment.nextTryCandidate),
      labeledLine("注意", experiment.cautions)
    ]).join("\n") || "次回も同じ支援でよいか確認"
  );
}

function buildReflectionRows(data: AppData, caseId: string): ReflectionRow[] {
  return data.observations
    .filter((observation) => observation.caseId === caseId)
    .sort(byNewest)
    .flatMap<ReflectionRow>((observation) => {
      const hypotheses = data.hypotheses.filter((hypothesis) => hypothesis.observationId === observation.id);
      if (hypotheses.length === 0) {
        return [
          {
            id: observation.id,
            observationId: observation.id,
            hypothesisId: null,
            label: `${formatShortDate(observation.observedAt)} 観察`,
            fact: observationFactText(observation),
            hypothesis: "未記録",
            evidence: compactLines([labeledLine("直前の環境", observation.antecedent), labeledLine("行動", observation.userBehavior)]).join("\n"),
            counter: observation.unknownMemo || "未記録",
            support: "未記録",
            response: observation.consequence,
            next: observation.unknownMemo || "次の観察で確認",
            loopStatus: "incomplete",
            orientationUpdate: "見立て未記録",
            supportAdjustment: "支援未選択",
            sourceFact: observation.factMemo || observation.userBehavior || "観察メモ"
          }
        ];
      }
      return hypotheses.map((hypothesis) => {
        const experiment = data.experiments.find((item) => item.hypothesisId === hypothesis.id);
        const review = experiment ? data.actReviews.find((item) => item.experimentId === experiment.id) : undefined;
        return {
          id: `${observation.id}-${hypothesis.id}`,
          observationId: observation.id,
          hypothesisId: hypothesis.id,
          label: `${formatShortDate(observation.observedAt)} ${hypothesis.category}`,
          fact: observationFactText(observation),
          hypothesis: hypothesisContextText(hypothesis),
          evidence: hypothesis.evidence,
          counter: compactLines([labeledLine("反証", hypothesis.counterEvidence), labeledLine("未確認", hypothesis.unknowns)]).join("\n") || "未記録",
          support: experimentSupportText(experiment),
          response: compactLines([
            review?.immediateResponse ?? observation.consequence,
            labeledLine("後続", review?.laterResponse),
            labeledLine("比較", review?.comparison)
          ]).join("\n"),
          next: review?.nextObservationPoint || hypothesis.nextObservationPoints || observation.unknownMemo || "次の観察で確認",
          loopStatus: review ? "complete" : "incomplete",
          orientationUpdate: orientationUpdateText(review),
          supportAdjustment: supportAdjustmentText(experiment, review),
          sourceFact: observation.factMemo || observation.userBehavior || hypothesis.statement
        };
      });
    });
}

function buildSummary(data: AppData, observation: ObservationRecord) {
  const hypothesis = data.hypotheses.find((item) => item.observationId === observation.id);
  const experiment = hypothesis ? data.experiments.find((item) => item.hypothesisId === hypothesis.id) : undefined;
  const review = experiment ? data.actReviews.find((item) => item.experimentId === experiment.id) : undefined;
  const scene = `${observation.location}の${observation.programName}`;
  const hypothesisText = hypothesis?.statement ?? "見立ては未記録";
  const support = experiment?.support ?? "支援は未記録";
  const response = review?.immediateResponse ?? observation.consequence;
  const behaviorSentence = observation.userBehavior ? `利用者の行動として「${observation.userBehavior}」が見られ、` : "";
  const observationDetails = compactLines([
    listLine("確認した観察", observation.observationChecklist),
    labeledLine("本人の言葉", observation.personWords),
    labeledLine("扱える範囲", observation.consentScope),
    labeledLine("共有", observation.shareScope)
  ]).join("。");
  const orientContext = hypothesis
    ? compactLines([
        labeledLine("大事な方向", hypothesis.valueDirection),
        labeledLine("避けたい体験", hypothesis.avoidancePattern),
        labeledLine("強く働く考え", hypothesis.fusedStory),
        labeledLine("小さな一歩", hypothesis.smallStep)
      ]).join("。")
    : "";
  const decisionContext = experiment?.decisionChecks.length ? `試す条件は「${experiment.decisionChecks.join("、")}」。` : "";
  return `本日は${scene}で、「${observation.factMemo}」が見られた。直前の環境は「${observation.antecedent}」で、${behaviorSentence}直後の環境の変化として「${observation.consequence}」があった。${observationDetails ? `${observationDetails}。` : ""}「${hypothesisText}」の可能性を置いた。${orientContext ? `${orientContext}。` : ""}次に「${support}」を試す。${decisionContext}反応として「${response}」を確認し、次回は「${review?.nextObservationPoint || hypothesis?.nextObservationPoints || observation.unknownMemo || "未確認点"}」を見る。`;
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
