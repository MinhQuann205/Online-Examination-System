# ExamSpace UI-10.1 — Runtime Investigation & Acceptance Report

**Ngày:** 02/11/2026, Asia/Saigon  
**Worktree:** `C:\Môn Học\ThucTapNgheNghiep\ExamSpace-Stitch-UI`  
**Kết luận:** `UI-10.1 ACCEPTANCE BLOCKED BY RECURRING NATIVE API EXIT — EVIDENCE PRESERVED — ROOT CAUSE UNKNOWN`  
**Functional gate:** INCOMPLETE · **Runtime gate:** OPEN · **Production:** NOT APPROVED

## 1. Executive summary

UI-10 test API PID 17996 exited unexpectedly with `3221226505 / 0xC0000409` during Browser E2E. HTTP/PostgreSQL 60/60 completed; browser completed 28 of 123 test cases before its dependent work was stopped. UI-10.1 did not restart the API or repeat the uninstrumented browser suite. No native exception record, parameters, stack or faulting module were captured. Root cause remains unknown; no application, backend, runtime or dependency fix was applied.

A hermetic-enough build copy was established under `%TEMP%\examspace-ui101-isolated-20261102`: Typecheck PASS and Build PASS, with all generated output in the copy. The live development Next server and its `.next` directory were preserved. UI-10.1 adds only this report and dated evidence addenda to four UI-10 documents; no product source was changed.

## 2. Current Git, worktree and source state

UI branch `feature/stitch-examspace-ui`, HEAD `a1e2891754e399aa4743e32c8218759938149bdc`. UI-10.1 initial snapshot: 311 files; index hash `16da9466ab1c5ba305adaa98a67d3c018b3c87665f63d943f4cd3fabcce785b7`; no staged delta. The source state carries the uncommitted UI-01–UI-09 work and UI-10 reports. Changes pre-existing at the start are not attributed to UI-10.1. Final comparison `%TEMP%\examspace-ui101-20261102\final-preservation.json` confirms 311 baseline files became 312: 307 unchanged, four existing documentation files changed, one report added, zero missing. HEAD, branch and index are unchanged. Original Phase 3 repository remains 250/250 files unchanged with its HEAD, branch and index unchanged.

The original Phase 3 repository was not modified. No reset, clean, stash, restore, checkout, rebase, merge, commit, push or deployment was performed. No `.env`, lockfile, application source, database schema or migration was edited.

## 3. Required UI-10 documents reviewed

Read all five: Final Polish Report, End-to-End Acceptance Matrix, Production Readiness Gap Report, Integration Handoff Plan and Local Test Runbook. Also reviewed the Workspace, Results, Runtime Stability, Native Diagnostics V2 and Native Capture reports, UI-10 evidence, repository instructions, package scripts and relevant Auth/Results/Grading/AnswerAutosave/ExamAttempts source and tests. Prior reports remain historical evidence; their PASS results are not substituted for the incomplete UI-10 browser run.

## 4. Incident timeline

All times are UTC. Uptime is shown only where process start and exit timestamps were recorded.

| Incident              | Start / PID                                           | Exit                                                        |    Uptime | Workload / evidence                                                             |
| --------------------- | ----------------------------------------------------- | ----------------------------------------------------------- | --------: | ------------------------------------------------------------------------------- |
| Foundation, 01 Nov    | wrapper PID 7952 at 08:30:50.862Z; API Node PID 30340 | `3221226505`; exact child exit time unavailable             |   UNKNOWN | Served E2E; logs do not identify work active at exit.                           |
| UI-05, 01 Nov         | PID 31436 at 09:32:46.378Z                            | 09:33:20.358Z, `3221226505`, signal null                    |   33.980s | Browser fixture setup/ECONNRESET; no request trace or native stack.             |
| UI-07, 01 Nov         | PID 24968 at 17:18:18.066Z                            | 17:40:33.016Z, same code, signal null                       | 1334.950s | Browser sequence included Admin F20; exact request at exit unknown.             |
| UI-08, 02 Nov         | PID 27600 at 05:11:47.117Z                            | 05:13:47.110Z, same code, signal null                       |  119.993s | Test API; frozen evidence; no native stack.                                     |
| UI-08.1 focus, 02 Nov | PID 27740 at 07:38:41.744Z                            | 07:38:47.598Z, same code, intentional=false                 |    5.854s | Focused run; frozen evidence.                                                   |
| UI-08.1 full, 02 Nov  | PID 13000 at 07:42:21.033Z                            | 07:47:35.032Z, same code, intentional=false                 |  313.999s | HTTP 54 passed; browser stopped around case 39.                                 |
| UI-09 final           | Test API, bounded suite                               | No unexpected exit recorded                                 |         — | 87 root + 60 HTTP + 123 browser historical PASS; final cleanup was intentional. |
| UI-10, 02 Nov         | PID 17996 at 11:55:52.937Z                            | 11:59:34.004Z, `3221226505`, signal null, intentional=false |  221.067s | HTTP 60 passed; browser 28/123 completed, then dependent suite stopped.         |

