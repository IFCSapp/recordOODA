"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DEFAULT_STAFF_ID } from "@/lib/constants";
import { generateExportSummary } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import {
  actReviewSchema,
  caseSchema,
  exportSummarySchema,
  hypothesisSchema,
  observationSchema,
  smallExperimentSchema,
  teamReviewCommentSchema
} from "@/lib/validation";

async function ensureDefaultStaff() {
  return prisma.staff.upsert({
    where: { id: DEFAULT_STAFF_ID },
    update: { displayName: "デモ職員" },
    create: { id: DEFAULT_STAFF_ID, displayName: "デモ職員" }
  });
}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value.length > 0 ? value : undefined;
}

function allText(formData: FormData, key: string) {
  return formData.getAll(key).filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean);
}

function optionalNumber(formData: FormData, key: string) {
  const value = text(formData, key);
  return value.length > 0 ? Number(value) : undefined;
}

function splitRef(value: string) {
  return value.split("|").map((part) => part.trim());
}

function withError(path: string, code: "validation" | "save" | "no-hypothesis" = "validation") {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}error=${code}`;
}

export async function createCaseAction(formData: FormData) {
  const staff = await ensureDefaultStaff();
  const result = caseSchema.safeParse({
    displayName: text(formData, "displayName"),
    memo: text(formData, "memo"),
    isActive: formData.get("isActive") !== null
  });
  if (!result.success) {
    redirect(withError("/cases"));
  }
  const parsed = result.data;

  try {
    await prisma.case.create({
      data: {
        ...parsed,
        staffId: staff.id
      }
    });
  } catch {
    redirect(withError("/cases", "save"));
  }

  revalidatePath("/cases");
  redirect("/cases");
}

export async function createObservationAction(formData: FormData) {
  const staff = await ensureDefaultStaff();
  const caseId = text(formData, "caseId");
  const errorPath = caseId ? `/observe?caseId=${encodeURIComponent(caseId)}` : "/observe";
  const result = observationSchema.safeParse({
    caseId,
    staffId: staff.id,
    observedAt: text(formData, "observedAt"),
    location: text(formData, "location"),
    programName: text(formData, "programName"),
    timing: text(formData, "timing"),
    freeText: text(formData, "freeText"),
    factMemo: text(formData, "factMemo"),
    behaviorTags: allText(formData, "behaviorTags"),
    antecedent: text(formData, "antecedent"),
    consequence: text(formData, "consequence"),
    startLatencySeconds: optionalNumber(formData, "startLatencySeconds"),
    stoppedDurationSeconds: optionalNumber(formData, "stoppedDurationSeconds"),
    promptCount: optionalNumber(formData, "promptCount"),
    resumeLatencySeconds: optionalNumber(formData, "resumeLatencySeconds"),
    workCondition: text(formData, "workCondition"),
    environmentSensory: allText(formData, "environmentSensory"),
    interpersonalContext: allText(formData, "interpersonalContext"),
    bodyPsych: allText(formData, "bodyPsych"),
    protectiveFactors: text(formData, "protectiveFactors"),
    riskUrgency: text(formData, "riskUrgency"),
    unknownMemo: text(formData, "unknownMemo")
  });
  if (!result.success) {
    redirect(withError(errorPath));
  }
  const parsed = result.data;

  let observation: { id: string };
  try {
    observation = await prisma.observation.create({
      data: {
        staffId: parsed.staffId,
        caseId: parsed.caseId,
        observedAt: parsed.observedAt,
        location: parsed.location,
        programName: parsed.programName,
        timing: parsed.timing,
        freeText: parsed.freeText,
        factMemo: parsed.factMemo,
        behaviorTags: parsed.behaviorTags.join(","),
        antecedent: parsed.antecedent,
        consequence: parsed.consequence,
        startLatencySeconds: parsed.startLatencySeconds,
        stoppedDurationSeconds: parsed.stoppedDurationSeconds,
        promptCount: parsed.promptCount,
        resumeLatencySeconds: parsed.resumeLatencySeconds,
        workCondition: parsed.workCondition,
        environmentSensory: parsed.environmentSensory.join(","),
        interpersonalContext: parsed.interpersonalContext.join(","),
        bodyPsych: parsed.bodyPsych.join(","),
        protectiveFactors: parsed.protectiveFactors,
        riskUrgency: parsed.riskUrgency,
        unknownMemo: parsed.unknownMemo
      }
    });

    const tagRows = [
      ...parsed.behaviorTags.map((label) => ({ kind: "行動", label })),
      ...parsed.environmentSensory.map((label) => ({ kind: "環境", label })),
      ...parsed.interpersonalContext.map((label) => ({ kind: "対人", label })),
      ...parsed.bodyPsych.map((label) => ({ kind: "身体心理", label }))
    ];

    if (tagRows.length > 0) {
      await prisma.observationTag.createMany({
        data: tagRows.map((tag) => ({
          staffId: staff.id,
          caseId: parsed.caseId,
          observationId: observation.id,
          kind: tag.kind,
          label: tag.label
        }))
      });
    }
  } catch {
    redirect(withError(errorPath, "save"));
  }

  revalidatePath("/");
  revalidatePath("/observe");
  redirect(`/orient?observationId=${observation.id}`);
}

export async function createHypothesesAction(formData: FormData) {
  const staff = await ensureDefaultStaff();
  const [observationId, caseId] = splitRef(text(formData, "observationRef"));
  const errorPath = observationId ? `/orient?observationId=${encodeURIComponent(observationId)}` : "/orient";
  const createdIds: string[] = [];

  for (let index = 0; index < 3; index += 1) {
    const statement = text(formData, `statement-${index}`);
    if (!statement) {
      continue;
    }

    const result = hypothesisSchema.safeParse({
      caseId,
      observationId,
      staffId: staff.id,
      category: text(formData, `category-${index}`),
      statement,
      evidence: text(formData, `evidence-${index}`),
      counterEvidence: text(formData, `counterEvidence-${index}`),
      unknowns: text(formData, `unknowns-${index}`),
      nextObservationPoints: text(formData, `nextObservationPoints-${index}`),
      confidence: text(formData, `confidence-${index}`) || 50,
      status: text(formData, `status-${index}`) || "未検証"
    });
    if (!result.success) {
      redirect(withError(errorPath));
    }

    try {
      const hypothesis = await prisma.hypothesis.create({
        data: result.data
      });
      createdIds.push(hypothesis.id);
    } catch {
      redirect(withError(errorPath, "save"));
    }
  }

  if (createdIds.length === 0) {
    redirect(withError(errorPath, "no-hypothesis"));
  }

  revalidatePath("/orient");
  revalidatePath("/");
  const nextId = createdIds[0] ?? "";
  redirect(nextId ? `/decide?hypothesisId=${nextId}` : "/orient");
}

export async function createSmallExperimentAction(formData: FormData) {
  const staff = await ensureDefaultStaff();
  const [hypothesisId, caseId] = splitRef(text(formData, "hypothesisRef"));
  const errorPath = hypothesisId ? `/decide?hypothesisId=${encodeURIComponent(hypothesisId)}` : "/decide";
  const result = smallExperimentSchema.safeParse({
    caseId,
    hypothesisId,
    staffId: staff.id,
    support: text(formData, "support"),
    supportCategory: text(formData, "supportCategory"),
    targetChange: text(formData, "targetChange"),
    metric: text(formData, "metric"),
    reviewDueAt: text(formData, "reviewDueAt"),
    plannedAt: text(formData, "plannedAt"),
    cautions: text(formData, "cautions"),
    nextTryCandidate: allText(formData, "nextTryCandidate").join("\n"),
    status: text(formData, "status") || "予定"
  });
  if (!result.success) {
    redirect(withError(errorPath));
  }
  const parsed = result.data;

  let experiment: { id: string };
  try {
    experiment = await prisma.smallExperiment.create({
      data: parsed
    });

    await prisma.hypothesis.update({
      where: { id: hypothesisId },
      data: { status: "検証中" }
    });
  } catch {
    redirect(withError(errorPath, "save"));
  }

  revalidatePath("/decide");
  revalidatePath("/");
  redirect(`/act?experimentId=${experiment.id}`);
}

export async function createActReviewAction(formData: FormData) {
  const staff = await ensureDefaultStaff();
  const [experimentId, caseId, hypothesisId] = splitRef(text(formData, "experimentRef"));
  const errorPath = experimentId ? `/act?experimentId=${encodeURIComponent(experimentId)}` : "/act";
  const result = actReviewSchema.safeParse({
    caseId,
    experimentId,
    hypothesisId,
    staffId: staff.id,
    implementation: text(formData, "implementation"),
    implementationStatus: text(formData, "implementationStatus"),
    immediateResponse: text(formData, "immediateResponse"),
    laterResponse: text(formData, "laterResponse"),
    measuredValue: text(formData, "measuredValue"),
    comparison: text(formData, "comparison"),
    hypothesisUpdate: text(formData, "hypothesisUpdate"),
    nextObservationPoint: text(formData, "nextObservationPoint"),
    nextTryCandidate: text(formData, "nextTryCandidate")
  });
  if (!result.success) {
    redirect(withError(errorPath));
  }
  const parsed = result.data;

  try {
    await prisma.$transaction([
      prisma.actReview.create({ data: parsed }),
      prisma.hypothesis.update({
        where: { id: hypothesisId },
        data: { status: parsed.hypothesisUpdate }
      }),
      prisma.smallExperiment.update({
        where: { id: experimentId },
        data: { status: parsed.implementationStatus === "未実施" ? "中止" : "完了" }
      })
    ]);
  } catch {
    redirect(withError(errorPath, "save"));
  }

  revalidatePath("/act");
  revalidatePath("/");
  redirect(`/team-review?caseId=${caseId}`);
}

export async function createTeamReviewCommentAction(formData: FormData) {
  const staff = await ensureDefaultStaff();
  const [observationId, hypothesisId] = splitRef(text(formData, "targetRef"));
  const caseId = text(formData, "caseId");
  const errorPath = caseId ? `/team-review?caseId=${encodeURIComponent(caseId)}` : "/team-review";
  const result = teamReviewCommentSchema.safeParse({
    caseId,
    observationId: observationId || undefined,
    hypothesisId: hypothesisId || undefined,
    staffId: staff.id,
    columnKey: text(formData, "columnKey"),
    body: text(formData, "body")
  });
  if (!result.success) {
    redirect(withError(errorPath));
  }
  const parsed = result.data;

  try {
    await prisma.teamReviewComment.create({
      data: parsed
    });
  } catch {
    redirect(withError(errorPath, "save"));
  }

  revalidatePath("/team-review");
  redirect(`/team-review?caseId=${parsed.caseId}`);
}

export async function createExportSummaryAction(formData: FormData) {
  const staff = await ensureDefaultStaff();
  const summary = text(formData, "summary");
  const observationId = text(formData, "observationId");
  const errorPath = observationId ? `/export?observationId=${encodeURIComponent(observationId)}` : "/export";
  const result = exportSummarySchema.safeParse({
    caseId: text(formData, "caseId"),
    observationId,
    hypothesisId: optionalText(formData, "hypothesisId"),
    experimentId: optionalText(formData, "experimentId"),
    staffId: staff.id,
    summary
  });
  if (!result.success) {
    redirect(withError(errorPath));
  }
  const parsed = result.data;

  try {
    await prisma.exportSummary.create({
      data: parsed
    });
  } catch {
    redirect(withError(errorPath, "save"));
  }

  revalidatePath("/export");
  redirect(`/export?observationId=${parsed.observationId}&saved=1`);
}

export async function createExportSummaryFromIdsAction(formData: FormData) {
  const observationId = text(formData, "observationId");
  const observation = await prisma.observation.findUnique({
    where: { id: observationId },
    include: {
      hypotheses: {
        include: {
          smallExperiments: true
        },
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });

  if (!observation) {
    redirect("/export");
  }

  const hypothesis = observation.hypotheses[0];
  const experiment = hypothesis?.smallExperiments[0];
  const summary = generateExportSummary({
    scene: `${observation.location}の${observation.programName}`,
    fact: observation.factMemo,
    antecedent: observation.antecedent,
    consequence: observation.consequence,
    hypothesis: hypothesis?.statement ?? "未整理の仮説",
    support: experiment?.support ?? "次に決める小さな支援",
    metric: experiment?.metric ?? "観察した指標"
  });

  const nextForm = new FormData();
  nextForm.set("caseId", observation.caseId);
  nextForm.set("observationId", observation.id);
  if (hypothesis?.id) {
    nextForm.set("hypothesisId", hypothesis.id);
  }
  if (experiment?.id) {
    nextForm.set("experimentId", experiment.id);
  }
  nextForm.set("summary", summary);

  await createExportSummaryAction(nextForm);
}
