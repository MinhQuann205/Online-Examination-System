# ExamSpace UI-07.1 — Native Crash Diagnostics V2

## 1. Kết luận

**RUNTIME UNSTABLE — ROOT CAUSE UNKNOWN.** Ba lần exit lịch sử vẫn chưa đóng.
Không có source/runtime fix được áp dụng; không chứng nhận stable hoặc production.

Ngày: 02/11/2026, Asia/Saigon. Trạng thái phép đo mới: **SURVIVED trong phiên hữu hạn; KHÔNG tái hiện native exit mới**.
Nhiệm vụ này không triển khai UI-08 và chưa tải/chạy ProcDump, attach debugger hoặc thu dump.

## 2. Git, source và phạm vi

- Worktree **ExamSpace-Stitch-UI**, branch **feature/stitch-examspace-ui**.
- HEAD **a1e2891754e399aa4743e32c8218759938149bdc**; index đầu không có staged delta.
- Snapshot mới: **286 file UI** và **250 file repository Phase 3 gốc**, gồm toàn bộ
  các thay đổi UI-01–UI-07 và bản sửa theme/launcher sau UI-07.
- Đã đọc AGENTS và các báo cáo Runtime/Foundation/Admin/Teacher/Student/Startup Fix,
  đối chiếu main, Prisma lifecycle, expiry scheduler, test scripts và SQL identity guard.
- Instrumentation/runner nằm ngoài Git trong TEMP. Trong repository chỉ thêm báo cáo này.
- Không sửa app/backend, schema, năm migrations, auth, lockfile, runtime global hoặc Git config.
  Không stage/commit/push/fetch/reset/clean/stash/restore/merge/rebase/checkout.

## 3. Cross-incident timeline

Timestamps bảng dưới là **UTC**; Asia/Saigon = UTC+7. Log Nest ghi local time.

| Sự cố             | Process/start                                        | Ready theo log Nest                                  | Exit                                                                  | Điều đã biết / chưa biết                                                                                                       |
| ----------------- | ---------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Foundation, 01/11 | Wrapper PID7952, 08:30:50.862Z; actual Node PID30340 | Khoảng08:30:53Z; chưa có TCP-ready timestamp độc lập | Log có3221226505; **không có exact exit timestamp**                   | Đã phục vụ E2E. Dòng Nest có timestamp cuối08:32:23Z; không dùng nó hoặc mtime làm thời điểm crash. Không tính uptime từ mtime |
| UI-05, 01/11      | Direct Node PID31436, 09:32:46.378Z                  | Khoảng09:32:48Z                                      | 09:33:20.358Z, code3221226505, signal null; **33,980s**               | Browser fixture setup, ECONNRESET. Không có request trace/stack để xác định thao tác đang chạy                                 |
| UI-07, 01/11      | Direct Node PID24968, 17:18:18.066Z                  | Khoảng17:18:20Z                                      | 17:40:33.016Z, code3221226505, signal null; **1334,950s =22m14,950s** | Browser23 PASS/57 FAIL; first failing case F20 Admin edit/reassign. Không chứng minh endpoint này gây exit                     |

UI-05/UI-07 có report-on-fatalerror/uncaught-exception, exclude-env/network trong
launcher đã lưu, nhưng không có report giải thích native exit. Foundation launcher
là shell/pnpm; không thấy các flags đó trong launcher Foundation được lưu.

UI-07 frozen evidence: **6/6 hash khớp** manifest đã chụp ngay sau sự cố.
Đối chiếu source của cả ba snapshot cũ với bản hiện tại: **65/65 backend files khớp byte** ở từng snapshot; không thay thế bằng chứng về compiled image tại giây crash.
Các stop/rebuild web và cleanup API sau restart có record riêng. UI-05/UI-07 exit
nằm trước cleanup tương ứng; không phân loại chúng thành intentional stop.
Không có bằng chứng loại trừ tuyệt đối mọi cơ chế kết thúc từ process bên ngoài.

## 4. Facts và unknowns giữa ba sự cố

