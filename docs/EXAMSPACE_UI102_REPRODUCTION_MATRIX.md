# ExamSpace UI-10.2 — Reproduction Matrix

Date: 02/11/2026, Asia/Saigon. Evidence %TEMP%\examspace-ui102-20261102-c34ba7d1. HEAD a1e2891754e399aa4743e32c8218759938149bdc; public baseline fingerprint 48833f84303597feb8acfccc55ad2919724b5c745934cee87134e40e67131c13. Node 24.15.0, Windows x64 SHA-256 3331e1ffe19874215472217c5e94f5a0c6d8e18c4ac7111d3937aa0ad5e9b4a5. Compiled main 246dedbf1f0b7f41f6d4711ca59e38461140b9658c9cd00841bbd3296b41a42d.

## Executed runs

| Run                                              | Workload/bounds                                         | Observer/requests                                      | Exit/result                             | Evidence/interpretation                      |
| ------------------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------- | -------------------------------------------- |
| Initial synthetic                                | 50 requests per disabled/enabledchild;concurrency1;20 s | Sync-file thenIPC experiments;fake data                | Canary PASS;timings noisy               | http/sanitizer-canary files;not app tests    |
| V3 synthetic                                     | 50 disabled+50 enabled;20 s each                        | 0 events disabled;50 START/50 COMPLETE/1 READY enabled | Unit6/6 + canary PASS                   | observer-v3/verification.json                |
| Initial API PID 21240,parent 36320               | Startup15s,GET/auth/me401,idle 35 s;observed52.498 s    | HTTP inactive from missing runId;process/PG only       | Intentional null/SIGTERM;no native exit | summary/idle-run.json;HTTP gate disqualified |
| observed-v3-c7f709c5-b0fc-4372-bbb5-93cea9cb624c | Startup/heartbeat/ownership guard                       | READY;0 HTTP/fixtures/suites                           | Intentional null/SIGTERM16:29:26.243Z   | runs/runId;owner list empty;BLOCKED          |

Test API4010/PG15433 only; no web. Both processes stopped after PID/start/executable/parent verification;0 restarts. Initial TCP readiness/401 do not prove socket owner.

## Planned workload disposition

| Workload              | Exact selection/purpose                                                                                | Bounds                                                                                       | Status                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| W1 startup/idle       | Heartbeat,owned listener,GET/auth/me401,live scheduler span                                            | 15sstartup,25stick-validation                                                                | PARTIAL initial;qualified W1BLOCKED              |
| W2 auth               | Existing tests/p0-api.test.cjs,F01+fixtures                                                            | Oneworker;240 s;no duplicate count for shared invocation                                     | NOT RUN                                          |
| W3 scoped reads       | Existing p0result/ownership assertions                                                                 | Same p0invocation                                                                            | NOT RUN                                          |
| W4 Teacher operations | p0fixtures question/exam/publish/assignment                                                            | GuardedtestDB,same invocation                                                                | NOT RUN                                          |
| W5 exam session       | p0F07/F08/F09save/revision/submit/pin/deadline                                                         | Existing assertions unchanged                                                                | NOT RUN                                          |
| W6 expiry             | node --test --test-reporter=tap --test-concurrency=1 --test-name-pattern=NT04/05 tests/p2-api.test.cjs | 540sworker;125attempt/two-stage poison/idempotency unchanged;other cases explicitly filtered | NOT RUN                                          |
| W7 bounded browser    | Hypothesis-specific existing cases after API validation+isolated web ownership                         | Explicit case/time/request caps;API4010/Web3010                                              | NOT RUN                                          |
| W8 full candidate     | Root87/HTTP60/Browser123historical;actual package integration9 files/e2e10 files                       | Freeze/build/observer/DB/ownership first;oneplannedrun                                       | NOT RUN;readiness BLOCKED                        |
| Linux                 | Existing compatible ExamSpace environment only                                                         | No download/install/versionchange                                                            | NOT AVAILABLE in verified compatible environment |

V3 global caps780s,3000 HTTPstarts,32activeHTTP,100000 events;process2s/PG5s target;no restart. No suite executed past ownership guard. Historical270 tests never count as current UI-10.2PASS.

## Acceptance cases