The first six are recorded unexpected native exits. UI-09's intentional stop is not classified as a crash. No exact active API request can be inferred from the last completed browser case.

## 5. UI-10 PID 17996 incident analysis

Evidence: `%TEMP%\examspace-ui10-20261102\final-runner\full-fe1b300e-309e-425c-afa5-6ceb03b04fb3`. Start record gives PID 17996, parent PID 38176, Node executable `C:\Program Files\nodejs\node.exe`, SHA-256 `3331e1ffe19874215472217c5e94f5a0c6d8e18c4ac7111d3937aa0ad5e9b4a5`, start `2026-11-02T11:55:52.937Z`. Exit was `2026-11-02T11:59:34.004Z`, code 3221226505, signal null, intentional false. Runner recorded zero API restarts and zero non-controller DB backends after stop; ProcDump was not used.

API args included Node fatal/uncaught report flags, environment/network exclusion, an environment-isolation preload and `dist/main.js`. No Node report was present. Browser stdout contains 28 completed cases; its final completed cases included 390px and 768px responsive/axe coverage. The next active test/request is unknown. The runner's small `active-at-exit.json` is not a request observer and cannot prove zero in-flight requests.

## 6. Windows event and WER diagnostics

Read-only query window: 2026-10-30T12:51:34Z–2026-11-02T12:51:34Z. Application log: 1,306 events; broad text filter found two candidates, but strict `node.exe` plus `0xC0000409`/3221226505 match count was zero. Defender Operational: 100 events, zero strict matches. WER Operational query was inaccessible. WER ReportArchive metadata listed 81 directories and none named for Node; ReportQueue had zero entries. Existing user CrashDumps metadata had 10 entries and no Node-named entry. `C:\Windows\Minidump` access was denied; no ACL was changed. Earlier diagnostics also found WER archive content scanning incomplete. These bounded queries neither explain the exit nor clear Windows/security software as a cause.

## 7. Node/runtime and native-module evidence

Recorded runtime: Node 24.15.0, Windows x64, executable hash above; previous signature check was Valid/OpenJS Foundation. Windows build recorded in prior diagnostics: 10.0.26300.0. No Node global/PATH change occurred. Runtime package inventory from prior read-only diagnostics: libuv 1.51.0, Argon2 0.44.0, Prisma Client 7.10.1, pg 8.23.1 and Nest 11.2.7. These versions do not establish which modules were loaded at PID 17996's exit. No faulting module, offset, exception parameters or native thread stack is available.

## 8. Prisma and PostgreSQL findings

UI-10 used the isolated PostgreSQL test endpoint guarded by host, port, database name, cluster identity and migration checks in its runner. HTTP/PostgreSQL suite completed 60/60; the runner's post-stop backend snapshot was empty. This is not a mapping from a PostgreSQL backend to a specific HTTP request at the crash. No development SQL was queried or changed. Prior source diagnostics describe Prisma's adapter/query-compiler arrangement, but no exact Prisma/PG execution context was captured at the failure.

## 9. Nest lifecycle and scheduler

