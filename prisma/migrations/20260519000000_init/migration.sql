PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "staff" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "displayName" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "cases" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "displayName" TEXT NOT NULL,
  "memo" TEXT NOT NULL DEFAULT '',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "staffId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cases_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "observations" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "staffId" TEXT,
  "caseId" TEXT NOT NULL,
  "observedAt" DATETIME NOT NULL,
  "location" TEXT NOT NULL,
  "programName" TEXT NOT NULL,
  "timing" TEXT NOT NULL,
  "freeText" TEXT NOT NULL DEFAULT '',
  "factMemo" TEXT NOT NULL,
  "behaviorTags" TEXT NOT NULL DEFAULT '',
  "antecedent" TEXT NOT NULL,
  "consequence" TEXT NOT NULL,
  "startLatencySeconds" INTEGER,
  "stoppedDurationSeconds" INTEGER,
  "promptCount" INTEGER,
  "resumeLatencySeconds" INTEGER,
  "workCondition" TEXT NOT NULL DEFAULT '',
  "environmentSensory" TEXT NOT NULL DEFAULT '',
  "interpersonalContext" TEXT NOT NULL DEFAULT '',
  "bodyPsych" TEXT NOT NULL DEFAULT '',
  "protectiveFactors" TEXT NOT NULL DEFAULT '',
  "riskUrgency" TEXT NOT NULL DEFAULT '',
  "unknownMemo" TEXT NOT NULL DEFAULT '',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "observations_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "observations_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "observation_tags" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "staffId" TEXT,
  "caseId" TEXT NOT NULL,
  "observationId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "observation_tags_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "observation_tags_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "observations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "hypotheses" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "staffId" TEXT,
  "caseId" TEXT NOT NULL,
  "observationId" TEXT,
  "category" TEXT NOT NULL,
  "statement" TEXT NOT NULL,
  "evidence" TEXT NOT NULL,
  "counterEvidence" TEXT NOT NULL DEFAULT '',
  "unknowns" TEXT NOT NULL DEFAULT '',
  "nextObservationPoints" TEXT NOT NULL DEFAULT '',
  "confidence" INTEGER NOT NULL DEFAULT 50,
  "status" TEXT NOT NULL DEFAULT '未検証',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "hypotheses_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "hypotheses_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "hypotheses_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "observations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "small_experiments" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "staffId" TEXT,
  "caseId" TEXT NOT NULL,
  "hypothesisId" TEXT NOT NULL,
  "support" TEXT NOT NULL,
  "supportCategory" TEXT NOT NULL,
  "targetChange" TEXT NOT NULL,
  "metric" TEXT NOT NULL,
  "reviewDueAt" DATETIME NOT NULL,
  "plannedAt" DATETIME NOT NULL,
  "cautions" TEXT NOT NULL DEFAULT '',
  "nextTryCandidate" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT '予定',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "small_experiments_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "small_experiments_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "small_experiments_hypothesisId_fkey" FOREIGN KEY ("hypothesisId") REFERENCES "hypotheses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "act_reviews" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "staffId" TEXT,
  "caseId" TEXT NOT NULL,
  "experimentId" TEXT NOT NULL,
  "hypothesisId" TEXT NOT NULL,
  "implementation" TEXT NOT NULL,
  "implementationStatus" TEXT NOT NULL,
  "immediateResponse" TEXT NOT NULL,
  "laterResponse" TEXT NOT NULL DEFAULT '',
  "measuredValue" TEXT NOT NULL DEFAULT '',
  "comparison" TEXT NOT NULL DEFAULT '',
  "hypothesisUpdate" TEXT NOT NULL,
  "nextObservationPoint" TEXT NOT NULL DEFAULT '',
  "nextTryCandidate" TEXT NOT NULL DEFAULT '',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "act_reviews_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "act_reviews_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "act_reviews_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "small_experiments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "act_reviews_hypothesisId_fkey" FOREIGN KEY ("hypothesisId") REFERENCES "hypotheses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "team_review_comments" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "staffId" TEXT,
  "caseId" TEXT NOT NULL,
  "observationId" TEXT,
  "hypothesisId" TEXT,
  "columnKey" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "team_review_comments_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "team_review_comments_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "team_review_comments_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "observations" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "team_review_comments_hypothesisId_fkey" FOREIGN KEY ("hypothesisId") REFERENCES "hypotheses" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "export_summaries" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "staffId" TEXT,
  "caseId" TEXT NOT NULL,
  "observationId" TEXT NOT NULL,
  "hypothesisId" TEXT,
  "experimentId" TEXT,
  "summary" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "export_summaries_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "export_summaries_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "export_summaries_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "observations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "export_summaries_hypothesisId_fkey" FOREIGN KEY ("hypothesisId") REFERENCES "hypotheses" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "export_summaries_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "small_experiments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "observations_caseId_observedAt_idx" ON "observations" ("caseId", "observedAt");
CREATE INDEX IF NOT EXISTS "observation_tags_caseId_kind_label_idx" ON "observation_tags" ("caseId", "kind", "label");
CREATE INDEX IF NOT EXISTS "hypotheses_caseId_category_status_idx" ON "hypotheses" ("caseId", "category", "status");
CREATE INDEX IF NOT EXISTS "small_experiments_caseId_status_reviewDueAt_idx" ON "small_experiments" ("caseId", "status", "reviewDueAt");
CREATE INDEX IF NOT EXISTS "act_reviews_caseId_hypothesisUpdate_idx" ON "act_reviews" ("caseId", "hypothesisUpdate");
CREATE INDEX IF NOT EXISTS "team_review_comments_caseId_columnKey_idx" ON "team_review_comments" ("caseId", "columnKey");
CREATE INDEX IF NOT EXISTS "export_summaries_caseId_createdAt_idx" ON "export_summaries" ("caseId", "createdAt");
