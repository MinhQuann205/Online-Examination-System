# ExamSpace UI-10.2 — Native Crash Isolation Report

**Ngày:** 02/11/2026, Asia/Saigon  
**Final:** DIAGNOSTIC WORKLOAD BLOCKED BY LISTENER OWNERSHIP GATE — ROOT CAUSE UNKNOWN — RUNTIME RISK OPEN.

## 1. Executive summary

Đã bàn giao observer/runner test-only ngoài repository, kiểm thử sanitizer/default-off, xác minh test PostgreSQL và thực hiện hai probe ngắn. Không có new native exit, native exception parameters, faulting module hoặc stack. Không product/runtime fix.

Probe đầu sống 52.498 s, một GET không credentials trả401, nhưng HTTP observer inactive do thiếu đúng tên biến run ID. Kết quả này không qualified cho HTTP observability. Bản v3 sửa activation, có fail-closed config và OBSERVER_READY; khi chạy thật, OS socket enumeration không xác minh được port 4010 thuộc API PID. Runner dừng đúng child trước HTTP tests/fixtures/suites. Đây là hard stop theo mục22 prompt UI-10.2.

**Diagnostic Safety BLOCKED · Root Cause UNKNOWN · Functional Acceptance INCOMPLETE · Runtime OPEN · Production NOT APPROVED.**

## 2. Git/source preservation and ledger

Worktree C:\Môn Học\ThucTapNgheNghiep\ExamSpace-Stitch-UI; branch feature/stitch-examspace-ui; HEAD a1e2891754e399aa4743e32c8218759938149bdc. Snapshot đầu có 311 public tracked/untracked files trong phạm vi không ignored/generated/.env. Fingerprint48833f84303597feb8acfccc55ad2919724b5c745934cee87134e40e67131c13.

Original Phase3 repository Online-Examination-System-Git được hash read-only cùng phương pháp:238 files. Phạm vi này khác250-file lịch sử; không thay số lịch sử bằng số mới. So sánh cuối dùng đúng snapshot đầu nhiệm vụ, xem summary/final-preservation.json trong evidence.

Repository ledger UI-10.2: ba báo cáo mới này, Observability Schema, Reproduction Matrix; append bốn tài liệu Acceptance Matrix, Production Gap, Integration Handoff, Local Runbook. Product source/backend/tests/schema/migrations/dependencies/lockfile không sửa. TEMP có observer/preloads/runner/tests/logs/manifests. Không stage/commit/push/fetch/reset/clean/stash/restore/checkout/rebase/merge/deploy, không sửa repository gốc hoặc global config.

## 3. UI-10.1 baseline and historical incidents

UI-10.1 typecheck/build PASS trong clone riêng; UI-10.2 không application source change, nên đây là historical baseline, không phải build mới. UI-09 từng đạt root 87 + HTTP 60 + browser 123 = 270; UI-10 có root 87 / HTTP 60 đạt nhưng browser 28/123 trước crash. Không cộng observer tests/canary requests vào270.

| Incident      |               PID | Observed native exit / uptime   | Missing evidence                |
| ------------- | ----------------: | ------------------------------- | ------------------------------- |
| Foundation    | 30340;wrapper7952 | 3221226505;uptime UNKNOWN       | Direct-child exit time/context  |
| UI-05         |             31436 | 01 Nov 09:33:20.358Z;33.980 s   | Request/native stack            |
| UI-07         |             24968 | 01 Nov 17:40:33.016Z;1334.950 s | Exact request/module            |
| UI-08         |             27600 | 02 Nov 05:13:47.110Z;119.993 s  | Exception parameters/stack      |
| UI-08.1 focus |             27740 | 07:38:47.598Z;5.854 s           | Native fault mechanism          |
| UI-08.1 full  |             13000 | 07:47:35.032Z;313.999 s         | HTTP54passed;browser incomplete |
| UI-10         |             17996 | 11:59:34.004Z;221.067 s         | HTTP60passed;browser 28/123     |

Times UTC. Các incidents cùng3221226505/0xC0000409. UI-09 final không có unexpected exit recorded; intentional cleanup không là native incident. Không suy endpoint gây crash từ last completed browser case.

## 4. Runtime inventory

Đo lại Node 24.15.0 Windows x64, C:\Program Files\nodejs\node.exe; Authenticode Valid. SHA-256 3331e1ffe19874215472217c5e94f5a0c6d8e18c4ac7111d3937aa0ad5e9b4a5. Compiled main SHA-256 246dedbf1f0b7f41f6d4711ca59e38461140b9658c9cd00841bbd3296b41a42d.

