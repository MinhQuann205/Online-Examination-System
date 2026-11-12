# ExamSpace UI-10.3 — Ownership Probe Matrix

03/11/2026, Asia/Saigon; timestamps UTC. **Final ownership BLOCKED for both families.** Initial passing measurements do not supersede final failures.

## Real synthetic probes

| ID         | Family | Bind      | Port  | Child PID | OS start / parent                          | PowerShell        | netstat                  | Win32               | Parser                            | Gate                | Evidence                        |
| ---------- | ------ | --------- | ----- | --------- | ------------------------------------------ | ----------------- | ------------------------ | ------------------- | --------------------------------- | ------------------- | ------------------------------- |
| first-ipv4 | IPv4   | 127.0.0.1 | 50756 | 18472     | 2026-11-03T04:02:29.0983810Z; parent 37480 | PERMISSION_DENIED | exit0; raw target absent | PID matches; state2 | no text row; numeric native state | VERIFIED            | ownership/first-probe/ipv4.json |
| first-ipv6 | IPv6   | ::1       | 50759 | 21548     | 2026-11-03T04:02:33.7813803Z; parent 37480 | PERMISSION_DENIED | exit0; raw target absent | PID matches; state2 | no text row; numeric native state | VERIFIED            | ownership/first-probe/ipv6.json |
| final-ipv4 | IPv4   | 127.0.0.1 | 60393 | 34060     | 2026-11-03T04:09:34.9545067Z; parent 8056  | PERMISSION_DENIED | exit0; raw target absent | PID matches; state0 | no text row; numeric native state | BLOCKED             | ownership/ipv4.json             |
| final-ipv6 | IPv6   | ::1       | 60401 | 22740     | 2026-11-03T04:09:41.6298846Z; parent 8056  | PERMISSION_DENIED | exit0; raw target absent | PID matches; state0 | no text row; numeric native state | BLOCKED             | ownership/ipv6.json             |
| ABI-2      | IPv4   | 127.0.0.1 | 51361 | 30872     | 2026-11-03T04:13:10.5500882Z; parent 11224 | Not repeated      | Not repeated             | class3/5 state0     | DWORD=struct; stride 24           | BLOCKED; audit only | ownership/abi-audit.json        |
| ABI-23     | IPv6   | ::1       | 51364 | 6984      | 2026-11-03T04:13:13.0164440Z; parent 11224 | Not repeated      | Not repeated             | class3/5 state0     | DWORD=struct; stride 56           | BLOCKED; audit only | ownership/abi-audit.json        |

Node v24.15.0; executable C:\Program Files\nodejs\node.exe; SHA-256 3331e1ffe19874215472217c5e94f5a0c6d8e18c4ac7111d3937aa0ad5e9b4a5. All canaries loopback-only, unique run ID, bounded lifetime and control channel. Final IPv6 explicitly ipv6Only; no public/dual-stack probe. State snapshots bracket each query.

Actual final TCP connected, but invalid state0 remained UNKNOWN/BLOCKED. Perturbed owner returned OWNER_MISMATCH. After close: listener absent and PROCESS_EXITED. Pre-listen child state observed; no-row pre-listen gate path is injected, not a separately reserved OS-port experiment.

## OWN-01–OWN-30