Source uses the existing bounded expiry scheduler and service-level failure handling. Prior source review records a 15-second scan cadence. UI-10 did not record scheduler start/end events at crash time; no evidence ties scheduler, grading, shutdown hooks or an in-flight transaction to the exit. No lifecycle hook, scheduler cadence or grading policy was modified.

## 10. Harness and process ownership

The UI-10 test runner started the API test on 4010 and web test on 3010; the recorded API parent was runner PID 38176. On the unexpected API exit it stopped dependent browser work, did not restart the API, and recorded a separate intentional web stop. Development ports 3000/4000 were not targeted. This separates known harness actions from the unexpected API exit, but does not exclude every external process termination mechanism.

## 11. Root-cause hypothesis matrix

| Hypothesis                          | Supporting evidence                                                        | Contradicting / missing evidence                                                                         | Safe test / outcome                                                                     | Confidence             |
| ----------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------- |
| Node/V8/libuv/WASM boundary         | Repeated Windows native status under Node 24.15.0.                         | No exception reason, stack or fault module; bounded runs sometimes survive.                              | Runtime comparison only in a separately approved, compatible environment; not run here. | Weak hypothesis.       |
| Argon2/N-API addon                  | Addon present in earlier inventory and authentication workload exists.     | Presence is not fault evidence; no module/stack at exit.                                                 | Isolated, workload-specific comparison with native capture approval if needed; not run. | Weak hypothesis.       |
| Prisma/adapter-pg/pool              | Real PostgreSQL workflows and concurrent operations exist.                 | No query, transaction or backend mapping at exit; HTTP suite passed.                                     | Instrumented test-only request/PG metadata; no causal test run in this continuation.    | Weak hypothesis.       |
| Nest scheduler/lifecycle            | Scheduler and background work run in the API.                              | No scheduler trace at exit; no shutdown evidence.                                                        | Reuse sanitized test observer before any bounded reproduction.                          | Weak hypothesis.       |
| Test harness/build/worker lifecycle | API ran under a parent runner; dependent work stopped after exit.          | Runner recorded API exit before its intentional web cleanup; no evidence of harness initiating API stop. | Inspect exact process records and add observer before a future run.                     | Possible, unconfirmed. |
| Windows/OS/security intervention    | Windows process exits with native status; event/WER visibility incomplete. | No matching strict event; no OS intervention record.                                                     | Read-only OS evidence; further capture requires separate approval.                      | Unknown.               |

## 12. Controlled reproduction plan and result

No additional API reproduction was launched in this continuation. UI-10 already had a bounded full runner and reproduced the native exit; repeating the same browser load without better diagnostics would add little causal information. Future test-only runs must use one API PID on 4010, web 3010, guarded test DB `127.0.0.1:15433/online_exam_phase3_test`, explicit source/runtime fingerprints and sanitized HTTP/scheduler/resource/PG observer data; cap duration and stop on any unexpected exit. No repeat-until-green policy.

## 13. New native incident in UI-10.1

None. UI-10.1 did not start/restart a test API. The existing UI-10 incident remains preserved and is not relabeled as a new reproduction.

## 14. Root cause disposition

**UNKNOWN.** Exit status alone does not prove a buffer overrun or identify a module, reason, thread or OS action. There is no causal evidence to choose Node, libuv, Argon2, Prisma, Nest, PostgreSQL, harness or Windows as the root cause.

## 15. Source/runtime fix

No fix was applied. No application source, backend, schema, migration, dependency, lockfile, Node global, Windows security setting or registry was changed.

## 16. Fix verification

Not applicable. No causal fix exists, so there is no before-fail/after-fix verification. Historical passing suites do not close the runtime gate.

## 17. Current development process ownership

Read-only snapshots during UI-10.1 showed a changing dev process state. Initially Next child PID 26424 listened on 3000; the parent tree included PIDs 33756, 460, 5404, 32348, 36912 and Next parent 2800. At later checks PID 26424 remained present but 3000 showed FIN_WAIT_1, not LISTEN. API child PID 19632 was present in an earlier snapshot with no 4000 listener; a later snapshot showed Node PID 18812 (start 2026-11-02T12:54:24.658Z) listening on 4000, while the final 13:04:52Z snapshot showed no LISTEN on 3000/4000/3010/4010. `.next/dev/lock` existed. WMI command-line query was Access Denied; executable path and process start were readable through Get-Process. No development process was stopped or attached, and these transient snapshots do not establish why listeners changed. Refresh process ownership before any future operation.