Inventory metadata mới: libuv 1.51.0, V8 13.6.233.17-node.48, Argon2 0.44.0, Prisma Client 7.10.1, pg 8.23.1, Nest core 11.2.7. Đây là installed-package inventory, không phải loaded/faulting module tại crash; xem summary/runtime-inventory.json. Không thay executable/PATH/package versions. Dependency presence hoặc tên status không xác định faulting module/buffer overrun. Package/loaded-module context đúng giây historical crash vẫn thiếu.

## 5. Observer architecture and sanitization

Toolkit: %TEMP%\examspace-ui102-20261102-c34ba7d1\observer-v3. External parent ghi process lifecycle/ownership, IPC events và evidence hashes. HTTP subscriptions dùng Node diagnostics_channel; response-close listener ghi aborted response. Không patch global request/response methods hoặc Prisma internals.

Route matcher chỉ xuất template từ52 controller definitions. URL path chỉ được match tạm trong memory, query bị bỏ; không ghi raw path/query/body/headers/IDs. IPC chuyển sanitized events sang parent, tránh file I/O trong API request handler. Parent giới hạn fields/categories/templates/caps.

Scheduler wrapper trong TEMP preload có flag riêng, gọi method gốc với nguyên this/args và trả chính original Promise. Module load order và Promise callbacks/timing có thay đổi do instrumentation; không coi run là hoàn toàn không can thiệp.

Observer unit 6/6 PASS: default-off, missing-config rejection, safe route mapping, Promise/args/this identity, rejection và synchronous throw. Canary v3: hai children riêng mỗi50 requests; disabled0 events; enabled50 START/50 COMPLETE/1 READY; fake path/query/header/cookie/answer/key markers không xuất hiện trong logs. Timings synthetic nhiễu, không là overhead bound.

Initial runner truyền UI102_RUN_ID thay vì EXAMSPACE_UI102_RUN_ID: đây là confirmed harness bug giải thích missing events. Bản v3 truyền đúng và bắt buộc heartbeat. Đây không phải native crash fix. Logs được scan trong phạm vi runtime records; fake markers có chủ đích trong source test không là log leak.

## 6. HTTP and scheduler findings

HTTP channels hoạt động trên synthetic Node server. Initial API GET401 không có events do inactive observer. V3 READY được ghi nhưng listener guard chặn trước HTTP. **API HTTP lifecycle NOT VERIFIED** trong qualified run.

Source scheduler interval 15000 ms, unref, catch outer rejection, clearInterval trong OnModuleDestroy; mỗi scan tối đa100 rows, catch lỗi từng row rồi trả due-count. Không có explicit interval in-flight guard: source cho phép overlap nếu scan lâu hơn15s, nhưng chưa có runtime trace xác nhận overlap.

Wrapper unit tests PASS; v3 process dừng trước tick đầu nên live tick duration/count/error/overlap NOT RUN. Due-count không là finalized-count; per-row caught errors/skips không được expose. Không đổi cadence, disable scheduler, bỏ125-attempt regression hoặc sửa grading.

## 7. Prisma/PostgreSQL findings

Source PrismaClient dùng PrismaPg; OnModuleInit connect và OnModuleDestroy disconnect. Private adapter pool/acquisition/transaction/query spans không được truy cập: UNSUPPORTED.

Guard đã xác minh host127.0.0.1/port 15433/database online_exam_phase3_test, cluster 7702318921920503846 khác expected development identity và5/5 applied migrations, trước metadata queries. Background expiry scheduler vẫn hoạt động trong initial idle probe và có thể finalize các test rows đã due; không có tuyên bố test row contents giữ nguyên hoặc scheduler không chạy. Test config cũ chỉ đọc trong memory; JWT secrets mới riêng mỗi API; dotenv preload chặn đọc worktree .env.

Initial probe có 7 PG samples, non-controller backends0–1; final0. V3 final0. Chỉ aggregated total/active/idle/lock-wait counts, không SQL text/parameters/table payloads. Không map aggregate thành request hoặc scheduler transaction cụ thể. Không tạo fixtures mới hoặc chạy migration/reset/drop/seed/dev SQL; container test vốn running được giữ running.

## 8. Controlled results and process diagnostics

| Probe                  | Observations                                                                | Disposition                                                                    |
| ---------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| PID 21240,parent 36320 | Start16:17:56.281Z;TCP-ready16:18:09.784Z;exit16:18:48.779Z;52.498 s;GET401 | Intentional code null/signalSIGTERM;HTTP instrumentation disqualified          |
| PID 12052,parent 29636 | OSstart16:29:20.688214Z;READY16:29:22.242Z;exit16:29:26.243Z                | Intentional code null/signalSIGTERM;ownership hard stop;0 HTTP/fixtures/suites |

V3 run ID observed-v3-c7f709c5-b0fc-4372-bbb5-93cea9cb624c. Child PID/parent/executable/start verified; port 4010 owner enumeration returned empty. TCP success không thay OS socket ownership. Không suy network visibility gap là nguyên nhân native exit.

