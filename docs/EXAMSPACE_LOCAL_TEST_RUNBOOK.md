# ExamSpace Local Test Runbook

## Worktree and running services

Use:

```powershell
Set-Location 'C:\Môn Học\ThucTapNgheNghiep\ExamSpace-Stitch-UI'
```

Do not use the original Phase 3 repo for UI changes. UI-10 observed Next dev on 3000 and API development on 4000. Identify PID, command line, start time and owner before stopping anything. Never kill all Node processes or run two Next processes against one build directory.

## Start local development

1. Use the Corepack-pinned pnpm/workspace dependencies.
2. Configure local `.env` from `.env.example` with local-only secrets and an explicitly identified development DB. Example values are placeholders. Never copy test/production credentials.
3. Ensure the owner has made the intended local PostgreSQL available. Do not run migrations, seed, reset, drop or `db push` as part of routine startup.
4. Start:

```powershell
corepack pnpm dev:stitch
```

The launcher checks port3000 and the configured API port, then calls `pnpm dev`. Dev prepare runs Prisma client generation (ignored output) and shared build; it does not migrate or seed. Web is `http://localhost:3000`; Swagger is `http://localhost:4000/docs` when API_PORT=4000.

If a known, correctly configured API already runs and only web is needed, `corepack pnpm dev:stitch:web` starts web on3000 after dev prepare. `NEXT_PUBLIC_API_URL` must point at the intended API when Next starts/builds; it is not a runtime switch for an existing bundle.

## Login and local data

Use accounts owned by the identified local development database. This project does not guarantee a default password. Do not show real learner credentials in screenshots/logs. API authorization remains authoritative.

## Isolated tests

Root tests require the private test-only env. A bare `pnpm test` without `DATABASE_TEST_URL` fails closed; never point test variables at development. The reviewed UI-10 runner is in TEMP:

```powershell
node (Join-Path $env:TEMP 'examspace-ui10-20261102\final-runner\run.cjs') full
```

It uses API4010/web3010, verifies the dedicated test DB identity/migrations, generates process JWT secrets, checks test ports, bounds workers and records owned cleanup. It is evidence tooling, not a production script. Latest run passed HTTP60/60 then API PID17996 exited 0xC0000409; Browser stopped at 28/123. Do not rerun to erase that incident.

After an approved run, inspect result and child ownership, confirm no test API/web workers remain, and verify test DB identity/connections. Keep development services running. No debugger/dump without separate approval and safe destination.

## Quality commands

Run only when no active Next process owns the build directory:

```powershell
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
corepack pnpm test
corepack pnpm test:integration
corepack pnpm test:e2e
corepack pnpm format:check
git diff --check
```

Integration/E2E require the reviewed guarded test environment. Typecheck/build were skipped in UI-10 to avoid racing the user's live Next dev on the shared build directory. Avoid `pnpm db:migrate`, `pnpm db:seed`, `pnpm dev` with unidentified DB, reset/drop commands.

## Troubleshooting

- Port conflict: identify owner first; don't terminate unrelated Node.
- Auth/API errors: check WEB_ORIGIN, CSRF_TRUSTED_ORIGINS, API_PORT and NEXT_PUBLIC_API_URL without printing secrets.
- Next overlay mentioning script tag: inspect current source/browser console; don't clear a live build cache or assume UI disappeared.
- API exit `3221226505 / 0xC0000409`: preserve PID/time/runtime/exit and runner evidence; stop dependent tests; no auto-restart or claim of fix. Root cause remains unknown.
- Autosave: only server-confirmed revisions are guaranteed persisted. Use workspace reconciliation after uncertain save/submit; don't create another attempt based only on timeout.

## UI-10.1 safety addendum — 02/11/2026

### Identify development and test processes

Before running anything, use `Get-Process -Id <PID>` and `Get-NetTCPConnection -State Listen -LocalPort 3000,3010,4000,4010` to record PID, process start time, executable and listener owner. If command line/parent cannot be read, treat ownership as unknown and do not stop it. Never stop all Node processes. Development uses 3000/4000; UI test uses 3010/4010. A CLOSED connection is not a listener or proof the process exited.

### Next build ownership

