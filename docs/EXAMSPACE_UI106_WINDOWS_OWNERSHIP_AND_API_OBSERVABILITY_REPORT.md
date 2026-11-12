# ExamSpace UI-10.6 — Windows Ownership & Conditional API Observability

Ngày 10/11/2026, Asia/Saigon. FINAL bounded scope — operator evidence validated; Gate B remains BLOCKED. Operational timestamps UTC.

## 1. Executive summary

WINDOWS SOCKET OWNERSHIP UNVERIFIED IN BOTH TESTED CONTEXTS — STATE0 REJECTED — GATE B BLOCKED. Gate A PASS in bounded metadata scope. User-approved canary and Docker read-only execution completed once. Native root cause UNKNOWN. No API/HTTP/scheduler workload, E2E or native capture.47/47 diagnostic tests PASS; these do not qualify live ownership.

## 2. Source preservation

Baseline321 public UI files; fingerprint 0ef402084484aa3b0f29a5461aa1e7101336912387c5e19af6578900fef6aba5. Branch feature/stitch-examspace-ui; HEAD a1e2891754e399aa4743e32c8218759938149bdc. Original238 files under same filtered scope. No product/backend/schema/migration/env/lockfile edits. Four new reports plus append-only five documentation addenda; compare against baseline hashes, not HEAD. Independent recoverable backup NOT VERIFIED; hash manifest is not backup. Recommend a separate local content backup before future product edits.

## 3. UI105 Gate A baseline

UI105 historical Gate A PASS at recovery/SQL verification time; one approved startup completed. UI106 performs no Docker lifecycle action and does not reuse startup approval. Test container is intended to remain running; current full state depends on owner metadata.

## 4. Current Gate A recheck

Fresh Docker owner metadata 2026-11-10T13:30:43.612Z verifies exact container c53c8db640b1f710e35fafbd1766656ce6b704c2c70e8130fff956ba92527198, same pinned postgres:16 image, named volume, RW destination and127.0.0.1:15433 mapping, running with original UI105 StartedAt07:47:45.088578824Z. No container replacement/restart or lifecycle command. Fresh guarded SQL 2026-11-10T13:32:27.527Z–2026-11-10T13:32:27.559Z confirms online_exam_phase3_test/cluster7702318921920503846, recovery=false via guard, read_only=on, PostgreSQL16.15 and exactly five completed/non-rolled-back migrations. Connection closed. Gate A PASS at those measurements; no guarantee of future uptime, full data integrity/schema drift or backup. Three bounded metadata SELECTs in each of initial/final checks; initial result retained database/recheck-initial.json. No5432 fallback or business-data mutation. Raw SQL helper pending-container field is local helper scope; conjunction proven by summary/operator-validation.json. Sandbox Docker inspect separately exit1/PERMISSION_DENIED, not used to falsify owner evidence.

## 5. UI103/UI104 ownership history

UI103 first IPv4PID18472/50756 and IPv6PID21548/50759 state2; final PID34060/60393 and PID22740/60401 state0. UI104 PID29320/51243 and PID25716/62164 all temporal/class/fill variants state0. Preserve old snapshots; different process lifetimes do not establish same-socket2→0.

## 6. Codex execution context

Measured account CodexSandboxOffline, admin=false, session5, PowerShell5.1.26100.9818/FullLanguage/x64, Windows10.0.26300.0. Nodev24.15.0/libuv1.51.0, executable hash 3331e1ffe19874215472217c5e94f5a0c6d8e18c4ac7111d3937aa0ad5e9b4a5. Identity in context.json. No escalation/token/context/security changes. Machine hash/session do not establish shared network compartment.

## 7. User execution context

