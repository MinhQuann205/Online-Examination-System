# ExamSpace UI-09 — Results & Reports, Teacher Results Shell, Contextual Back & Matching

Ngày nghiệm thu: **02/11/2026, Asia/Saigon**  
Worktree: `C:\Môn Học\ThucTapNgheNghiep\ExamSpace-Stitch-UI`  
Branch/HEAD: `feature/stitch-examspace-ui` / `a1e2891754e399aa4743e32c8218759938149bdc`

## 1. Executive summary

**UI-09 IMPLEMENTED — FUNCTIONAL TESTS PASS IN ISOLATED TEST ENVIRONMENT — RUNTIME RISK OPEN — PRODUCTION READY: NO.**

- Teacher Results giữ TeacherShell/sidebar trên index, detail, direct URL và refresh; Results là nav active.
- Back button ẩn ở trang root/index và đặt cuối nội dung detail theo role/parent.
- Results/Reports dùng API và policy hiện hữu; Matching UI làm rõ mỗi hàng là một cặp đúng, giữ UUID, snapshot và server grading.
- Root **87/87**, HTTP/PostgreSQL **60/60**, Browser E2E **123/123**; tổng **270 tests** trong các lượt final. Không tính focused reruns vào tổng.
- Không thêm API, database migration, thay đổi backend, grading hoặc runtime. Native exit lịch sử `3221226505 / 0xC0000409` vẫn **RUNTIME UNSTABLE — ROOT CAUSE UNKNOWN**.

Không triển khai UI-10, không commit/push/deploy.

## 2. Git/worktree preservation

- UI worktree: `ExamSpace-Stitch-UI`; HEAD/branch/index không đổi. Index không có staged delta.
- UI snapshot đầu đợt: **296 files**. Hậu kiểm: **274 giữ nguyên byte, 22 changed, 0 mất**, thêm 9 source/test files và báo cáo này. Các changed files gồm thay đổi UI-01–UI-08.1 được mang theo; không quy toàn bộ 22 files riêng cho UI-09.
- HEAD: `a1e2891754e399aa4743e32c8218759938149bdc`; branch: `feature/stitch-examspace-ui`.
- Repository Phase 3 gốc: **250/250 files giữ nguyên**, HEAD/branch/index/status không đổi.
- Backend UI worktree: **65/65 tracked apps/api files trùng byte với HEAD**, gồm schema và năm migrations.
- Không reset/clean/stash/restore/checkout/rebase/merge/commit/push. Không sửa .env, dependency/lockfile, Node global, registry hay Windows security.
- Git diff check cuối: PASS.

Evidence hậu kiểm: `%TEMP%\examspace-ui09-ad511689\preservation-current.json`.

## 3. UI-08.1 baseline

UI-08.1 baseline là 84 root + 54 HTTP + 108 browser = 246 tests, trong test scope. UI-08.1 đã xác nhận NAV-01–NAV-14, autosave/submission integrity và matching grading, nhưng vẫn để runtime risk OPEN. Các số lịch sử đó không được cộng vào UI-09.

## 4. Stitch resources

Đã xác minh Stitch project `16397645008301072963` (PRIVATE, Academic Focus v1), đọc metadata/HTML và xem assets thực có sẵn cho S01 Results, S06 Graded Answers, S07 Reports, cùng các nguồn tham chiếu S05/S08/S10. Dùng hierarchy, typography, spacing, cards/table, palette và navigation làm tham chiếu; chuyển thành giao diện dùng dữ liệu API thật.

Không copy KPI mẫu, AI/IRT/rank, cheating/proctoring, certificate hoặc export không có contract; không sửa project Stitch và không đưa HTML/ảnh PRIVATE vào Git. Visual fidelity: **PARTIAL/ADAPTED**, không tuyên bố pixel-perfect.

## 5. Files created/modified

Core UI-09 files được thêm trong snapshot:

