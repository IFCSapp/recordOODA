import {
  EXPORT_NOTICE,
  FACT_WARNING_MESSAGE,
  MULTIPLE_SUPPORT_WARNING,
  SINGLE_HYPOTHESIS_PROMPT,
  WARNING_DICTIONARY
} from "./constants";
import type { ActReviewInput, HypothesisInput, ObservationInput, SmallExperimentInput } from "./validation";
import {
  actReviewSchema,
  hypothesisSchema,
  observationSchema,
  smallExperimentSchema
} from "./validation";

export function findInterpretationTerms(text: string) {
  return WARNING_DICTIONARY.filter((term) => text.includes(term));
}

export function getFactMemoWarning(text: string) {
  const terms = findInterpretationTerms(text);
  if (terms.length === 0) {
    return null;
  }
  return {
    message: FACT_WARNING_MESSAGE,
    terms
  };
}

export function shouldPromptAdditionalHypothesis(hypothesisCount: number) {
  return hypothesisCount === 1 ? SINGLE_HYPOTHESIS_PROMPT : null;
}

export function getMultipleSupportWarning(supports: string[]) {
  const filled = supports.map((support) => support.trim()).filter(Boolean);
  return filled.length > 1 ? MULTIPLE_SUPPORT_WARNING : null;
}

export function createObservationDraft(input: ObservationInput) {
  return observationSchema.parse(input);
}

export function createHypothesisDraft(input: HypothesisInput) {
  return hypothesisSchema.parse(input);
}

export function createSmallExperimentDraft(input: SmallExperimentInput) {
  return smallExperimentSchema.parse(input);
}

export function applyActReviewDraft(input: ActReviewInput) {
  const review = actReviewSchema.parse(input);
  return {
    review,
    nextHypothesisStatus: review.hypothesisUpdate
  };
}

export type ExportSummaryParts = {
  scene: string;
  fact: string;
  antecedent: string;
  userBehavior: string;
  consequence: string;
  hypothesis: string;
  support: string;
  metric: string;
};

export function generateExportSummary(parts: ExportSummaryParts) {
  return `本日は${wrap(parts.scene)}で、${wrap(parts.fact)}が見られた。行動の前には${wrap(parts.antecedent)}があり、本人は${wrap(parts.userBehavior)}をしていた。その後、${wrap(parts.consequence)}があった。${wrap(parts.hypothesis)}が影響している可能性があるため、次回は${wrap(parts.support)}を行い、${wrap(parts.metric)}の変化を確認する。`;
}

export function getExportNotice() {
  return EXPORT_NOTICE;
}

function wrap(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? `〔${trimmed}〕` : "〔未入力〕";
}