| Thuộc tính   | Evidence-supported fact                                                                                        | Unknown / giới hạn                                                                        |
| ------------ | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Exit status  | Cùng3221226505/0xC0000409                                                                                      | Chưa có OS exception record/parameters; không suy buffer overrun chỉ từ tên status        |
| Binary       | Node24.15.0 được ghi nhận trong các đợt; executable hiện tại có chữ ký Valid/OpenJS, hash khớp phép đo UI-05.1 | Không có executable hash gắn đúng giây crash của cả ba process cũ                         |
| Lifecycle    | Cả ba đã qua Nest startup và phục vụ workload                                                                  | Foundation thiếu direct child exit timestamp; không có lifecycle trace đầy đủ tại crash   |
| HTTP         | UI-05 đang setup; UI-07 first failing case là Admin F20                                                        | Không có request-start/end ở giây chết; không xác định request in flight hoặc duration    |
| Scheduler    | Source hiện hữu quét mỗi15s; Foundation/UI-07 có lỗi fixture expiry trong log                                  | UI-07 dòng expiry cuối17:33:35Z, cách exit gần7 phút; không phải stack/trace tại17:40:33Z |
| PG/Prisma    | Các đợt dùng PostgreSQL test và real workflow                                                                  | Không có query/transaction/native execution context đúng giây crash cũ                    |
| Native addon | Argon2 addon được load trong các probe UI-05.1 và phiên mới                                                    | Loaded module không phải faulting module; không có native stack cho cả ba sự cố           |
| WER/Windows  | Không thấy node/c0000409 trong phạm vi đọc mới                                                                 | WER content scan không hoàn chỉnh; không kết luận OS/AV vô can hoặc gây lỗi               |

