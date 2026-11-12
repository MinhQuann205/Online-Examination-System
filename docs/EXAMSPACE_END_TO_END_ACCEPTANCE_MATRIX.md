# ExamSpace End-to-End Acceptance Matrix — UI-10

## Trạng thái bằng chứng

UI-09 lịch sử: root87 + HTTP60 + browser123 PASS. UI-10 mới: lint PASS, root87/87 PASS, HTTP/PostgreSQL60/60 PASS; browser **28 PASS rồi API test exit 0xC0000409**, suite123 chưa hoàn tất. Bảng dưới là route inventory, không phải tuyên bố UI-10 acceptance PASS.

## App Router inventory

| Actual path                   | Page / parent layout                                                     | Role / API                                     | States, navigation, responsive                                                     | Coverage / remaining                                       |
| ----------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `/`                           | `app/page.tsx`, RootLayout                                               | Public; no private API                         | Landing, role cards, anchors/login; public responsive header                       | UI Foundation historical; static UI-10 inventory           |
| `/login`                      | `app/login/page.tsx`, RootLayout                                         | Public; auth/login, auth/me                    | Validation/pending/error, role redirect, dark/mobile                               | Foundation/Admin/Student historical                        |
| POST `/login/unavailable`     | `app/login/unavailable/route.ts`, handler only                           | Public no-JS fallback; no API                  | 400 no-store text response, discards body                                          | Source review                                              |
| `/dashboard/[role]`           | `app/dashboard/[role]/page.tsx`, RootLayout                              | ADMIN/TEACHER/STUDENT; SSR auth/me + dashboard | Wrong-role/login redirect; totals loading/error/retry; role shell                  | Admin/Teacher/Student historical; UI-10 browser incomplete |
| `/admin/users`                | `app/admin/users/page.tsx`, AdminLayout/AdminShell                       | ADMIN; users                                   | Search/filter/page, create/edit/status/password actions, validation/confirm/errors | Admin browser/API historical                               |
| `/admin/classes`              | `app/admin/classes/page.tsx`, AdminLayout                                | ADMIN; classes/users/roster                    | List/detail/create/edit/teacher/member states                                      | Admin historical                                           |
| `/admin/exams`                | `app/admin/exams/page.tsx`, AdminLayout                                  | ADMIN; exams                                   | List/monitor/report links, empty/error                                             | Admin historical                                           |
| `/admin/exams/[id]/results`   | `app/admin/exams/[id]/results/page.tsx`, AdminLayout                     | ADMIN; exam results                            | Loading/error/empty/page/detail links; shell                                       | Results historical                                         |
| `/admin/results/[id]`         | `app/admin/results/[id]/page.tsx`, AdminLayout                           | ADMIN; result detail                           | Projected score/key, contextual Back                                               | Results historical                                         |
| `/teacher/classes`            | `app/teacher/classes/page.tsx`, TeacherLayout/TeacherShell               | TEACHER; scoped classes/students               | Search/page/detail/member states, mobile drawer                                    | Teacher historical                                         |
| `/teacher/questions`          | `app/teacher/questions/page.tsx`, TeacherLayout                          | TEACHER; questions                             | Search/type/difficulty/topic/page, create/edit/duplicate/archive/errors            | Teacher/Matching historical                                |
| `/teacher/exams`              | `app/teacher/exams/page.tsx`, TeacherLayout                              | TEACHER; exams                                 | Search/status/page, create/detail/publish links                                    | Teacher historical                                         |
| `/teacher/exams/new`          | `app/teacher/exams/new/page.tsx`, TeacherLayout                          | TEACHER; exams/questions                       | Draft validation/pending/errors, responsive editor, list fallback                  | Teacher historical                                         |
| `/teacher/exams/[id]`         | `app/teacher/exams/[id]/page.tsx`, TeacherLayout                         | TEACHER; preview/versions                      | Draft/published snapshot, versions and actions                                     | Teacher historical                                         |
| `/teacher/exams/[id]/edit`    | `app/teacher/exams/[id]/edit/page.tsx`, TeacherLayout                    | TEACHER; exams/questions                       | Validation/pending/error, contextual Back                                          | Teacher historical                                         |
| `/teacher/exams/[id]/results` | `app/teacher/exams/[id]/results/page.tsx`, TeacherLayout                 | TEACHER; results/assignment roster             | Scoped report, pagination/detail links                                             | Results historical                                         |
| `/teacher/assignments`        | `app/teacher/assignments/page.tsx`, TeacherLayout                        | TEACHER; assignment/exam/class APIs            | Create/update/search/page/409/error; responsive                                    | HTTP fresh; Teacher browser historical                     |
| `/teacher/results`            | `app/teacher/results/page.tsx`, TeacherLayout/TeacherShell               | TEACHER; results index                         | Search/page/loading/error/empty, active Results nav                                | UI-09 historical direct/index/refresh PASS                 |
| `/teacher/results/[id]`       | `app/teacher/results/[id]/page.tsx`, TeacherLayout                       | TEACHER; scoped result detail                  | Projection + contextual Back; no nested shell                                      | UI-09 historical PASS                                      |
| `/student/classes`            | `app/student/classes/page.tsx`, StudentLayout/StudentShell               | STUDENT; own memberships                       | Read-only detail, revoked-membership retry/error                                   | Student historical                                         |
| `/student/exams`              | `app/student/exams/page.tsx`, StudentLayout                              | STUDENT; own assignments/attempts              | Future/open/closed/max/in-progress/archived/error; start/resume                    | Student historical                                         |
| `/student/attempts/[id]`      | `app/student/attempts/[id]/page.tsx`, RootLayout; isolated attempt guard | STUDENT owner; attempt read/save/review/submit | Deadline, save/409/UNKNOWN, safe leave; responsive                                 | UI-08.1 historical; UI-10 interrupted                      |
| `/student/results`            | `app/student/results/page.tsx`, StudentLayout/StudentShell               | STUDENT; own results                           | Hidden vs zero score, empty/loading/error                                          | Student/Results historical                                 |
| `/student/results/[id]`       | `app/student/results/[id]/page.tsx`, StudentLayout                       | STUDENT owner; projected detail                | Key only when policy permits, contextual Back                                      | Results historical                                         |

