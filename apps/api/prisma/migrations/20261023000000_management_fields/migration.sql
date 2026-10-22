CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

ALTER TABLE "Question"
  ADD COLUMN "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "topic" VARCHAR(120),
  ADD COLUMN "archivedAt" TIMESTAMP(3);

ALTER TABLE "Class" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Question_authorId_archivedAt_difficulty_idx" ON "Question"("authorId", "archivedAt", "difficulty");
CREATE INDEX "Question_topic_idx" ON "Question"("topic");
CREATE INDEX "Class_isArchived_teacherId_idx" ON "Class"("isArchived", "teacherId");