Theo Microsoft, user-mode fast-fail dùng exception0xC0000409 và tham số đầu chỉ
reason. Exit code đơn lẻ chưa cung cấp tham số, faulting module hoặc native stack.
[Microsoft __fastfail](https://learn.microsoft.com/en-us/cpp/intrinsics/fastfail?view=msvc-170).

## 5. Runtime và Windows evidence mới

- Executable: Node **24.15.0**, Windows x64; libuv **1.51.0**; Windows build10.0.26300.0.
- SHA-256 **3331e1ffe19874215472217c5e94f5a0c6d8e18c4ac7111d3937aa0ad5e9b4a5**,
  91.694.408 bytes; Authenticode Valid, OpenJS Foundation. Không thay executable/PATH global.
- Runtime packages được đọc thực tế: Argon2 0.44.0, Prisma Client7.10.1, pg8.23.1,
  Nest core11.2.7. Đây là versions hiện có, không phải dependency upgrade trong nhiệm vụ này.
- Current API sharedObjects có **argon2/prebuilds/win32-x64/argon2.glibc.node**;
  addon SHA-256 **1f33419dfcc98e1c6ad8ad5bb22c209aedd1287b7e65bc49641775b57a32aa33**.
- Đọc read-only45 Windows process modules tại một checkpoint; không attach debugger.
  Không quan sát Prisma query-engine .node trong snapshots này. Generated Prisma dùng
  query compiler WASM/adapter-pg theo source; không vì vậy loại trừ tương tác Prisma/PG/WASM/Node.
- Application log đang enabled. Broad query từ31/10: **946 events, 0 node/c0000409**;
  query riêng IDs1000/1001/1002:0 events. Ghi thời điểm kết thúc và limit trong evidence.
- Defender Operational: **69 events, 0 node/c0000409** trong scope đã đọc.
- WER Archive/Queue: **81 directories**, đọc được1 report, **80 access errors**,0 node report
  trong phần đọc được. **CONTENT SCAN INCOMPLETE**, không đổi ACL/take ownership.
- Existing CrashDumps metadata:0 file node*.dmp; không đọc dumps của ứng dụng khác.
- Read-only WER settings: không thấy giá trị Disabled tường minh ở hai keys đã kiểm,
  không có LocalDumps/node.exe. Điều này không chứng minh mọi WER policy/service đều đang hoạt động.

**Faulting module/offset: UNKNOWN. Native exception parameters/stack: NOT AVAILABLE.**

## 6. Observer test-only

Observer dùng HTTP diagnostics channel và process lifecycle/resource APIs của Node.
[Node diagnostics_channel](https://nodejs.org/docs/latest-v24.x/api/diagnostics_channel.html),
[Node process](https://nodejs.org/docs/latest-v24.x/api/process.html).

- Ghi PID/PPID, absolute binary/hash/version/args, start/TCP-listen/exit, code/signal,
  intentional-stop record trước khi dừng đúng child handle.
- HTTP method, allowlisted route pattern, start/end/status/duration và active count.
  Bỏ toàn bộ query; mọi segment ngoài allowlist thành:id. Không đọc request body,
  Authorization/Cookie hoặc user identity để ghi observer.
- Memory RSS/heap/external/arrayBuffers, CPU/resourceUsage và active HTTP/background mỗi10s.
- Hook TEMP vào expireDueAttempts ghi start/end/duration/outcome; gọi đúng method với
  nguyên args và trả **chính original Promise**. Không đổi timer15s/deadline/score/transaction.
- PG metadata mỗi15s: pid, state, wait-event và timestamps, chỉ test database;
  không query text, parameters hoặc row content. Guard identity chạy trước queries.
- Chỉ uncaughtExceptionMonitor, không catch-all/uncaughtException handler để nuốt lỗi.
  Không auto-restart. Worker stdout lưu TAP titles/counts; bỏ payload diagnostics của TAP.
  API logs được redaction; không ghi secrets, emails hoặc UUID thực vào observer route logs.
- Riêng API test chặn dotenv đọc .env worktree và dùng env test tường minh từ memory;
  không copy cấu hình development vào subject. JWT secrets random riêng từng API process.

Observer có overhead/timing effect và scheduler hook đổi thứ tự module load trong probe.
Cold run không có HTTP/resource/scheduler observer, nhưng vẫn có env-isolation preload và
Node report flags. Không gọi nó là process hoàn toàn không instrumentation.
IPC record đã nhận được ghi ngay ở parent; crash vẫn có thể làm mất events chưa chuyển xong.

## 7. Controlled reproduction mới

API4010, web3010; TCP-ready kiểm độc lập. PostgreSQL test15433 được xác minh
current_database/system identifier khác development, đủ5 migrations; không fallback API4000.
Next production bundle được kiểm chỉ trỏ API4010 trước browser workload.

| Run                | Phạm vi                                                                                                           | Kết quả                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Cold, PID2452      | Process mới, không external HTTP, giữ30s sau TCP-ready; scheduler/PG vẫn hoạt động                                | SURVIVED; uptime 31.988s; intentional SIGTERM                  |
| Extended, PID33472 | Cùng một direct child, full HTTP54 → browser81 → periodic auth/reads theo3 role; mục tiêu28 phút từ process start | SURVIVED; uptime 1680.325s; không restart; intentional SIGTERM |
| Aged Admin         | Một lần chạy nguyên tests/ui-admin.test.cjs khi cùng API đủ22m30s, kiểm quản lý trên process đã sống lâu          | PASS10/10,0 fail/skip; start ở tuổi API1350.026s; exit0        |

Run IDs, exact commands/file lists, args và binary hash lưu trong từng start/suite-plan/result.
Không filter/skip test trong hai scripts đầy đủ. Aged Admin là chạy lặp10 ca đã có;
không cộng thêm vào unique test count. Không restart API trong các run này.

Mốc extended: start **2026-11-02T02:58:21.980Z**, TCP-ready **02:58:23.847Z**;
kết thúc có chủ đích **2026-11-02T03:26:22.305Z**, code **null**, signal **SIGTERM**. Không phải graceful app.close hoặc native crash. Aged Admin start 2026-11-02T03:20:52.006Z, end 2026-11-02T03:21:35.883Z.

## 8. Active requests, scheduler và resources mới

- HTTP: **4999 starts / 4999 ends**, active tại stop **0**. Routes không query/UUID thực.
- Scheduler: **111 scans hoàn thành**, outer promise rejected **0**, active tại stop **0**. Service có catch từng row, nên outer resolved không có nghĩa mọi row đều thành công. Fault-injection fixture errors được giữ riêng, không coi là native exit.
- Resource samples: **168**; RSS **54.0–325.3 MiB**, heapUsed **6.1–108.6 MiB**, RSS mẫu cuối **260.1 MiB**. Có startup và workload peaks; không suy leak/no-leak.
- PG: **113 samples**, tối đa **20 connections** ngoài controller trong snapshot; sau stop còn **0**. Không SQL text/row data.
- Observer events **10395**, sequence gaps **0** trong stream đã nhận; uncaught monitor events **0**, Node fatal reports **0**. Không có native stack/module fault mới.
- Periodic auth/reads/refresh/logout: **10 chu kỳ** ba role hoàn thành, cách nhau khoảng120s; không stress vô hạn.

Các chỉ số mô tả đúng những mẫu đã thu; không phải load/soak/leak certification.
Không có căn cứ dùng RSS ổn định hoặc một phiên không crash để loại trừ memory corruption,
race, Windows/runtime hoặc addon failure ngẫu nhiên. PG samples không ánh xạ chắc chắn
một backend PID tới một HTTP request cụ thể.

## 9. Root cause / fix policy

**ROOT CAUSE UNKNOWN. Không source fix.**

- Không có new failing native case/exception stack để phân biệt Node/libuv/Argon2/Prisma/PG/OS.
- Không nâng packages, đổi Node global, thêm retry vô hạn, tắt scheduler hoặc sửa auth/grading.
- Không coi expiry fault-injection logs là native crash stack. Native exits cũ vẫn có giá trị
  dù tests và bounded run mới đạt. Không sửa kết luận lịch sử để biến UNSTABLE thành FIXED.
- Đề nghị native exception capture để có reason/thread stack/module+offset; cần permission riêng.

## 10. Quality gates thực tế

| Gate                       | Kết quả mới                                                   |
| -------------------------- | ------------------------------------------------------------- |
| Typecheck                  | PASS shared/API/web                                           |
| Lint                       | PASS                                                          |
| Build                      | PASS shared/Nest/Next; API4010 được set tại build             |
| Root test                  | PASS81: tooling17 + Jest47/14 suites + frontend17             |
| HTTP/PostgreSQL/migration  | PASS54 trong cùng extended API                                |
| Browser                    | PASS81 trong cùng extended API                                |
| Aged Admin                 | PASS10/10,0 skipped; chạy lặp, không cộng vào tổng unique     |
| Format/Git/source/security | PASS format/diff/source/security; hậu kiểm cuối lưu ngoài Git |

**216 unique tests mới PASS** trong ba scripts đầy đủ; không cộng cold probe,
periodic requests, aged rerun, tests215 UI-07 lịch sử hoặc216 của đợt sửa theme trước.
Baseline UI-07 có browser80; bản hiện tại có thêm UI19 theme, nên browser81 là đúng package.json.
Không đo coverage mới hoặc tuyên bố CI/production/WCAG đạt threshold.

## 11. Permission gate cho process-scoped native dump — CHƯA THỰC THI

Đề xuất cho phiên tiếp theo, **chỉ sau phê duyệt riêng**:

1. Dùng official Microsoft ProcDump x64; chỉ download sau approval, xác minh chữ ký Microsoft
   và ghi version/hash. Không chạy installer postmortem hoặc cài WER system-wide.
2. Start mới API4010 với test-only secrets/PG identity guard và env-file isolation.
   Xác minh đúng PID+start time+binary; chỉ attach process đó.
3. Một **mini dump** cho unhandled exception, không full dump mặc định:

```text
procdump64.exe -mm -e -n 1 <VERIFIED_API_TEST_PID> <APPROVED_PRIVATE_DIRECTORY>
```

4. Monitoring tối đa30 phút hoặc một dump, tùy mốc nào đến trước. Nếu không có exception,
   dừng capture ở deadline; không retry vô hạn, không tăng thành first-chance/full dump tự động.
5. Không đổi registry, Defender, security hoặc ACL. Không dùng -i/-ma/-wer/-w theo image name
   để bắt nhầm Node khác. Không attach API4000, Next3000 hoặc process cá nhân.
6. Vùng lưu đề xuất: thư mục riêng **ExamSpaceDiagnostics/<runId>** tại một parent ngoài
   repository/cloud, do người dùng xác nhận trước. Mục tiêu quyền đọc/ghi:
   current user, SYSTEM và Administrators; không chia sẻ cho tài khoản/nhóm khác.
7. **Read-only ACL check thực tế:** LOCALAPPDATA/Documents/TEMP hiện có quyền đọc kế thừa
   cho nhóm sandbox, ngoài ba principal trên. Chưa có private destination đáp ứng mục tiêu.
   Cần người dùng cung cấp parent đã có quyền phù hợp hoặc phê duyệt rõ bộ quyền hiện hữu;
   agent không tự loại ACE/đổi ACL. Chưa tạo dump directory.
8. Đề xuất retention **tối đa7 ngày từ capture**, người phụ trách xóa tại hạn theo approval;
   không lập scheduled task/system cleanup. Chỉ phân tích local; không upload dump lên
   GitHub/ChatGPT/dịch vụ ngoài, không commit hoặc đưa vào báo cáo public.

Mini dump vẫn có thể chứa referenced stack memory, test JWT/PG credentials và dữ liệu
fixture; flags exclude-env của Node report không làm mini dump trở thành vô hại.
Cần exception code+parameters, native thread stack, module+offset và module versions.
[Microsoft ProcDump](https://learn.microsoft.com/en-us/sysinternals/downloads/procdump).

## 12. UI-08 và rủi ro còn lại

**Chưa đủ điều kiện đóng runtime gate để nghiệm thu UI-08 hoặc production.** Một phiên
28 phút hữu hạn không chứng minh đã sửa nondeterministic native failure. UI-08 test-only
chỉ nên mở sau khi người dùng chấp nhận rõ trạng thái UNSTABLE, giữ observer/test isolation
và queue/revision/deadline/snapshot/server grading/policy; không tự triển khai ở nhiệm vụ này.

HTTPS/Secure-cookie/proxy/cross-site, refresh đa process/SSR, scheduler multi-instance,
throughput và screen reader/WCAG vẫn là gates độc lập.

## 13. Preservation, cleanup và evidence

**UI286/286 file baseline giữ nguyên byte, original250/250 giữ nguyên; không mất file.** Chỉ thêm báo cáo V2 này. HEAD/branch/index contents giữ nguyên; physical index checkpoint không đổi. Backend65/65, schema/năm migrations đúng bytes HEAD; .env hai worktrees và bốn compiled API files tại checkpoint giữ nguyên hash.

Cleanup: dừng đúng API4010/web3010 theo child handles và record intentional trước stop; aged/periodic workers đã exit0. Test PG identity/five migrations xác minh lại, connections ngoài controller bằng0. Test container trở lại stopped; development container/API4000/web Stitch3000 giữ chạy. Không kết nối SQL development, reset/drop/seed development hoặc xóa database/volume/evidence. Container/process final states và source checks được lưu trong final-safety.json.

Evidence ngoài Git: **%TEMP%/examspace-native-v2-6ca1a0e5** gồm before/env/index checkpoints,
source hashes, documents read, cross-incident facts và verified frozen hashes, Windows/WER
scope, binary/components metadata, observer/runner, cold/extended/aged results, HTTP/background/
resource/PG events, suite plans/TAP summaries và final checks. Không lưu native dumps.
Các evidence Foundation/UI-05/UI-07 vẫn ở nguyên chỗ; không ghi đè hoặc xóa chúng.

**Trạng thái cuối: RUNTIME UNSTABLE — ROOT CAUSE UNKNOWN.**
Dừng tại permission gate cho native capture nếu dữ liệu mới không xác định được nguyên nhân.