| Case     | Status                            | Evidence/limit                                             |
| -------- | --------------------------------- | ---------------------------------------------------------- |
| OBS-01   | PASS                              | Default-off units/canary0 events                           |
| OBS-02   | PASS synthetic;BLOCKED API        | Static template matcher;no qualified API HTTP              |
| OBS-03   | PASS scoped                       | Canary body/token/cookie/answer markers absent             |
| OBS-04   | PARTIAL                           | Canary complete;native missing/abort paths NOT RUN         |
| OBS-05   | PARTIAL                           | Scheduler semantics units;live ticks NOT RUN               |
| OBS-06   | PASS aggregates                   | Guardedcounts;private Prisma metrics unsupported           |
| OBS-07   | PARTIAL                           | Child identity verified;listenerownerBLOCKED               |
| OBS-08   | PASS                              | Per-run/task SHA-256 manifests                             |
| OBS-09   | PARTIAL                           | Truncation schema/source review;native path NOT RUN        |
| OBS-10   | PASS                              | observer-v3/verification.json                              |
| CRASH-01 | PASS review                       | Historical timeline retained,no invented Foundation uptime |
| CRASH-02 | PASS                              | Both current stops intentional beforetermination           |
| CRASH-03 | NOT RUN                           | No nativeexit/dependent worker                             |
| CRASH-04 | PASS current                      | 0 restarts,no native rerun                                 |
| CRASH-05 | NOT RUN                           | No nativeexit;callback source only                         |
| CRASH-06 | PASS review                       | No last-test causal attribution                            |
| CRASH-07 | PASS                              | Read-only19 events/0 strictmatches                         |
| CRASH-08 | PASS scope                        | No dump/debugger/securitymutation                          |
| CRASH-09 | PASS review                       | Evidence/confidence matrix in mainreport                   |
| CRASH-10 | PASS                              | Native cause UNKNOWN,no FIXED claim                        |
| ENV-01   | PASS                              | Distinct cluster 7702318921920503846;5 migrations          |
| ENV-02   | BLOCKED                           | Listenerownerempty;webNOTRUN                               |
| ENV-03   | PASS action scope                 | No development stop/start/mutation                         |
| ENV-04   | PASS final scope                  | summary/final-preservation.json                            |
| ENV-05   | NOT RUN anew                      | UI-10.1clone build historical,noUI-10.2build               |
| ENV-06   | PASS preflight;comparison NOT RUN | No verified compatibleLinux environment                    |
| ENV-07   | PASS scope                        | Nodehash/version retained,noPATH/dependencyedit            |
| ENV-08   | PASS scope                        | No download/install                                        |
| EXAM-01  | NOT RUN                           | Matching UUID/grading regression blocked                   |
| EXAM-02  | NOT RUN                           | Autosave revision blocked                                  |
| EXAM-03  | NOT RUN                           | Conflict409blocked                                         |
| EXAM-04  | NOT RUN                           | Safesubmitblocked                                          |
| EXAM-05  | NOT RUN                           | UNKNOWNreconcileblocked                                    |
| EXAM-06  | NOT RUN                           | Serverdeadline/expiryblocked                               |
| EXAM-07  | NOT RUN                           | PinnedV1/V2blocked                                         |
| EXAM-08  | NOT RUN                           | Score/keypolicyblocked                                     |
| EXAM-09  | NOT RUN                           | Initial401not fullRBAC/IDORregression                      |
| EXAM-10  | PASS canary scope                 | Fake answer/key absent;no currentexamfixtures              |

## Four gates

A Diagnostic Safety BLOCKED by socket ownership despite DB/sanitizer subchecks PASS. B Root Cause UNKNOWN. C Functional Acceptance INCOMPLETE. D Runtime/Release OPEN/BLOCKED;staging/production NOT APPROVED.

No native exit in short probes does not close historical instability. Related reproduction stopped at the explicit hard stop; documentation/preservation continued.

## Additional environment canary

Owned synthetic IPv6 TCP listener, ephemeral port, PID 38008; no API/DB/HTTP fixture traffic. IPv4-only, IPv6-only and all-protocol netstat owner lists were empty. Expected owner verification assertion: FAIL (environment diagnostic), child closed through its control channel. Evidence: observer-v3/listener-ipv6-canary.json. This is not a native crash, not an observer-unit failure, and not a reason to bypass ENV-02. No additional API run followed.

## UI-10.3 dated addendum — 03/11/2026

**WINDOWS LISTENER OWNERSHIP VISIBILITY BLOCKED — SAFETY GATE PRESERVED.**

Initial IPv4/IPv6 returned state2; final correct PID/port rows returned state0 and were rejected.44 diagnostic tests PASS; API spawn0/application requests0. PostgreSQL15433 refused connections; Docker API denied. No elevated diagnostic retry, system security change, product/runtime fix, native capture or agent dev control.

W1 API BLOCKED before spawn. W2 auth/W3 reads/W4 Teacher/W5 Student/W6 expiry/W7 browser/full candidate NOT RUN. New OWN/OBS/RT matrix separates synthetic/simulated/real scopes. Historical270 tests are not current acceptance.

Historical text above remains byte-exact. Native cause UNKNOWN; runtime OPEN; full acceptance INCOMPLETE; integration/staging BLOCKED; production NOT APPROVED.

Evidence: C:/Users/Admin/AppData/Local/Temp/examspace-ui103-20261103-d58f2a90. [Ownership report](EXAMSPACE_UI103_LISTENER_OWNERSHIP_REPORT.md), [matrix](EXAMSPACE_UI103_OWNERSHIP_PROBE_MATRIX.md), [observer validation](EXAMSPACE_UI103_API_OBSERVER_VALIDATION.md).
