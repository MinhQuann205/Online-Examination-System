-- Additive only. Review and back up development before deployment there.
CREATE INDEX "ExamVersion_examId_publishedAt_idx" ON "ExamVersion"("examId", "publishedAt");