### Framework fallback routes

No custom `loading.tsx`, `error.tsx`, or `not-found.tsx` was found under `apps/web/src/app`; component-level queries render most loading/error/empty states, Next defaults handle remaining route errors/404s. No API health endpoint was found; Swagger is `/docs`. A dedicated error/404 boundary could be considered separately. This was not a confirmed defect from the interrupted run.

## Business flow acceptance

| Flow                                        | Authority / expected invariant                           | Evidence and current status                                                             |
| ------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Admin account/class setup                   | Backend RBAC and scoped users/classes                    | Admin UI/API historical; HTTP fresh; browser incomplete                                 |
| Teacher question authoring → publish        | Question DTO, Matching UUID pairs, immutable ExamVersion | UI-09 tests historical; browser incomplete                                              |
| Assignment pinned version/schedule          | Assignment API, schedule conflict and ownership          | HTTP60 fresh; browser incomplete                                                        |
| Student start/resume/autosave/review/submit | Server attempt ID/revision/deadline/grading              | UI-08.1 historical; browser incomplete                                                  |
| Results for Student/Teacher/Admin           | Role-scoped projection, showScore/showAnswers            | UI-09 historical; browser incomplete                                                    |
| Session change/IDOR/cache                   | Auth/session lifecycle + backend guards                  | HTTP fresh; browser incomplete                                                          |
| API failure/recovery                        | Persisted revision and server reconciliation             | Selected UI-08.1 cases historical; no general recovery claim; UI-10 crash is unresolved |

Static path/link search found no TODO/FIXME/direct router.back call. Dynamic href correctness is not established by static search alone. UI-09 historically checked root/index no-Back, role parent fallback, Teacher Results shell, and workspace leave guard. The interrupted UI-10 run did not reaccept every route.

