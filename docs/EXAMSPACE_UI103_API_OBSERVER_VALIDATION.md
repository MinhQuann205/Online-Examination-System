# ExamSpace UI-10.3 — API Observer Validation

03/11/2026, Asia/Saigon. **REAL API OBSERVABILITY BLOCKED — SYNTHETIC EVIDENCE ONLY.**

## Synthetic versus real evidence

External v3 preload remains default OFF. Preload/routes/unit files copied byte-identical; verifier path alone adapted. Enable requires corrected EXAMSPACE_UI102_RUN_ID, observability flag, static routes and IPC. READY proves installed hooks, not a live API listener or tick.

Fresh synthetic: disabled50 requests/0 events; enabled50 requests/50START/50COMPLETE/1READY. Fake auth/cookie/query/path/body/answer/key markers absent. Separate abort:1START/1ABORT/0COMPLETE, same correlation ID, final wrapper exit0. These are synthetic servers, not Nest/API evidence.

First abort verifier emitted valid events but parent exited1 on a late duplicate disconnect. Failed outputs retained in http/abort-first-wrapper-failed; one guarded-disconnect correction then final exit0.

## Actual API disposition

API spawn0; API PID unavailable; real READY0; application requests0; real HTTP/scheduler spans0; API resource samples0; PG aggregates0. W1 preflights2026-11-03T04:06:38.148Z and04:07:38.128Z got ECONNREFUSED before spawn. Second preflight followed user-reported test startup, not an API restart. User later identified healthy5432 container as development and expected15433 container as Exited(255).

Final synthetic positives failed on state0. No API may launch after that failure even if DB availability changes. Current SQL identity/five migrations NOT VERIFIED. No dev fallback, auth workflow, fixtures/migration/restore/reset/drop, browser or web3010 start.

## W1 plan and prerequisites

Prepared: GET/auth/me without credentials, expect401, only after exact API PID/start/executable/parent and OS LISTEN owner.1request/concurrency1; startup15s; correlation1.5s; HTTP3s; at most25s for one normal15000ms tick; resources/PG target2s;200events;60s overall;0restarts. Source/runtime fingerprints and lifecycle code in api/w1.cjs. No API code path was executed past preflight.

No enlarged tick timeout/expiry fixtures. Source lacks interval in-flight guard, but runtime overlap NOT OBSERVED. Wrapper units preserve exact Promise/this/args. Due-count is not finalized-count; caught row outcomes/private Prisma pool/query/transaction spans unsupported.

## Sanitization/correlation/limits

Static52 route templates; queries discarded, unknown paths UNMAPPED, body/headers not read. Allowlisted IPC scalar fields only. New freeze writer keeps diagnostic fields; actual writer test excludes injected sensitive fields. Exact-secret and JWT/private-key/GitHub/AWS pattern scan is scoped, not a universal no-secret guarantee.

Synthetic complete/abort correlation passed. Real abort/UNKNOWN and native final IPC loss NOT exercised. A future native exit can bypass event delivery; last-known open spans are incomplete context, not a causal stack. No debugger/dump/ProcDump/capture.

## OBS acceptance

| ID     | Scenario          | Expected                               | Actual                                                 | Evidence                             | Status          |
| ------ | ----------------- | -------------------------------------- | ------------------------------------------------------ | ------------------------------------ | --------------- |
| OBS-01 | Default OFF       | No events                              | Synthetic50/0 events + unit                            | verification.json                    | PASS synthetic  |
| OBS-02 | Real HTTP pair    | Actual API START/COMPLETE              | No API spawned                                         | W1 preflight failures                | BLOCKED         |
| OBS-03 | Sanitization      | No sensitive markers                   | Canaries + scoped scan                                 | verification; abort; scan            | PASS scoped     |
| OBS-04 | Correlation       | Pair IDs agree                         | Synthetic complete/abort agree; real not run           | synthetic event JSONL                | PARTIAL         |
| OBS-05 | Abort/unknown     | Accurate terminal event                | Synthetic1START/1ABORT/0COMPLETE; real unknown not run | abort-validation.json                | PARTIAL         |
| OBS-06 | Live scheduler    | Observe normal real tick               | Wrapper unit semantics only                            | observer units; W1 blocked           | NOT RUN live    |
| OBS-07 | Resources         | Bounded owned API samples              | Canary identities only; no API resources               | ownership; W1                        | NOT RUN API     |
| OBS-08 | PG guard          | Verify SQL identity first              | Connection refused before SQL                          | availability; preflight              | BLOCKED         |
| OBS-09 | Safe freeze       | Exercise writer without native failure | Actual writer simulation excludes injected fields      | freeze-simulation/context.json; unit | PASS simulation |
| OBS-10 | Product unchanged | No mutation                            | Documentation only                                     | final-preservation.json              | PASS            |

