# ExamSpace UI-10.4 — PostgreSQL Test Environment

03/11/2026, Asia/Saigon. **DOCKER READ-ONLY INSPECTION BLOCKED BY PERMISSIONS · GATE A BLOCKED.**

## Current measured evidence

CLI Docker29.6.2/build dfc4efb executes. Context show returns default but stderr says user Docker config access denied. Engine version query exit1, permission denied at docker_engine named pipe. Server version/reachability/context intended by owner UNKNOWN; do not call this proof Engine is down. No automatic elevation/context/security/daemon change.

Current exact test container ID/image/creation/state/start/finish/health/OOM/restart policy/Compose labels NOT VERIFIED. Historical expected name examspace-phase3-restore-20261030-115026; historical user Exited(255) statement retained as historical only. Current inspect/logs were not attempted after access hard stop. A255 status alone would not identify PostgreSQL corruption or process cause anyway.

Reference Compose defines postgres:16-alpine on127.0.0.1:5432 with postgres_data; that configuration must not be mistaken for the dedicated test15433 container. No Compose lifecycle or SQL5432.

## Storage and data integrity

Actual mount type/name/container destination/readOnly flag/driver/existence/Compose ownership BLOCKED. Private host paths/PGDATA not read. No mount into another container, repair, copy live files, initdb/resetwal/fsck/restore/reset/drop/seed/migration/volume removal.

Data classification: DATA NOT ACCESSIBLE / SQL DATA NOT VERIFIED. Absence of agent mutations is not evidence of data integrity. No confirmed loss or corruption. Metadata alone would not prove SQL consistency even if volume exists.

## Availability and SQL gate

At2026-11-03T04:49:51.993Z, bounded500ms TCP probe127.0.0.1:15433 failed ECONNREFUSED. No SQL sent. Name online_exam_phase3_test and old expected cluster7702318921920503846 versus development7699697588847288354 are configuration/history, not current identity. Five migrations NOT VERIFIED. No development fallback.

## Exit cause classification

UNKNOWN. No current evidence for PostgreSQL process exit, runtime/daemon interruption, OOM, storage/mount failure, healthcheck failure or host restart. Confirmed permission error belongs to the diagnostic query and cannot be used as container-exit cause.

## Recovery case assessment

| Case                              | Current evidence        | Allowed next step / approval                                                                                                         |
| --------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| A stopped + volume present        | NOT ESTABLISHED anew    | After exact ID/image/mount/volume/log audit, present a specific controlled start for separate approval; no start now                 |
| B Engine inaccessible             | CURRENT APPLICABLE CASE | Owner/platform operator supplies selected read-only metadata in an already authorized context; no automatic privilege/context change |
| C missing/corrupt volume          | NOT ESTABLISHED         | Preserve evidence; no recreate/restore/repair; require independent backup/rollback review                                            |
| D running but15433 unavailable    | RUNNING NOT VERIFIED    | Once identity known, inspect published binding/network/health read-only; no firewall/port edit                                       |
| E owner restored existing service | NOT OBSERVED/VERIFIED   | Re-inspect same ID/image/mount, then guarded SQL/database/cluster/five migrations; no implied Docker mutation permission             |

## Concrete evidence handoff before any startup request

Owner/platform operator needs to provide selected metadata, not raw inspect/env: container short ID/name/Created/image ID; status/exit/start/finish/OOM/restart count/policy/health; sanitized State.Error category;15433 mapping/network mode; relevant Compose project/service; mount type/volume identifier/destination/RW and volume existence/driver/Compose ownership. Do not include private bind host paths.

Only after exact container is identified: bounded timestamped tail at most200 lines, processed locally into safe startup/shutdown/recovery/OOM/storage/error categories. PostgreSQL logs can contain SQL/identifiers/secrets; do not paste raw logs or credentials. No raw-log quarantine was needed or created by this task.

