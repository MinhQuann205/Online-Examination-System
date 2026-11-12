# ExamSpace UI-07.2 — Permission-Gated Native Crash Capture

## 1. Trạng thái

**NOT REPRODUCED · ROOT CAUSE UNKNOWN · RUNTIME UNSTABLE.**
Ngày thực hiện:02/11/2026, Asia/Saigon. Không triển khai UI-08; không xác nhận FIXED hoặc production stable.

## 2. Phê duyệt và vùng lưu

Người dùng đã đồng ý rõ ràng phạm vi tải/chạy Microsoft ProcDump, đúng API test PID,
**tối đa1 mini dump cho unhandled exception**, tối đa30 phút và retention tối đa7 ngày.
Sau khi cung cấp ZIP và chọn thư mục cha, người dùng tiếp tục xác nhận **chấp nhận ACL hiện có**
và **không đồng bộ cloud**. Không suy phê duyệt tự động từ prompt.

- Parent đã duyệt: **C:/@1_Công Nghệ**; tạo subdirectory riêng, không ghi đè ZIP của người dùng.
- Capture root: **C:\@1_Công Nghệ\ExamSpaceDiagnostics-573f22b158554bb19e026f6b2eb998f1**; dumps nằm trong subdirectory **dumps**.
- ACL đã kiểm read-only trước capture và trên thư mục con: Administrators/SYSTEM full control;
  BUILTIN/Users read/execute, Authenticated Users có quyền sửa/ghi kế thừa.
  Đây là rủi ro đã được người dùng chấp nhận; thư mục không có tính riêng tư chỉ-user.
- Không sửa ACL, registry/WER/Defender hoặc security settings. EulaAccepted=1 đã tồn tại
  trước khi chạy tool; không dùng -accepteula, -i, -wer hay postmortem registration.
- Dump có thể chứa referenced stack memory, test JWT/PG credentials. Không upload, commit,
  copy vào repository/cloud hoặc trích xuất credentials vào báo cáo.

## 3. Công cụ và provenance

- ProcDump x64 **12.02**, Authenticode **Valid / Microsoft Corporation**.
- ZIP do người dùng cung cấp và ZIP tải trực tiếp từ Microsoft có cùng SHA-256:
  **5fe68e81632f13188930affff20a9a9910170bae654360850d3108cead708a2d**.
- procdump64.exe SHA-256:
  **22c2a2b09ade73a342a18dab838354385f73fc98e324b9903fd61fff949c5124**.