Inspect the process tree and the configured Next `distDir`; this repository uses the default `apps/web/.next`. If a dev server owns that directory or `.next/dev/lock` exists, do not run build/typecheck there, remove cache, or stop the user process. Use a separate source copy outside both worktrees, excluding `.git`, `.env*`, `.next`, build output and browser data. Verify package/junction targets: no dependency link may route build output back into the active worktree. If safe dependency isolation cannot be verified, record `ISOLATED BUILD BLOCKED — LIVE DEV ENVIRONMENT PRESERVED — USER APPROVAL REQUIRED FOR MAINTENANCE WINDOW`.

### Isolated typecheck/build

UI-10.1 used `%TEMP%\\examspace-ui101-isolated-20261102`. It copied source without `.env*`, `.next` or generated output, copied the dependency files to the clone and remapped junctions within it. It then ran `corepack pnpm typecheck` and `corepack pnpm build` with only `NEXT_PUBLIC_API_URL=http://127.0.0.1:4010` and telemetry disabled. This is a recorded example, not a guarantee every clone is hermetic; compare hashes and verify the actual link graph first. Do not run `pnpm install` against the user's global store without a separate safety review.

### Test API, Web and database identity

Reserve only API4010/Web3010 after confirming no listener. Verify API PID/start/executable and web PID/start before workload. Build/browser bundle must target API4010. Before SQL/fixtures, guard PostgreSQL host `127.0.0.1`, port `15433`, database `online_exam_phase3_test`, cluster identity distinct from development, and all required migration records. If any check fails, do not fall back to port4000 or a development URL. Never query development SQL or run reset/drop/db push/seed/migrate there.

### Bounded regression and unexpected exit

Run one planned suite at a time; record run ID, source/runtime hashes, PID, start/readiness/exit, suite counts and exact outcome. Do not loop until green. On unexpected API exit: stop only dependent test workers, do not restart automatically, retain logs and process records, hash/freeze evidence, record exit code/time and current observer data if available. Do not infer an active endpoint from the last browser case. Do not upload dumps/logs containing sensitive data.

### Cleanup

Stop only test API/Web child processes whose PID, start time and ownership were verified and recorded by the current runner. Confirm test DB connections, retain fixtures/databases/evidence per current policy, and do not stop dev services or delete volumes. Never issue `taskkill /IM node.exe`, kill port3000/4000 owners, or delete the active `.next` tree.

## UI-10.2 sanitized diagnostic toolkit — 02/11/2026

Current state: **listener ownership gate BLOCKED**. The v3 runner received observer activation but OS socket enumeration returned no owner for4010. It stopped its verified API child before HTTP tests/fixtures. Do not repeatedly invoke it to obtain a green run. Verify a trustworthy OS socket-to-PID view before any later reproduction.

### Safe observer preparation

Keep a new run directory outside both worktrees, with process/http/scheduler/database/windows/tests/snapshots/summary subdirectories. Preserve old runs. The reviewed toolkit is under %TEMP%\examspace-ui102-20261102-c34ba7d1\observer-v3; verify it still exists and check its hashes before reuse. Six unit tests and loopback fake-data canaries are recorded in verification.json.

Activation is explicit and default OFF: EXAMSPACE_UI102_OBSERVABILITY=1, EXAMSPACE_UI102_RUN_ID, EXAMSPACE_UI102_ROUTES and parent IPC. Missing configuration fails closed; require OBSERVER_READY. Scheduler wrapping additionally requires EXAMSPACE_UI102_SCHEDULER=1. The initial probe omitted the correct run-ID variable; its HTTP trace is disqualified. Read the [schema and limitations](EXAMSPACE_UI102_OBSERVABILITY_SCHEMA.md) before enabling hooks.

### Process, database and build gates

Check child PID, parent, executable and OS start time; separately prove listener4010 belongs to that PID. TCP readiness alone is insufficient. Confirm3010 is unused or owned by the intended isolated web child. Preserve user-owned development3000/4000 and live.next.

Read private test config only into memory; require127.0.0.1:15433/online_exam_phase3_test, expected cluster distinct from development and five migrations before metadata or fixtures. Use fresh API JWT secrets; block worktree.env reads. Never substitute development config, print credentials or fallback to4000.

Use the UI-10.1 isolated build method when a new build is necessary: new copy, safe dependency graph, no env/live.next, verified source fingerprint and API4010 bundle target. UI-10.2 did not build anew. Do not overwrite the old isolated evidence or run build against a live directory.

### Logging and bounded workloads