Initial resource sampling có 9 samples, gồm một helper failure được harness đánh dấu alive:false. Cờ này không chứng minh process đã exit; không dùng missing/zero values để kết luận leak. PowerShell synchronous sampling có overhead; v3 external sampler chưa start vì guard. Native failure/dependent-worker-stop paths trong runner chưa thực thi thực tế; không đánh PASS chỉ từ code. IPC cuối có thể thiếu tại native exit, open spans chỉ là last-known context.

## 9. Windows and Linux findings

Application read-only query16:17:50Z–16:30:00Z,limit 1000:19 events,0 strict node.exe+native-status matches; không persist event messages. WER archive metadata83 directories,0node-named; content scan NOT PERFORMED. Prior WER access limitations còn nguyên; không kết luận OS/security vô can.

WSL chỉ liệt kê Docker system distro docker-desktop; existing image inventory không xác minh được ExamSpace Linux source/dependencies tương thích. **COMPARISON NOT AVAILABLE IN VERIFIED COMPATIBLE ENVIRONMENT.** Không dùng unrelated services, download/install hoặc chuyển production OS.

Không ProcDump/debugger/native dump/registry/ACL/Defender/WER changes. Node fatal report flags exclude-env/network được giữ cho test process; không có native report/stack mới được dùng làm evidence.

## 10. Hypothesis matrix

| Hypothesis                    | Evidence for                     | Evidence against / missing        | Diagnostic result                            | Confidence / remaining unknown                 |
| ----------------------------- | -------------------------------- | --------------------------------- | -------------------------------------------- | ---------------------------------------------- |
| Node/V8/libuv/native boundary | Repeated Windows native status   | No reason/stack/module            | Short probes no native exit                  | POSSIBLE;mechanism UNKNOWN                     |
| Argon2/N-API                  | Dependency in prior inventory    | No fault/auth trace at crash      | Auth workload NOT RUN                        | UNKNOWN                                        |
| Prisma/pg                     | Historical real DB workflows     | No transaction/pool crash context | Guarded aggregates only                      | UNKNOWN                                        |
| Nest scheduler                | Async interval could overlap     | No qualified live trace           | Wrapper semantics PASS;tick NOT RUN          | POSSIBLE;actual overlap UNKNOWN                |
| Harness                       | Missing observer env name proven | Explains missing events only      | Activation fix tested;listener guard stopped | CONFIRMED harness bug;native causality UNKNOWN |
| Windows/security              | Socket owner not observable here | No strict fault/security record   | Read-only metadata only                      | UNKNOWN                                        |
| App lifecycle                 | Startup/timers exist             | No shutdown/fault stack at crash  | Intentional cleanup recorded                 | UNKNOWN                                        |

## 11. Fix, exam regression and acceptance

Không product/native fix; không before-fail/after-pass native differential. Minimal fixes chỉ nằm trong TEMP observer activation/guards/tests. Matching UUID, AnswerAutosave/revision409, safe submit/UNKNOWN, pinnedV1/V2, deadline, server grading, result policy và auth source không sửa. Business regressions phiên này NOT RUN/BLOCKED; historical PASS không được nâng thành current acceptance.

Không typecheck/lint/build/root/HTTP/browser mới vì source không đổi và live environment phải được giữ; UI-10.1 isolated build/typecheck là baseline lịch sử. Full regression readiness BLOCKED ở listener ownership. Planned selection/caps trong Reproduction Matrix; không repeat-until-green.

## 12. P0 blockers, integration, staging and next approval

P0 recurring native cause và incomplete final browser acceptance vẫn OPEN. Integration/staging BLOCKED, production NOT APPROVED. Trước probe tiếp cần môi trường có thể xác minh OS listener PID. Không xin quyền thay user/bypass guard.

**ADDITIONAL NATIVE CAPTURE MAY BE REQUIRED — SEPARATE APPROVAL NECESSARY.** Nếu sau này cần capture: exception parameters, thread stack, module+offset/version; dump có thể chứa credentials/data trong memory nên cần separate explicit approval, private storage/retention. Approval UI-07.2 không được áp dụng cho nhiệm vụ này.

## 13. Evidence and cleanup

Root %TEMP%\examspace-ui102-20261102-c34ba7d1. Source-before manifest ở snapshots; canary/unit verification ở observer-v3; initial probe ở summary/idle-run.json; v3 run ở runs/observed-v3-c7f709c5-b0fc-4372-bbb5-93cea9cb624c. Final preservation/sanitizer/hash manifests ở summary.

PID 21240/PID 12052 đã không còn sau cleanup; intention/identity được record trước stop. Không start web 3010, stop dev 3000/4000 hoặc ghi live .next. Development/test containers vẫn running ở hậu kiểm; giữ data/volumes/evidence. SIGTERM Windows không chứng minh graceful app.close/OnModuleDestroy.