- `apps/web/src/app/admin/exams/[id]/results/page.tsx`
- `apps/web/src/app/admin/results/[id]/page.tsx`
- `apps/web/src/components/matching-editor.tsx`
- `apps/web/src/components/results/result-detail.tsx`
- `apps/web/src/components/results/results-ui.tsx`
- `apps/web/src/components/results/results.css`
- `tests/ui-results-api.test.cjs`
- `tests/ui-results-support.cjs`
- `tests/ui-results.test.cjs`

Shared shell/navigation and carried UI source are integrated through existing Teacher/Admin/Student layouts and `ContextualBackButton`; matching authoring updates existing question management. The required report is the final additional file. Other changed files in the snapshot include carried forward UI-01–UI-08.1 changes; see the source snapshot in TEMP for exact per-file hashes.

This finalization turn also updated only legacy regression expectations in `tests/ui-admin.test.cjs` and `tests/ui-student.test.cjs`, then formatted the latter. Admin still asserts API/SQL totals; Student still asserts isolated attempt workspace and the new Results shell separately.

## 6. Teacher Results sidebar root-cause inspection

The supplied before screenshot (`before-teacher-results.png`) shows standalone Results content without the shell. Source review found the Teacher Results component composed as a standalone `<main>` with its own auth/query handling; the route itself is under `/teacher/layout.tsx`, and no intentional Teacher Results layout bypass was found. The screenshot alone cannot establish why the old runtime bundle omitted the parent layout; a stale Next bundle/route render remains possible.

The effective source composition is now within the shared Teacher shell. The browser suite checks the actual rendered sidebar, active nav, direct URL, refresh, detail and absence of duplicate shell. Root cause of the historical runtime screenshot is therefore **partly evidenced, not conclusively attributed to Next routing or a specific cache fault**.

## 7. Sidebar fix

Teacher Results index and detail render within `TeacherShell`/shared WorkspaceShell. Brand, navigation, account, theme toggle, logout, desktop sidebar and mobile drawer remain shared. `/teacher/results` and `/teacher/results/:id` activate “Kết quả”; no second auth provider or nested sidebar was introduced.

## 8. Teacher Results List/Detail

Results index uses server-backed search and pagination, real exam/assignment metadata, status/availability and actual report links. Empty, loading, retry and error states follow API responses; stale private report rows are not treated as success.

Teacher detail displays only scoped submitted attempts, allowed student identifiers, score projection, submission time and permitted result detail. Back returns to Teacher Results at the bottom. DRAFT/no-result behavior follows actual API records; no fake submissions or first-page-derived aggregate was added.

## 9. Student Results List/Detail

Student history remains own-results scoped. Detail retains existing result policy and routes; shell/navigation changes do not broaden access. Null score remains “not published,” distinct from a published zero. Detail shows matching choices/key only when the response policy supplies them; no client-side key inference or score calculation.

## 10. Admin Reports

Admin report index/detail use existing scoped endpoints and AdminShell. Counts, pagination, search and attempt rows come from API; detail navigation remains role-checked. No global totals are inferred from one page, and no new analytics/export endpoint was added.

## 11. Contextual BackButton rules

Root/index pages do not render Back even if internal history exists. Detail/create/edit/report pages use a verified role-specific parent fallback and a moderate-width contextual action after the main content. External, encoded, query-based, login and cross-role destinations remain rejected by SafeNavigation. Teacher list filters remain component state and are not promised across unmount. Exam Workspace keeps its separate leave/sentinel/autosave protections.

## 12. BACK-01–BACK-14 results

**PASS in browser/unit test scope.** Tests cover: no Back on Teacher/Admin/Student roots and Results indexes; bottom Back on Teacher/Student details; correct role parent/fallback for direct URL; Teacher exam detail; session-scoped browser history and RBAC; no duplicate mutation; mobile visibility; and preserved Exam Workspace pending-save/UNKNOWN-submit protections.

## 13. Teacher Matching form UX

Editor labels each left field “Nội dung cần ghép” and right field “Đáp án đúng tương ứng,” states that each row is one correct pair, and visually links them. It supports add/remove, whitespace/duplicate/one-sided validation and a correct-pair preview. Preview does not shuffle or mutate the stored key; API DTO remains the final validator.

## 14. Teacher correct-pair preview