User account Admin, distinct SID from CodexSandboxOffline, admin token=false, session5, PowerShell5.1.26100.9818/FullLanguage/x64, Windows10.0.26300.0. Same Node24.15.0/libuv1.51.0/executable SHA3331e1ffe19874215472217c5e94f5a0c6d8e18c4ac7111d3937aa0ad5e9b4a5 and same host fingerprint. User controllerPID31448,parent13016; outer operator run 9c814479-bbeb-48ed-958b-22d743ccc12f, inner canary run 75cd1362-7074-48d8-b4f7-cb992c795b09. No elevation requested. Shared host/session does not prove identical token/network compartment.

## 8. Operator script review

APPROVED 2026-11-10T12:18:13.375Z; original reply interpreted as Vietnamese đồng ý. Exactly one guarded user invocation, exclusive marker and result receipt retained. Original entry SHA122ca09ae526097da4da3ee483fb764a78e321bdeccd8450fae8dce9e7bc9f84, canary SHA43f936477096f1c9020c1fb02ddcf73099cacb9568f3fe0875033ba88e7ee157 and all five bundle hashes still match. Output/result pointer/source/runtime/time/child identities checked by operator/validate-return.cjs. Controller exit0 means collection completed, not ownership PASS. No cryptographic authentication of operator files claimed. Original approved bundle remains unchanged; collector patch is a separate unexecuted-live variant.

## 9. Cross-context experiment design

CC01 Codex→Codex and CC02 User→User executed once per family with the same frozen implementation. Max3samples/1s gaps/10s query budgets/90s child lifetime; actual1sample/family because first state0 triggered hard stop. No repeat-until-green and no new live listener after user return. CC03 Codex→User and CC04 User→Codex NOT RUN: no approved simultaneous listener/query coordination, and both independent contexts already fail LISTEN. Do not infer cross-token visibility from separate self-context runs.

## 10. IPv4 results

| Creator/query | PID   | Parent | Address   | Port  | OS start UTC                 | Native                              | Gate    |
| ------------- | ----- | ------ | --------- | ----- | ---------------------------- | ----------------------------------- | ------- |
| Codex / Codex | 31196 | 39768  | 127.0.0.1 | 65510 | 2026-11-10T12:06:49.9329176Z | class3/5 code0,state0,owner matches | BLOCKED |
| User / User   | 14536 | 31448  | 127.0.0.1 | 60072 | 2026-11-10T13:30:29.4965333Z | class3/5 code0,state0,owner matches | BLOCKED |

## 11. IPv6 results

| Creator/query | PID  | Parent | Address | Port  | OS start UTC                 | Native                              | Gate    |
| ------------- | ---- | ------ | ------- | ----- | ---------------------------- | ----------------------------------- | ------- |
| Codex / Codex | 1300 | 39768  | ::1     | 65511 | 2026-11-10T12:06:55.0144352Z | class3/5 code0,state0,owner matches | BLOCKED |
| User / User   | 9044 | 31448  | ::1     | 60075 | 2026-11-10T13:30:34.3192305Z | class3/5 code0,state0,owner matches | BLOCKED |

## 12. Win32 results

All four live listeners: classes3/5 each code0 with exact target PID/port/address but state0; eight native table result groups rejected. Original C#/gate/child unchanged. No same-socket2→0 demonstrated. State2 required by documented [IPv4](https://learn.microsoft.com/en-us/windows/win32/api/tcpmib/ns-tcpmib-mib_tcprow_owner_pid) and [IPv6](https://learn.microsoft.com/en-us/windows/win32/api/tcpmib/ns-tcpmib-mib_tcp6row_owner_pid) structures. Reused bounded122 resize/16MiB ceiling, row strides24/56, header4, state offsets0/48 and network-order port. No repeated buffer-fill/large ABI study or state0 normalization. Null-safe PowerShell projection patch does not alter these native calls.

## 13. PowerShell/CIM results

