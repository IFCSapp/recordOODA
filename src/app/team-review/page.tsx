import Link from "next/link";
import { createTeamReviewCommentAction } from "@/app/actions";
import { EmptyState, Label, PageHeader, Section, Select, SubmitButton, Tag, Textarea } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TeamReviewPage({ searchParams }: { searchParams?: { caseId?: string } }) {
  const cases = await prisma.case.findMany({ orderBy: { updatedAt: "desc" } });
  const selectedCaseId = searchParams?.caseId ?? cases[0]?.id;

  const observations = selectedCaseId
    ? await prisma.observation.findMany({
        where: { caseId: selectedCaseId },
        include: {
          case: true,
          hypotheses: {
            include: {
              smallExperiments: {
                include: { actReviews: true },
                orderBy: { createdAt: "desc" }
              },
              teamReviewComments: {
                orderBy: { createdAt: "desc" },
                take: 5
              }
            },
            orderBy: { createdAt: "desc" }
          },
          teamReviewComments: {
            orderBy: { createdAt: "desc" },
            take: 5
          }
        },
        orderBy: { observedAt: "desc" },
        take: 30
      })
    : [];

  type ReviewObservation = (typeof observations)[number];
  type ReviewHypothesis = ReviewObservation["hypotheses"][number];
  const rows: { observation: ReviewObservation; hypothesis: ReviewHypothesis | null }[] = [];
  for (const observation of observations) {
    if (observation.hypotheses.length === 0) {
      rows.push({ observation, hypothesis: null });
    } else {
      for (const hypothesis of observation.hypotheses) {
        rows.push({ observation, hypothesis });
      }
    }
  }

  return (
    <>
      <PageHeader
        title="チームレビュー"
        description="コメント欄だけで終わらせず、事実、仮説、根拠、反証・未確認点、支援、反応、次の確認点を横に分けて確認します。"
        image={{ src: "/illustrations/team-review.png", alt: "チームで表を確認する小さな図" }}
      />

      <Section title="対象ケース">
        {cases.length === 0 ? (
          <EmptyState>
            ケースがまだありません。<Link href="/cases" className="font-medium text-skyline">ケースを作成</Link>してください。
          </EmptyState>
        ) : (
          <form className="rounded-md border border-ink/10 bg-white p-4 shadow-sm">
            <Label>
              ケース
              <Select name="caseId" defaultValue={selectedCaseId}>
                {cases.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.displayName}
                  </option>
                ))}
              </Select>
            </Label>
            <div className="mt-3">
              <SubmitButton>表示</SubmitButton>
            </div>
          </form>
        )}
      </Section>

      <Section title="レビュー表">
        {rows.length === 0 ? (
          <EmptyState>このケースのレビュー対象はまだありません。</EmptyState>
        ) : (
          <div className="overflow-x-auto rounded-md border border-ink/10 bg-white shadow-sm">
            <table className="min-w-[1180px] border-collapse text-left text-sm">
              <thead className="bg-field text-xs text-ink/65">
                <tr>
                  {["事実", "仮説", "根拠", "反証・未確認点", "試した支援", "反応", "次の確認点"].map((label) => (
                    <th key={label} className="border-b border-ink/10 px-3 py-3 font-semibold">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ observation, hypothesis }) => {
                  const experiment = hypothesis?.smallExperiments[0];
                  const review = experiment?.actReviews[0];
                  return (
                    <tr key={`${observation.id}-${hypothesis?.id ?? "none"}`} className="align-top">
                      <Cell>
                        <div className="font-medium">{observation.case.displayName}</div>
                        <div className="mt-1 text-xs text-ink/50">{formatDateTime(observation.observedAt)}</div>
                        <p className="mt-2">{observation.factMemo}</p>
                      </Cell>
                      <Cell>
                        {hypothesis ? (
                          <>
                            <Tag>{hypothesis.category}</Tag>
                            <p className="mt-2">{hypothesis.statement}</p>
                          </>
                        ) : (
                          "未作成"
                        )}
                      </Cell>
                      <Cell>{hypothesis?.evidence ?? "未入力"}</Cell>
                      <Cell>{hypothesis ? [hypothesis.counterEvidence, hypothesis.unknowns].filter(Boolean).join(" / ") || "未入力" : "未入力"}</Cell>
                      <Cell>{experiment?.support ?? "未作成"}</Cell>
                      <Cell>{review?.immediateResponse ?? "未記録"}</Cell>
                      <Cell>{review?.nextObservationPoint || hypothesis?.nextObservationPoints || observation.unknownMemo || "未入力"}</Cell>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {selectedCaseId ? (
        <Section title="レビューコメント">
          <form action={createTeamReviewCommentAction} className="grid gap-4 rounded-md border border-ink/10 bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr]">
            <input type="hidden" name="caseId" value={selectedCaseId} />
            <Label>
              対象
              <Select name="observationId">
                <option value="">ケース全体</option>
                {observations.map((observation) => (
                  <option key={observation.id} value={observation.id}>
                    {formatDateTime(observation.observedAt)} / {observation.programName}
                  </option>
                ))}
              </Select>
            </Label>
            <Label>
              列
              <Select name="columnKey" defaultValue="次の確認点">
                {["事実", "仮説", "根拠", "反証・未確認点", "試した支援", "反応", "次の確認点"].map((column) => (
                  <option key={column} value={column}>
                    {column}
                  </option>
                ))}
              </Select>
            </Label>
            <Label>
              コメント
              <Textarea name="body" rows={3} placeholder="確認したい事実、別の可能性、次回見る点など" required />
            </Label>
            <div className="flex items-end">
              <SubmitButton>コメントを追加</SubmitButton>
            </div>
          </form>

          <div className="mt-4 grid gap-3">
            {observations.flatMap((observation) => observation.teamReviewComments).length === 0 ? (
              <EmptyState>コメントはまだありません。</EmptyState>
            ) : (
              observations.flatMap((observation) =>
                observation.teamReviewComments.map((comment) => (
                  <article key={comment.id} className="rounded-md border border-ink/10 bg-white p-3 text-sm shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag>{comment.columnKey}</Tag>
                      <span className="text-xs text-ink/50">{formatDateTime(comment.createdAt)}</span>
                    </div>
                    <p className="mt-2 leading-6 text-ink/75">{comment.body}</p>
                  </article>
                ))
              )
            )}
          </div>
        </Section>
      ) : null}
    </>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td className="border-b border-ink/10 px-3 py-3 leading-6 text-ink/75">{children}</td>;
}