## Runtime acceptance

| ID    | Scenario             | Expected                | Actual                                                 | Evidence                       | Status                       |
| ----- | -------------------- | ----------------------- | ------------------------------------------------------ | ------------------------------ | ---------------------------- |
| RT-01 | History              | Retain incidents        | Seven historical incidents remain, prefixes unchanged  | UI102 + preservation           | PASS                         |
| RT-02 | Exit classification  | Intentional distinct    | Canaries exit0, API never ran                          | ownership records              | PASS canary scope            |
| RT-03 | Bounds               | Exact plan              | W1 prepared; preflight only                            | api/w1.cjs                     | PASS plan / workload BLOCKED |
| RT-04 | No until-green       | Retain failures         | Final gate failure preserved; ABI not acceptance retry | first/final/ABI                | PASS                         |
| RT-05 | Cause classification | Facts versus hypothesis | OS state discrepancy measured; mechanism UNKNOWN       | main classes                   | PASS review                  |
| RT-06 | No speculative fix   | No causal FIXED claim   | Native NOT APPLIED/NOT VERIFIED                        | main status table              | PASS review                  |
| RT-07 | Dev preserved        | No dev impact           | No agent dev action; complete state unknown            | cleanup; user container status | PARTIAL state                |
| RT-08 | No auto release      | Keep gates              | Integration/staging blocked; production not approved   | six addenda                    | PASS                         |

## Quality and next action

44 diagnostic tests PASS. Application typecheck/lint/build/root/HTTP/browser NOT RUN; no live build/product mutation. Full acceptance INCOMPLETE, runtime OPEN, production NOT APPROVED.

Require consistent synthetic OS LISTEN first, actual test DB availability/identity second, real API owner/correlated HTTP third. Then one normal tick/resources/guarded PG before optional workloads. Fresh evidence tree/run ID per rerun; never accept0, substitute TCP/READY or grant new privileges to force PASS.

Evidence: C:/Users/Admin/AppData/Local/Temp/examspace-ui103-20261103-d58f2a90. [Main report](EXAMSPACE_UI103_LISTENER_OWNERSHIP_REPORT.md); [matrix](EXAMSPACE_UI103_OWNERSHIP_PROBE_MATRIX.md).

## UI-10.4 evidence addendum — 03/11/2026

**DOCKER READ-ONLY INSPECTION BLOCKED BY PERMISSIONS. WINDOWS LISTENER ENUMERATION INCONSISTENT — GATE B BLOCKED.**

New44/44 diagnostic tests PASS; no product tests counted. Docker CLI29.6.2 available, current context CLI says default with unreadable user config, Engine permission denied. Exact test container status/volume/exit cause UNKNOWN. One bounded TCP probe15433 refused; SQL not attempted. No Docker lifecycle/security/privilege/runtime/product change.

UI104 API spawn0/application HTTP0. Gates A and B BLOCKED; Gate C, real observer READY/HTTP401/correlation/scheduler/API resource/PG metadata all NOT RUN.44 fresh diagnostic tests PASS are not real API or application acceptance.

Initial controller interruption is retained with exact Node exit UNKNOWN; IPv4 completed once, only missing IPv6 continued under a supervisor. Both canary children exit0; no ExamSpace API native reproduction. Runtime0xC0000409 cause UNKNOWN/OPEN, functional acceptance INCOMPLETE, integration/staging BLOCKED, production NOT APPROVED.

Historical bytes above are retained. Evidence: C:/Users/Admin/AppData/Local/Temp/examspace-ui104-20261103-9d202804. [Main report](EXAMSPACE_UI104_ENVIRONMENT_AND_OWNERSHIP_RECOVERY_REPORT.md), [PostgreSQL environment](EXAMSPACE_UI104_POSTGRESQL_TEST_ENVIRONMENT_REPORT.md), [Windows ownership](EXAMSPACE_UI104_WINDOWS_SOCKET_OWNERSHIP_REPORT.md).
