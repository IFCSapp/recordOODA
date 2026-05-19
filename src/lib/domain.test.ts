import { describe, expect, it } from "vitest";
import {
  applyActReviewDraft,
  createHypothesisDraft,
  createObservationDraft,
  createSmallExperimentDraft,
  generateExportSummary,
  getExportNotice,
  getFactMemoWarning,
  getMultipleSupportWarning,
  shouldPromptAdditionalHypothesis
} from "./domain";

const observedAt = new Date("2026-05-19T10:00:00");
const reviewDueAt = new Date("2026-05-26T10:00:00");

describe("OODA MVP domain rules", () => {
  it("Observe作成ができる", () => {
    const observation = createObservationDraft({
      caseId: "case-a",
      observedAt,
      location: "作業室",
      programName: "PC課題",
      timing: "昼休み後",
      factMemo: "3分間キーボードに触れず、画面を見ていた。",
      behaviorTags: ["開始できない"],
      antecedent: "席替えがあった",
      consequence: "職員が手順を再提示した",
      environmentSensory: [],
      interpersonalContext: [],
      bodyPsych: []
    });

    expect(observation.factMemo).toContain("キーボード");
  });

  it("解釈語が含まれると警告が出る", () => {
    const warning = getFactMemoWarning("やる気がない様子で座っていた");
    expect(warning?.message).toContain("解釈や評価");
    expect(warning?.terms).toContain("やる気がない");
  });

  it("Hypothesis作成ができる", () => {
    const hypothesis = createHypothesisDraft({
      caseId: "case-a",
      observationId: "obs-a",
      category: "見通し・変化への弱さ",
      statement: "予定変更による見通しの崩れが影響している可能性がある。",
      evidence: "席替え後に開始まで時間がかかった。",
      counterEvidence: "昼食後の疲労もありうる。",
      unknowns: "事前予告の有無",
      nextObservationPoints: "予告ありの日の開始時間",
      confidence: 55
    });

    expect(hypothesis.category).toBe("見通し・変化への弱さ");
  });

  it("仮説が1つだけのときに追加仮説の促しが出る", () => {
    expect(shouldPromptAdditionalHypothesis(1)).toContain("別の可能性");
    expect(shouldPromptAdditionalHypothesis(2)).toBeNull();
  });

  it("SmallExperiment作成ができる", () => {
    const experiment = createSmallExperimentDraft({
      caseId: "case-a",
      hypothesisId: "hyp-a",
      support: "休憩終了2分前に戻り予告を行う。",
      supportCategory: "見通し支援",
      targetChange: "開始までの時間が短くなる",
      metric: "開始までの時間",
      reviewDueAt,
      plannedAt: observedAt,
      cautions: "声かけは短くする"
    });

    expect(experiment.metric).toBe("開始までの時間");
  });

  it("複数支援を同時に選んだときに警告が出る", () => {
    expect(getMultipleSupportWarning(["予告", "席変更"])).toContain("一度に一つ");
    expect(getMultipleSupportWarning(["予告", ""])).toBeNull();
  });

  it("ActReview保存後、Hypothesisのステータスを更新できる", () => {
    const result = applyActReviewDraft({
      caseId: "case-a",
      experimentId: "exp-a",
      hypothesisId: "hyp-a",
      implementation: "予告してから着席を促した。",
      implementationStatus: "予定通り",
      immediateResponse: "40秒で開始した。",
      hypothesisUpdate: "強まった"
    });

    expect(result.nextHypothesisStatus).toBe("強まった");
  });

  it("ExportSummaryが一段落で生成される", () => {
    const summary = generateExportSummary({
      scene: "昼休み後のPC課題",
      fact: "3分間キーボードに触れなかった",
      antecedent: "席替えがあった",
      consequence: "職員が手順を再提示した",
      hypothesis: "予定変更による見通しの崩れ",
      support: "休憩終了2分前の戻り予告",
      metric: "開始までの時間"
    });

    expect(summary).not.toContain("\n");
    expect(summary).toMatch(/^本日は/);
  });

  it("ExportSummary画面に「法定様式の代替ではない」という注意文が出る", () => {
    expect(getExportNotice()).toContain("法定様式の代替ではない");
  });
});