Codex Get-NetTCPConnection/CIM both PermissionDenied/HRESULT0x80041003. In user context CIM succeeds with matching PID/parent/path and creation timestamp at millisecond precision; native process timestamps retain exact100ns strings. User Get-NetTCPConnection projection throws InvokeMethodOnNull in ForEachObject at State.ToString. This is a confirmed collector null-handling defect reproduced offline; the raw cmdlet object was not retained before projection, so its full contents and why State was null remain unknown. Do not report this as user query permission denial, empty listener inventory or valid LISTEN. Null-safe variant preserves null and still fails gate. Independent native state0 remains unexplained.

## 14. netstat results

All four netstat.exe -ano invocations exit0 with0raw target lines and no accepted listener row. Absolute executable, command/times/hashes/bytes/scoped extracts retained. Full unrelated inventory discarded. Raw row absent means no evidenced regex explanation. Collector null fix has no effect on netstat output.

## 15. Process identity results

For each owned child: exact OS PID/start/path/parent checked before query and before close; socket IPC confirms same address/port/listening before and after collection. User CIM independently matches PID/parent/path, timestamp agrees at millisecond precision (CIM truncates sub-microsecond digits; no claim of exact string equality). All four children own IPC close, exit0, exact target rows absent after. No unknown-PID/image-name termination or service mutation. User-created listeners do not qualify ownership for a different API process.

## 16. Context comparison

| Property             | Codex                                   | User                         | Interpretation                                        |
| -------------------- | --------------------------------------- | ---------------------------- | ----------------------------------------------------- |
| Token                | CodexSandboxOffline; non-admin          | Admin; non-admin             | Different SID; no elevation                           |
| Host/runtime/session | Same hashed host, session5, Node binary | Same                         | Network compartment still UNKNOWN                     |
| CIM process query    | PermissionDenied                        | OK, expected child           | Context-dependent query capability observed           |
| Get-NetTCPConnection | PermissionDenied                        | Collector InvokeMethodOnNull | Raw cmdlet State before projection not fully captured |
| Native classes3/5    | PID/port match, state0                  | PID/port match, state0       | Both fail; cannot attribute solely to sandbox         |
| netstat target       | Absent                                  | Absent                       | No valid OS LISTEN source                             |
| CC03/04              | NOT RUN                                 | NOT RUN                      | Cross-token socket visibility not proven              |

## 17. Root-cause classification

CONFIRMED: both tested contexts return invalid native state0 despite matching PID/port; netstat target absent; Codex CIM permissions denied while user CIM works. CONFIRMED collector defect exists: null State.ToString loses structured PowerShell rows; offline before reproduces recorded error, after preserves null. Live null-State inference strongly supported by unique error site, but raw object unavailable. Underlying native/OS/provider/network visibility mechanism UNKNOWN. Neither a Windows bug nor sandbox cause established. Native0xC0000409 cause also UNKNOWN; no API process/native stack in UI106.

## 18. Harness defect/fix if any

A minimal null guard was prepared in separate TEMP canary/run-null-safe.cjs; original reviewed operator bundle/source hashes untouched. Exactly one expression changed: preserve null State instead of calling ToString unconditionally. Before/after syntax and three offline PSCustomObject tests verified: old expression reproduces InvokeMethodOnNull; patched null retains PID/port/null and gate PARSE_FAILED; explicit Listen still verifies only with correct identity, wrong owner/missing identity reject. Evidence summary/projection-patch.json and tests/projection-*.json. PATCH APPLIED TO COLLECTOR VARIANT, OFFLINE VERIFIED ONLY; LIVE POSITIVE NOT VERIFIED. No live rerun after hard stop, no gate/native/backend/runtime fix and no claim of full harness recovery. CaseD acceptance requiring a live positive remains unmet.

## 19. Negative tests

Final full diagnostic invocation tests/diagnostics-final.tap:47PASS/0FAIL/0skip =36ownership/parser/error +2freeze/identity +6observer +3null-projection tests. Old44-case run retained; not added again. Simulated positive/negative objects and helper timeouts are diagnostic tests, not application tests or live ownership. Wrong PID/port/start/path/parent, exited/closed, mixed owners, invalid state0/null, malformed/error/timeout/dev ports/TCP/READY-only fail closed. Application typecheck/lint/build/root/HTTP/browser NOT RUN: no product changes and requested full-regression prerequisites blocked.

