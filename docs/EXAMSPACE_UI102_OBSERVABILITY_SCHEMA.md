# ExamSpace UI-10.2 — Observability Schema

## Activation and removal

Toolkit: %TEMP%\examspace-ui102-20261102-c34ba7d1\observer-v3. Default OFF; no product file/public endpoint changed. Enable only reviewed test child with EXAMSPACE_UI102_OBSERVABILITY=1, ephemeral EXAMSPACE_UI102_RUN_ID, EXAMSPACE_UI102_ROUTES to static route JSON and parent IPC channel. Incomplete config fails startup. Parent requires OBSERVER_READY before traffic.

EXAMSPACE_UI102_SCHEDULER=1 additionally wraps compiled ExamAttemptsService.expireDueAttempts using UI102_ROOT. It preserves this/args and exact original Promise but changes module load timing and adds callbacks. Remove test preloads/flags to disable; no application/database reversal. Preserve TEMP toolkit for review.

## Structured events

Envelope: schemaVersion integer1; runId; processId; timestampUtc ISO8601UTC; monotonicMs numeric performance.now; fixed source; enumerated category; per-process increasing sequence. Optional allowlisted fields: ephemeral correlationId, method, routeTemplate, statusCode, durationMs, activeCount, fixed errorCategory, numeric scannedCount, boolean schedulerEnabled. Parent rejects extra fields/categories/templates and enforces caps.

| Event                     | Meaning and limitation                                  |
| ------------------------- | ------------------------------------------------------- |
| OBSERVER_READY            | Hooks installed;not proof request/tick executed         |
| HTTP_REQUEST_START        | Native HTTP channel;ephemeral correlation/static route  |
| HTTP_REQUEST_COMPLETE     | Native response-finish;status/duration                  |
| HTTP_REQUEST_ABORT        | Response close before writableFinished                  |
| SCHEDULER_TICK_START      | Original method invocation began                        |
| SCHEDULER_TICK_COMPLETE   | Original Promise resolved;due-count,not finalized-count |
| SCHEDULER_TICK_ERROR      | SYNC_THROW/PROMISE_REJECTED category only               |
| OBSERVER_LIMIT            | Tracking cap;parent stops workload                      |
| API_READY                 | Parent handshake/TCP/listenerPID verified               |
| API_SHUTDOWN_REQUESTED    | Parent intent before verified owned stop                |
| API_PROCESS_EXIT_OBSERVED | Parent code/signal/time,last-known spans/resources      |

No catch-all exception handler. HTTP5xx becomes SERVER_ERROR; raw error text/stack never logged. Native exit can bypass JS/IPC flush. Unmatched starts are UNKNOWN_COMPLETION, not proof a request caused crash. HTTP error/abort/native crash handling is not fully exercised in the current API run.

## Sanitization and timestamps

Static route JSON derives52 method/template pairs from controller definitions; literals precede parameter routes. URL path transiently matches these definitions; query discarded before match, unknown path emits UNMAPPED. Never persist literal IDs/raw path/query. Body/headers are not read.

Forbidden output: Authorization/JWT/cookies/passwords, account/exam/attempt/question identifiers, email/IP, request/response bodies, student answers/correct keys, SQL text/bind values, credentials/.env contents, raw error stacks. No req/res serialization or Prisma internal patch.

UTC correlates processes/OS; monotonic duration only compares within one process. Correlation IDs random per request/scan and carry no authorization. Canary uses fake sensitive markers and inspects runtime JSONL, not the source containing intentional markers. Six tests cover default-off/config rejection/route mapping/scheduler Promise and failure semantics.

## Scheduler, PG and external process limits

Scheduler wrapper does not alter cadence/deadline/grading. It observes invocation concurrency/outer completion/due-count. Finalized/skipped/per-row caught errors and transaction attribution remain UNSUPPORTED.

PG metadata requires test guard host127.0.0.1/port 15433/database online_exam_phase3_test, distinct cluster identity and5migration check. Counts total/active/idle/lock-wait exclude controller; no query text/parameters/rows. Prisma private pool counts, acquisition and transaction spans UNSUPPORTED. Aggregate state cannot attribute one backend to a request.

External process sampler records bounded memory/CPU/handles/threads only; PID/executable/start/parent verified. Listener ownership must independently map port 4010 to that child. In this task that guard blocked workload; no fallback to dev4000.

## Storage, bounds, overhead and failure

New runs get separate runs/runId/process,http,scheduler,database,windows,tests,snapshots,summary directories. Append-only logs and SHA-256 manifests with explicit coverage; preserve previous attempts.

Runner caps:15sstartup;required heartbeat/listenerPID;oneworker;3000 HTTPstarts;32activeHTTP;100000 events;process2s/PG5s target;780soverall. Planned p0 worker240s and NT04/05 worker540s preserve existing assertions/timeouts. Schema/sanitizer/identity/native-exit/deadline/cap failures stop related work, freeze/hash, never autorestart.

IPC writes files in parent; added listeners/route matching/serialization/Promise callbacks still affect timing. Synthetic elapsed times are noisy, not an overhead bound. Initial synchronous logging experiment/inactive API probe are retained as preparation failures.

Before cleanup reverify owned child PID/start/executable/parent, record intention, stop only that child. Windows termination does not prove Nest app.close. Preserve dev 3000/4000/live .next/data/volumes. No debugger/dump/security mutation.

Version-matched channel reference: [Node 24.15 diagnostics_channel](https://nodejs.org/download/release/v24.15.0/docs/api/diagnostics_channel.html). Built-in HTTP channels are experimental; synthetic tests and real API validation are separate gates.