## Responsive / accessibility

Prior reports cover 390/768/1024/1440 and LIGHT/DARK subsets, axe, keyboard/drawer focus and matching pointer/touch. Fresh UI-10 reached 390px and 768px checks before the crash; remaining browser cases were not rerun. No screen-reader or system-wide WCAG certification.

## UI-10.1 current evidence addendum — 02/11/2026

Historical UI-09 and UI-10 entries above remain unchanged. Current evidence is deliberately separated from historical full-green rows.

| Route / feature                                  | UI-10.1 current evidence                                                                | Runtime status                | Final functional gate                     | Environment                                                           | Source fingerprint                              | Evidence                           |
| ------------------------------------------------ | --------------------------------------------------------------------------------------- | ----------------------------- | ----------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------- |
| Shared shell and Admin/Teacher/Student routes    | UI-10 root 87/87 and HTTP 60/60 PASS; browser ended after 28/123                        | OPEN; API exit during browser | INCOMPLETE                                | Isolated test API4010/Web3010; test DB guard                          | UI-10.1 before.json and final-preservation.json | `%TEMP%\\examspace-ui101-20261102` |
| Teacher Results shell, contextual Back, Matching | UI-09 123 browser cases are HISTORICAL PASS ONLY; UI-10 browser incomplete              | OPEN                          | HISTORICAL PASS ONLY / INCOMPLETE current | UI worktree, prior isolated run                                       | UI-10.1 doc-only edits                          | UI-09 evidence plus UI-10.1 report |
| Exam Workspace, autosave, submit, deadlines      | UI-08.1 108 browser cases HISTORICAL PASS ONLY; no full UI-10 current rerun             | OPEN                          | INCOMPLETE                                | Prior guarded test DB                                                 | No application source changed in UI-10.1        | UI-08.1/10 evidence                |
| HTTP/PostgreSQL contracts and security           | UI-10 same-source 60/60 PASS                                                            | OPEN                          | PASS for this suite only                  | `127.0.0.1:15433/online_exam_phase3_test`; cluster/migrations guarded | Current app code unchanged                      | UI-10 runner evidence              |
| Root tests                                       | UI-10 87/87 PASS                                                                        | OPEN                          | PASS for this suite only                  | Isolated UI worktree run                                              | Current app code unchanged                      | UI-10 runner evidence              |
| Typecheck                                        | UI-10.1 isolated PASS, exit 0                                                           | No API workload               | PASS                                      | TEMP clone; no shared `.next`                                         | Source copy matched UI snapshot at start        | `isolated-typecheck.log`           |
| Production build                                 | First isolated attempt infrastructure-failed; self-contained clone attempt PASS, exit 0 | No API workload               | PASS                                      | TEMP clone; NEXT_PUBLIC_API_URL=4010                                  | Build output confined to clone                  | `isolated-build-attempt2.log`      |
| Browser E2E                                      | 28/123 completed before API PID17996 exit; remaining 95 NOT RUN                         | Native exit recorded          | INCOMPLETE                                | Test API4010/Web3010                                                  | Same UI-10 source                               | UI-10 final-runner evidence        |

Allowed evidence labels in this addendum are PASS, INCOMPLETE, HISTORICAL PASS ONLY and NOT RUN. A historical PASS is never promoted to a UI-10.1 current PASS.

## UI-10.2 diagnostic addendum — 02/11/2026

Current disposition: **DIAGNOSTIC WORKLOAD BLOCKED BY LISTENER OWNERSHIP GATE — ROOT CAUSE UNKNOWN — RUNTIME RISK OPEN.** Historical UI-09 270-test PASS and UI-10 root/HTTP PASS remain historical. There is no new full functional acceptance.

