# ExamSpace UI-10.3 — Windows Listener Ownership Gate Recovery

Ngày: **03/11/2026, Asia/Saigon**. Timestamps below are UTC.

## 1. Executive summary

**WINDOWS LISTENER OWNERSHIP VISIBILITY BLOCKED — SAFETY GATE PRESERVED.**

Implemented a new TEMP ownership toolkit using documented Win32 APIs. Initial IPv4/IPv6 probes returned LISTEN/state2 with the correct child PID. Final probes returned state0 for the same kind of live sockets. Direct DWORD reads and separately marshalled structures agreed on0. The gate rejects this undocumented state; initial successes do not override the final BLOCKED result.

**44 diagnostic tests PASS, 0 failed/skipped in the final invocation.** These are not application tests. API spawn0; application requests0; full root/HTTP/browser NOT RUN. Test PostgreSQL connections were refused; user evidence later confirmed the intended container remained Exited (255). No native/runtime/product fix.

## 2. Git/source preservation

Worktree C:/Môn Học/ThucTapNgheNghiep/ExamSpace-Stitch-UI; branch feature/stitch-examspace-ui; HEAD a1e2891754e399aa4743e32c8218759938149bdc. Initial314 public files, fingerprint e473ba76baea48b982058bcdcc8634c6d30cccd367ee446f175b66d97d7d7fb0. Original238 files in the same current scope, excluding ignored/generated/env contents; this does not replace historical250-file counts.

Before documentation,314/314 UI and238/238 original hashes matched. Final ledger/checks: summary/final-preservation.json. Six documents receive exact-byte-preserving appendices; three reports are new. Product/backend/schema/five migrations, packages/lockfile, env and index contents are unchanged. No stage/commit/push/deploy or destructive Git command.

## 3. Three UI-10.2 reports reviewed

- Native Crash Isolation Report: wrong run-ID activation variable fixed in v3; subsequent API stopped at ownership.
- Observability Schema: default OFF, static route/IPC allowlist, exact original scheduler Promise, unsupported private Prisma metrics and IPC-loss limitations.
- Reproduction Matrix: qualified API workload remained blocked; synthetic evidence is separate.

Also reviewed UI-10.1 and acceptance/readiness/handoff/runbook documents. Read/runtime hashes: summary/read-runtime-ledger.json. All65 current-inventory UI-10.2 evidence files are retained byte-identical.

## 4. Historical ownership failure

UI-10.2 API PID12052 emitted READY but netstat did not verify port4010; stop was intentional. IPv6 wildcard canary PID38008 also had no accepted owner. Sparse raw command diagnostics prevent retrospective attribution to parser, family or OS cause. The earlier UI102_RUN_ID versus EXAMSPACE_UI102_RUN_ID bug explains missing observer events only, not ownership or native crashes.

## 5. Observer v3 inventory

Copied preload.cjs, routes.json, observer.test.cjs and verifier into new TEMP; env-file isolation copied separately. Preload/routes/units remain byte-identical to UI-10.2. Only the copied verifier path was adapted. Requires observability flag, corrected EXAMSPACE_UI102_RUN_ID, route resource and IPC; scheduler has its own flag. Nothing installed into application startup/config.

## 6. Exact harness implementation

New harness/ownership.cjs uses absolute executables, hidden windows,10s command limit and2MiB output cap. Cwd: supplied Online_Examination_System workspace. Account CodexSandboxOffline, admin token false, PowerShell5.1.26100.9818, FullLanguage/session6. Baseline execution-context.json stores actual identity/context.

PowerShell invocation: SystemRoot/System32/WindowsPowerShell/v1.0/powershell.exe -NoLogo -NoProfile -NonInteractive -EncodedCommand <UTF16LE inline command>. Records preserve exact arguments, UTC start/end, elapsed time, exit/signal/error, stdout/stderr hashes/counts, BOM prefix and NUL count. No privilege/policy change.

Win32 helper uses bounded sizing/allocation, three buffer-size retries, count/buffer checks, numeric port/PID/state and explicit AF_INET2/AF_INET6=23. OpenProcess(QUERY_LIMITED_INFORMATION), GetProcessTimes, QueryFullProcessImageName and Toolhelp snapshot verify PID/start/executable/parent without CIM or process-memory reads.

Outcomes: VERIFIED, LISTENER_NOT_FOUND, OWNER_MISMATCH, QUERY_FAILED, PERMISSION_DENIED, PARSE_FAILED, PROCESS_EXITED, TIMEOUT, UNKNOWN. Only VERIFIED permits application traffic.

## 7. PowerShell findings

