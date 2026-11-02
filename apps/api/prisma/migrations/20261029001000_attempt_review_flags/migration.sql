-- Independent of answer revisions; review flags never participate in grading.
ALTER TABLE "ExamAttempt" ADD COLUMN "reviewQuestionIds" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[];