| Scope                                                              | UI-10.2 current evidence                                                                                                    | Status                                             |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Observer default-off, route sanitizer, scheduler Promise semantics | Six observer tests and synthetic canary passed; enabled canary emitted 50 starts,50 completes,one activation heartbeat      | PASS in synthetic/unit scope                       |
| Test database                                                      | Guard verified independent cluster7702318921920503846 and five migrations; aggregate metadata only                          | PASS                                               |
| API identity and listener                                          | Owned child PID/start/parent/executable verified; OS listener owner list for4010 empty                                      | BLOCKED for listener ownership                     |
| Initial API probe                                                  | One unauthenticated GET returned401;52.498s before intentional stop, but HTTP observer inactive due missing run-ID variable | INCOMPLETE / disqualified for HTTP instrumentation |
| Qualified v3 probe                                                 | OBSERVER_READY observed; stopped before HTTP/fixtures/suites at ownership guard                                             | BLOCKED                                            |
| Root/HTTP/browser/security/exam regressions                        | No new suite run; no new270-test claim                                                                                      | NOT RUN                                            |
| Typecheck/build/lint                                               | No product source changes; UI-10.1 isolated build/typecheck remain historical                                               | NOT RUN anew                                       |
| Runtime/native cause                                               | No native exit in short current probes; no exception stack/module or causal fix                                             | OPEN — UNKNOWN                                     |

Each OBS/CRASH/ENV/EXAM case has a scoped status and evidence in [UI-10.2 Reproduction Matrix](EXAMSPACE_UI102_REPRODUCTION_MATRIX.md). Planned or source-reviewed failure paths are not marked executed PASS. See the [investigation](EXAMSPACE_UI102_NATIVE_CRASH_ISOLATION_REPORT.md) and [schema](EXAMSPACE_UI102_OBSERVABILITY_SCHEMA.md).

## UI-10.3 dated addendum — 03/11/2026

**WINDOWS LISTENER OWNERSHIP VISIBILITY BLOCKED — SAFETY GATE PRESERVED.**

Initial IPv4/IPv6 returned state2; final correct PID/port rows returned state0 and were rejected.44 diagnostic tests PASS; API spawn0/application requests0. PostgreSQL15433 refused connections; Docker API denied. No elevated diagnostic retry, system security change, product/runtime fix, native capture or agent dev control.

Current product root/HTTP/browser acceptance INCOMPLETE. Matching/autosave/revision/deadline/submit/version/result-policy/RBAC not rerun.44 diagnostic cases are separate. Gate A negative subchecks PASS but final live positives BLOCKED; B/C real workload not run; D blocked; E not approved.

Historical text above remains byte-exact. Native cause UNKNOWN; runtime OPEN; full acceptance INCOMPLETE; integration/staging BLOCKED; production NOT APPROVED.

Evidence: C:/Users/Admin/AppData/Local/Temp/examspace-ui103-20261103-d58f2a90. [Ownership report](EXAMSPACE_UI103_LISTENER_OWNERSHIP_REPORT.md), [matrix](EXAMSPACE_UI103_OWNERSHIP_PROBE_MATRIX.md), [observer validation](EXAMSPACE_UI103_API_OBSERVER_VALIDATION.md).

## UI-10.4 evidence addendum — 03/11/2026

**DOCKER READ-ONLY INSPECTION BLOCKED BY PERMISSIONS. WINDOWS LISTENER ENUMERATION INCONSISTENT — GATE B BLOCKED.**

New44/44 diagnostic tests PASS; no product tests counted. Docker CLI29.6.2 available, current context CLI says default with unreadable user config, Engine permission denied. Exact test container status/volume/exit cause UNKNOWN. One bounded TCP probe15433 refused; SQL not attempted. No Docker lifecycle/security/privilege/runtime/product change.

UI104 current full root/HTTP/browser acceptance INCOMPLETE. DB-01–20, OWN-104-01–20 and API-104-01–12 are mapped in the new reports; API cases blocked/not run, not business failures. Historical270 PASS remains historical; no new product regression claim.

Initial controller interruption is retained with exact Node exit UNKNOWN; IPv4 completed once, only missing IPv6 continued under a supervisor. Both canary children exit0; no ExamSpace API native reproduction. Runtime0xC0000409 cause UNKNOWN/OPEN, functional acceptance INCOMPLETE, integration/staging BLOCKED, production NOT APPROVED.