Get-NetTCPConnection returns PermissionDenied/HRESULT0x80041003; CIM also returns Access denied. CLASS-1 failures, not empty success. Script-file invocation was refused by existing execution policy; permitted inline execution was used without changing policy. Documented read-only process APIs worked for owned children. No elevated diagnostic retry, ACL/security change.

## 8. netstat findings

Executed absolute netstat.exe with -ano -p tcp, -ano -p tcpv6 and -ano while sockets stayed open. Exit0, stderr empty, normal ASCII socket fields, no BOM/NUL issue. No raw line contained the target local port before parsing. Thus no demonstrated parser-skipped listener.

Full tables were inspected transiently; unrelated socket inventories were not retained. Evidence saves scoped target lines, whole-output hashes/byte/line counts and separate parsed rows. This limits reconstruction of unrelated output without inventing a target row. Unknown/localized state labels fail closed.

## 9. Structured OS query findings

Documented GetExtendedTcpTable, OWNER_PID_LISTENER class3 versus OWNER_PID_ALL class5. Initial listener-class rows state2, all-class state0. Final both classes state0 with correct PID/address/port. All discrepancies retained.

One additional bounded ABI audit per family compared direct DWORD and Marshal.PtrToStructure: both state0; IPv4 stride/state offset24/0, IPv6 56/48. Canary-only raw row bytes locate this observation upstream of JavaScript parsing. This audit is not a passing acceptance retry.

