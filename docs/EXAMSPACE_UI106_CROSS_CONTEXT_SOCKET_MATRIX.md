# ExamSpace UI-10.6 — Cross-context Socket Matrix

10/11/2026 Asia/Saigon, timestamps UTC. FINAL bounded scope. Both contexts native state0; no ownership PASS.

| Case  | Run ID                               | Creator | Query executor | Family/bind      | Port  | PID   | OS start UTC                 | Executable SHA256                                                | Raw native/owner                      | Independent sources                                | Gate    | Evidence                                                |
| ----- | ------------------------------------ | ------- | -------------- | ---------------- | ----- | ----- | ---------------------------- | ---------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------- | ------- | ------------------------------------------------------- |
| CC-01 | f16d369f-d3d4-41d3-842a-9e73ff1e7c8d | Codex   | Codex          | IPv4 / 127.0.0.1 | 65510 | 31196 | 2026-11-10T12:06:49.9329176Z | 3331e1ffe19874215472217c5e94f5a0c6d8e18c4ac7111d3937aa0ad5e9b4a5 | code0; classes3/5 state0; PID matches | GetNet/CIM denied; netstat0rows                    | BLOCKED | canary/f16d369f-d3d4-41d3-842a-9e73ff1e7c8d/ipv4.json   |
| CC-01 | f16d369f-d3d4-41d3-842a-9e73ff1e7c8d | Codex   | Codex          | IPv6 / ::1       | 65511 | 1300  | 2026-11-10T12:06:55.0144352Z | 3331e1ffe19874215472217c5e94f5a0c6d8e18c4ac7111d3937aa0ad5e9b4a5 | code0; classes3/5 state0; PID matches | GetNet/CIM denied; netstat0rows                    | BLOCKED | canary/f16d369f-d3d4-41d3-842a-9e73ff1e7c8d/ipv6.json   |
| CC-02 | 75cd1362-7074-48d8-b4f7-cb992c795b09 | User    | User           | IPv4 / 127.0.0.1 | 60072 | 14536 | 2026-11-10T13:30:29.4965333Z | 3331e1ffe19874215472217c5e94f5a0c6d8e18c4ac7111d3937aa0ad5e9b4a5 | code0; classes3/5 state0; PID matches | GetNet null projection error; CIM OK; netstat0rows | BLOCKED | operator/75cd1362-7074-48d8-b4f7-cb992c795b09/ipv4.json |
| CC-02 | 75cd1362-7074-48d8-b4f7-cb992c795b09 | User    | User           | IPv6 / ::1       | 60075 | 9044  | 2026-11-10T13:30:34.3192305Z | 3331e1ffe19874215472217c5e94f5a0c6d8e18c4ac7111d3937aa0ad5e9b4a5 | code0; classes3/5 state0; PID matches | GetNet null projection error; CIM OK; netstat0rows | BLOCKED | operator/75cd1362-7074-48d8-b4f7-cb992c795b09/ipv6.json |

CC03 Codex→User and CC04 User→Codex NOT RUN: no simultaneous approved cross-token coordination. Self-context runs occurred at different times; no same-socket2→0/network-compartment claim. All original reviewed bundle hashes agree. Same host/session/runtime, distinct SIDs/non-admin tokens.

Each listener max3planned samples, first state0 stopped further samples; actual1sample/family, no until-green retry. All four own IPC closes exit0; fresh process identity verified before close and post-close target rows absent. Context comparison PARTIAL, full bounded repeatability not established.

User Get-NetTCPConnection result is a collector projection exception (InvokeMethodOnNull), not permission denial or missing-OS-row proof. Raw cmdlet object not retained; new null-safe collector variant only offline verified. Native state0 and netstat no-target evidence remain unchanged.

Source patch: separate TEMP variant preserves null, gate rejects null; live variant not executed. Full47diagnostics PASS does not turn any live row into LISTEN.

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