| ID     | Scenario              | Expected              | Actual                                               | Evidence                        | Status                            |
| ------ | --------------------- | --------------------- | ---------------------------------------------------- | ------------------------------- | --------------------------------- |
| OWN-01 | IPv4                  | Correct LISTEN PID    | First verified; final state0                         | ownership/ipv4.json             | BLOCKED                           |
| OWN-02 | IPv6                  | Correct LISTEN PID    | First verified; final state0                         | ownership/ipv6.json             | BLOCKED                           |
| OWN-03 | Actual ephemeral port | Use bound port        | Real IPC/native port agrees                          | final canary JSONs              | PASS                              |
| OWN-04 | Identity              | OS start/exe/parent   | Documented identity verified                         | identityBeforeClose             | PASS                              |
| OWN-05 | OS owner              | PID and LISTEN        | PID matches; final LISTEN unverified                 | final native queries            | BLOCKED                           |
| OWN-06 | TCP alone             | Reject                | Unit rejects; real TCP cannot override UNKNOWN       | unit + final canaries           | PASS                              |
| OWN-07 | READY alone           | Reject                | Missing OS query rejected                            | diagnostic-final.tap            | PASS simulated                    |
| OWN-08 | Wrong PID             | Reject                | OWNER_MISMATCH real-data perturbation/unit           | negativeWrongPid; unit          | PASS                              |
| OWN-09 | Wrong port            | Reject                | LISTENER_NOT_FOUND                                   | negativeWrongPort; unit         | PASS                              |
| OWN-10 | Closed                | Reject                | No rows after control close                          | afterClose; closedGate          | PASS                              |
| OWN-11 | Query failure         | Not empty success     | Real permission denied; injected errors              | queries; unit                   | PASS                              |
| OWN-12 | Malformed             | Fail closed           | PARSE_FAILED                                         | diagnostic-final.tap            | PASS simulated                    |
| OWN-13 | Stale start           | No reuse false pass   | Start mismatch rejected; reuse not forced            | unit                            | PASS simulated                    |
| OWN-14 | Family normalization  | Explicit families     | Loopback/wildcard/mapped/localized tests             | unit; canaries                  | PASS scoped                       |
| OWN-15 | Shutdown              | Owned control channel | Fresh identity then close/exit0                      | final canaries; cleanup         | PASS                              |
| OWN-16 | Dev untouched         | No dev actions        | No agent dev control; full state unknown             | cleanup; execution              | PARTIAL state / PASS action scope |
| OWN-17 | Source/test DB        | Preserve              | Source verified; DB no SQL but contents unverified   | preservation; preflight         | PARTIAL                           |
| OWN-18 | Sanitized             | No secret data        | Markers absent; scoped scan                          | canary/scan records             | PASS scoped                       |
| OWN-19 | Structured query      | Independent source    | PID rows decoded; final state0 blocked               | abi-audit.json                  | PARTIAL / gate BLOCKED            |
| OWN-20 | Raw/parser            | Separate evidence     | Scoped target lines/hash and native raw bytes        | ownership JSONs                 | PASS                              |
| OWN-21 | Empty result          | Never pass            | LISTENER_NOT_FOUND                                   | unit; post-close                | PASS                              |
| OWN-22 | Nonzero command       | Never pass            | Real missing executable/timeout plus injected errors | unit                            | PASS                              |
| OWN-23 | PID reuse             | Reject stale identity | Start mismatch unit; actual reuse not forced         | unit                            | PASS simulated                    |
| OWN-24 | Real API4010          | Verified owner        | API not spawned                                      | W1 preflight failures           | BLOCKED                           |
| OWN-25 | Wrong API PID         | Reject real mismatch  | No real API; generic unit only                       | W1 not started                  | NOT RUN real API                  |
| OWN-26 | Dev4000               | Never accepted        | Gate rejects3000/4000; no dev connection             | unit                            | PASS simulated                    |
| OWN-27 | READY+mismatch        | Reject                | Mismatch rejected with readiness flags               | ownerMismatchWithTcpReady; unit | PASS simulated READY              |
| OWN-28 | No identity           | Reject                | Missing/malformed identity rejected                  | unit                            | PASS simulated                    |
| OWN-29 | Cleanup               | Verified child only   | Control close; no unverified kill                    | identityBeforeClose; cleanup    | PASS canary scope                 |
| OWN-30 | Historical            | Retain bytes/verdicts | Old evidence65/65; document prefixes exact           | final-preservation.json         | PASS                              |

CLASS-1 confirmed for permission-denied queries; CLASS-6 visibility/state discrepancies observed. Underlying mechanism UNKNOWN. No demonstrated parser/family/timing/PID/isolation cause. Raw native state0 agrees across direct and struct reads and never becomes LISTEN2.

Final tests/diagnostic-final.tap:44 PASS/0 FAIL/0 skipped (36 ownership/parser,2 freeze/identity,6 observer). IDs map assertions, not extra tests.100 synthetic HTTP requests and one abort are not application tests. All preparation/failed/final/ABI records retained.

Evidence root: C:/Users/Admin/AppData/Local/Temp/examspace-ui103-20261103-d58f2a90. Manifest: summary/evidence-sha256.json; manifest hash: summary/manifest-sha256.txt. [Main report](EXAMSPACE_UI103_LISTENER_OWNERSHIP_REPORT.md).