## 14. Required final status

| Gate                            | Status                                            |
| ------------------------------- | ------------------------------------------------- |
| Source preservation             | VERIFIED in final-preservation scope              |
| Test DB isolation               | PASS identity/migrations/metadata only            |
| Process identity                | PASS owned children                               |
| API4010 listener ownership      | BLOCKED;owner enumeration empty                   |
| Instrumentation                 | PASS synthetic/unit;API READY observed            |
| Sanitization                    | PASS canary/emitted-log scope                     |
| HTTP diagnostics                | PASS synthetic;API lifecycle NOT VERIFIED         |
| Scheduler diagnostics           | PASS wrapper semantics;live ticks NOT RUN         |
| Prisma/PG diagnostics           | PARTIAL aggregates;private metrics UNSUPPORTED    |
| External process diagnostics    | PARTIAL initial;v3 sampler NOT RUN                |
| Windows diagnostics             | PARTIAL read-only metadata                        |
| Linux comparison                | NOT AVAILABLE in verified compatible environment  |
| Crash reproduced                | NO new native exit in short probes                |
| Root cause                      | UNKNOWN                                           |
| Source/native fix               | NOT APPLIED                                       |
| Fix verification                | Harness activation only;native fix NOT APPLICABLE |
| Typecheck/lint/build/root       | NOT RUN anew;historical baseline identified       |
| HTTP/PostgreSQL suites          | NOT RUN;guard blocked                             |
| Browser/security/exam integrity | NOT RUN;guard blocked                             |
| Functional acceptance           | INCOMPLETE                                        |
| Runtime stability               | OPEN;historical UNSTABLE                          |
| Integration/staging             | BLOCKED                                           |
| Production                      | NOT APPROVED                                      |

**DIAGNOSTIC WORKLOAD BLOCKED BY LISTENER OWNERSHIP GATE — ROOT CAUSE UNKNOWN — RUNTIME RISK OPEN.**

## 15. Final ownership canary and preservation reconciliation

A separate synthetic TCP server on an ephemeral IPv6 wildcard port was tested without API or database access. The owned child PID was 38008. IPv4-filtered, IPv6-filtered and all-protocol netstat enumeration all returned no owner for its port. The ownership assertion correctly FAILED; the server was closed through its own control channel. Evidence: observer-v3/listener-ipv6-canary.json. This rules out treating an IPv4-only query correction as a verified resolution here. The cause of socket-enumeration visibility remains unknown; no further API reproduction was attempted.

Results are therefore separate: observer unit tests 6 PASS; fake-data HTTP lifecycle/sanitizer canary PASS; socket-ownership environment canary FAIL; application suites NOT RUN. The current blocker was not bypassed.

Final source reconciliation: UI 311 baseline public files, 307 unchanged, four intended documentation files changed, zero missing, three new reports (314 current). All 65 backend baseline files are unchanged. Original repository 238/238 public files unchanged in this task scope, with HEAD/branch/index/status unchanged. UI HEAD/branch/physical index unchanged, staged delta empty. Final secret scan covers runtime records and seven documents; see the final summary JSON for exact scanned-file count. No secrets were printed.

Final process-state limitation: eight of the nine initially observed preexisting Node PIDs were still present. PID 18812 was no longer observed at the final snapshot; no exit time/code was collected for that unowned process. This task issued no termination against it. Its absence is not attributed to a native crash or to a particular development service, and continuous development uptime is not claimed.

## UI-10.3 dated addendum — 03/11/2026

**WINDOWS LISTENER OWNERSHIP VISIBILITY BLOCKED — SAFETY GATE PRESERVED.**

Initial IPv4/IPv6 returned state2; final correct PID/port rows returned state0 and were rejected.44 diagnostic tests PASS; API spawn0/application requests0. PostgreSQL15433 refused connections; Docker API denied. No elevated diagnostic retry, system security change, product/runtime fix, native capture or agent dev control.

Documented OS backend found correct canary PIDs: initial listener-class state2, final state0. Direct DWORD/structure audit confirms raw0 upstream of JavaScript parsing. No retrospective UI-10.2 parser/Windows root cause; old run-ID fix still explains activation only.

Historical text above remains byte-exact. Native cause UNKNOWN; runtime OPEN; full acceptance INCOMPLETE; integration/staging BLOCKED; production NOT APPROVED.

Evidence: C:/Users/Admin/AppData/Local/Temp/examspace-ui103-20261103-d58f2a90. [Ownership report](EXAMSPACE_UI103_LISTENER_OWNERSHIP_REPORT.md), [matrix](EXAMSPACE_UI103_OWNERSHIP_PROBE_MATRIX.md), [observer validation](EXAMSPACE_UI103_API_OBSERVER_VALIDATION.md).