Emit only static route templates, ephemeral correlation, method/status/duration/counts and sanitized error categories. Never serialize request/response, body, answers/key, tokens/cookies/headers, literal IDs, raw URL/query or SQL parameters. PG diagnostics use guarded aggregates; private Prisma metrics are unsupported.

Validate fake canaries before API traffic, then validate actual API start/complete and scheduler spans. Use one owned worker, declared request/concurrency/time/output caps and a new run ID. The v3 plan uses startup15s,3000HTTP starts,32active HTTP,100000events and780s overall; p0 API and existing125-attempt NT04/05 are planned, not executed in this task. Browser/full regression requires all safety/build/ownership gates and a specific diagnostic purpose.

### Crash freeze, Linux and cleanup

On unexpected API exit: record observed UTC/code/signal/PID/runtime, last-known open spans/resources/PG state and possible IPC truncation; stop only dependent owned workers; freeze/hash all evidence; no automatic restart or last-test causal attribution. Assertion, harness, environment, native and intentional-stop outcomes stay distinct.

Only compare an already available compatible ExamSpace Linux environment with matching source/workload semantics. Current preflight found no verified compatible environment; no distro/image/package was downloaded. Do not use unrelated project containers.

Before intentional stop, reverify owned PID/start/executable/parent and record intention. Windows termination does not prove graceful app.close. Check guarded DB connections and preserve the container's initial state/data/volumes. Current test container was already running and remained running; both API test children were absent after cleanup. No dump/debugger/security/global-runtime change is authorized by this runbook; a later native capture needs separate approval.

The final synthetic socket canary also failed to map its own ephemeral IPv6 listener under IPv4, IPv6 and all-protocol netstat views. Changing the protocol filter alone is therefore not a verified fix. Retain this environment failure separately from passing observer/sanitizer tests; no further API run was made. See observer-v3/listener-ipv6-canary.json in the UI-10.2 evidence.

## UI-10.3 dated addendum — 03/11/2026

**WINDOWS LISTENER OWNERSHIP VISIBILITY BLOCKED — SAFETY GATE PRESERVED.**

Initial IPv4/IPv6 returned state2; final correct PID/port rows returned state0 and were rejected.44 diagnostic tests PASS; API spawn0/application requests0. PostgreSQL15433 refused connections; Docker API denied. No elevated diagnostic retry, system security change, product/runtime fix, native capture or agent dev control.

Never substitute development5432 or dev4000. User confirmed expected test container examspace-phase3-restore-20261030-115026 Exited(255); another healthy5432 container was development. Owner must restore existing test availability, then verify actual SQL identity/five migrations. DB availability does not override synthetic BLOCKED. Fresh evidence tree/run ID per rerun; retained scripts use fixed filenames, so do not rerun them in place. No new container/restore implicit authorization, elevated queries, security changes, accepting state0 or deleting live .next.

Historical text above remains byte-exact. Native cause UNKNOWN; runtime OPEN; full acceptance INCOMPLETE; integration/staging BLOCKED; production NOT APPROVED.

Evidence: C:/Users/Admin/AppData/Local/Temp/examspace-ui103-20261103-d58f2a90. [Ownership report](EXAMSPACE_UI103_LISTENER_OWNERSHIP_REPORT.md), [matrix](EXAMSPACE_UI103_OWNERSHIP_PROBE_MATRIX.md), [observer validation](EXAMSPACE_UI103_API_OBSERVER_VALIDATION.md).

## UI-10.4 evidence addendum — 03/11/2026

**DOCKER READ-ONLY INSPECTION BLOCKED BY PERMISSIONS. WINDOWS LISTENER ENUMERATION INCONSISTENT — GATE B BLOCKED.**

New44/44 diagnostic tests PASS; no product tests counted. Docker CLI29.6.2 available, current context CLI says default with unreadable user config, Engine permission denied. Exact test container status/volume/exit cause UNKNOWN. One bounded TCP probe15433 refused; SQL not attempted. No Docker lifecycle/security/privilege/runtime/product change.

UI104 did not start/restart/stop containers or run Compose. Do not infer startup authorization from diagnostic tasks or old approvals. Reference Compose5432 is not dedicated test15433. Require exact existing test ID/image/mount/volume evidence before separate controlled-start approval; startup can write WAL/recovery/checkpoints. Both A/B then real API C must pass before HTTP; no state0/TCP/READY fallback. Use fresh evidence/run IDs, preserve old runs and live .next.

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