## 20. Gate B verdict

BLOCKED in both tested contexts. Matching numeric owner/process identity is a subcheck, not valid LISTEN. First state0 stopped each listener, so planned samples2/3 NOT RUN and repeatability PARTIAL. Unit47 PASS and collector null handling do not satisfy live positive acceptance. No authorized alternative runner has been qualified; no API traffic.

## 21. API Gate C if performed

NOT RUN, API spawn0. Gate A reverified PASS, Gate B BLOCKED. W1 approval NOT APPLICABLE while B blocked and was never granted. No port4010 ownership/READY claimed. Synthetic consent does not authorize normal scheduler writes.

## 22. Real HTTP observer if performed

REAL API OBSERVABILITY NOT QUALIFIED — SAFETY PREREQUISITES BLOCKED. No app HTTP or GET/auth/me. Observer v3 original activation EXAMSPACE_UI102_RUN_ID remains default OFF; six offline semantics tests PASS within47. No real lifecycle/READY/correlation proof substituted from synthetic evidence.

## 23. Scheduler/resource/PG observation

No live scheduler/API resource/PG connection aggregates. Guarded test SQL identity/settings/history only, initial and fresh post-operator records retained; no business-data writes. Scheduler15000ms/business methods unchanged. W1 remains a future explicitly approved workload acknowledging existing due test attempts may be finalized/written. No W2–W8, fixtures or full E2E.

## 24. Native exit classification

All four synthetic children exit0 through own IPC; both controllers exit0. API never launched; no new API native reproduction or API-survival inference. Historical0xC0000409 ROOT CAUSE UNKNOWN, RUNTIME RISK OPEN. No dump/ProcDump/debugger/runtime/package/security change. Last observed canary/command does not identify historical crash cause.

## 25. Remaining blockers

Valid native LISTEN2 evidence unavailable in either context; why provider/state visibility behaves this way is UNKNOWN. User PowerShell query null-projection evidence incomplete until separately reviewed future raw-null-safe measurement. Direct simultaneous CC03/04 not performed. No reason to request W1 approval or expand traffic while ownership unresolved. Keep test container running; no additional startup/stop. Next review platform/provider visibility with a separately bounded read-only experiment capable of distinguishing API-provider output from collector formatting, preserving raw nullable fields; do not grant privileges or repeatedly rerun same probes. No execution authorized merely by this recommendation.

## 26. Integration/Staging readiness

BLOCKED, full functional acceptance INCOMPLETE, production NOT APPROVED. Historical270 application tests remain historical;44 diagnostics are not added to them.

## 27. Source/evidence hashes

Evidence C:\Users\Admin\AppData\Local\Temp\examspace-ui106-20261110-35f95d0c. Validated operator outer 9c814479-bbeb-48ed-958b-22d743ccc12f / inner 75cd1362-7074-48d8-b4f7-cb992c795b09; summary/operator-validation.json binds approved source/result hashes, process lifetimes, context and current Docker+SQL. Original phase checkpoint and documents retained summary/checkpoints/pre-operator-finalization. Initial SQL in database/recheck-initial.json, fresh SQL in recheck.json. Live canary records frozen unchanged; projection variant/offline tests stored separately. Historical UI101–UI105/source/index/env checks and scoped scan/format/diff recorded in summary. Only four new reports and five appended documents; no product source edits. Hashes prove local consistency, not trusted authentication or recoverable backups.

## 28. Final verdict

WINDOWS SOCKET OWNERSHIP UNVERIFIED IN BOTH TESTED CONTEXTS — STATE0 REJECTED — GATE B BLOCKED. Gate A PASS in bounded metadata scope; API qualification NOT RUN. Native cause UNKNOWN; no production approval.

