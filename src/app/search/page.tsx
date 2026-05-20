import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { EmptyState, Input, Label, Notice, PageHeader, Section, Select, SubmitButton, Tag } from "@/components/ui";
import { BODY_PSYCH_TAGS, ENVIRONMENT_TAGS, HYPOTHESIS_CATEGORIES, INTERPERSONAL_TAGS, SIMILAR_SCENE_NOTICE } from "@/lib/constants";
import { csvToTags, formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;
type TextSearchField =
  | "behaviorTags"
  | "antecedent"
  | "consequence"
  | "environmentSensory"
  | "interpersonalContext"
  | "bodyPsych";

export default async function SearchPage({ searchParams = {} }: { searchParams?: Params }) {
  const cases = await prisma.case.findMany({ orderBy: { updatedAt: "desc" } });
  const where = buildObservationWhere(searchParams);
  const hasFilters = Object.keys(searchParams).some((key) => Boolean(first(searchParams[key])));

  const results = hasFilters
    ? await prisma.observation.findMany({
        where,
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
        take: 40
      })
    : [];

  return (
    <>
      <PageHeader
        title="類似場面検索"
        description="過去の場面を、行動タグ、先行条件、結果、見立てカテゴリーなどから探します。"
        image={{ src: "/illustrations/search.png", alt: "類似場面検索を表す小さな図" }}
      />

      <Section title="検索条件">
        <form className="grid gap-4 rounded-md border border-ink/10 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4">
          <Label>
            ケース
            <Select name="caseId" defaultValue={first(searchParams.caseId) ?? ""}>
              <option value="">すべて</option>
              {cases.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.displayName}
                </option>
              ))}
            </Select>
          </Label>
          <Label>
            行動タグ
            <Input name="behaviorTag" defaultValue={first(searchParams.behaviorTag) ?? ""} placeholder="開始できないなど" />
          </Label>
          <Label>
            直前の出来事
            <Input name="antecedent" defaultValue={first(searchParams.antecedent) ?? ""} placeholder="予定変更など" />
          </Label>
          <Label>
            直後の結果
            <Input name="consequence" defaultValue={first(searchParams.consequence) ?? ""} placeholder="休憩になったなど" />
          </Label>
          <Label>
            見立てカテゴリー
            <Select name="category" defaultValue={first(searchParams.category) ?? ""}>
              <option value="">すべて</option>
              {HYPOTHESIS_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </Label>
          <Label>
            環境タグ
            <Select name="environmentTag" defaultValue={first(searchParams.environmentTag) ?? ""}>
              <option value="">すべて</option>
              {ENVIRONMENT_TAGS.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </Select>
          </Label>
          <Label>
            対人タグ
            <Select name="interpersonalTag" defaultValue={first(searchParams.interpersonalTag) ?? ""}>
              <option value="">すべて</option>
              {INTERPERSONAL_TAGS.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </Select>
          </Label>
          <Label>
            身体・心理タグ
            <Select name="bodyPsychTag" defaultValue={first(searchParams.bodyPsychTag) ?? ""}>
              <option value="">すべて</option>
              {BODY_PSYCH_TAGS.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </Select>
          </Label>
          <Label>
            期間開始
            <Input name="from" type="date" defaultValue={first(searchParams.from) ?? ""} />
          </Label>
          <Label>
            期間終了
            <Input name="to" type="date" defaultValue={first(searchParams.to) ?? ""} />
          </Label>
          <div className="md:col-span-2 xl:col-span-4">
            <SubmitButton>検索</SubmitButton>
          </div>
        </form>
      </Section>

      <Notice>{SIMILAR_SCENE_NOTICE}</Notice>

      <Section title="検索結果">
        {!hasFilters ? (
          <EmptyState>条件を入れて検索してください。</EmptyState>
        ) : results.length === 0 ? (
          <EmptyState>該当する場面はありませんでした。</EmptyState>
        ) : (
          <div className="grid gap-4">
            {results.map((observation) => {
              const hypothesis = observation.hypotheses[0];
              const experiment = hypothesis?.smallExperiments[0];
              const review = experiment?.actReviews[0];

              return (
                <article key={observation.id} className="rounded-md border border-ink/10 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong>{observation.case.displayName}</strong>
                    <span className="text-xs text-ink/55">{formatDateTime(observation.observedAt)}</span>
                  </div>
                  <div className="mt-3 grid gap-4 lg:grid-cols-3">
                    <ResultField label="場面" value={`${observation.location} / ${observation.programName} / ${observation.timing}`} />
                    <ResultField label="観察された事実" value={observation.factMemo} />
                    <ResultField label="仮説" value={hypothesis?.statement ?? "未作成"} />
                    <ResultField label="試した支援" value={experiment?.support ?? "未作成"} />
                    <ResultField label="結果" value={review?.immediateResponse ?? "未記録"} />
                    <ResultField label="成功条件らしきもの" value={review?.comparison || observation.protectiveFactors || "未整理"} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {csvToTags(observation.behaviorTags).map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                    {hypothesis ? <Tag>{hypothesis.category}</Tag> : null}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <ResultLink href={`/cases/${observation.caseId}`}>ケースを開く</ResultLink>
                    <ResultLink href={`/orient?observationId=${observation.id}`}>
                      {hypothesis ? "見立てを確認する" : "この観察から見立てる"}
                    </ResultLink>
                    {hypothesis ? <ResultLink href={`/decide?hypothesisId=${hypothesis.id}`}>支援を決める</ResultLink> : null}
                    {experiment ? <ResultLink href={`/act?experimentId=${experiment.id}`}>反応を記録する</ResultLink> : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Section>
    </>
  );
}

function buildObservationWhere(searchParams: Params) {
  const where: Prisma.ObservationWhereInput = {};
  const and: Prisma.ObservationWhereInput[] = [];
  const caseId = first(searchParams.caseId);

  if (caseId) {
    where.caseId = caseId;
  }
  addContains(and, "behaviorTags", first(searchParams.behaviorTag));
  addContains(and, "antecedent", first(searchParams.antecedent));
  addContains(and, "consequence", first(searchParams.consequence));
  addContains(and, "environmentSensory", first(searchParams.environmentTag));
  addContains(and, "interpersonalContext", first(searchParams.interpersonalTag));
  addContains(and, "bodyPsych", first(searchParams.bodyPsychTag));

  const category = first(searchParams.category);
  if (category) {
    and.push({ hypotheses: { some: { category } } });
  }

  const from = first(searchParams.from);
  const to = first(searchParams.to);
  if (from || to) {
    where.observedAt = {
      ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59`) } : {})
    };
  }

  if (Array.isArray(and) && and.length > 0) {
    where.AND = and;
  }
  return where;
}

function addContains(and: Prisma.ObservationWhereInput[], field: TextSearchField, value?: string) {
  if (!value) {
    return;
  }
  and.push({ [field]: { contains: value } });
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function ResultField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l-2 border-ink/10 pl-3">
      <div className="text-xs font-semibold text-ink/50">{label}</div>
      <p className="mt-1 text-sm leading-6 text-ink/75">{value}</p>
    </div>
  );
}

function ResultLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="focus-ring rounded-md border border-ink/15 bg-white px-3 py-2 text-sm font-medium text-ink transition hover:border-skyline hover:text-skyline">
      {children}
    </Link>
  );
}
