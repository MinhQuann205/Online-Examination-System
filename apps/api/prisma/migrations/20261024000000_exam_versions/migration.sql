-- Additive Phase 3 migration. Existing exams, assignments and attempts remain intact.
CREATE TABLE "ExamVersion" (
  "id" UUID NOT NULL,
  "examId" UUID NOT NULL,
  "number" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExamVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ExamVersion_examId_number_key" ON "ExamVersion"("examId", "number");
ALTER TABLE "ExamVersion" ADD CONSTRAINT "ExamVersion_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ExamAssignment" ADD COLUMN "examVersionId" UUID,
  ADD COLUMN "showScore" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "showAnswers" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "ExamAssignment_examVersionId_idx" ON "ExamAssignment"("examVersionId");
ALTER TABLE "ExamAssignment" ADD CONSTRAINT "ExamAssignment_examVersionId_fkey" FOREIGN KEY ("examVersionId") REFERENCES "ExamVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ExamAttempt" ADD COLUMN "examVersionId" UUID,
  ADD COLUMN "deadlineAt" TIMESTAMP(3);
CREATE INDEX "ExamAttempt_status_deadlineAt_idx" ON "ExamAttempt"("status", "deadlineAt");
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_examVersionId_fkey" FOREIGN KEY ("examVersionId") REFERENCES "ExamVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AttemptAnswer" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;