No startup approval is requested now because actual identity and volume risk remain unknown. After metadata, a concrete proposal must name the exact existing ID/image/mount and preservation/rollback limits. Start may perform WAL recovery/checkpoints and write database files; no promise of read-only startup. Separate approval is required for container start; no inherited authorization from earlier tasks.

## DB-01–DB-20

| ID    | Scenario             | Expected                          | Actual                                                            | Evidence                        | Status                             |
| ----- | -------------------- | --------------------------------- | ----------------------------------------------------------------- | ------------------------------- | ---------------------------------- |
| DB-01 | Docker CLI/Engine    | CLI/Engine reachable              | CLI29.6.2; Engine permission denied                               | docker/read-only-inventory.json | PARTIAL                            |
| DB-02 | Context              | Identify actual intended context  | CLI default with unreadable user config; intended context unknown | same                            | PARTIAL                            |
| DB-03 | Exact test container | ID/name/image/ports cross-check   | Historical name only; inspect unavailable                         | same; historical docs           | BLOCKED                            |
| DB-04 | Status/ExitCode      | Current inspect                   | No current Engine state                                           | same                            | BLOCKED                            |
| DB-05 | Start/finish         | Current timestamps                | Unavailable                                                       | same                            | BLOCKED                            |
| DB-06 | OOM/restart          | Inspect flags/policy              | Unavailable                                                       | same                            | BLOCKED                            |
| DB-07 | Safe bounded logs    | Only verified test container      | Not queried because identity/access blocked                       | same                            | NOT RUN                            |
| DB-08 | Exit classification  | Evidence-based cause              | UNKNOWN; query permission is not exit cause                       | main section8                   | PARTIAL                            |
| DB-09 | Mount metadata       | Actual volume/type/destination/RW | Unavailable; Compose is reference only                            | docker-compose.yml read ledger  | BLOCKED                            |
| DB-10 | Volume present       | Read-only actual metadata         | Not inspected                                                     | Docker gate                     | BLOCKED                            |
| DB-11 | No data deletion     | No deletion operation             | Zero agent destructive/storage operations                         | command/source ledger           | PASS action scope                  |
| DB-12 | Dev container        | No dev mutation                   | No lifecycle command; full state unknown                          | inventory; action scope         | PARTIAL state                      |
| DB-13 | No dev SQL           | No development query              | SQL attempted0                                                    | database/availability.json      | PASS action scope                  |
| DB-14 | No reset/recreate    | No recreation/reset               | None executed                                                     | command/source ledger           | PASS action scope                  |
| DB-15 | Lifecycle approval   | No automatic change               | No start/restart/stop/Compose lifecycle                           | inventory; scope                | PASS action scope                  |
| DB-16 | Port15433            | Check current availability        | One bounded TCP probe ECONNREFUSED                                | database/availability.json      | PASS check; availability BLOCKED   |
| DB-17 | Cluster              | Verify actual SQL identity        | No SQL; endpoint/metadata gate blocked                            | same                            | NOT RUN                            |
| DB-18 | Migrations           | Verify five expected records      | No SQL; historical count not reused                               | same                            | NOT RUN                            |
| DB-19 | Integrity claim      | Match evidence limits             | NOT VERIFIED, no corruption/loss claim                            | report integrity section        | PASS review                        |
| DB-20 | Gate A               | Explicit verdict                  | BLOCKED                                                           | main section13                  | PASS verdict clarity; gate BLOCKED |

## Cleanup/preservation

Agent Docker state-changing commands0; SQL connections/queries0; development DB actions0. Current container/service/volume state UNKNOWN. No start/stop/restore/recreate/reset or security change. Existing data/volumes were not operated on by the agent.

Evidence root: C:/Users/Admin/AppData/Local/Temp/examspace-ui104-20261103-9d202804. [Main report](EXAMSPACE_UI104_ENVIRONMENT_AND_OWNERSHIP_RECOVERY_REPORT.md).
