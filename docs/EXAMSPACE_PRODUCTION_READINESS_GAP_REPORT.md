# ExamSpace Production Readiness Gap Report — UI-10

Ngày đánh giá 02/11/2026. **Production readiness: NO.** Test-isolated functionality is not operational staging/production evidence. No deployment occurred.

## Blockers and required evidence

| Priority | Gap and evidence                                                                                                                                                                 | User/system impact                                                                                          | Required gate                                                                                                                                                                                       |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P0**   | Repeated API exits `3221226505 / 0xC0000409`; UI-10 API PID17996 exited at 2026-11-02T11:59:34Z during browser suite. No exception parameters, native stack, or faulting module. | API may stop during a live attempt. Save/submit response can be lost; unconfirmed client draft may be lost. | Native investigation under separately approved capture policy; determine evidence-backed cause or reviewed mitigation; bounded staging soak afterwards. Exit code alone does not identify a module. |
| **P0**   | UI-10 browser 123-case run stopped after 28 passes on native exit. Typecheck/build were not run because live Next dev owns the worktree build directory.                         | No complete final source acceptance.                                                                        | Freeze source and run typecheck/build/root/HTTP/full browser after safe runtime disposition and with no conflicting Next process. Preserve every exit; do not rerun to hide it.                     |
| **P1**   | Production HTTPS, proxy/TLS termination, Secure/SameSite cookies, CORS/CSRF origin behavior not tested on target staging.                                                        | Session/cookie or origin checks can fail or be weakened behind a proxy.                                     | Confirm public origins, trusted proxy/TLS, cookie policy and CSRF/CORS; run staging security/browser checks.                                                                                        |
| **P1**   | No target-infrastructure backup/restore or point-in-time recovery drill evidence.                                                                                                | Attempts/results may not be recoverable after data loss.                                                    | Define RPO/RTO/retention, encrypt backups, rehearse restore and validate version/attempt/answer/result invariants.                                                                                  |
| **P1**   | No load/soak, DB pool sizing, scheduler multi-instance/throughput certification.                                                                                                 | Pool saturation, deadline lag or grading races under concurrent exams.                                      | Staging load profile, connection budget, scheduler locking/ownership, deadline/submit race suite and alerts.                                                                                        |
| **P1**   | Production secret rotation, least-privilege DB grants, sanitized audit log and incident response owner not confirmed.                                                            | Credential/PII exposure or weak incident recovery.                                                          | Secret manager/rotation, DB grants, log redaction/retention, alerting and named on-call procedure.                                                                                                  |
| **P2**   | No NVDA/VoiceOver or full WCAG audit; axe/keyboard subsets only.                                                                                                                 | Some users may be unable to complete workflows.                                                             | Screen-reader audit login, management, editor, exam, submit and results; close findings.                                                                                                            |
| **P2**   | No explicit browser support/performance budgets/bundle and cache verification for production CDN.                                                                                | Slow transitions or unintended stale private data.                                                          | Define targets; test supported browser matrix and cross-account private cache isolation.                                                                                                            |
| **P2**   | Operational dashboards and support workflow for unknown submission/save state not validated.                                                                                     | Users/support may be unable to distinguish pending, committed and failed actions.                           | Monitor API errors/latency, DB pool, scheduler lag; correlation IDs without sensitive payloads and support runbook.                                                                                 |
| **P3**   | AI/IRT/proctoring/export/rank/certificates lack backend contract.                                                                                                                | Outside current product acceptance.                                                                         | Separate product/API/policy review before implementation; do not infer from Stitch prototypes.                                                                                                      |

## Exam data and recovery limits

AnswerAutosave serializes revisions in one client queue. A server-confirmed save is persisted; pending edits depend on the live browser process and can be lost after tab/browser/process/system failure. UI-08.1 tested selected network/timeout reconciliation cases in isolation, not every crash, browser loss, deadline race or multi-process scenario.

After an API failure, the server may have committed an operation while its response was lost. Resume the existing attempt and verify server state; do not create a second attempt based only on timeout. UI-10 did not capture request context at the native exit, so no endpoint or component is attributed.

## Pre-production sequence

1. Resolve/disposition P0 runtime and finish complete isolated acceptance.
2. Deploy a separate staging environment with TLS, managed secrets and separate DB identity.
3. Rehearse reviewed migrations and backup/restore; load-test scheduler, pools, locking and grading.
4. Run browser/security/accessibility checks against the target proxy/cookie configuration.
5. Review retention, audit, monitoring and incident support.
6. Obtain release-owner approval. Functional PASS alone does not approve production.

No runtime/package change is claimed as a fix.

## UI-10.1 evidence update — 02/11/2026

The existing gap rows and severity are retained. UI-10.1 adds no mitigation that closes a blocker.