| Gate                           | Status                                                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Source preservation            | VERIFIED; four new reports/five documentation addenda, no product changes                                   |
| Original repository            | UNCHANGED in 238-file baseline/Git/index/env scope                                                          |
| Independent source backup      | NOT VERIFIED                                                                                                |
| PostgreSQL Gate A              | PASS bounded current Docker identity + fresh guarded read-only SQL/history                                  |
| Codex context canary           | BLOCKED                                                                                                     |
| User context canary            | BLOCKED; both families native state0                                                                        |
| Cross-context correlation      | PARTIAL; CC01/02 compared; simultaneous CC03/04 NOT RUN                                                     |
| Windows owner PID verification | BLOCKED as ownership proof; numeric PID matches native target rows                                          |
| OS LISTEN state                | BLOCKED: actual native state0 rejected                                                                      |
| State0 handling                | REJECTED                                                                                                    |
| Harness patch                  | APPLIED to TEMP collector variant; offline null handling verified, LIVE NOT VERIFIED; gate/native unchanged |
| Negative tests                 | PASS:47 diagnostic tests in final full diagnostic invocation,0fail/skip                                     |
| Gate B                         | BLOCKED for actual Codex runner                                                                             |
| Real API W1 approval           | NOT APPLICABLE while Gate B BLOCKED; never approved                                                         |
| API Gate C                     | NOT RUN                                                                                                     |
| Observer v3 real API           | NOT RUN                                                                                                     |
| Scheduler observation          | NOT RUN                                                                                                     |
| PostgreSQL metadata            | VERIFIED read-only identity/settings/five migrations; API aggregates NOT RUN                                |
| Native root cause              | UNKNOWN                                                                                                     |
| Native fix                     | NOT APPLIED                                                                                                 |
| Full regression                | NOT RUN                                                                                                     |
| Integration readiness          | BLOCKED                                                                                                     |
| Staging readiness              | BLOCKED                                                                                                     |
| Production                     | NOT APPROVED                                                                                                |

## OWN-106 acceptance matrix

| ID         | Requirement                              | Status  | Actual scope                                                                                      |
| ---------- | ---------------------------------------- | ------- | ------------------------------------------------------------------------------------------------- |
| OWN-106-01 | Historical UI103/UI104 evidence retained | PASS    | Diagnostic scope/evidence                                                                         |
| OWN-106-02 | Current source preserved                 | PASS    | Diagnostic scope/evidence                                                                         |
| OWN-106-03 | Codex context identified                 | PASS    | Diagnostic scope/evidence                                                                         |
| OWN-106-04 | User PowerShell context identified       | PASS    | User WindowsIdentity/context measured; same runtime/host, different SID                           |
| OWN-106-05 | Operator canary script reviewed          | PASS    | Reviewed frozen source/hash, explicit approval, one operator execution validated                  |
| OWN-106-06 | Operator source hash recorded            | PASS    | Reviewed frozen source/hash, explicit approval, one operator execution validated                  |
| OWN-106-07 | IPv4 canary in Codex context             | BLOCKED | Native PID/port match but state0, no accepted LISTEN                                              |
| OWN-106-08 | IPv6 canary in Codex context             | BLOCKED | Native PID/port match but state0, no accepted LISTEN                                              |
| OWN-106-09 | IPv4 canary in user context              | BLOCKED | User native classes3/5 state0; own IPC cleanup exit0                                              |
| OWN-106-10 | IPv6 canary in user context              | BLOCKED | User native classes3/5 state0; own IPC cleanup exit0                                              |
| OWN-106-11 | Cross-context results compared           | PARTIAL | Own-context measurements compared; CC03/04 simultaneous queries NOT RUN                           |
| OWN-106-12 | OS state2 verified when available        | BLOCKED | Native PID/port match but state0, no accepted LISTEN                                              |
| OWN-106-13 | Correct owning PID verified              | BLOCKED | Native PID/port match but state0, no accepted LISTEN                                              |
| OWN-106-14 | Process start identity verified          | PASS    | Diagnostic scope/evidence                                                                         |
| OWN-106-15 | Executable/parent verified               | PASS    | Diagnostic scope/evidence                                                                         |
| OWN-106-16 | Wrong PID rejected                       | PASS    | Final47 diagnostic tests PASS, including3 offline projection tests; no live positive substitution |
| OWN-106-17 | Wrong port rejected                      | PASS    | Final47 diagnostic tests PASS, including3 offline projection tests; no live positive substitution |
| OWN-106-18 | State0 rejected                          | PASS    | Final47 diagnostic tests PASS, including3 offline projection tests; no live positive substitution |
| OWN-106-19 | TCP readiness alone rejected             | PASS    | Final47 diagnostic tests PASS, including3 offline projection tests; no live positive substitution |
| OWN-106-20 | Observer READY alone rejected            | PASS    | Final47 diagnostic tests PASS, including3 offline projection tests; no live positive substitution |
| OWN-106-21 | Permission/query error rejected          | PASS    | Final47 diagnostic tests PASS, including3 offline projection tests; no live positive substitution |
| OWN-106-22 | Bounded repeatability assessed           | PARTIAL | One sample/family; hard stop prevented samples2/3                                                 |
| OWN-106-23 | Safe process cleanup                     | PASS    | Both children own IPC close, exit0, fresh identity matches, post-close rows absent                |
| OWN-106-24 | Gate B verdict                           | BLOCKED | Native PID/port match but state0, no accepted LISTEN                                              |