Teacher sees the pair relationship as authored, not an assumed A/B/C/D ordering. Pair text and explanation stay separate; explanation is not used as grading authority. Saving uses existing Question API and matchingPairs model.

## 15. Student Matching interaction preservation

Student interaction still maps left/right values by actual snapshot UUIDs, permits the existing matching interaction modes, and saves the normal answer payload/revision. It does not rely on option position or question-bank IDs. No Matching answer ordering is treated as grading authority.

## 16. Matching result visualization

Result detail separates the student's selected right-side choice from the correct right-side answer. It resolves IDs against the attempt snapshot/public result projection. Correct answers are rendered only when backend policy includes them; per-pair feedback does not invent partial credit or recompute the score.

## 17. MATCH-01–MATCH-18 results

**PASS in the combined UI/API/full-flow scope.** Verified authoring guidance and pair preview; real save; shuffled snapshot UUIDs; autosave revision/reload; server grading; incorrect-pair review; hidden key when `showAnswers=false`; V1/V2 immutability; invalid pair rejection; keyboard/mouse/touch responsive behavior; explanation not used as key; and no fabricated partial credit.

The full UI-09 tests explicitly exercise MATCH-01–15, 16, 17 and 18 across browser/API cases; they also assert SQL payload/revision and server score. These are mapped acceptance assertions, not 18 separately counted test processes.

## 18. showScore/showAnswers verification

API and browser regressions verify score and answer-key visibility independently. Null score is not rendered as 0; hidden answers do not leak through Matching feedback or result explanation. Authorization remains server-side; UI only renders projected fields.

## 19. Pinned ExamVersion/history preservation

Tests pin assignment V1, publish V2, then start/read the old assignment and compare snapshot title/duration/order/points/keys/explanation and historical grade. V1 and historical result remain unchanged. No direct mutation of published snapshot and no schema/migration change.

## 20. RESULT-01–RESULT-18 results

**PASS in the tested contract.** Coverage includes Teacher sidebar/index/detail/direct/refresh, active item/no duplicate shell, Student and Admin role separation, wrong-role/IDOR, own results, visibility projections, pinned V1, teacher reassignment/cache isolation, API search/page, empty/loading/error/retry, mobile drawer, DRAFT/no-result records and snapshot-aligned explanation.

## 21. SQL/server grading verification

Test guard verifies the independent PostgreSQL test endpoint `127.0.0.1:15433/online_exam_phase3_test`, cluster identity different from development and five applied migrations. API suite verifies actual question/attempt/answer UUIDs, payload/revision, ownership/scope, historical version and server grading. Matching complete result remains **6.75/6.75** where the fixture expects it. Runner recorded zero test DB backends after API stop. No development SQL, reset/drop/seed or migration was run.

## 22. Responsive/DARK/accessibility

Full browser suite covers real routes at 390/768/1024/1440 widths, LIGHT/DARK cases, no document overflow, axe WCAG 2.1 A/AA checks and keyboard/drawer/focus behavior. Matching uses existing keyboard/mouse/touch controls. Native zoom and long-text reflow were exercised in focused UI-09 cases. This is test evidence, not a screen-reader or system-wide WCAG certification.

## 23. Visual screenshot comparison

The screenshot evidence is under `%TEMP%\examspace-ui09-browser-*`, with focused zoom evidence under `%TEMP%\examspace-ui09-zoom-*`. It includes Results layouts, Teacher sidebar/detail, Back placement, Student/Admin reports, Matching authoring/preview/review, mobile and DARK states. Historical before evidence is `%TEMP%\examspace-ui09-ad511689\before-teacher-results.png`. Design is **ADAPTED/PARTIAL** to actual API and permissions; no unsupported Stitch analytics were copied.

## 24. Root/HTTP/Browser full test results

Final gates:

| Gate            |                                  Result |
| --------------- | --------------------------------------: |
| Typecheck       |                            PASS, exit 0 |
| Lint            |                            PASS, exit 0 |
| Build           |                            PASS, exit 0 |
| Root tests      |                          **87/87 PASS** |
| HTTP/PostgreSQL |                          **60/60 PASS** |
| Browser E2E     |                        **123/123 PASS** |
| Format check    |                                    PASS |
| Git diff check  |                                    PASS |
| Secret scan     | PASS, 304 scanned text files, 0 matches |

