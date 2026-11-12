# ExamSpace Integration Handoff Plan — UI-10

## Current state

- UI worktree: `C:\Môn Học\ThucTapNgheNghiep\ExamSpace-Stitch-UI`
- Branch/HEAD: `feature/stitch-examspace-ui` / `a1e2891754e399aa4743e32c8218759938149bdc`
- UI-01–UI-09 remain uncommitted and retained. UI-10 adds five Markdown deliverables only.
- UI-10 pre-doc snapshot: 306 files; all 306 remained byte-identical. Original Phase 3 repository: 250/250 unchanged. The UI worktree's 65 tracked `apps/api` files matched HEAD at preservation check.
- No staged delta, commit, push, merge, deployment, API/schema/migration/dependency edit.
- Evidence is in `%TEMP%\examspace-ui10-20261102`; test env, logs, browser profiles, screenshots/raw private Stitch assets are not handoff source.
- UI-10 final acceptance is incomplete: API PID17996 exited 0xC0000409 during browser E2E.

## Suggested integration sequence (not executed)

1. Freeze and review this worktree against the intended Phase 3 base. Keep UI-10 status and runtime risk explicit.
2. Resolve/disposition native instability and complete all gates on a frozen source.
3. Create a separate integration branch from the intended Phase 3 HEAD; import changes in reviewable groups.
4. Review/integrate in dependency order:
   - Foundation: tokens, providers, login/session, public pages/common shell.
   - Admin: dashboard/users/classes/exams.
   - Teacher: classes, questions/Matching, editor/versions, assignments, Results.
   - Student: dashboard/classes/assignments/history.
   - Exam workspace: navigation guard, autosave UI integration, review/submit.
   - Results/Reports and documentation.
     Each group depends on shared auth, API client and shell/layout. Run the related tests after each group.
5. Review backend RBAC/DTO, immutable snapshots and result policy independently. This UI adds no API or migration.
6. Rehearse target DB migration/backup/restore only in an approved integration environment.
7. Stage/commit/PR/deploy only under a later explicit release process. Nothing was staged or published here.

## UI-10 change ledger

| Category                  | Change                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| Application source        | No UI-10 source edits; UI-01–UI-09 carried forward                                         |
| Backend/schema/migrations | No change                                                                                  |
| Dependencies/lockfile     | No change                                                                                  |
| Tests                     | Existing suites invoked; no test source changed                                            |
| Documentation             | Final polish report, acceptance matrix, production gap report, handoff plan, local runbook |
| Ignored/generated         | Build/test artifacts are not product changes                                               |
| External evidence         | TEMP only                                                                                  |

The preexisting UI worktree has extensive local changes; do not attribute all changes to UI-10 or include unrelated editor/plugin state automatically. Use the saved UI-10 baseline and exact file-level review.

## Exclude from integration

`.env`, test env JSON, secrets, tokens/cookies, runtime evidence, TEMP folders, `node_modules`, `.next`, generated Prisma Client, build output, screenshots/profile storage, raw PRIVATE Stitch HTML/images, and unrelated local plugin state.

## Future rollback

Use a dedicated integration branch and revert only reviewed feature commits, preserving DB state and unrelated local work. Check for active attempts before any rollback; UI rollback must not reset data. No rollback or Git mutation occurred in UI-10.

## Acceptance gate

Do not accept the UI-10 branch until the native runtime incident has an evidence-backed disposition, full Browser E2E and typecheck/build finish on frozen source, and P0/P1 gaps are reviewed. Functional acceptance does not equal production approval.

## UI-10.1 handoff addendum — 02/11/2026

- UI-01–UI-09 remain uncommitted in the UI worktree; no product source change was made in UI-10.1. Four existing UI-10 reports were amended and `docs/EXAMSPACE_UI101_RUNTIME_AND_ACCEPTANCE_REPORT.md` was added.
- UI HEAD remains `a1e2891754e399aa4743e32c8218759938149bdc`, branch `feature/stitch-examspace-ui`; index unchanged. Original Phase 3 repository was not modified.
- Keep `.env*`, `.next`, `node_modules`, `dist`, TEMP evidence, browser profiles/screenshots, runtime logs and private Stitch files out of any source integration. The isolated TEMP build copy is evidence, not an integration source.
- No backend/schema/migration/dependency/lockfile edits. API `apps/api` remains subject to byte/HEAD verification before any later handoff.
- Integration readiness is BLOCKED by incomplete UI-10 browser acceptance and OPEN runtime P0. Source may be reviewed separately, but do not import/merge or claim acceptance from this report.
- Staging is separately BLOCKED pending a reviewed runtime disposition, full functional gate, TLS/proxy/cookie/CSRF, backup/restore, observability, concurrency/scheduler and rollback evidence.
- Evidence root: `%TEMP%\\examspace-ui101-20261102`; UI-10 incident evidence remains `%TEMP%\\examspace-ui10-20261102\\final-runner\\full-fe1b300e-309e-425c-afa5-6ceb03b04fb3`.