Microsoft documents [GetExtendedTcpTable](https://learn.microsoft.com/en-us/windows/win32/api/iphlpapi/nf-iphlpapi-getextendedtcptable), [table classes](https://learn.microsoft.com/en-us/windows/win32/api/iprtrmib/ne-iprtrmib-tcp_table_class) and [IPv6 layout/states](https://learn.microsoft.com/en-us/windows/win32/api/tcpmib/ns-tcpmib-mib_tcp6row_owner_pid). LISTEN is2; the toolkit does not reinterpret0. Underlying provider/Windows mechanism UNKNOWN.

## 10. IPv4 canary

First PID18472,127.0.0.1:50756,state2,VERIFIED. Final PID34060,127.0.0.1:60393,state0,UNKNOWN/BLOCKED. Actual TCP connected; IPC state/address bracketed queries. Neither is substituted for OS ownership. Both children closed via control channel, exit0.

## 11. IPv6 canary

First PID21548,[::1]:50759,state2,VERIFIED. Final PID22740,[::1]:60401,state0,UNKNOWN/BLOCKED. Explicit ipv6Only. No wildcard/public/dual-stack canary; no family inferred from another. All runs had distinct run IDs.

## 12. Negative tests

Final44 tests:36 ownership/parser/error,2 freeze/identity,6 observer. Wrong owner/port, stale start/PID, wrong exe/parent, missing process, empty/malformed output, permission/nonzero/timeout, mixed owners, state0/FIN_WAIT1, dev3000/4000 and TCP/READY-only acceptance reject.

Real final canaries confirm TCP-ready plus perturbed owner remains OWNER_MISMATCH, reverified identity before close, no rows after close and PROCESS_EXITED afterward. PID reuse/start mismatch and READY flags are simulated; no real PID reuse/native failure forced. See [matrix](EXAMSPACE_UI103_OWNERSHIP_PROBE_MATRIX.md).

## 13. Root-cause classification

| Class        | Evidence-supported disposition                                                   |
| ------------ | -------------------------------------------------------------------------------- |
| 1 execution  | CONFIRMED permission errors for CIM/Get-NetTCPConnection; netstat exited0        |
| 2 parser     | NOT DEMONSTRATED: no raw target netstat row; direct/native struct state agree    |
| 3 family     | NOT sole demonstrated cause: both explicit families fail finally                 |
| 4 timing     | NOT DEMONSTRATED: live snapshots bracket queries; close occurs later             |
| 5 PID        | Canary native PID matches; deliberate wrong owner rejected                       |
| 6 visibility | OBSERVED: netstat row absent, native state inconsistent across measured runs     |
| 7 identity   | Documented owned-process identity succeeds; CIM-only approach unavailable        |
| 8 isolation  | UNCONFIRMED; observed session/parent is not proof of every network compartment   |
| 9 mechanism  | UNKNOWN; no specific Windows defect, sandbox policy or native module attribution |

## 14. Harness fix details

New TEMP backend adds documented OS/process queries, typed outcomes, raw/parser diagnostics, negative tests, cleanup checks and allowlisted freeze writer. No confirmed regex/invocation defect explains the absent row. State2 remains mandatory; empty/error/mismatch cannot pass. No product fix. The replacement is NOT accepted for routine API workloads because final live positive acceptance is BLOCKED.

## 15. Before/after evidence

UI-10.2 sparse empty owner array → UI-10.3 initial native state2 with netstat empty → final native state0 and gate BLOCKED → ABI audit confirms raw0. Diagnostic progress, not causal before-fail/after-pass repair.

Preparation failures retained: TEMP edit inserted literal escaped newline, producing SyntaxError before tests; corrected before qualified final invocation. First abort verifier had valid events but parent exited1 after duplicate IPC disconnect; one guarded-disconnect correction then exit0. Failed outputs remain separate, not counted PASS.

## 16. API4010 ownership result

**BLOCKED; API never spawned.** Two initial W1 preflights reached test DB connect and received ECONNREFUSED before spawn. The second followed user-reported test startup; no API restart occurred. After final synthetic BLOCKED, no API launch followed. API PID/start/owner/READY unavailable; no dev4000 fallback.

## 17. API observer validation

Real API HTTP NOT RUN. Synthetic: disabled50 requests/0 events; enabled50/50START/50COMPLETE/1READY, sensitive markers absent. Abort canary:1START/1ABORT/0COMPLETE, matching correlation, final wrapper exit0. These are not Nest evidence. See [validation](EXAMSPACE_UI103_API_OBSERVER_VALIDATION.md).

## 18. Scheduler live validation

Source interval15000ms and per-row error isolation unchanged. No in-flight guard added. Units preserve original Promise/this/args and outer failure semantics. No real tick/duration/overlap/count/row outcome observed. No expiry fixtures or enlarged tick timeout.

## 19. PostgreSQL metadata

Configured test:127.0.0.1:15433/online_exam_phase3_test. Expected identities in config are not current SQL proof. Both connections failed before SQL; separate15s availability check also refused connections and native target row absent. Docker API permission denied; no elevated retry/container mutation.

User first showed healthy development5432, then intended test container Exited(255). No development SQL, restore/reset/migration/seed/drop/volume operation. Current SQL identity/five migrations NOT VERIFIED; PG aggregates NOT RUN. Prisma private metrics UNSUPPORTED.

## 20. Native crash diagnostics

Prepared W1 only: startup15s; unauthenticated GET/auth/me401;1request/concurrency1;200events; resource/PG target2s; at most25s for one normal tick;60s overall;0restarts. Exact code/selection in api/w1.cjs; no API workload executed. W2–W7 and full suites NOT RUN.

Historical Foundation/UI-05/UI-07/UI-08/two UI-08.1/UI-10 native incidents remain unchanged, including UI-10 PID17996 exit2026-11-02T11:59:34.004Z. No endpoint causal attribution.

## 21. New native incident

None on ExamSpace: no API ran. Canary controlled/natural exit0 is not0xC0000409. Safe simulation exercised actual local freeze writer using synthetic spans/resources/PG and excluded injected sensitive fields. No forced failure, dump/debugger/ProcDump or new exception parameters/stack/faulting module.

## 22. Full regression readiness

BLOCKED by final synthetic positives and unavailable test DB. Typecheck/lint/build/application root/HTTP/browser NOT RUN in UI-10.3. No product changes, live .next/build writes or compiler-rule changes. Historical UI-10.1 build/UI-09 270 tests are not current acceptance.

## 23. Remaining blockers

- Consistent documented OS LISTEN ownership under permitted diagnostic identity; no reinterpretation of0 or extra privileges to force PASS.
- Existing independent test DB availability, then actual cluster identity and five migrations; no substitute dev5432/new restored DB.
- Only after synthetic PASS: exact real API4010 identity/OS listener, GET401/correlated HTTP, then normal tick and guarded PG/resources.
- Frozen source/isolated build and reviewed bounded plan before full browser123; native causal and staging/production gates remain open.

## 24. Evidence and hashes

Evidence: C:/Users/Admin/AppData/Local/Temp/examspace-ui103-20261103-d58f2a90.

summary/evidence-sha256.json inventories evidence; summary/manifest-sha256.txt hashes that manifest and is excluded from self-inventory. Final preservation checks65/65 old UI-10.2 evidence files and byte-exact historical document prefixes.

Subtrees: baseline, harness, canary, ownership/first-probe, ownership/abi-audit.json, tests/diagnostic-final.tap, http, database, process, windows, summary, staged. Secret scan coverage/limits: summary/secret-scan.json. No raw private Stitch assets, config secrets or native dumps committed.

## 25. Cleanup

All8 identity-tracked targets absent, all6 tracked TCP ports without rows in final checks. Both50-request HTTP children also exited0 in verifier. No API/web/resource sampler/application worker started. No agent Docker control or development process termination.

Complete dev service state UNKNOWN: trustworthy initial socket inventory unavailable; user reported dev PostgreSQL healthy. Databases/volumes/evidence retained. No registry/Defender/WER/firewall/ACL/global runtime change. Command-local git safe.directory allowed read-only inspection of Admin-owned repositories; no Git config persisted.

## 26. Final verdict

| Gate                          | Status                                                          |
| ----------------------------- | --------------------------------------------------------------- |
| Source preservation           | VERIFIED; six documentation appendices, three new reports       |
| Original repository           | UNCHANGED; current238-file scope; Git/index/env hashes retained |
| Development services          | UNKNOWN full state; no agent dev stop/start/SQL                 |
| Windows socket enumeration    | PARTIAL; final positive ownership BLOCKED                       |
| Listener ownership root cause | UNKNOWN; visibility/state discrepancy observed                  |
| Harness fix                   | APPLIED in new TEMP toolkit only; no application fix            |
| Harness fix verification      | FAIL live positive acceptance; negative tests PASS              |
| Synthetic IPv4 ownership      | BLOCKED final; initial VERIFIED retained                        |
| Synthetic IPv6 ownership      | BLOCKED final; initial VERIFIED retained                        |
| Negative ownership tests      | PASS in real/simulated scope                                    |
| API4010 listener ownership    | BLOCKED; API never spawned                                      |
| Observer v3 activation        | PARTIAL; synthetic VERIFIED, real NOT RUN                       |
| HTTP API diagnostics          | BLOCKED                                                         |
| Scheduler diagnostics         | NOT RUN live                                                    |
| PostgreSQL metadata           | NOT RUN; current identity/migrations not verified               |
| Sanitization                  | PASS in scanned/canary scope                                    |
| Native crash reproduced       | NOT RUN on ExamSpace API                                        |
| Native root cause             | UNKNOWN                                                         |
| Native fix                    | NOT APPLIED                                                     |
| Native fix verification       | NOT VERIFIED                                                    |
| Full regression readiness     | BLOCKED                                                         |
| Browser E2E 123 cases         | NOT RUN                                                         |
| Functional acceptance         | INCOMPLETE                                                      |
| Runtime stability             | OPEN                                                            |
| Integration readiness         | BLOCKED                                                         |
| Staging readiness             | BLOCKED                                                         |
| Production                    | NOT APPROVED                                                    |

**WINDOWS LISTENER OWNERSHIP VISIBILITY BLOCKED — SAFETY GATE PRESERVED.**

**FULL FUNCTIONAL ACCEPTANCE INCOMPLETE — HISTORICAL RUNTIME RISK OPEN — PRODUCTION NOT APPROVED.**

## UI-10.4 evidence addendum — 03/11/2026

**DOCKER READ-ONLY INSPECTION BLOCKED BY PERMISSIONS. WINDOWS LISTENER ENUMERATION INCONSISTENT — GATE B BLOCKED.**

New44/44 diagnostic tests PASS; no product tests counted. Docker CLI29.6.2 available, current context CLI says default with unreadable user config, Engine permission denied. Exact test container status/volume/exit cause UNKNOWN. One bounded TCP probe15433 refused; SQL not attempted. No Docker lifecycle/security/privilege/runtime/product change.

UI104 retained all first2/final0/ABI0 evidence. One IPv4 and one IPv6 child each yielded3 same-listener samples. Classes3/5, unchanged/zero/0xA5 initial buffers all returned native0 with matching PID/port and direct/struct agreement. No same-socket2→0 observed; no verified ownership repair or decision change.

Initial controller interruption is retained with exact Node exit UNKNOWN; IPv4 completed once, only missing IPv6 continued under a supervisor. Both canary children exit0; no ExamSpace API native reproduction. Runtime0xC0000409 cause UNKNOWN/OPEN, functional acceptance INCOMPLETE, integration/staging BLOCKED, production NOT APPROVED.

Historical bytes above are retained. Evidence: C:/Users/Admin/AppData/Local/Temp/examspace-ui104-20261103-9d202804. [Main report](EXAMSPACE_UI104_ENVIRONMENT_AND_OWNERSHIP_RECOVERY_REPORT.md), [PostgreSQL environment](EXAMSPACE_UI104_POSTGRESQL_TEST_ENVIRONMENT_REPORT.md), [Windows ownership](EXAMSPACE_UI104_WINDOWS_SOCKET_OWNERSHIP_REPORT.md).
