import { PrismaClient } from "@prisma/client";
import { DEFAULT_STAFF_ID } from "../src/lib/constants";

const prisma = new PrismaClient();

async function main() {
  const staff = await prisma.staff.upsert({
    where: { id: DEFAULT_STAFF_ID },
    update: { displayName: "デモ職員" },
    create: { id: DEFAULT_STAFF_ID, displayName: "デモ職員" }
  });

  const sampleCase = await prisma.case.upsert({
    where: { id: "case-a" },
    update: {
      displayName: "ケースA",
      memo: "本名ではなく、運用上の表示名で扱うサンプルケース。",
      isActive: true,
      staffId: staff.id
    },
    create: {
      id: "case-a",
      displayName: "ケースA",
      memo: "本名ではなく、運用上の表示名で扱うサンプルケース。",
      isActive: true,
      staffId: staff.id
    }
  });

  const observation = await prisma.observation.upsert({
    where: { id: "obs-sample-a" },
    update: {
      staffId: staff.id,
      caseId: sampleCase.id,
      observedAt: new Date("2026-05-19T12:45:00+09:00"),
      location: "作業室",
      programName: "PC課題",
      timing: "昼休み後",
      freeText: "昼休み後の開始場面。席替えあり。",
      factMemo:
        "昼休み後、PC課題開始予定。予定変更で席替え。本人は返事したが3分間キーボードに触れず。周囲は会話多め。",
      behaviorTags: "開始できない,返事のみ",
      antecedent: "予定変更で席替えがあった",
      consequence: "職員が近づき、開始手順を短く確認した",
      startLatencySeconds: 180,
      stoppedDurationSeconds: 180,
      promptCount: 1,
      resumeLatencySeconds: 60,
      workCondition: "既知課題、席替えあり",
      environmentSensory: "音,混雑",
      interpersonalContext: "複数,口頭指示",
      bodyPsych: "疲労,眠気",
      protectiveFactors: "壁側の席、短い既知課題",
      riskUrgency: "緊急度低",
      unknownMemo: "昼食後の疲労の程度は未確認"
    },
    create: {
      id: "obs-sample-a",
      staffId: staff.id,
      caseId: sampleCase.id,
      observedAt: new Date("2026-05-19T12:45:00+09:00"),
      location: "作業室",
      programName: "PC課題",
      timing: "昼休み後",
      freeText: "昼休み後の開始場面。席替えあり。",
      factMemo:
        "昼休み後、PC課題開始予定。予定変更で席替え。本人は返事したが3分間キーボードに触れず。周囲は会話多め。",
      behaviorTags: "開始できない,返事のみ",
      antecedent: "予定変更で席替えがあった",
      consequence: "職員が近づき、開始手順を短く確認した",
      startLatencySeconds: 180,
      stoppedDurationSeconds: 180,
      promptCount: 1,
      resumeLatencySeconds: 60,
      workCondition: "既知課題、席替えあり",
      environmentSensory: "音,混雑",
      interpersonalContext: "複数,口頭指示",
      bodyPsych: "疲労,眠気",
      protectiveFactors: "壁側の席、短い既知課題",
      riskUrgency: "緊急度低",
      unknownMemo: "昼食後の疲労の程度は未確認"
    }
  });

  await prisma.observationTag.deleteMany({ where: { observationId: observation.id } });
  await prisma.observationTag.createMany({
    data: [
      { staffId: staff.id, caseId: sampleCase.id, observationId: observation.id, kind: "行動", label: "開始できない" },
      { staffId: staff.id, caseId: sampleCase.id, observationId: observation.id, kind: "行動", label: "返事のみ" },
      { staffId: staff.id, caseId: sampleCase.id, observationId: observation.id, kind: "環境", label: "音" },
      { staffId: staff.id, caseId: sampleCase.id, observationId: observation.id, kind: "環境", label: "混雑" },
      { staffId: staff.id, caseId: sampleCase.id, observationId: observation.id, kind: "身体心理", label: "疲労" }
    ]
  });

  const hypothesisA = await prisma.hypothesis.upsert({
    where: { id: "hyp-sample-a" },
    update: {
      staffId: staff.id,
      caseId: sampleCase.id,
      observationId: observation.id,
      category: "見通し・変化への弱さ",
      statement: "予定変更による見通しの崩れが影響している可能性がある。",
      evidence: "席替え直後に3分間キーボードに触れず、開始まで時間がかかった。",
      counterEvidence: "昼食後の疲労や周囲の会話量も影響している可能性がある。",
      unknowns: "事前予告があった場合の開始時間は未確認。",
      nextObservationPoints: "予告あり、席固定、周囲の会話量が少ない日の開始までの時間。",
      confidence: 60,
      status: "強まった"
    },
    create: {
      id: "hyp-sample-a",
      staffId: staff.id,
      caseId: sampleCase.id,
      observationId: observation.id,
      category: "見通し・変化への弱さ",
      statement: "予定変更による見通しの崩れが影響している可能性がある。",
      evidence: "席替え直後に3分間キーボードに触れず、開始まで時間がかかった。",
      counterEvidence: "昼食後の疲労や周囲の会話量も影響している可能性がある。",
      unknowns: "事前予告があった場合の開始時間は未確認。",
      nextObservationPoints: "予告あり、席固定、周囲の会話量が少ない日の開始までの時間。",
      confidence: 60,
      status: "強まった"
    }
  });

  await prisma.hypothesis.upsert({
    where: { id: "hyp-sample-b" },
    update: {
      staffId: staff.id,
      caseId: sampleCase.id,
      observationId: observation.id,
      category: "感覚・環境負荷",
      statement: "周囲の会話量と昼食後の疲労が影響している可能性がある。",
      evidence: "周囲は会話多めで、昼休み後の場面だった。",
      counterEvidence: "予定変更が主なきっかけだった可能性もある。",
      unknowns: "静かな席で同じ課題を始める時の反応は未確認。",
      nextObservationPoints: "会話量が少ない日、壁側の席での開始時間。",
      confidence: 45,
      status: "未検証"
    },
    create: {
      id: "hyp-sample-b",
      staffId: staff.id,
      caseId: sampleCase.id,
      observationId: observation.id,
      category: "感覚・環境負荷",
      statement: "周囲の会話量と昼食後の疲労が影響している可能性がある。",
      evidence: "周囲は会話多めで、昼休み後の場面だった。",
      counterEvidence: "予定変更が主なきっかけだった可能性もある。",
      unknowns: "静かな席で同じ課題を始める時の反応は未確認。",
      nextObservationPoints: "会話量が少ない日、壁側の席での開始時間。",
      confidence: 45,
      status: "未検証"
    }
  });

  const experiment = await prisma.smallExperiment.upsert({
    where: { id: "exp-sample-a" },
    update: {
      staffId: staff.id,
      caseId: sampleCase.id,
      hypothesisId: hypothesisA.id,
      support: "休憩終了2分前に戻り予告を行い、壁側の席で、最初の課題を3分で終わる既知課題にする。",
      supportCategory: "見通し支援",
      targetChange: "開始までの時間が短くなり、途中離席なしで着手できる。",
      metric: "開始までの時間",
      reviewDueAt: new Date("2026-05-20T15:00:00+09:00"),
      plannedAt: new Date("2026-05-20T12:40:00+09:00"),
      cautions: "声かけは短く、説明を増やしすぎない。",
      status: "完了"
    },
    create: {
      id: "exp-sample-a",
      staffId: staff.id,
      caseId: sampleCase.id,
      hypothesisId: hypothesisA.id,
      support: "休憩終了2分前に戻り予告を行い、壁側の席で、最初の課題を3分で終わる既知課題にする。",
      supportCategory: "見通し支援",
      targetChange: "開始までの時間が短くなり、途中離席なしで着手できる。",
      metric: "開始までの時間",
      reviewDueAt: new Date("2026-05-20T15:00:00+09:00"),
      plannedAt: new Date("2026-05-20T12:40:00+09:00"),
      cautions: "声かけは短く、説明を増やしすぎない。",
      status: "完了"
    }
  });

  await prisma.actReview.upsert({
    where: { id: "act-sample-a" },
    update: {
      staffId: staff.id,
      caseId: sampleCase.id,
      experimentId: experiment.id,
      hypothesisId: hypothesisA.id,
      implementation: "予告ありで1分以内に着席。最初の既知課題を提示した。",
      implementationStatus: "予定通り",
      immediateResponse: "開始まで40秒。途中離席なし。",
      laterResponse: "課題終了後に次の手順を確認した。",
      measuredValue: "開始まで40秒、離席0回",
      comparison: "前回は開始まで3分。今回は短縮。",
      hypothesisUpdate: "強まった",
      nextObservationPoint: "予告の有無と席位置を分けて見る。",
      nextTryCandidate: "静かな席のみを変えた場合も確認する。"
    },
    create: {
      id: "act-sample-a",
      staffId: staff.id,
      caseId: sampleCase.id,
      experimentId: experiment.id,
      hypothesisId: hypothesisA.id,
      implementation: "予告ありで1分以内に着席。最初の既知課題を提示した。",
      implementationStatus: "予定通り",
      immediateResponse: "開始まで40秒。途中離席なし。",
      laterResponse: "課題終了後に次の手順を確認した。",
      measuredValue: "開始まで40秒、離席0回",
      comparison: "前回は開始まで3分。今回は短縮。",
      hypothesisUpdate: "強まった",
      nextObservationPoint: "予告の有無と席位置を分けて見る。",
      nextTryCandidate: "静かな席のみを変えた場合も確認する。"
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