| ID            | Severity | Evidence                                                                                                                        | Impact                                                           | Owner / approval                                        | Proposed action                                                                         | Verification                                                                          | Status                    |
| ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------- |
| P0-RUNTIME-01 | P0       | Repeated API exits `3221226505 / 0xC0000409`; latest UI-10 PID17996 exited 11:59:34.004Z after 221.067s; no native stack/module | API availability and in-flight exam actions remain unpredictable | Runtime owner; separate approval for any native capture | Correlate a bounded sanitized observer run; native capture only after separate approval | Exception code/parameters, stack, module/offset and bounded before/after verification | OPEN — ROOT CAUSE UNKNOWN |
| P0-ACCEPT-02  | P0       | UI-10 HTTP 60/60 and root87/87 PASS; browser 28/123 before API exit; UI-10.1 isolated typecheck/build PASS                      | Full UI-10 functional acceptance not demonstrated                | Product/test owner                                      | Finish browser/security matrix only after reviewed runtime test plan                    | All required browser cases pass without skips on frozen source and guarded DB         | OPEN — INCOMPLETE         |
| P1-STAGE-03   | P1       | No current TLS/proxy/Secure-cookie/backup/restore/monitoring/load/multi-instance evidence                                       | Deployment readiness unknown                                     | Platform/security/DB owners                             | Separate staging plan with test data and rollback                                       | Approved staging checklist and evidence                                               | OPEN                      |
| P2-A11Y-04    | P2       | Axe/responsive cases partly run; no screen-reader certification                                                                 | Accessibility coverage incomplete                                | Accessibility owner                                     | NVDA/VoiceOver and browser support review                                               | Assistive technology test record                                                      | OPEN                      |

Do not lower P0 severity based on UI-09 historical PASS, bounded non-crash runs or isolated build success. Production remains NOT APPROVED.

## UI-10.2 evidence update — 02/11/2026

P0-RUNTIME-01 remains **OPEN — ROOT CAUSE UNKNOWN**. Current short probes recorded no new native exit; neither probe establishes native stability. No runtime/dependency/product fix was applied, and the confirmed observer run-ID harness bug does not explain historical native failures.

P0-ACCEPT-02 remains **OPEN — INCOMPLETE**. UI-10.2 created a sanitized observer and passed six observer tests plus synthetic canaries, but real workloads stopped because OS port4010 ownership could not be verified. This is an investigation environment blocker, not a proven application defect. Current full root/HTTP/browser/security/exam acceptance was NOT RUN. Historical270 PASS is not current acceptance.

Before another diagnostic workload, the environment must expose a trustworthy listener-to-PID mapping while preserving dev3000/4000. Native capture, runtime/dependency/system-policy changes or a maintenance window require their own applicable authorization; none was performed here.

P1 TLS/proxy/cookie/CSRF, backup/restore, secret management/monitoring, pool/load and multi-instance scheduler gates remain OPEN. P2 accessibility/supported-browser/support procedures remain OPEN. Integration/staging BLOCKED; production NOT APPROVED. [UI-10.2 report](EXAMSPACE_UI102_NATIVE_CRASH_ISOLATION_REPORT.md) records evidence and limits.

## UI-10.3 dated addendum — 03/11/2026

**WINDOWS LISTENER OWNERSHIP VISIBILITY BLOCKED — SAFETY GATE PRESERVED.**

Initial IPv4/IPv6 returned state2; final correct PID/port rows returned state0 and were rejected.44 diagnostic tests PASS; API spawn0/application requests0. PostgreSQL15433 refused connections; Docker API denied. No elevated diagnostic retry, system security change, product/runtime fix, native capture or agent dev control.

P0-RUNTIME-01 OPEN, native cause UNKNOWN, no native fix. P0-ACCEPT-02 INCOMPLETE. Additional investigation blockers: inconsistent documented OS LISTEN state and unavailable independent test PostgreSQL15433. Existing severity/TLS/proxy/cookies/backup/load/accessibility gaps remain.

Historical text above remains byte-exact. Native cause UNKNOWN; runtime OPEN; full acceptance INCOMPLETE; integration/staging BLOCKED; production NOT APPROVED.

Evidence: C:/Users/Admin/AppData/Local/Temp/examspace-ui103-20261103-d58f2a90. [Ownership report](EXAMSPACE_UI103_LISTENER_OWNERSHIP_REPORT.md), [matrix](EXAMSPACE_UI103_OWNERSHIP_PROBE_MATRIX.md), [observer validation](EXAMSPACE_UI103_API_OBSERVER_VALIDATION.md).

## UI-10.4 evidence addendum — 03/11/2026

**DOCKER READ-ONLY INSPECTION BLOCKED BY PERMISSIONS. WINDOWS LISTENER ENUMERATION INCONSISTENT — GATE B BLOCKED.**

New44/44 diagnostic tests PASS; no product tests counted. Docker CLI29.6.2 available, current context CLI says default with unreadable user config, Engine permission denied. Exact test container status/volume/exit cause UNKNOWN. One bounded TCP probe15433 refused; SQL not attempted. No Docker lifecycle/security/privilege/runtime/product change.

Keep P0 native runtime OPEN/UNKNOWN and functional acceptance INCOMPLETE. Docker Engine/config access denied prevents current container/volume/exit forensics; endpoint15433 ECONNREFUSED. Native state0 persists for both owned listeners. No downgrade from44 diagnostic passes or infrastructure observations. No staging/production approval.

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
