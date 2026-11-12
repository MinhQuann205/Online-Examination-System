# ExamSpace UI-10.6 — Operator Verification Handoff

10/11/2026, Asia/Saigon. EXECUTED ONCE BY USER AFTER EXPLICIT APPROVAL. Original reviewed command below is retained as historical handoff; DO NOT RUN AGAIN.

## Purpose and context

Run once in the ordinary user Windows PowerShell that already has Docker access. No Administrator/RunAs/UAC, context switch or execution-policy changes. Same synthetic child/C#/ownership gate as the Codex measurement. This is not permission for API W1 or scheduler writes.

## Reviewed source

Entry C:\Users\Admin\AppData\Local\Temp\examspace-ui106-20261110-35f95d0c\operator\verify-once.cjs. SHA-256 122ca09ae526097da4da3ee483fb764a78e321bdeccd8450fae8dce9e7bc9f84. Full source dependencies and hashes in C:\Users\Admin\AppData\Local\Temp\examspace-ui106-20261110-35f95d0c\operator\source-manifest.json. Entry verifies all five files before action; source drift blocks, do not override it.

| Relative file            | SHA-256                                                          |
| ------------------------ | ---------------------------------------------------------------- |
| operator/verify-once.cjs | 122ca09ae526097da4da3ee483fb764a78e321bdeccd8450fae8dce9e7bc9f84 |
| canary/run.cjs           | 43f936477096f1c9020c1fb02ddcf73099cacb9568f3fe0875033ba88e7ee157 |
| canary/child.cjs         | f765939c100025e32be0a85131fdad9242c2972551153fc3094823ff78fd5815 |
| windows/ownership.cjs    | 4d87286c4c77be0b3d50b91a4a049e6803b289300c01d9cf40f3a0dcb8e15a28 |
| windows/windows.cs       | acfd34245f72fa18c1597a4d24f35e6de0223e786da4ce084deacc1459a9a078 |

## Side effects and limits

Two new owned Node children, one IPv4 127.0.0.1 and one IPv6 ::1, ephemeral ports only. No public bind/client HTTP or TCP application requests. Each listener maximum90s, up to3fixed samples/1s gaps/10s per query; first ownership error stops that listener. OS queries are read-only and exact-port/PID scoped. Child closes via own IPC and exits; no arbitrary process termination. Local TEMP evidence and exclusive one-shot execution marker are written. No retries.

One docker inspect with a whitelisted format for the exact existing recovered test container, only ID/name/image/status/start/binding/mount identity. No raw inspect/env/credentials/server logs, Docker lifecycle, SQL, API, fixture, policy or security operations. Docker unavailable is recorded, never fixed automatically.

## Historical executed command — do not run again

    node "C:\Users\Admin\AppData\Local\Temp\examspace-ui106-20261110-35f95d0c\operator\verify-once.cjs" --approve-synthetic-and-readonly

The flag is an explicit manual execution acknowledgement of the synthetic/read-only scope. Run only once. Existing marker/source mismatch/error means stop and return the error; do not delete marker or retry.

## Expected output

One final JSON containing runId/result path, Docker metadata verdict and canary controller exit. The result files contain actual listener ports/PIDs/start/runtime/context and scoped query/cleanup results. A controller exit0 indicates completed collection; it does not mean ownership PASS. Native state0 or denied/error/missing rows keep Gate B BLOCKED.

## Evidence return

Send the final JSON line or its exact result.json path. Codex will read local files, recheck source hashes, operator run/runtime identity, lifetimes and raw-versus-parser decisions. Do not paste .env/password/raw inspect or full netstat output. Return is user-operated provenance, not independently authenticated by hashes. Original source and outputs are retained.

## Stop and cleanup

Stop on UAC/elevation/policy request, source hash drift, unexpected container identity, ownership mismatch/state0/error, failed child cleanup or unknown PID. Script makes no attempt to repair the machine. Children have their own deadline; return error if cleanup is not confirmed. Do not stop test PostgreSQL or development services.

## Original pre-execution checkpoint (retained)

Codex state0 on both families; user-context and CC03/04 not measured. No live cross-context PID is left waiting. Next compare local contexts; concurrent cross-context probes only with separately coordinated short window. Even if user succeeds, Codex Gate B remains BLOCKED until its actual trust boundary qualifies.

## Execution result — 10/11/2026

Approved 2026-11-10T12:18:13.375Z. Outer operator run 9c814479-bbeb-48ed-958b-22d743ccc12f completed exit0 at13:30:43.613Z. Inner canary run 75cd1362-7074-48d8-b4f7-cb992c795b09 returned BLOCKED, not PASS. IPv4PID14536/60072 and IPv6PID9044/60075: native classes3/5 state0, owner matches; CIM process query succeeds, Get-NetTCPConnection null-State projection throws, netstat has no target line. Both children own IPC close/exit0/no post-close rows. Original bundle hashes unchanged; local files validated for consistency, not independent authentication.

Current Docker metadata verifies exact original running container/image/volume/port; fresh guarded read-only SQL at2026-11-10T13:32:27.559Z completes Gate A PASS in bounded metadata scope. Gate B remains BLOCKED in both contexts; no W1/API/E2E or further operator execution requested. Exclusive one-shot marker retained; do not delete/retry.

Null projection correction exists only as separate TEMP variant; three offline tests pass, native state0 unaffected, no live rerun. Original entry/source manifest remain frozen. Next investigation needs new reviewed scope that distinguishes raw nullable OS data from collector formatting; no security/elevation or lifecycle changes are requested.