## 18. Isolated build approach

The copy `%TEMP%\examspace-ui101-isolated-20261102` excluded `.git`, `.env*`, `.next`, dependency directories and generated outputs. Initial Next attempt failed because dependency junctions resolved outside the isolated workspace. The dependency tree was then copied into the isolated workspace (897,367,548 bytes of regular package files); 3,101 junctions were remapped inside the copy, including `@exam/shared`. No install, global store mutation, config change or main-worktree cache use was required. The copy had no `.env` files; sensitive process environment variables were cleared for the build child and only `NEXT_PUBLIC_API_URL=http://127.0.0.1:4010` plus telemetry-disabled were set.

## 19. Typecheck and build

Isolated typecheck: **PASS, exit 0**. Isolated build: first attempt **infrastructure FAIL** due Turbopack rejecting external dependency junctions; after making the dependency tree self-contained, build **PASS, exit 0**. Shared, API and Next outputs, including `.next/BUILD_ID`, were generated under the isolated TEMP copy. The live UI worktree `.next` and dev server were not used as build output. The failed first build is retained and not counted as the final gate.

## 20. Final source fingerprint

UI-10.1 baseline snapshot is `%TEMP%\examspace-ui101-20261102\before.json`; final reconciliation is `%TEMP%\examspace-ui101-20261102\final-preservation.json`. It confirms 307 of 311 baseline files unchanged, the four existing requested Markdown documents changed, one report added, and zero missing. HEAD/branch/index are unchanged. A separate clone comparison found no non-documentation source mismatch after excluding generated `tsconfig.tsbuildinfo`, build output and `.next`.

## 21. Root tests

UI-10 same-source root suite: **87/87 PASS** (tooling 17, Jest 47 across 14 suites, frontend 23). No UI-10.1 product source changed. Result is accepted as the recorded UI-10 run; it is not a new rerun.

## 22. HTTP/PostgreSQL tests

UI-10 same-source HTTP/PostgreSQL: **60/60 PASS**, completed before browser work, no skip reported. Database guard and final connection snapshot are retained by the runner. No UI-10.1 rerun was performed after the runtime incident.

## 23. Browser E2E

**INCOMPLETE: 28/123 completed before API exit.** The remaining 95 cases did not run to completion and are not assertion failures or passes. Browser exit followed API exit by about 0.102 seconds; dependent testing stopped. No browser retry was used to mask the failure.

## 24. Role-flow regression

Admin/Teacher/Student behavior is supported by UI-09 historical full green and UI-10 root/HTTP plus the first 28 browser cases only. Current full browser verification is incomplete. Do not promote role-flow historical PASS to current full acceptance.

## 25. Matching, autosave, submit and deadline regression

UI-09/08.1 historical tests cover Matching UUID snapshots/server grading, AnswerAutosave revision serialization, submit UNKNOWN reconciliation and server-authoritative deadlines. UI-10 full browser did not finish these gates in its current run. UI-10.1 changed no code; current end-to-end status remains INCOMPLETE, not a fresh PASS.

## 26. Security, RBAC and result policy

UI-10 HTTP 60/60 and root tests passed their configured cases; UI-09 historical suites cover RBAC/IDOR, score/key policy and scoped results. Because UI-10 Browser ended early, the complete combined security/browser matrix is not current-green. No successful API behavior was changed or mocked in this continuation.

## 27. UI, responsive and accessibility regression

The completed UI-10 browser cases include 390px and 768px responsive/axe tests; the complete 123-case suite did not finish. UI-09 historical visual, four-width, theme and focused zoom evidence remains historical. No screen-reader certification is claimed.

## 28. Production P0/P1 blockers

