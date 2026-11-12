# ExamSpace UI-05.1 — Windows API Runtime Stability Investigation

## 1. Executive summary

**NOT REPRODUCED — ROOT CAUSE UNKNOWN.**

Hai lần exit `3221226505 / 0xC0000409` trong foundation/UI-05 vẫn là sự cố có bằng chứng. Nhiệm vụ này chưa tái hiện được cùng exit code và chưa xác định faulting module. **Không có bản sửa application/runtime được áp dụng; không kết luận ROOT CAUSE FIXED hoặc production stable.**

- Ngày điều tra: **01/11/2026, Asia/Saigon**.
- Node global: **24.15.0**, Windows x64; libuv **1.51.0**.
- Ma trận Node global: **18/18 lượt SURVIVED**, không có native exit mới.
- Đối chiếu Node **24.16.0 portable**: **16/18 SURVIVED**, **2 cold-start TIMEOUT 15 giây**, không có native exit mới. Hai timeout không được đổi thành PASS sau các lượt warm start.
- TCP tối giản: **3 lượt mỗi Node**, 256 connections/lượt, concurrency 8; cả 6 process exit 0. Đây không phải phép chứng minh một phiên bản đã sửa lỗi của ExamSpace.
- Lượt API liên tục có observer: HTTP/PostgreSQL **44/44**, browser **62/62**; root tests mới **81/81**. Tổng **187 tests mới PASS**, không cộng các lượt controlled/TCP hoặc baseline UI-05 lịch sử vào số này.
- Khuyến nghị: **chưa chốt runtime gate để bắt đầu UI-06 theo kế hoạch nghiệm thu**. Cần native exception record/stack hoặc repro trước–sau có khả năng phân biệt nguyên nhân. Không tự nâng packages hoặc sửa business logic để đoán lỗi.

## 2. Git, worktree và dữ liệu

| Thuộc tính                | Kết quả                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| Worktree triển khai       | `C:\Môn Học\ThucTapNgheNghiep\ExamSpace-Stitch-UI`                                                     |
| Branch                    | `feature/stitch-examspace-ui`                                                                          |
| HEAD/baseline             | `a1e2891754e399aa4743e32c8218759938149bdc`                                                             |
| UI baseline               | **259/259 file giữ nguyên byte**, chỉ thêm báo cáo này                                                 |
| Repository Phase 3 gốc    | **250/250 file giữ nguyên byte**; HEAD/branch/index/status không đổi                                   |
| UI source/index           | Giữ toàn bộ UI-01–UI-05 chưa commit; không stage, index giữ baseline                                   |
| Backend                   | **65 tracked files dưới apps/api khớp byte HEAD**, gồm schema và năm migrations                        |
| Dependency/runtime config | Không sửa package manifests, lockfile, global Node/PATH, Git config hoặc Windows registry/security/ACL |

Cwd mặc định khác worktree UI; mọi lệnh dự án dùng workdir đã xác minh. Đã đọc AGENTS, foundation/Admin reports, manifests, main/Auth/Prisma lifecycle, scheduler, test harness và database guards. Không reset/clean/stash/restore/rebase/merge/commit/push hoặc chuyển branch.

Database fixture duy nhất: **127.0.0.1:15433/online_exam_phase3_test**, container `examspace-phase3-restore-20261030-115026`. Guard kiểm host/port/name và PostgreSQL cluster identity SQL khác development trước mọi query/fixtures; đủ **5 migrations** trước/sau. Không kết nối SQL development, không lấy credentials development để start process; `.env` gốc chỉ được hash trong baseline bảo toàn, không copy vào worktree.

Fixtures có suffix/password random, bootstrap Admin chỉ trong test DB, rồi xác minh API login trả đúng actor trước các mutation khác. JWT secrets mới riêng mỗi lượt process, chỉ trong memory/env. Migration preservation trong HTTP suite tạo database prefix test mới trên server test, dùng SQL hiện hữu; giữ DB/evidence, không reset/drop/restore đè hoặc xóa volume. Không chạy migration development.

Cleanup cuối: dừng các process API/web do harness tạo; test container trở lại **stopped** như đầu nhiệm vụ; development vốn chạy vẫn chạy. Không dừng container dự án khác. Test data/databases/volumes và portable/evidence được giữ lại.

## 3. Exit code và bằng chứng Windows/process

