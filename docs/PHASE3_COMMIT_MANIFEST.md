# Phạm vi commit dự kiến — Phase 3

Danh sách chính xác dựa trên working tree ngày 30/10/2026, sau khắc phục Git Review. Đây là kế hoạch review, không stage/commit. Tổng **104 file nội dung**, không tính các path chỉ khác newline. Xem [release summary](PHASE3_RELEASE_SUMMARY.md).

## Nhóm 1 — Runtime, schema, tests và cấu hình (97)

Giữ đủ modules/routes/helpers và cả ba migration mới so với HEAD cùng nhau để không thiếu dependency giữa các commit. Không sửa SQL đã áp dụng.

- `.env.example`
- `.gitignore`
- `.prettierignore`
- `apps/api/prisma/migrations/20261024000000_exam_versions/migration.sql`
- `apps/api/prisma/migrations/20261029000000_phase3_p1_review/migration.sql`
- `apps/api/prisma/migrations/20261029001000_attempt_review_flags/migration.sql`
- `apps/api/prisma/schema.prisma`
- `apps/api/src/app.module.ts`
- `apps/api/src/auth/auth.service.spec.ts`
- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/classes/classes.controller.ts`
- `apps/api/src/classes/classes.service.spec.ts`
- `apps/api/src/classes/classes.service.ts`
- `apps/api/src/common/csrf.spec.ts`
- `apps/api/src/common/csrf.ts`
- `apps/api/src/exam-assignments/exam-assignments.controller.ts`
- `apps/api/src/exam-assignments/exam-assignments.module.ts`
- `apps/api/src/exam-assignments/exam-assignments.service.spec.ts`
- `apps/api/src/exam-assignments/exam-assignments.service.ts`
- `apps/api/src/exam-attempts/exam-attempts.controller.ts`
- `apps/api/src/exam-attempts/exam-attempts.module.ts`
- `apps/api/src/exam-attempts/exam-attempts.service.spec.ts`
- `apps/api/src/exam-attempts/exam-attempts.service.ts`
- `apps/api/src/exam-attempts/exam-flow.integration.spec.ts`
- `apps/api/src/exams/exam-metadata.spec.ts`
- `apps/api/src/exams/exam-metadata.ts`
- `apps/api/src/exams/exam-snapshot.ts`
- `apps/api/src/exams/exams.controller.ts`
- `apps/api/src/exams/exams.integration.spec.ts`
- `apps/api/src/exams/exams.module.ts`
- `apps/api/src/exams/exams.service.spec.ts`
- `apps/api/src/exams/exams.service.ts`
- `apps/api/src/grading/grading.module.ts`
- `apps/api/src/grading/grading.service.spec.ts`
- `apps/api/src/grading/grading.service.ts`
- `apps/api/src/main.ts`
- `apps/api/src/questions/questions.controller.ts`
- `apps/api/src/questions/questions.service.ts`
- `apps/api/src/results/result-scope.ts`
- `apps/api/src/results/results.controller.ts`
- `apps/api/src/results/results.module.ts`
- `apps/api/src/results/results.service.spec.ts`
- `apps/api/src/results/results.service.ts`
- `apps/api/src/users/users.controller.ts`
- `apps/api/src/users/users.service.spec.ts`
- `apps/api/src/users/users.service.ts`
- `apps/web/package.json`
- `apps/web/src/app/admin/exams/page.tsx`
- `apps/web/src/app/login/unavailable/route.ts`
- `apps/web/src/app/student/attempts/[id]/page.tsx`
- `apps/web/src/app/student/exams/page.tsx`
- `apps/web/src/app/student/results/[id]/page.tsx`
- `apps/web/src/app/student/results/page.tsx`
- `apps/web/src/app/teacher/assignments/page.tsx`
- `apps/web/src/app/teacher/exams/[id]/edit/page.tsx`
- `apps/web/src/app/teacher/exams/[id]/page.tsx`
- `apps/web/src/app/teacher/exams/[id]/results/page.tsx`
- `apps/web/src/app/teacher/exams/new/page.tsx`
- `apps/web/src/app/teacher/exams/page.tsx`
- `apps/web/src/app/teacher/results/[id]/page.tsx`
- `apps/web/src/app/teacher/results/page.tsx`
- `apps/web/src/components/admin-exam-monitor.tsx`
- `apps/web/src/components/attempt-workspace.tsx`
- `apps/web/src/components/dashboard-shell.tsx`
- `apps/web/src/components/exam-assignment-management.tsx`
- `apps/web/src/components/exam-management.tsx`
- `apps/web/src/components/login-form.tsx`
- `apps/web/src/components/management-detail.tsx`
- `apps/web/src/components/management.tsx`
- `apps/web/src/components/pagination.tsx`
- `apps/web/src/components/question-form.tsx`
- `apps/web/src/components/student-exams.tsx`
- `apps/web/src/components/student-results.tsx`
- `apps/web/src/components/teacher-results.tsx`
- `apps/web/src/lib/all-pages.ts`
- `apps/web/src/lib/answer-autosave.ts`
- `apps/web/src/lib/api.ts`
- `apps/web/tests/answer-autosave.test.mjs`
- `docker-compose.yml`
- `package.json`
- `pnpm-lock.yaml`
- `tests/git-review-api.test.cjs`
- `tests/git-review-browser.test.cjs`
- `tests/p0-api.test.cjs`
- `tests/p0-browser.test.cjs`
- `tests/p0-support.cjs`
- `tests/p1-api.test.cjs`
- `tests/p1-browser.test.cjs`
- `tests/p1-migration.test.cjs`
- `tests/p2-api-worker.cjs`
- `tests/p2-api.test.cjs`
- `tests/p2-browser.test.cjs`
- `tests/p2-restart.cjs`
- `tests/restart-evidence.cjs`
- `tests/test-database.cjs`
- `tests/test-database.d.cts`
- `tests/test-infrastructure.test.cjs`

## Nhóm 2 — Tài liệu public (7)

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/PHASE3_COMMIT_MANIFEST.md`
- `docs/PHASE3_DEV_MIGRATION_PLAN.md`
- `docs/PHASE3_RELEASE_SUMMARY.md`
- `docs/ROADMAP.md`

## Loại khỏi commit

- Báo cáo audit/P0/P1/P2/final acceptance/predeploy/deploy/unblock/Git Review/fix bản gốc được giữ private, có ignore theo từng tên; không xóa bản gốc. Public dùng release summary và runbook.
- Delta generated local apps/web/next-env.d.ts; giữ byte baseline trong workspace, không tự hoàn nguyên thay đổi của người dùng.
- .env/secrets, dumps/backups, raw logs/cookies/evidence, node_modules, Prisma Client generated, dist, .next, coverage, tsbuildinfo và browser artifacts. Không ignore migration SQL.
- Path chỉ khác LF/CRLF không tạo diff nội dung; không tự stage/restore chúng.

Trước stage phải đối chiếu lại danh sách với working tree mới và kiểm staged diff. Không dùng git add .; không tự push/merge/rebase. Local main/origin-main chưa được fetch trong nhiệm vụ này, cần cập nhật refs và review conflict riêng trước PR.