Root suites comprise 17 tooling + 47 Jest (14 suites) + 23 frontend tests. The full HTTP/browser run ID is `full-3361e2ad-9ca3-4da9-9fb9-882f8cdf93ae`; HTTP ended exit 0, browser ended exit 0, no skipped tests. Typecheck/build passed before only the final test-expectation/format-only edits; application source was unchanged afterward. Focused runs are not added to totals. Two focused invocations for legacy UI05/UI07 cases had TAP results 1/1 and 3/3 pass, but the TEMP wrapper then returned FAIL because its selected-case guard accepts only UI09/NAV title prefixes. They are disqualified harness outcomes, not assertion failures; the final full suites above ran all cases and passed.

## 25. UI-01–UI-08.1 regressions

The full 123-case E2E and 60-case integration scripts ran with their configured file lists and concurrency 1. They retain auth/session/cross-tab guards, Admin/Teacher/Student shell routing, ownership/RBAC/IDOR, pinned snapshots, autosave/revision/deadline, submit reconciliation, result policy, roster scope and workspace navigation. No successful API response was mocked to bypass server behavior.

## 26. Runtime native crash status

**RUNTIME UNSTABLE — ROOT CAUSE UNKNOWN.** The three or more historical `3221226505 / 0xC0000409` incidents remain unresolved; UI-09 provides no native exception parameters, stack or faulting module. In the final bounded run there was no unexpected native exit. One controlled API stop/recovery was exercised by the existing UI08-05 test; the runner recorded it separately. Final API cleanup was intentional SIGTERM, not proof of graceful `app.close()`. No runtime change, ProcDump, debugger, auto-restart or package upgrade was used. **RUNTIME RISK OPEN.**

## 27. Remaining gaps

- Historical reason for the Teacher standalone screenshot cannot be attributed conclusively beyond the old standalone component composition.
- No NVDA/VoiceOver audit or full WCAG certification.
- No production HTTPS/proxy/cross-site, multi-process refresh, multi-instance scheduler/throughput or production soak gate.
- Runtime root cause and historical NT04 timeout root cause remain unknown.
- No AI/IRT/proctor analytics, certificates, PDF/Excel export, global rank or unsupported aggregate.

## 28. Evidence paths

Primary private evidence: `%TEMP%\examspace-ui09-ad511689`. Final run logs, plans, process lifecycle, database identity, source hashes, preservation and secret-scan summary are stored there. Browser images/axe metadata and native zoom screenshots remain in the private TEMP folders above. Raw private Stitch assets, configs, tokens, cookies and profiles are not included in this report or Git.

## 29. Final cleanup/database/source preservation

Final runner stopped only its owned API4010/web3010 children and recorded intentional stop before cleanup. Test database backends after stop: **0**. Database data and volumes were retained; no development DB was queried or modified. Development services were not stopped by this finalization. Docker status could not be independently re-read at final cleanup because Docker API access was denied; the report therefore relies on guarded DB identity and runner connection evidence, not a container-state claim.

Source final check: UI baseline 296 files, 274 unchanged/22 changed/0 missing, 9 new UI source/test files plus this report; original repository 250/250 unchanged; API 65/65 match HEAD. No stage/commit/push/deploy.

## 30. Conditions before UI-10 final polish

UI-09 functional acceptance is complete in isolated tests. Before UI-10, review this report and the uncommitted UI-01–UI-09 diff; preserve the explicit runtime UNSTABLE status, test database identity guards, result policy, Matching snapshot UUIDs, server grading, autosave/revision and safe navigation. UI-10 must be separately authorized and scoped. These results do not approve production.

**Final status:** UI-09 **IMPLEMENTED** · Teacher Results sidebar **FIXED IN TESTED ROUTES** · Back UX **VERIFIED** · Matching UX/grading integrity **VERIFIED IN TEST SCOPE** · Result policy **VERIFIED IN TEST SCOPE** · Tests **PASS** · Runtime **RISK OPEN** · Production **NO**.
