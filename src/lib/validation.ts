import { z } from "zod";
import {
  EXPERIMENT_STATUSES,
  HYPOTHESIS_CATEGORIES,
  HYPOTHESIS_STATUSES,
  IMPLEMENTATION_STATUSES,
  METRIC_OPTIONS
} from "./constants";

const requiredText = (label: string) => z.string().trim().min(1, `${label}は必須です`);
const optionalText = z.string().trim().optional().default("");
const dateLike = z.coerce.date();
const optionalNumber = z.coerce.number().int().nonnegative().optional();

export const caseSchema = z.object({
  displayName: requiredText("表示名"),
  memo: optionalText,
  isActive: z.coerce.boolean().optional().default(true)
});

export const observationSchema = z.object({
  caseId: requiredText("ケースID"),
  staffId: z.string().trim().optional(),
  observedAt: dateLike,
  location: requiredText("場所"),
  programName: requiredText("プログラム名"),
  timing: requiredText("タイミング"),
  freeText: optionalText,
  factMemo: requiredText("事実メモ"),
  behaviorTags: z.array(z.string()).default([]),
  antecedent: requiredText("直前の出来事"),
  consequence: requiredText("直後の結果"),
  startLatencySeconds: optionalNumber,
  stoppedDurationSeconds: optionalNumber,
  promptCount: optionalNumber,
  resumeLatencySeconds: optionalNumber,
  workCondition: optionalText,
  environmentSensory: z.array(z.string()).default([]),
  interpersonalContext: z.array(z.string()).default([]),
  bodyPsych: z.array(z.string()).default([]),
  protectiveFactors: optionalText,
  riskUrgency: optionalText,
  unknownMemo: optionalText
});

export const hypothesisSchema = z.object({
  caseId: requiredText("ケースID"),
  observationId: z.string().trim().optional(),
  staffId: z.string().trim().optional(),
  category: z.enum(HYPOTHESIS_CATEGORIES),
  statement: requiredText("見立て文"),
  evidence: requiredText("根拠"),
  counterEvidence: optionalText,
  unknowns: optionalText,
  nextObservationPoints: optionalText,
  confidence: z.coerce.number().int().min(0).max(100).default(50),
  status: z.enum(HYPOTHESIS_STATUSES).default("未検証")
});

export const smallExperimentSchema = z.object({
  caseId: requiredText("ケースID"),
  hypothesisId: requiredText("見立て"),
  staffId: z.string().trim().optional(),
  support: requiredText("試す支援"),
  supportCategory: requiredText("支援カテゴリー"),
  targetChange: requiredText("狙う変化"),
  metric: z.enum(METRIC_OPTIONS),
  reviewDueAt: dateLike,
  plannedAt: dateLike,
  cautions: optionalText,
  nextTryCandidate: optionalText,
  status: z.enum(EXPERIMENT_STATUSES).default("予定")
});

export const actReviewSchema = z.object({
  caseId: requiredText("ケースID"),
  experimentId: requiredText("実験カード"),
  hypothesisId: requiredText("見立て"),
  staffId: z.string().trim().optional(),
  implementation: requiredText("実施内容"),
  implementationStatus: z.enum(IMPLEMENTATION_STATUSES),
  immediateResponse: requiredText("直後反応"),
  laterResponse: optionalText,
  measuredValue: optionalText,
  comparison: optionalText,
  hypothesisUpdate: z.enum(["強まった", "弱まった", "保留"]),
  nextObservationPoint: optionalText,
  nextTryCandidate: optionalText
});

export const reflectionMemoSchema = z.object({
  caseId: requiredText("ケースID"),
  observationId: z.string().trim().optional(),
  hypothesisId: z.string().trim().optional(),
  staffId: z.string().trim().optional(),
  columnKey: requiredText("列"),
  body: requiredText("メモ")
});

export const exportSummarySchema = z.object({
  caseId: requiredText("ケースID"),
  observationId: requiredText("観察"),
  hypothesisId: z.string().trim().optional(),
  experimentId: z.string().trim().optional(),
  staffId: z.string().trim().optional(),
  summary: requiredText("要約")
});

export type ObservationInput = z.input<typeof observationSchema>;
export type HypothesisInput = z.input<typeof hypothesisSchema>;
export type SmallExperimentInput = z.input<typeof smallExperimentSchema>;
export type ActReviewInput = z.input<typeof actReviewSchema>;