Historical bytes above are retained. Evidence: C:/Users/Admin/AppData/Local/Temp/examspace-ui104-20261103-9d202804. [Main report](EXAMSPACE_UI104_ENVIRONMENT_AND_OWNERSHIP_RECOVERY_REPORT.md), [PostgreSQL environment](EXAMSPACE_UI104_POSTGRESQL_TEST_ENVIRONMENT_REPORT.md), [Windows ownership](EXAMSPACE_UI104_WINDOWS_SOCKET_OWNERSHIP_REPORT.md).

## UI-10.6 checkpoint addendum — 10/11/2026

Historical conclusions above retained. Fresh guarded SQL metadata verifies correct test DB/cluster/five completed migrations, read_only=on and connection closed. Current Docker no-replacement check pending operator; Gate A overall PARTIAL at this checkpoint. No repeated startup/Docker lifecycle/dev SQL.

Codex IPv4PID31196/65510 and IPv6PID1300/65511 each returned native class3/5 state0 with matching numeric owner. First invalid sample stopped that listener; planned remaining samples NOT RUN. Get-NetTCPConnection/CIM PermissionDenied; netstat no target listener. Both child IPC close/exit0/target rows absent. Gate B BLOCKED, state0 REJECTED;44diagnostic tests PASS do not substitute for positives.

User-context canary/current Docker metadata handoff prepared and source-reviewed, explicit execution pending. CC02/03/04 NOT RUN; no confirmed context-dependent mechanism yet. No API4010/Web3010/HTTP/scheduler/API resource/PG aggregates/full E2E, no W1 consent inferred. Native cause UNKNOWN, runtime OPEN, integration/staging BLOCKED, production NOT APPROVED.

Details: [UI-10.6 report](EXAMSPACE_UI106_WINDOWS_OWNERSHIP_AND_API_OBSERVABILITY_REPORT.md), [matrix](EXAMSPACE_UI106_CROSS_CONTEXT_SOCKET_MATRIX.md), [operator handoff](EXAMSPACE_UI106_OPERATOR_VERIFICATION_HANDOFF.md). Evidence C:\Users\Admin\AppData\Local\Temp\examspace-ui106-20261110-35f95d0c. Product source/versions/env/index/original repository preserved; no source fix, security change or native dump.

## UI-10.6 final measured results — 10/11/2026

This completes the user-context checkpoint above. User explicitly approved and executed the reviewed operator once: outer9c814479-bbeb-48ed-958b-22d743ccc12f/inner75cd1362-7074-48d8-b4f7-cb992c795b09. Source/runtime/context/lifetime/result hashes validated; provenance is local user-operated consistency, not independent cryptographic authentication.

Current exact Docker container/image/volume/loopback15433 mapping verified running, original StartedAt unchanged. Fresh guarded read-only SQL 2026-11-10T13:32:27.559Z verifies correct database/cluster and exactly five completed/non-rolled-back migrations; connection closed. Gate A PASS at measured times; no lifecycle/development SQL/data mutation, no full-data/schema/backup certification.

User IPv4PID14536/60072 and IPv6PID9044/60075 both native state0 with matching owner, as in Codex. User CIM works while Codex is denied; user Get-NetTCPConnection projection threw on null State. A separate null-safe TEMP collector variant is offline verified; native state0 remains unexplained, live positive not verified.47/47diagnostics PASS in final invocation, not44+47 or application tests. Gate B BLOCKED in both contexts, state0/null rejected; CC03/04 simultaneous cross queries NOT RUN.

No API/W1/observer/scheduler/API resources/PG aggregates/full regression, native capture or source/runtime/security change. W1 approval not applicable while B blocked. ROOT CAUSE UNKNOWN, RUNTIME OPEN, integration/staging BLOCKED, production NOT APPROVED. Original pending-checkpoint text and historical conclusions retained. See [UI-10.6 final report](EXAMSPACE_UI106_WINDOWS_OWNERSHIP_AND_API_OBSERVABILITY_REPORT.md).