## UI-10.2 handoff addendum — 02/11/2026

UI-10.2 repository changes are documentation only: three new investigation/schema/reproduction reports and appended updates to the four acceptance/gap/handoff/runbook documents. Product source, backend, tests, schema/migrations, dependencies and lockfiles were not changed. UI-01–UI-10 work remains uncommitted; no integration was performed.

The opt-in observer, scheduler wrapper, env-isolation preload, unit/canary tests and guarded runner are TEMP evidence at %TEMP%\examspace-ui102-20261102-c34ba7d1. They are diagnostic tooling, not production source or an automatic integration payload. Static routes, Promise semantics and emitted-log sanitizer were tested; real API heartbeat was observed. Actual API HTTP/scheduler regression remains unverified because listener ownership failed before traffic.

Current source baseline fingerprint48833f84303597feb8acfccc55ad2919724b5c745934cee87134e40e67131c13 and per-file preservation are recorded in snapshots/source-before.json and summary/final-preservation.json. That public-manifest scope excludes env/ignored/generated/dependency files; it does not redefine older reports' counts.

Integration acceptance and staging remain BLOCKED by runtime P0 and incomplete full browser/security acceptance. A later diagnostic environment must verify API4010/Web3010 ownership, test cluster/migrations, observer handshake/sanitizer, frozen source and isolated build outputs before suites. Native capture requires separate approval. Staging still needs TLS/proxy/cookie/CSRF, backup/restore, monitoring/load/scheduler and rollback evidence. No TEMP config/log/profile/private asset should enter source integration.

## UI-10.3 dated addendum — 03/11/2026

**WINDOWS LISTENER OWNERSHIP VISIBILITY BLOCKED — SAFETY GATE PRESERVED.**

Initial IPv4/IPv6 returned state2; final correct PID/port rows returned state0 and were rejected.44 diagnostic tests PASS; API spawn0/application requests0. PostgreSQL15433 refused connections; Docker API denied. No elevated diagnostic retry, system security change, product/runtime fix, native capture or agent dev control.

Integration/staging BLOCKED. Review new TEMP OS/process helper, command metadata, native state/structure audit, negatives and retained failure evidence. Do not promote the toolkit to routine acceptance until live positive ownership is consistent and the actual API observer gate is exercised.

Historical text above remains byte-exact. Native cause UNKNOWN; runtime OPEN; full acceptance INCOMPLETE; integration/staging BLOCKED; production NOT APPROVED.

Evidence: C:/Users/Admin/AppData/Local/Temp/examspace-ui103-20261103-d58f2a90. [Ownership report](EXAMSPACE_UI103_LISTENER_OWNERSHIP_REPORT.md), [matrix](EXAMSPACE_UI103_OWNERSHIP_PROBE_MATRIX.md), [observer validation](EXAMSPACE_UI103_API_OBSERVER_VALIDATION.md).

## UI-10.4 evidence addendum — 03/11/2026

**DOCKER READ-ONLY INSPECTION BLOCKED BY PERMISSIONS. WINDOWS LISTENER ENUMERATION INCONSISTENT — GATE B BLOCKED.**

New44/44 diagnostic tests PASS; no product tests counted. Docker CLI29.6.2 available, current context CLI says default with unreadable user config, Engine permission denied. Exact test container status/volume/exit cause UNKNOWN. One bounded TCP probe15433 refused; SQL not attempted. No Docker lifecycle/security/privilege/runtime/product change.

Actual recovery is Case B Engine inaccessible: owner/platform operator needs selected read-only container/image/state/port/Compose/mount/volume metadata and sanitized bounded logs before a concrete startup approval request. No current exact container/volume/data integrity proof, no automatic start/restore/recreate/elevation. Review new buffer-fill and per-socket sequence evidence independently of Docker/native crash.

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
