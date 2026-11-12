# ExamSpace UI-10.4 — Windows Socket Ownership

03/11/2026, Asia/Saigon. **WINDOWS LISTENER ENUMERATION INCONSISTENT — GATE B BLOCKED.**

## Historical baseline

UI103 first IPv4PID18472/50756 and IPv6PID21548/50759 returned state2. Final IPv4PID34060/60393 and IPv6PID22740/60401 returned0; ABI audit also0. All bytes/verdicts retained. Historical numbers belong to different child lifetimes; they do not prove same-socket transition.

## Current execution and source

CodexSandboxOffline, admin token false, PowerShell5.1.26100.9818/FullLanguage. No privilege/context/ACL/policy/security change. Node24.15.0 x64/libuv1.51.0 unchanged. Stock Win32 ownership helper/gate copied from UI103; no decision change. Observer preload/routes/units copied unchanged. Test imports adapted to new TEMP folder.

Absolute PowerShell runs inline EncodedCommand UTF16LE, no execution-policy bypass. Commands have10s timeout/2MiB output cap. Exact argv/start/end/status/stdout/stderr hashes/counts retained; unrelated full socket inventories are transient, only target lines persisted. PowerShell CLIXML progress output, when present, is not treated as a permission result; per-operation statuses are explicit.

## Predefined experiment

One owned loopback listener/family, ephemeral0, unique run ID; IPv6 ipv6Only. Three temporal samples on the same socket, minimum1s gap. Each sample calls OWNER_PID_LISTENER3 and OWNER_PID_ALL5 with unmodified allocation(-1), zero-filled buffer and0xA5-filled buffer. Fill is diagnostic only; no returned state is rewritten. Parent verifies OS start/exe/PPID before probes and again before controlled close.

Acceptance requires all planned samples/classes/fills to expose matching state2/direct-struct agreement plus negatives. Any0/unknown/error/mismatch blocks.90s controller limit,10s command limit, no public bind/development ports/until-green retry.

First controller stopped after IPv4 had all3 samples/cleanup recorded. Tool session exit1, exact Node exit/stderr unavailable; cause UNKNOWN, not attributed to native API. Combined original controller plan is not a completed PASS. Only missing IPv6 ran in a separately bounded continuation with supervisor/exit logging; no second IPv4 listener or repeated positive attempt. Continuation controller exit0.

## Results: same listener across three samples

| Family | Bind      | Port  | PID   | OS start UTC                 | Parent | Sample | Sample UTC               | Classes/fills | Native result              | ABI          | netstat            | Gate    |
| ------ | --------- | ----- | ----- | ---------------------------- | ------ | ------ | ------------------------ | ------------- | -------------------------- | ------------ | ------------------ | ------- |
| IPv4   | 127.0.0.1 | 51243 | 29320 | 2026-11-03T04:49:21.1551781Z | 19252  | 1      | 2026-11-03T04:49:22.144Z | 3/5; -1/0/165 | code0; state0 in6 variants | DWORD=struct | 0 raw target lines | BLOCKED |
| IPv4   | 127.0.0.1 | 51243 | 29320 | 2026-11-03T04:49:21.1551781Z | 19252  | 2      | 2026-11-03T04:49:23.863Z | 3/5; -1/0/165 | code0; state0 in6 variants | DWORD=struct | 0 raw target lines | BLOCKED |
| IPv4   | 127.0.0.1 | 51243 | 29320 | 2026-11-03T04:49:21.1551781Z | 19252  | 3      | 2026-11-03T04:49:25.503Z | 3/5; -1/0/165 | code0; state0 in6 variants | DWORD=struct | 0 raw target lines | BLOCKED |
| IPv6   | ::1       | 62164 | 25716 | 2026-11-03T04:51:43.5020449Z | 35500  | 1      | 2026-11-03T04:51:44.169Z | 3/5; -1/0/165 | code0; state0 in6 variants | DWORD=struct | 0 raw target lines | BLOCKED |
| IPv6   | ::1       | 62164 | 25716 | 2026-11-03T04:51:43.5020449Z | 35500  | 2      | 2026-11-03T04:51:45.759Z | 3/5; -1/0/165 | code0; state0 in6 variants | DWORD=struct | 0 raw target lines | BLOCKED |
| IPv6   | ::1       | 62164 | 25716 | 2026-11-03T04:51:43.5020449Z | 35500  | 3      | 2026-11-03T04:51:47.443Z | 3/5; -1/0/165 | code0; state0 in6 variants | DWORD=struct | 0 raw target lines | BLOCKED |