## API-106 conditional acceptance matrix

| ID         | Requirement                        | Status  | Actual scope                                                                    |
| ---------- | ---------------------------------- | ------- | ------------------------------------------------------------------------------- |
| API-106-01 | Gate A reverified                  | PASS    | Current exact running container metadata plus13:32 guarded SQL identity/history |
| API-106-02 | Gate B PASS for actual runner      | BLOCKED | State0 rejected in Codex context                                                |
| API-106-03 | W1 workload explicitly authorized  | NOT RUN | No W1 approval requested/executed because Gate B remains BLOCKED                |
| API-106-04 | API4010 child identity             | NOT RUN | Real API never spawned; do not substitute synthetic evidence                    |
| API-106-05 | OS LISTEN owner verified           | NOT RUN | Real API never spawned; do not substitute synthetic evidence                    |
| API-106-06 | Gate C PASS                        | NOT RUN | Real API never spawned; do not substitute synthetic evidence                    |
| API-106-07 | Observer READY                     | NOT RUN | Real API never spawned; do not substitute synthetic evidence                    |
| API-106-08 | HTTP401                            | NOT RUN | Real API never spawned; do not substitute synthetic evidence                    |
| API-106-09 | Correlated START/COMPLETE          | NOT RUN | Real API never spawned; do not substitute synthetic evidence                    |
| API-106-10 | Sanitization PASS                  | NOT RUN | Real API never spawned; do not substitute synthetic evidence                    |
| API-106-11 | Bounded scheduler observation      | NOT RUN | Real API never spawned; do not substitute synthetic evidence                    |
| API-106-12 | Guarded PG metadata                | NOT RUN | Real API never spawned; do not substitute synthetic evidence                    |
| API-106-13 | Bounded process samples            | NOT RUN | Real API never spawned; do not substitute synthetic evidence                    |
| API-106-14 | Correct native exit classification | NOT RUN | Real API never spawned; do not substitute synthetic evidence                    |
| API-106-15 | No development impact              | NOT RUN | Real API never spawned; do not substitute synthetic evidence                    |
| API-106-16 | Safe owned cleanup                 | NOT RUN | Real API never spawned; do not substitute synthetic evidence                    |