- Chỉ giải nén entry x64/Eula từ archive đã kiểm; không cài system-wide.
- Đã đọc help của chính executable12.02 và đối chiếu tài liệu Microsoft cho -mm/-e/-n/-cancel.
  [Microsoft ProcDump](https://learn.microsoft.com/en-us/sysinternals/downloads/procdump).

## 4. Process identity và môi trường

- Worktree **ExamSpace-Stitch-UI**, nhánh **feature/stitch-examspace-ui**,
  HEAD **a1e2891754e399aa4743e32c8218759938149bdc**.
- Direct API test Node PID **11620**, parent **22332**. Node **24.15.0**, Windows x64,
  binary SHA-256 **3331e1ffe19874215472217c5e94f5a0c6d8e18c4ac7111d3937aa0ad5e9b4a5**.
- API start **2026-11-02T04:10:23.231Z**; monitor PID **35312**,
  start **04:10:26.113Z**, ready **04:10:26.324Z**. Các mốc này là UTC.
- Kiểm process name/start time/executable/command bằng Win32_Process trước attach.
  Request nonce riêng tới auth/me trả401; IPC từ chính child PID11620 xác nhận
  localPort4010, server.address().port4010, server.listening=true.
- API4010, web3010; Next bundle kiểm chỉ trỏ API4010. Test DB15433/online_exam_phase3_test
  có SQL cluster identity khác development và5 migrations. Không dùng restored DB có tài khoản thật làm fixture.
- Env test tường minh, JWT random mỗi process; preload chặn dotenv đọc .env worktree.
  Không copy/khởi chạy bằng development secrets. API4000/web3000 không attach.

## 5. Capture configuration và thời hạn

Command thực tế:

```text
procdump64.exe -mm -e -n 1 11620 <approved-capture-root>/dumps
```

Output thực của tool xác nhận: **Unhandled**, **1 dump**, terminate monitor/clone/debug strings
và Queue to WER disabled; Kill after dump disabled. Không -e 1/first-chance, -ma/full memory,
-i/global registration hoặc image-name auto-attach.

Planned monitoring **29 phút**, dành biên cleanup trước hard limit30 phút. Hủy bằng
**cùng executable đã kiểm, -cancel 11620** để detach; không kill bừa ProcDump hoặc Node khác.
Monitoring thực tế **1740.570s**, end **2026-11-02T04:39:26.683Z**, ProcDump exit code **0**. API uptime **1743.621s**, cuối cùng code **null**, signal **SIGTERM**, intentional **true**. Có record -cancel trước khi dừng API; không coi forced stop là graceful app.close/native crash.

ProcDump stdout ghi **^C / Dump count not reached** sau cancellation. Helper **-cancel** trả code **4294967295**, còn **monitor chính thoát0**. Hai records được giữ riêng; không dùng code của helper làm API exit0xC0000409 hoặc coi cancellation là dump thành công.

## 6. Workloads và kết quả

Một API duy nhất thực sự được ProcDump giám sát, giữ qua các workloads:

1. HTTP/PostgreSQL/migration suites từ nguyên script test:integration, không filter/skip.
2. Browser E2E từ nguyên script test:e2e, Edge headless/profile test riêng.
3. Periodic login → scoped reads → refresh → logout cho3 role, mỗi chu kỳ cách khoảng120s.
4. Một lượt nguyên ui-admin.test.cjs ở tuổi API22m30s, kiểm các thao tác quản lý trên process chạy lâu.

- HTTP: **54/54 PASS**, fail0, skipped0.
- Browser: **81/81 PASS**, fail0, skipped0.
- Root: **81/81 PASS** ở gate mới trước capture; tổng **216 tests PASS** trong các scripts cuối, không cộng lặp lịch sử.
- Aged Admin: **PASS**, start khi API đủ **1350.032s**; đây là chạy lặp10 cases, không cộng vào tổng unique.
- Periodic hoàn thành **11 chu kỳ**.
- Observer: **5051 HTTP starts / 5051 ends**, **116 expiry scans**, **175 resource samples**, **117 PG samples**, sequence gaps **0**.
- Active HTTP/background tại stop **0/0**, connections test ngoài controller sau stop **0**. Outer scheduler resolved không có nghĩa mọi row thành công; service bắt lỗi từng row, giữ fault-injection logs riêng.

Các test migration-preservation chỉ áp SQL hiện hữu trong database test prefix mới,
không migrate/reset/db push/seed/drop database development; giữ fixtures/DB/volumes.

## 7. Crash / native analysis

**0 dump. Native crash NOT REPRODUCED trong phiên này.** Không có exception parameters/native stack/faulting module/offset hoặc thread context mới để phân tích. Reader metadata không được chạy trên dump thật; không suy root cause hoặc claim FIXED. Không tạo dump thử để thay artifact crash.

Chưa có căn cứ quy Node/libuv/Prisma/Argon2/Nest hoặc endpoint Admin gây lỗi chỉ vì phase test.
Ba sự cố lịch sử vẫn có giá trị. Debugger/observer có thể đổi timing; một phiên hữu hạn
không loại trừ race/memory corruption/OS interference hoặc chứng nhận stable.

Reader metadata local được chuẩn bị cho header/PID/exception/module nếu có dump;
không tự scan raw stack strings hoặc suy call stack từ những địa chỉ tình cờ giống return address.
Không có synthetic dump để kiểm parser; không tính parser là đã xác minh bằng dump thật khi chưa có artifact.

## 8. Quality gates

Typecheck/lint/build **PASS** shared/API/web; root81, HTTP54, browser81 đạt trong các lượt mới. Format/diff/source/index/security checks được chạy lại ở hậu kiểm cuối. Không có source fix trong nhiệm vụ này.

Root81 gồm tooling17 + Jest47/14 suites + frontend17. Current browser có UI19 theme nên81,
không lấy con số80 lịch sử UI-07 thay script hiện tại. Không cộng lặp lượt aged Admin hoặc
periodic requests vào tổng unique tests; không đo coverage/CI/WCAG mới.

## 9. Các lỗi chuẩn bị và giới hạn evidence

- Lượt setup PID36396 tồn tại2,985s, dừng có chủ đích **trước attach** vì netstat không xác nhận listener.
  Không có dump hoặc unexpected exit; không ghi lượt đó PASS/NOT REPRODUCED của capture.
- Netstat còn mô tả listener3000/4000 hiện hữu thành CLOSED/FIN_WAIT_1 dù HTTP phục vụ.
  Không quy thành native crash. Giữ kiểm PID/start/exe, bổ sung proof listener từ chính
  child IPC và nonce request; không bỏ guard để attach theo tên node.exe.
- ProcDump dùng UTF-16 cho redirected output; đã decode đúng trước nhận diện ready/config.
  Một lần đọc JSON path bằng PowerShell default encoding làm path hiển thị sai; đọc lại UTF-8.
  Không có lỗi directory thật hoặc thay đổi dump destination do việc hiển thị này.
- Chỉ1 session attach thực sự, không auto-restart khi native crash hoặc monitor kết thúc.
- Không catch-all để nuốt exception, không tăng timeout/deadline thi hoặc sửa policy backend.

## 10. Retention và cleanup

Không có file dump để áp dụng deadline7 ngày; thư mục dumps trống được giữ lại. Tools/ZIP và evidence không bị xóa. Retention7 ngày đã được duyệt cho dump nếu có; không tạo scheduled task.

Không tạo scheduled cleanup/system task, không tự xóa evidence trước thời hạn đã thống nhất.
Việc thay retention hoặc nâng mức capture cần approval bổ sung. Existing ZIP/evidence cũ giữ nguyên.
ProcDump đã detach bằng -cancel, API4010/web3010 và test workers kết thúc; test container trở lại **exited**, development **running**. Web3000 status **200**, API4000 auth/me **401**; không dừng user services. Test identity/five migrations kiểm lại, connections ngoài controller0.

## 11. Source và database preservation

Baseline mới: **287 file UI**, **250 file repository Phase3 gốc**, index không staged delta.
**287/287 file UI baseline giữ nguyên byte, original250/250 giữ nguyên byte**, không mất file. Chỉ thêm báo cáo capture này. HEAD/branch/index contents và physical index checkpoint giữ nguyên; .env hai worktrees/bốn file compiled API checkpoint giữ nguyên hash. Backend65/65, schema và5 SQL migrations đúng bytes HEAD. ACL dump directory SDDL giữ nguyên; EulaAccepted vẫn1, không tạo ProcDump64 registry key. Không kết nối SQL development hoặc xóa database/volume/evidence.

Không thay Node global/PATH, dependency/lockfile, backend/auth/schema/migrations hoặc business logic
nhằm đoán lỗi. Không commit/push/fetch/reset/clean/stash/restore/merge/rebase/checkout.

## 12. Điều kiện UI-08 và kết luận

**Root cause vẫn UNKNOWN**, chưa có source fix hoặc before-fail/after-pass chứng minh fix.
Chưa đóng runtime gate để nghiệm thu UI-08/production. UI-08 test-only cần người dùng chấp nhận
rủi ro còn mở cùng test isolation/observer, giữ queue/revision/deadline/snapshot/server grading/result policy.
Không triển khai UI-08 trong nhiệm vụ này.

Evidence private ngoài Git: **%TEMP%/examspace-capture-01235ece**, gồm approval/ACL records,
baseline, tool signature/hash/help, setup thất bại, actual run/identity/listener proof,
ProcDump start/config/cancel/exit, observer/PG/TAP logs, kết quả/retention và hậu kiểm.
Raw dump nếu có chỉ nằm trong approved dump directory, không nằm trong repo/báo cáo.