36 native result groups: every API return0, every matching state0, correct numeric PID/port and direct-DWORD=struct. No current state2 and no same-socket2→0. Socket IPC listening before/after each query and TCP connection succeeded; neither replaces ownership proof. All final live positives BLOCKED.

## ABI and buffer audit

Reviewed DWORD parameters/BOOL/AF/class/reserved0, initial size query/122 retry,16MiB cap/three sizing attempts, allocated/returned buffer/count checks. IPv4 stride24/state0/localPort8/PID20; IPv6 stride56/state48/localPort20/PID52; table header4; numeric network-byte-order port. Canary-only raw row bytes retained.

State field became0 even when destination initially0xA5, not0xA5A5A5A5. This experiment does not support an unchanged/uninitialized destination-state explanation for current samples. It does not establish why the provider returns0 or retrospectively explain historical2; no OS/sandbox/security/Node cause confirmed.

Microsoft [GetExtendedTcpTable](https://learn.microsoft.com/en-us/windows/win32/api/iphlpapi/nf-iphlpapi-getextendedtcptable), [IPv4 row](https://learn.microsoft.com/en-us/windows/win32/api/tcpmib/ns-tcpmib-mib_tcprow_owner_pid), [IPv6 row](https://learn.microsoft.com/en-us/windows/win32/api/tcpmib/ns-tcpmib-mib_tcp6row_owner_pid) and [table classes](https://learn.microsoft.com/en-us/windows/win32/api/iprtrmib/ne-iprtrmib-tcp_table_class) define the reviewed interface/layout. State2 is LISTEN;0 is not accepted. No undocumented API authority.

## Independent sources and permission outcomes

Get-NetTCPConnection and CIM each returned PermissionDenied/HRESULT0x80041003. Native limited-process identity worked while canaries lived. netstat exit/raw/parsed target results are recorded per sample; no accepted raw target listener. These discrepancies remain, not a reason to select a convenient source or relax the state requirement.

Immediate post-exit native identity queries returned QUERY_FAILED/error31, not a proven alive/dead state; kept as such. Later independent .NET queries returned NO_SUCH_PROCESS for both children. Listener rows after close absent, child exit0. No agent termination of unowned processes.

## Tests and corrective action

New44/44 diagnostic tests PASS,0skip; same36 ownership/parser/error +2 freeze/identity +6 observer cases as UI103. Query error/nonzero/permission/timeout/malformed/empty, stale start, wrong PID/port/parent/executable, missing process, state0/FIN_WAIT1, dev ports and TCP/READY-only paths reject. Unit/simulation success does not make live ownership PASS.

No evidenced ownership/backend defect; no corrective patch, normalize0, fallback warning or application edit. The filled audit and continuation logging are measurement tooling, not a verified fix.

## OWN-104-01–OWN-104-20

| ID         | Scenario            | Expected                        | Actual                                                                              | Evidence                                   | Status                              |
| ---------- | ------------------- | ------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------- |
| OWN-104-01 | Historical2/0       | Keep facts/bytes                | Old UI103 source/evidence preserved                                                 | baseline/historical-evidence; final checks | PASS                                |
| OWN-104-02 | Harness review      | Read exact native/source        | PInvoke/buffer/AF/class/port/PID/state/identity reviewed                            | read ledger; copied source hashes          | PASS review                         |
| OWN-104-03 | Native codes        | Preserve actual return          | 0 with state0;122 sizing path retained                                              | listener family JSONs                      | PASS capture                        |
| OWN-104-04 | Table classes       | Verify3/5 docs                  | Requested both, all samples; neither fixes state                                    | plan; result rows                          | PASS query scope                    |
| OWN-104-05 | IPv4 layout         | Verify offsets/bounds           | 24-byte row/state0/port8/PID20; direct=struct                                       | raw rows; source                           | PASS layout scope; positive BLOCKED |
| OWN-104-06 | IPv6 layout         | Verify offsets/bounds           | 56-byte row/state48/port20/PID52; direct=struct                                     | raw rows; source                           | PASS layout scope; positive BLOCKED |
| OWN-104-07 | Numeric port/PID    | Match actual owned child        | Correct numeric bound ports/PIDs                                                    | family identities/rows                     | PASS decoding scope                 |
| OWN-104-08 | IPv4 positive       | Stable documented LISTEN        | Three temporal samples all0                                                         | listener/ipv4.json                         | BLOCKED                             |
| OWN-104-09 | IPv6 positive       | Stable documented LISTEN        | Three temporal samples all0                                                         | listener/ipv6.json                         | BLOCKED                             |
| OWN-104-10 | Same socket samples | Bounded sequence                | 3 each, socket identity stays; no2→0 observed                                       | listener/analysis.json                     | PASS measurement scope              |
| OWN-104-11 | PS permissions      | Record each outcome             | Get-NetTCPConnection/CIM denied; wrapper status distinct                            | powershellQueries                          | PASS capture                        |
| OWN-104-12 | Raw/parser          | Distinguish missing versus skip | Scoped lines/hash separate from parse                                               | netstat records                            | PASS capture                        |
| OWN-104-13 | DWORD/struct        | Compare independently           | Agree0 in all36 native groups                                                       | raw rows; filled audit                     | PASS ABI comparison                 |
| OWN-104-14 | Wrong PID           | Reject                          | Existing unit/mismatch simulations pass                                             | tests/diagnostics.tap                      | PASS unit only                      |
| OWN-104-15 | Wrong port          | Reject                          | Existing unit simulations pass                                                      | same                                       | PASS unit only                      |
| OWN-104-16 | State0              | Reject                          | Actual rows gateUNKNOWN; unit reject                                                | rows; tests                                | PASS rejection                      |
| OWN-104-17 | TCP/READY only      | Never authorize                 | Real TCP does not override0; READY unit rejects                                     | liveTcp; tests                             | PASS scoped                         |
| OWN-104-18 | Identity/cleanup    | Verified owned close            | Fresh start/exe/parent, IPC close, exit0, socket rows absent; later NO_SUCH_PROCESS | summary/cleanup.json                       | PASS measured cleanup               |
| OWN-104-19 | Corrective patch    | Before/after if proven          | No defect proven; no ownership patch                                                | copied source; audit scope                 | NOT RUN; NOT APPLICABLE             |
| OWN-104-20 | Gate B              | Explicit verdict                | BLOCKED, no choosing initial/pass source                                            | main; analysis                             | PASS verdict clarity; gate BLOCKED  |

## Gate and next action

Gate B BLOCKED. Gate A independently blocked by Docker/test DB. Gate C/API/HTTP/scheduler/full browser NOT RUN. Underlying Windows ownership mechanism and historical0xC0000409 cause remain UNKNOWN. No new privilege, debugger/dump, runtime change or production approval.

Evidence: C:/Users/Admin/AppData/Local/Temp/examspace-ui104-20261103-9d202804. [Main report](EXAMSPACE_UI104_ENVIRONMENT_AND_OWNERSHIP_RECOVERY_REPORT.md).