`3221226505` là `0xC0000409`. Microsoft mô tả mã này được dùng cho user-mode fast-fail; tham số đầu của exception mới chỉ ra fast-fail reason. **Chỉ exit status chưa đủ chứng minh buffer overrun, call stack hoặc thành phần gây lỗi**; cũng chưa có OS exception record để loại trừ mọi cơ chế kết thúc khác. Không dùng tên status để quy lỗi Prisma/Argon2/Nest. [Microsoft __fastfail](https://learn.microsoft.com/en-us/cpp/intrinsics/fastfail?view=msvc-170).

Đã kiểm Node global hiện tại:

- Executable: `C:\Program Files\nodejs\node.exe`, 91.694.408 bytes.
- Version: `24.15.0`; x64; Windows build được .NET báo `10.0.26300.0`.
- SHA-256: `3331e1ffe19874215472217c5e94f5a0c6d8e18c4ac7111d3937aa0ad5e9b4a5`.
- Authenticode **Valid**, signer OpenJS Foundation. Không thay global executable.
- Hash/chữ ký này được đo trong nhiệm vụ hiện tại; không giả thành hash executable đã chụp tại giây crash lịch sử.

### OS diagnostics

- Đọc Application Event Log từ 31/10 đến thời điểm query: **600 events**, **0 matching node.exe/c0000409**. Giữ thời gian/phạm vi query ở evidence.
- Defender Operational: **41 events**, **0 matching node.exe**. Không có bằng chứng để quy antivirus là nguyên nhân; không tắt bảo vệ.
- WER ReportArchive liệt kê được **81 directories**, không có tên node; ReportQueue **0 entries**. Đọc sâu một số system-owned report directories bị **Access denied**, nên content scan **INCOMPLETE**. Không đổi ACL/take ownership để đọc.
- Thư mục CrashDumps hiện có 10 entries, không có entry tên node; không đọc hoặc công bố dumps của ứng dụng khác.
- Hai evidence folders cũ còn tồn tại. Không tìm thấy Node diagnostic report giải thích hai native exits. Node report flags không bảo đảm bắt được mọi native fail-fast.

Không có exception parameters, fault offset, native stack hoặc WER faulting-module record cho hai sự cố. **Faulting module: UNKNOWN.**

## 4. Timeline lịch sử

| Sự cố             | Process/start                                                                                               | Listen/workload                                                     | Exit và giới hạn                                                                                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| UI foundation     | Wrapper PID7952, start **08:30:50.862Z**; stdout Nest ghi actual API Node PID30340, startup khoảng08:30:53Z | Đã phục vụ HTTP và tham gia E2E; last timestamped API line08:32:23Z | api.log có `Exit status 3221226505`; thiếu direct child exit timestamp. Không dùng mtime hoặc wrapper PID làm thời điểm/PID crash chính xác. Restart record08:50:19.779Z |
| UI-05             | Direct Node PID31436, start **09:32:46.378Z**; command `node [report flags] dist/main.js`, cwd apps/api     | Nest ready log09:32:48Z; browser đang bootstrap fixtures            | Exit **09:33:20.358Z**, code3221226505, signal null; lifespan **33,980 giây**. Browser setup ECONNRESET, 0/10 thành công                                                 |
| UI-05 sau restart | Direct Node PID31864 theo process record cũ                                                                 | Hoàn thành quality/HTTP/browser suites                              | Cleanup lúc10:00:51Z ghi không có exit trước cleanup; lần dừng cuối là có chủ đích. Không chứng minh sự cố trước đã được sửa                                             |

Tất cả thời gian trong bảng là UTC; Asia/Saigon = UTC+7. Foundation có shell/pnpm parent nên wrapper PID khác actual Node PID. UI-05 dùng direct child nên PID/exit record rõ hơn.

**Requests/queries tại đúng thời điểm hai crash cũ: chưa biết.** Evidence UI-05 chỉ xác định phase fixture setup; không có request-start/finish trace để khẳng định endpoint nào đang chạy. Foundation chết trong một đợt E2E, nhưng không biết tại giây chết đang active HTTP, scheduler query hay idle. Hai API đều đã qua startup; không có bằng chứng chúng chết trong intentional shutdown.

## 5. Controlled reproduction matrix

Mỗi nhóm chạy **3 lượt**, process mới, test secrets mới, startup deadline15s, worker deadline90s; không vô hạn retry/restart. API4010; browser cần web3010 và bundle được kiểm đúng API4010, không fallback4000. Subject binary được gọi bằng absolute path.

| Nhóm | Phép thử                                                                                             | Node24.15.0  | Portable24.16.0         | Native exit mới |
| ---- | ---------------------------------------------------------------------------------------------------- | ------------ | ----------------------- | --------------- |
| A    | Cold start, không gửi HTTP, giữ20s                                                                   | 3/3 SURVIVED | 1/3 SURVIVED; 2 TIMEOUT | 0               |
| B    | Bootstrap/login thật, auth/me, dashboard, list an toàn, unauthenticated401                           | 3/3 SURVIVED | 3/3 SURVIVED            | 0               |
| C    | Ba chuỗi login → refresh → stale replay401 → logout → old-access401 mỗi lượt                         | 3/3 SURVIVED | 3/3 SURVIVED            | 0               |
| D    | Fixtures qua API, version/assignment/start/save/submit/results; SQL score2.50/max6.75 và outsider403 | 3/3 SURVIVED | 3/3 SURVIVED            | 0               |
| E    | API + Next + Edge mới; UI login Admin → Users → generic logout                                       | 3/3 SURVIVED | 3/3 SURVIVED            | 0               |
| F    | Startup/auth; controlled app.close qua IPC observer; natural exit0 và kiểm DB connections            | 3/3 SURVIVED | 3/3 SURVIVED            | 0               |

Cold start A nghĩa là **không có external HTTP**. Scheduler15s/Prisma/PostgreSQL vẫn hoạt động theo source hiện hữu; không coi đây là thử nghiệm không có database activity.

Portable A1/A2: hết15s mà chưa có stdout/API ready, API chưa bị quan sát thoát; harness chấm TIMEOUT rồi chủ động terminate. **Không có code0xC0000409**. Chưa đủ chứng cứ về nguyên nhân startup delay; không quy cho Defender/AV hoặc tăng timeout để làm xanh. A3 và các lượt sau đạt không đổi kết quả A1/A2.

### Observer và phân loại kết thúc

- Lượt1 A–E không preload; lượt2/3 có HTTP diagnostics observer. F có observer ở cả3. Vì vậy có cả uninstrumented và instrumented runs; observer có thể thay đổi timing.
- Observer dùng built-in diagnostics channels đã kiểm trong runtime để ghi method, path bỏ query/UUID, status, timestamp và active requests; **không body, cookies, tokens hoặc passwords**. [Node diagnostics channels](https://nodejs.org/docs/latest-v24.x/api/diagnostics_channel.html).
- Ghi PID, executable/version, args, start/listen/exit time, signal, intentional flag, loaded native object paths, probe stage và pg_stat_activity metadata. Không ghi SQL text/dữ liệu từng hàng.
- A–E kết thúc bằng controlled SIGTERM/TerminateProcess của **đúng child handle**. Exit `code:null, signal:SIGTERM` là intentional termination; không đổi thành crash hoặc graceful exit0.
- F dùng TEMP preload giữ reference Nest app và gọi app.close khi nhận IPC. Không thêm endpoint hoặc sửa source main. Đây là kiểm module lifecycle có instrumentation, **không phải chứng minh production Ctrl+C/SIGTERM tự gọi app.close**.

### Extended profile trên Node24.15.0

Một API direct child giữ xuyên suốt HTTP44 và browser62, có HTTP/process observer; giới hạn HTTP150s, browser480s. Đây là nguyên subcommands/file lists của scripts integration/E2E hiện tại, gọi trực tiếp bằng `node --test --test-concurrency=1`, không filter/skip/only hoặc mock success.

API PID **34184**, start **2026-11-01T11:50:22.250Z**, listen confirmed **2026-11-01T11:50:23.765Z**, intentional stop **2026-11-01T11:56:42.741Z**; lifespan **380.491 giây**. Ghi **2715 request-start events**, active request list khi API dừng: **0**. HTTP44/browser62 exit0; API không có unexpected exit, cuối cùng được harness SIGTERM có chủ đích. DB connections sau stop:0.

### TCP-only differential

Chỉ `node:net` và assert, ephemeral loopback port; không Nest/Prisma/Argon2/PostgreSQL. Mỗi process256 connections, concurrency8, bật keepalive hai phía; timeout20s. Cả3 process Node24.15 và3 process24.16 exit0,1536 connections tổng cộng. **NOT REPRODUCED**, không phải bằng chứng trước–sau fix.

## 6. Faulting module và native components

Không có module gây lỗi đã xác minh. Node diagnostic sharedObjects trong các lượt instrumented cho thấy addon `argon2/prebuilds/win32-x64/argon2.glibc.node` đã load. **Loaded module không đồng nghĩa faulting module.** Cả hai Node chạy được auth/hash/verify; chưa có phép thử nào tái hiện lỗi tại binding này.

Prisma generated client hiện dùng query compiler PostgreSQL **WASM** và adapter-pg; không quan sát thấy Prisma native query-engine `.node` trong sharedObjects thu được. Không vì vậy loại trừ lỗi Prisma/PG/WASM/Node interaction; chỉ loại cách giải thích dựa trên một native engine chưa thấy được load.

Node24.16 portable lấy từ nodejs.org, archive SHA-256 khớp SHASUMS256 chính thức, executable Authenticode Valid/OpenJS. Archive SHA-256: `edaca9bd58ec8e92037dac4e877d52f6b8f430b81c18b57e264b4e2fb111cd56`. Chỉ giải nén TEMP và gọi absolute executable; không installer/global PATH hoặc package upgrades.

## 7. Giả thuyết và kết quả

| Giả thuyết                  | Bằng chứng / kết luận giới hạn                                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Native Windows/Node failure | Hai high-bit exits lịch sử phù hợp loại lỗi này; thiếu OS exception record/stack nên chưa xác định cơ chế hoặc faulting module                                                 |
| Node24.15 incompatibility   | Node24.15 hoàn thành18 controlled runs và extended profile; TCP chưa tái hiện. Không loại trừ nondeterministic bug                                                             |
| Argon2 addon                | Đã load và được dùng qua real auth/create/hash; không có crash stack/probe failure chỉ vào addon. Chưa xác nhận hoặc loại trừ hoàn toàn                                        |
| Prisma/PG/WASM              | Real DB/integration/lifecycle hoàn thành; sau app.close không còn connections mới quan sát được. Không có native engine trace làm bằng chứng quy lỗi                           |
| Harness tự kill API         | UI-05 native exit xảy ra trước cleanup theo exit timestamp; controlled termination ghi riêng. Các lỗi TEMP harness mới được tách riêng, không giải thích thay cho exit lịch sử |
| Startup/shutdown lifecycle  | Main đã listen trong hai sự cố cũ; cold/auth/app.close probes chưa tái hiện. Main không bật enableShutdownHooks; không coi forced termination là graceful disconnect           |
| Connection/resource cleanup | F và activity sampling không thấy backend connection còn lại sau close. Không phải soak/load/leak test dài hạn hoặc loại trừ mọi race                                          |
| Antivirus/OS interference   | Event Log/Defender không có node evidence; WER content access bị giới hạn. Không đủ căn cứ xác nhận hoặc loại trừ                                                              |
| Sai env/port                | Subject được pin4010/3010/test cluster và bundle check. Lỗi build fallback4000 ở UI-05 là sự cố khác, không dùng giải thích native exit                                        |

### Giả thuyết libuv đã kiểm và không được dùng làm “fix”

Nguồn libuv có [bản sửa OSVERSIONINFOW aabb7651de](https://github.com/libuv/libuv/commit/aabb7651de), được [Node24.16.0 nhận vào](https://nodejs.org/en/blog/release/v24.16.0). Tuy nhiên [tcp.c tag24.15.0](https://raw.githubusercontent.com/nodejs/node/v24.15.0/deps/uv/src/win/tcp.c) không có hàm OSVERSIONINFOW đó; [tag24.16.0](https://raw.githubusercontent.com/nodejs/node/v24.16.0/deps/uv/src/win/tcp.c) có phần khởi tạo đã sửa. Không được suy từ một issue Windows gần giống thành root cause của binary24.15 đang dùng. Portable tests ở đây là comparison, **không phải một bản sửa được chứng minh cho ExamSpace**.

## 8. Root cause và bằng chứng còn thiếu

**Root cause: UNKNOWN.** Không có fresh failing native case để gắn endpoint/stack vào nguyên nhân và không có same-condition before-fail/after-pass differential. Các kết quả thành công hữu hạn không giải quyết hai sự cố lịch sử.

Còn thiếu: native exception code/parameters từ OS, thread stack tại fault, module+offset, loaded-module versions tại giây chết và current request/background-query context. Với dữ liệu hiện tại không có cơ sở sửa Auth/CSRF/RBAC/Prisma/Argon2/grading/scheduler hoặc nâng hàng loạt packages.

## 9. Source fixes và các lỗi harness

**Không sửa source ứng dụng, dependency, lockfile hoặc business logic. Chỉ thêm báo cáo này vào worktree.** Diagnostics/probes nằm ngoài Git trong evidence TEMP. Hai báo cáo foundation/Admin giữ byte lịch sử, không đổi UNSTABLE thành FIXED.

Trong chuẩn bị phép thử đã sửa riêng TEMP harness:

1. PowerShell/Node quoting và BOM JSON parsing bị syntax/parse errors; sửa trước khi dùng kết quả. Không phải lỗi API.
2. Ready log của Nest xuất hiện trong init trước bind hoàn tất; single TCP assertion đôi khi kiểm quá sớm. Đổi sang chờ **TCP listen thực** trong cùng15s, không tăng timeout.
3. Logout locator phải là “Đồng ý đăng xuất”; ca đầu timeout vì locator sai, không phải API exit.
4. Unref trên sleep cleanup làm parent harness có thể tự exit0 khi hết handles trước khi ghi summary. Giữ sleep có ref, chỉ unref timeout race; ghi start/exit tức thì từng process để không mất evidence. Không tái hiện code3221226505 bằng lỗi harness này.

Các lượt chuẩn bị/partial/failed được giữ nguyên, không tính vào ma trận qualified hoặc187 tests. Không silently skip hoặc chuyển FAIL thành PASS.

## 10. Verification gates mới

| Gate                    | Kết quả hiện tại                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------ |
| Typecheck               | PASS shared/API/web                                                                  |
| Lint                    | PASS                                                                                 |
| Build                   | PASS shared/Nest/Next; env test4010 ngay lúc build                                   |
| Root tests              | PASS81: tooling17 + Jest47/14 suites + frontend17                                    |
| HTTP/PostgreSQL         | PASS44 trong extended profile                                                        |
| Browser E2E             | PASS62 trong extended profile                                                        |
| Format check            | PASS toàn worktree                                                                   |
| Git diff/index/security | PASS diff/index checks; report secret scan0; UI259/259 và original250/250 giữ nguyên |

Đây là **187 tests của nhiệm vụ hiện tại**. Jest47 gồm45 unit +2 PostgreSQL service tests; frontend17 gồm9 autosave +8 session/API. Không đo coverage mới. Không cộng36 controlled runs,6 TCP processes, fixtures, reruns hoặc187 UI-05 lịch sử vào số tests mới.

Regression thật giữ Auth/Users/Classes/Questions/Exams/Assignments/Attempts/Results, JWT/cookies/CSRF/RBAC/ownership/roster scope, refresh rotation/tokenVersion, pinned version/metadata, autosave revision409/flush, deadline/scheduler, grading/policy; Homepage/Login/Logout/session/cache/cross-tab và Admin UI. Main E2E vẫn kiểm SQL6.75/6.75. HTTP/browser không mock success.

## 11. Controlled restart và connection lifecycle

F có3 lượt trên mỗi runtime: app.close hoàn thành, API natural exit0; worker/browser đóng trước API, pg_stat_activity được chụp trước/sau. Không thấy API/test-worker connections mới còn lại sau cleanup ở các lượt đã chụp. Controller pool được exclude khỏi activity snapshots và đóng cuối run.

A–E chỉ chứng minh process sống qua workload rồi được harness dừng; không dùng SIGTERM Windows để tuyên bố OnModuleDestroy đã thực thi. Không auto-restart production, không nuốt exception, không đổi scheduler hoặc thêm shutdown hooks khi chưa có causal evidence.

## 12. Residual risks và đề xuất diagnostics tiếp theo

- Native failure lịch sử còn chưa đóng; chưa có faulting module/stack. Hai portable cold-start timeouts cũng chưa được giải thích.
- Observer/IPC và số lượt hữu hạn có thể thay đổi timing; không chứng nhận soak/production/multi-instance/HTTPS hoặc mọi concurrency.
- WER chỉ đọc được metadata/phần có quyền; không khẳng định content scan hoàn chỉnh hoặc antivirus vô can.
- Không tự đổi Node global, project engine range hoặc lockfile dựa trên comparison không có failing-before case.

### Đề xuất, chưa thực thi: process-scoped native capture

Nếu tiếp tục điều tra, cần người dùng phê duyệt một phiên debug **test-only** và vùng lưu riêng có ACL hạn chế. Có thể attach ProcDump vào **đúng PID API test hiện tại**, chỉ một mini dump cho unhandled exception:

```text
procdump64.exe -mm -e -n 1 <API_TEST_PID> <PRIVATE_DUMP_DIRECTORY>
```

Không dùng postmortem install `-i`, registry/system-wide dump hoặc full-memory mặc định. Mini dump vẫn có thể chứa stack/referenced memory, credentials/tokens; giữ ngoài repository/cloud, chỉ người phụ trách/SYSTEM/Admin được đọc, chốt retention và xóa theo quyết định riêng. Thu native stack, exception parameters và faulting module/offset tại crash để xác nhận hypothesis. **Chưa download/run ProcDump, chưa attach debugger, chưa thu/upload/commit dump** trong nhiệm vụ này. [Microsoft ProcDump](https://learn.microsoft.com/en-us/sysinternals/downloads/procdump).

## 13. Có nên bắt đầu UI-06?

**Chưa khuyến nghị coi runtime gate đã đạt để chuyển UI-06.** Source UI-01–UI-05 và functional regressions được bảo toàn, nhưng không có chứng cứ native fault đã được sửa. Có thể review source/thiết kế riêng; việc mở đợt implementation/nghiệm thu mới cần ghi rõ unresolved runtime hoặc có investigation tiếp theo được duyệt. Không tự triển khai Teacher UI trong nhiệm vụ này.

Trạng thái cuối duy nhất: **NOT REPRODUCED — ROOT CAUSE UNKNOWN**. Không phải FIXED AND VERIFIED hoặc phê duyệt production.

## 14. Evidence và cách chạy lại an toàn

Evidence hiện tại:

```text
%TEMP%\examspace-runtime-a51eb861
```

Gồm before.json, forensic-timeline.json, Node/global/portable signatures+hashes, Application/Defender/WER query scope, primary-research.json, matrix-qualified-results.json, matrix-portable-results.json, matrix-extended-results.json, từng run/start/exit/stdout/stderr/HTTP events, TCP results, quality gate logs, source preservation và cleanup. Folder cũ UI-05/foundation vẫn giữ nguyên. Không giả định TEMP được giữ mãi; trước tái hiện phải kiểm file tồn tại và cấp lại config test riêng nếu thiếu.

Repro harness nằm trong TEMP, không phải script production hoặc regression source mới. `matrix.cjs` xác minh test identity trước fixtures, sinh JWT secrets trong process và kiểm port chưa bị chiếm. API executable/version và mọi intentional stops được ghi riêng; không đọc development config để khởi chạy.

Ví dụ chạy lại các phép thử hiện đã lưu, **sau khi xác minh đúng test server và private test configuration còn tồn tại**:

```powershell
Set-Location 'C:\Môn Học\ThucTapNgheNghiep\ExamSpace-Stitch-UI'
$runtimeEvidence = Join-Path $env:TEMP 'examspace-runtime-a51eb861'
$env:RUNTIME_RUN_TAG = '-new-' + [guid]::NewGuid().ToString('N').Substring(0,8)
$env:RUNTIME_NODE_EXE = 'C:\Program Files\nodejs\node.exe'
node (Join-Path $runtimeEvidence 'matrix.cjs') all
# Hoặc extended: HTTP44 + browser62, có startup/worker deadlines riêng.
```

Config riêng hiện được harness đọc từ `%TEMP%\examspace-ui-foundation\test-env.json`; file có test URL/secrets cũ phải giữ private, không in nội dung vào terminal/chat. JWT của API subject được override mới mỗi lượt. Nếu file mất, tái tạo test configuration từ môi trường test đã xác minh; không thay bằng .env development. Ghi run tag mới, không ghi đè evidence cũ; snapshot source/Git và container states lại trước chạy. Browser cần Edge, build API/Nest/shared và Next đã nhận API test URL; port4010/3010 phải trống.

Node portable ở `portable-node/node-v24.16.0-win-x64/node.exe`; chỉ dùng absolute path sau kiểm signature/checksum, không đổi PATH global. TCP probe `tcp-only.cjs` không dùng DB; `tcp-runner.cjs` ghi kết quả6 bounded processes.

Sau chạy, đóng đúng child processes, kiểm PG identity/connections, đưa test container về trạng thái ban đầu và giữ dữ liệu/volume/evidence. Không chạy migrate/reset/db push hoặc seed trên development.