P0: repeated native API exits without faulting module/root cause; UI-10 browser suite incomplete. P1: staging TLS/proxy/Secure-cookie/CSRF verification, backup/restore, secrets/monitoring, pool/load, scheduler multi-instance and crash recovery. P2: full assistive-technology/browser support, performance budgets and support procedure for UNKNOWN submit. See the updated Production Readiness Gap Report for evidence, owner/approval, action, verification and status fields.

## 29. Integration readiness

**BLOCKED for integration acceptance.** UI-01–UI-09 remain uncommitted local changes. UI-10.1 changes are documentation-only. No source integration, stage or commit was performed. A separate review may inspect the diff, but acceptance remains incomplete and runtime risk explicit.

## 30. Staging readiness

**BLOCKED pending separate decision.** Isolated build success is not staging approval. Runtime root cause/disposition and incomplete full browser gate remain open. Staging requires separate environment, approved test data, TLS/proxy/cookie/CSRF, backup/restore, monitoring and rollback verification.

## 31. Source, database and process preservation

No source application changes, dependency/runtime changes or database writes were made in UI-10.1. Original Phase 3 repo remained untouched. No development SQL, reset/drop/seed, migration or volume operation occurred. Test database evidence/data was retained. Live dev process and `.next` were not stopped or modified. UI-10's own test runner cleaned only its recorded API4010/web3010 children; UI-10.1 started no service.

## 32. Evidence paths and cleanup

- UI-10.1 snapshot/logs/build copy: `%TEMP%\examspace-ui101-20261102`.
- UI-10 incident: `%TEMP%\examspace-ui10-20261102\final-runner\full-fe1b300e-309e-425c-afa5-6ceb03b04fb3`.
- Earlier incidents: their original `%TEMP%\examspace-*` folders listed in prior reports; none overwritten or deleted.
- No dump, credential, cookie, request body or raw private Stitch asset is included here.

Only owned isolated copy/output is disposable; no historical evidence was deleted. User data, databases and volumes were retained.

## 33. Remaining approvals required

No approval is requested for a native debugger/dump in this report; any such capture needs a separate explicit approval and private storage review. A future maintenance window is needed before any action that would stop/change the live development server or its `.next`. No permission to change runtime/dependencies, Windows policy, development DB or deploy is inferred.

## 34. Final recommendation

Keep `RUNTIME ROOT CAUSE UNKNOWN — RUNTIME RISK OPEN`. Do not integrate as accepted or stage from this evidence. Preserve the native incident; complete an instrumented, bounded test-only investigation only if it can correlate sanitized lifecycle/request/scheduler/PG data without touching development processes. Finish the browser suite only after the runtime investigation plan is reviewed; do not loop until green. Production is not approved.

## Required final status table

| Gate                  | Status                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------- |
| Source preservation   | VERIFIED (UI-10.1 changes limited to docs; final hash reconciliation recorded separately) |
| Runtime root cause    | UNKNOWN                                                                                   |
| Native runtime fix    | NOT APPLIED                                                                               |
| Windows diagnostics   | PARTIAL                                                                                   |
| Isolated build        | VERIFIED                                                                                  |
| Typecheck             | PASS                                                                                      |
| Build                 | PASS                                                                                      |
| Root tests            | PASS (UI-10 recorded run)                                                                 |
| HTTP/PostgreSQL       | PASS (UI-10 recorded run)                                                                 |
| Browser E2E           | INCOMPLETE (28/123 before API exit)                                                       |
| Admin                 | PARTIAL                                                                                   |
| Teacher               | PARTIAL                                                                                   |
| Student               | PARTIAL                                                                                   |
| Matching              | PARTIAL                                                                                   |
| Autosave              | PARTIAL                                                                                   |
| Submission            | PARTIAL                                                                                   |
| Security regression   | NOT RUN                                                                                   |
| Functional acceptance | INCOMPLETE                                                                                |
| Runtime stability     | OPEN                                                                                      |
| Integration readiness | BLOCKED                                                                                   |
| Staging readiness     | BLOCKED                                                                                   |
| Production readiness  | NOT APPROVED                                                                              |

**Final status:** `UI-10.1 ACCEPTANCE BLOCKED BY RECURRING NATIVE API EXIT — EVIDENCE PRESERVED — ROOT CAUSE UNKNOWN`.
