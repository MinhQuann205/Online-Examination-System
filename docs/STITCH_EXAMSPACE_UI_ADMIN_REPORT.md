# ExamSpace — Stitch UI-05: Admin Dashboard & Management

## 1. Kết luận

**UI-05 ĐÃ TRIỂN KHAI; RUNTIME UNSTABLE.** Giao diện Admin dùng API thật đã được triển khai trong worktree UI. Lỗi API thoát với mã **3221226505** đã tái diễn trong nhiệm vụ này; chưa xác định nguyên nhân. Không dùng kết quả chạy lại để kết luận runtime ổn định hoặc phê duyệt nghiệm thu tổng thể, production hay UI-06.

- Ngày: **01/11/2026, Asia/Saigon**.
- Worktree: C:\Môn Học\ThucTapNgheNghiep\ExamSpace-Stitch-UI.
- Branch: feature/stitch-examspace-ui; HEAD/baseline: a1e2891754e399aa4743e32c8218759938149bdc.
- Tái sử dụng worktree có sẵn; index giữ trống. Không stage/commit/push/merge/rebase/reset/clean/stash hoặc sửa Pull Request Phase 3.
- Repository gốc Online-Examination-System-Git được giữ nguyên HEAD, branch, index, status và **250/250 file baseline**, gồm local changes, .env và báo cáo private. Không chuyển branch hoặc mang source từ workspace cũ vào.
- Snapshot worktree UI trước đợt này gồm **248 file** và các thay đổi UI-01–UI-04 chưa commit. Báo cáo foundation được giữ nguyên byte. Mọi lệnh dự án dùng workdir UI đã xác minh.

## 2. Stitch đã đọc thật

Project được MCP xác minh: **Multi-Role Education Portal**, ID **16397645008301072963**, PRIVATE; updateTime khi đọc: 2026-11-01T04:50:14.924886Z. Design system **Academic Focus**, asset assets/5dc43d0355f042f999caea23b13210e7, version1. Không sửa project, screens hoặc design system.

| Reference                       | ID                                      | Dữ liệu truy cập trong UI-05                                               | Sử dụng                                                         |
| ------------------------------- | --------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------- |
| S07 Báo cáo & Thống kê hệ thống | 7715e0a7718c4f5890dcccc0e2677825        | get_screen; HTML/CSS 82.490 ký tự; screenshot JPEG 2560×3630 đã tải và xem | Sidebar, header/breadcrumb, filter bar, cards, table, hierarchy |
| S05 Teacher Exam Editor         | f4223e051e7342cf95c9db2deda3e0b5        | get_screen; HTML/CSS 48.884 ký tự; screenshot JPEG 2560×3044 đã tải và xem | Cấu trúc quản lý, form và bố cục nội dung                       |
| S10 Homepage                    | 59c106effe8e42e3993e50c968ecc043        | Đọc lại metadata; HTML/PNG đã được đọc ở foundation                        | Branding/navigation thông qua components foundation             |
| Academic Focus                  | assets/5dc43d0355f042f999caea23b13210e7 | Project theme và list_design_systems                                       | Colors, Plus Jakarta Sans, surfaces và spacing                  |

Resources HTML/screenshot của S07: projects/16397645008301072963/files/15639772692339067602 và /files/3800930262585724497; S05: /files/8258041688325679938 và /files/5437369604434762665. Dùng đúng resource MCP trả về; không đoán signed URL. Raw HTML/screenshot PRIVATE không đưa vào repository.

Stitch **không có design riêng cho Admin Dashboard/Users/Classes**. Ba trang này được phân loại **ADAPTED**. Monitoring tham chiếu S07 về cấu trúc, cũng là **ADAPTED**, không pixel-perfect. Không đưa KPI, AI/IRT, camera, cluster health, notifications hoặc device inventory mẫu vào sản phẩm.

## 3. Shared Admin shell và design

- AdminShell dùng Brand, ThemeToggle, LogoutDialog, Button/Input/Card và semantic tokens từ foundation; giữ Plus Jakarta Sans local và Lucide. Không thêm dependency, không sửa lockfile, không dùng Tailwind CDN hoặc inline handlers từ Stitch.
- Sidebar desktop rộng260px, bốn đích thật: Tổng quan, Người dùng, Lớp học, Theo dõi bài thi; trạng thái aria-current, identity từ auth/me. Header/breadcrumb, skip link, content/footer nhất quán.
- Mobile/tablet dùng drawer, focus trap, Escape, restore focus sau khi main hết inert; không để focus chuyển vào nội dung nền. Dialog logout foundation vẫn xử lý cancel/focus/error của nó.
- AdminPageHeader, SearchToolbar, DataTable, EmptyState/ErrorState, StatusBadge, ConfirmationDialog và SecretDialog đều có nơi dùng thực tế. Tái sử dụng Pagination hiện có.
- Bảng có caption, th scope, vùng cuộn được đặt tên và có thể focus bằng bàn phím. Form có labels/constraints và trạng thái pending/error; server validation tiếp tục quyết định.
- CSS chỉ dùng selectors admin-*, giữ tokens LIGHT/DARK. Bảng rộng được cuộn trong container, không cắt các cột khỏi dữ liệu hoặc làm document tràn ngang.

## 4. Admin Dashboard — /dashboard/admin

- Giữ SSR auth/me no-store và role redirect hiện hữu tại route động dashboard/[role]. Chỉ nhánh ADMIN render shell/dashboard mới; Teacher/Student giữ DashboardShell cũ.
- Greeting dùng fullName thật; thông tin email/vai trò lấy auth/me và dashboard/admin. Không hard-code người quản trị trong runtime.
- Bốn cards lấy total của Users, Users role STUDENT, Classes chưa lưu trữ và Exams tất cả trạng thái. Không cộng một trang items để giả tổng. Các con số trong screenshots là fixture của DB test thật, không KPI production.
- Loading dùng dấu chờ; lỗi hiện dấu — và retry, không giả số0. Kết quả total0 là trạng thái rỗng hợp lệ. Quick actions điều hướng tới routes/anchor thật.
- GET dashboard/admin hiện chỉ trả user và section. Không xây analytics API để giống hình Stitch.

## 5. User Management — /admin/users

- Search, role/status filters và pagination server20 rows/page; đổi filter về page1, không dừng ở trang đầu.
- Tạo TEACHER/STUDENT theo contract; không có tùy chọn tạo ADMIN hoặc đổi role ngoài quyền backend. Email, tên và mật khẩu tạm được validate; password input được xóa sau lần gửi, kể cả thất bại.
- Chi tiết và chỉnh sửa tên/email; hiển thị lỗi409/validation từ server. Chỉ thông báo thành công sau response thành công.
- Khóa/mở khóa và reset có confirmation, chống double-submit, error/retry, cancel/Escape và focus return. Thông tin phiên theo đúng endpoint hiện hữu, không thêm per-device semantics.
- Reset response gọi trực tiếp, **không đưa temporaryPassword vào QueryCache/MutationCache, URL, localStorage hoặc sessionStorage**; không log hay tự copy clipboard. Secret chỉ ở component memory, masked mặc định, có show/hide; đóng dialog, chuyển tab hoặc rời trang sẽ bỏ state/input. Không có lịch sử xem lại mật khẩu cũ.
- Giao diện hướng dẫn chuyển mật khẩu qua kênh riêng và yêu cầu người dùng đổi; không tuyên bố đã thêm cơ chế bắt buộc đổi mật khẩu vào backend.

## 6. Class Management — /admin/classes

- Search tên/mã và phân trang thật; tạo lớp với name/code/description và active Teacher từ API. Teacher picker đọc đủ các trang; trạng thái lỗi có retry và không gửi form khi chưa lấy được lựa chọn.
- Chi tiết lớp, chỉnh name/description và phân công lại Teacher. Không sửa code vì PATCH hiện tại không hỗ trợ.
- Reassignment có confirmation giải thích chuyển quyền quản lý/báo cáo, giữ bài làm. Teacher cũ mất scope theo backend sau response thành công; không cấp quyền bằng việc thay navigation.
- Roster hiển thị đầy đủ members mà detail API trả về, không tự cắt20 học viên. Student picker dùng search/pagination API; thêm nhận duplicate409, xóa khỏi lớp có confirmation. Không xóa tài khoản hoặc bài làm.
- Endpoint roster hiện không có paging riêng; với lớp rất lớn, đề xuất API paging ở backlog, không tự thêm backend trong UI-05.

## 7. Exam Monitoring — /admin/exams

- Table theo S07 có current Exam status/version, các published versions API trả về, số assignment/attempt từ backend và actions thật. Search/status filter/paging server hoạt động.
- Xem bài giao mở panel có paging riêng, pin version/title, lớp hoặc direct recipient, thời gian và attempt count theo contract. Current draft metadata được phân biệt với pinned assignment metadata.
- Link Theo dõi kết quả mở report hiện hữu /teacher/exams/:id/results, endpoint và component này vốn hỗ trợ ADMIN; không tạo reports API hoặc analytics giả.
- Loading/error/empty/retry đúng nguồn. Không live invigilation, camera, server health hoặc export chưa có contract.

## 8. API/DTO và quyền đã đối chiếu source

| UI/action         | API và request                                                                                    | Response dùng                                          | Quyền backend                                               |
| ----------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------- |
| Identity/session  | GET /auth/me; POST /auth/refresh và /auth/logout hiện hữu                                         | Safe CurrentUser/cookies; logout204                    | Auth/JWT/active role và CSRF giữ nguyên                     |
| Dashboard         | GET /dashboard/admin                                                                              | user, section                                          | ADMIN                                                       |
| Users list/totals | GET /users?search=&role=&active=&page=&limit=                                                     | items,total,page,pageCount; safe user fields           | ADMIN                                                       |
| Tạo tài khoản     | POST /users {email,fullName,role,password}                                                        | 201, safe user                                         | ADMIN; role mới chỉ TEACHER/STUDENT                         |
| Xem/sửa user      | GET/PATCH /users/:id; PATCH {fullName,email}                                                      | 200, safe detail                                       | Admin UI dùng quyền ADMIN; backend scope không đổi          |
| Khóa/mở khóa      | PATCH /users/:id/status {isActive}                                                                | 200                                                    | ADMIN, thu hồi phiên theo tokenVersion                      |
| Reset             | POST /users/:id/reset-password                                                                    | 201 {temporaryPassword,mustChangePassword}             | ADMIN; response secret không cache ở UI                     |
| Classes           | GET /classes?search=&page=&limit=; GET /classes/:id                                               | items,total,pageCount; detail teacher/members          | ADMIN toàn phạm vi; Teacher owner/Student scope hiện hữu    |
| Tạo/sửa lớp       | POST /classes {name,code,description?,teacherId}; PATCH /classes/:id {name,description,teacherId} | 201/200                                                | Create/reassign ADMIN; Teacher owner không được tự reassign |
| Membership        | POST /classes/:id/students {studentId}; DELETE /classes/:id/students/:studentId                   | 201/200                                                | Backend owner/RBAC kiểm tra, UI dùng ADMIN                  |
| Monitoring        | GET /exams?search=&status=&page=                                                                  | items,total,pageCount,versions,_count                  | ADMIN/TEACHER theo scope; Student403                        |
| Assignment panel  | GET /exam-assignments?examId=&page=                                                               | Public pinned metadata, recipients, counts, pagination | resultAssignmentScope hiện hữu; ADMIN hệ thống              |
| Reports/detail    | GET /results/exams/:id; GET /results/:id                                                          | Scoped report/results; score/key theo policy           | ADMIN/manager/Student owner theo endpoint                   |

Không invent endpoint, không truy cập Prisma từ frontend. Admin layout chỉ mount các query dữ liệu quản trị khi auth/me xác nhận ADMIN; lỗi network không lấy identity cũ để cấp quyền. Backend vẫn là nguồn phân quyền, có HTTP403/IDOR regression riêng.

## 9. Kiểm thử và hình ảnh

**Lượt cuối:187 tests PASS,0 FAIL,0 skipped — root81 + HTTP/PostgreSQL44 + browser62. Runtime vẫn UNSTABLE theo mục11.** Không cộng các focused runs, reruns, fixture rows hoặc172 tests foundation lịch sử vào187.

| Gate            | Kết quả                                                       |
| --------------- | ------------------------------------------------------------- |
| Typecheck       | PASS shared/API/web; build cuối còn chạy TypeScript           |
| Lint            | PASS toàn worktree sau sửa focus/form cuối                    |
| Build           | PASS shared/Nest/Next bằng cấu hình API test4010              |
| Root tests      | PASS81: tooling17 + Jest47/14 suites + frontend17             |
| HTTP/PostgreSQL | PASS44: regression39 + Admin5;0 failed/skipped                |
| Browser E2E     | PASS62: Phase1–3 34 + foundation18 + Admin10;0 failed/skipped |
| Format/Git diff | PASS toàn worktree; git diff --check và index check PASS      |

Jest47 gồm45 unit +2 PostgreSQL service tests; frontend17 gồm9 autosave +8 session/API. HTTP/browser không instrument vào coverage Jest; không đo coverage mới hoặc kết luận CI/production đạt chuẩn.

HTTP Admin kiểm identity/counts đối chiếu SQL,24-record paging/filter, safe responses, Admin-only mutations, chuyển giảng viên/membership, pinned metadata/IDOR và reset password/thu hồi phiên/đăng nhập mới. Browser Admin gồm10 cases cho bốn trang, CRUD/status/reset, cancel/error/pending/retry, pagination20/4, role redirects và phiên hết hạn/refresh.

Responsive đã có **16 lượt kiểm bốn route ×390/768/1024/1440**, document không tràn ngang, axe0 trong tập wcag2a/wcag2aa/wcag21aa của lượt kiểm tương ứng. DARK Users390 và keyboard drawer/dialog/logout đã PASS ở UI05-10 của suite cuối; tổng17 lượt axe Admin (16LIGHT +1DARK) đều0 violations trong tập đã nêu. Không suy axe thành chứng nhận NVDA/VoiceOver/WCAG toàn hệ thống.

Ảnh app được giữ ngoài Git tại các thư mục TEMP examspace-ui05-browser-*; checks.json ghi route, width, axe, overflow và tên ảnh. Đã xem trực tiếp Dashboard desktop, Users mobile, Classes desktop, Monitoring desktop và Users DARK mobile để so với S07/S05; LIGHT palette/font/cards/sidebar/table tương ứng, cấu trúc dữ liệu là thích nghi. Không pixel-perfect; DARK không có reference Stitch riêng.

Screenshots Admin cuối: %TEMP%\examspace-ui05-browser-33hVVh. Có16 PNG route/viewport và Users DARK390, checks.json ghi16 route/width checks; ảnh Dashboard desktop riêng được giữ. Đây là fixture test, không dữ liệu development.

## 10. Hồi quy foundation và Phase1–3

Giữ Homepage/Login/Logout/session lifecycle, generation fence, refresh coalescing, HttpOnly cookies, CSRF và cross-tab exam guard. Không sửa API client, AuthService, AnswerAutosave core, grading hoặc deadline.

Bộ browser chạy lại nguyên script, không bỏ negative assertion: đăng nhập ba role, no-JS/pre-hydration, wrong password/network/403, logout cancel/error/retry/cache/Back/nhiều tab/phòng thi pending; Teacher tạo ba dạng câu, publish/giao; Student làm/autosave/reload/nộp; server chấm và Student/Teacher/Admin xem kết quả. Các ca abort/delay/revision/conflict, matching mouse/keyboard/touch, review flags, snapshot/metadata/roster và responsive/axe hiện hữu được giữ.

Tests P0/P1/P2 chỉ thích nghi locator theo table mới, confirmation reassignment và student search/select; không giảm assertions SQL/RBAC/score/axe để làm xanh. Loader/API/queue foundation không đổi.

## 11. Runtime và lỗi trong quá trình kiểm

### Runtime UNSTABLE — chưa sửa

API test trực tiếp bằng Node24.15.0, có report-on-fatalerror, report-uncaught-exception, report-exclude-env và report-exclude-network. **Lần API đầu thoát3221226505 lúc09:33:20Z**; browser setup nhận ECONNRESET,0/10 cases thành công. Startup PID/start/exit/signal và logs đã giữ trong attempt-01-runtime-crash. Không có Node diagnostic report được sinh trong node-diagnostics dù flags đã bật; không có stack JavaScript giải thích native exit. Không đủ chứng cứ quy nguyên nhân cho Nest, Prisma, Argon2 hoặc hệ điều hành.

Khởi động lại đúng API test sau khi giữ evidence để tiếp tục kiểm UI. Kết quả suite sau restart chỉ chứng minh những luồng đã chạy, **không chứng minh runtime đã được sửa**. Không đổi backend/dependency hoặc tắt warnings theo phỏng đoán. Cần xử lý độ ổn định trước nghiệm thu tổng thể/UI-06; Windows/native crash dump và môi trường Node/native modules cần điều tra có kiểm soát riêng.

### Lỗi UI và harness đã sửa

1. Users mobile bị intrinsic width của wrapper grid làm document tràn: sửa min-width/container gap và cuộn bảng bên trong; kiểm lại bốn viewport.
2. Escape đóng drawer trước khi main hết inert nên trả focus không thành công: chuyển restore focus sang effect sau DOM commit; UI05-10 đã xác nhận initial focus, Escape và restore focus đúng.
3. Locator select exact label gồm cả option text và heading report lấy tên đề thay chữ Kết quả: thêm accessible names ổn định, sửa locator đúng DOM.
4. Locator parent tr dùng cú pháp XPath thiếu prefix trong P0/P2: sửa xpath=ancestor::tr, giữ report/score assertions.
5. Một lượt build riêng web thiếu env test, bundle trỏ fallback4000; browser không kết nối được. Đã dừng lượt đó, giữ logs, xác minh4000 không có listener/ECONNREFUSED và4010 là API test; rebuild qua harness, kiểm bundle0 occurrence4000/2 occurrence4010 trước chạy lại. Không tính lượt dở này PASS hoặc kết luận nó là lỗi sản phẩm.

6. Test phát hiện thông báo tạo tài khoản xuất hiện khi password input còn chờ invalidate queries hoàn thành: chuyển xóa password vào ngay finally của request, trước onSaved/refetch. Assertion chờ DOM đạt rỗng và không in password nếu lỗi; UI05-02 cuối PASS.

Các lượt7/10,9/10,59/62, build-env bị dừng và focused debug được giữ riêng, không cộng vào tổng test cuối. Runtime3221226505 là finding chưa xử lý riêng, không gộp với lỗi locator/setup.

Còn warnings pg concurrent-query deprecation và Node TS module detection từ baseline; không tắt warnings/rules để làm xanh. Sau restart không có API exit ngoài ý muốn mới trước cleanup; cleanup xác minh PID/start time và ghi rõ các lần dừng có chủ đích. Điều đó không đóng finding native exit đã tái diễn.

## 12. Database/source safety

- **0 API backend mới,0 thay đổi schema và0 migration UI mới.** Toàn bộ65 tracked files dưới apps/api, gồm schema và năm migrations, khớp bytes HEAD. Không sửa lịch sử migration hoặc auth/RBAC/CSRF.
- Test duy nhất:127.0.0.1:15433/online_exam_phase3_test, container test hiện hữu. Guard kiểm database name, host/port và cluster identity SQL khác development; test schema đủ5 migrations. API4010/web3010 dùng env test riêng và secrets random từ TEMP; không copy .env development vào UI worktree.
- Chỉ tạo fixtures có suffix riêng trong DB test. Migration preservation regression dùng database prefix test mới và SQL hiện hữu trên server test, giữ DB/evidence; không deploy development, reset/drop DB, xóa volume hoặc restore đè.
- Không kết nối SQL development trong nhiệm vụ UI-05. Container development vốn chạy giữ chạy; đã dừng riêng API4010/web3010 của harness và đưa test container do nhiệm vụ khởi động lại stopped. Development vẫn chạy. Không dừng container dự án khác.
- Hậu kiểm source:240/248 file UI baseline giữ nguyên byte,8 sửa có chủ đích,11 file mới,0 file mất; foundation report/queue/auth/API client/DashboardShell giữ nguyên. Original250/250 và index/HEAD/branch/status gốc không đổi; UI index trống. Scan cuối258 text files:0 exact local/test secret matches hoặc private key/GitHub/AWS/JWT patterns; chỉ xử lý giá trị trong bộ nhớ. Đây là scan có phạm vi, không chứng nhận mọi lỗ hổng/secret đều bị phát hiện.

## 13. Danh sách file của UI-05

**8 file có sẵn sửa:**

- apps/web/src/app/admin/classes/page.tsx
- apps/web/src/app/admin/users/page.tsx
- apps/web/src/app/dashboard/[role]/page.tsx
- apps/web/src/components/admin-exam-monitor.tsx
- package.json
- tests/p0-browser.test.cjs
- tests/p1-browser.test.cjs
- tests/p2-browser.test.cjs

**11 file mới, gồm báo cáo:**

- apps/web/src/app/admin/layout.tsx
- apps/web/src/components/admin/admin-classes.tsx
- apps/web/src/components/admin/admin-dashboard.tsx
- apps/web/src/components/admin/admin-data.ts
- apps/web/src/components/admin/admin-shell.tsx
- apps/web/src/components/admin/admin-ui.tsx
- apps/web/src/components/admin/admin-users.tsx
- apps/web/src/components/admin/admin.css
- tests/ui-admin-api.test.cjs
- tests/ui-admin.test.cjs
- docs/STITCH_EXAMSPACE_UI_ADMIN_REPORT.md

Tổng19 file UI-05; diff với HEAD còn chứa foundation có sẵn. Không quy toàn bộ working tree cho UI-05. Package chỉ thêm hai test files vào scripts integration/E2E, không thêm dependency/lockfile.

## 14. Trước UI-06 và chạy lại

1. Điều tra và đóng finding runtime3221226505 bằng diagnostics phù hợp; chưa có bản sửa. Không lấy một lượt rerun xanh làm điều kiện ổn định.
2. Review diff UI-05 và các screenshots trong worktree; chưa commit/merge hoặc deploy UI vào development.
3. Teacher/Student management/editor/workspace/results giữ giao diện hiện hữu ngoài shared foundation; redesign từng scope theo auditV2, tiếp tục bảo vệ queue/version/deadline/results policy.
4. Analytics/IRT/export/AI/proctor/device sessions và roster paging nếu cần là backlog cần API contract riêng; không dựng controls giả.
5. Screen reader, production HTTPS/proxy/cross-site và refresh nhiều process/scheduler multi-instance giữ giới hạn foundation, chưa chứng nhận trong UI-05.

Chạy lại trong đúng worktree, dùng PostgreSQL test có identity guard hiện hữu, env test cho cả generate/build/API/web, API4010 và web3010. Build Next phải nhận NEXT_PUBLIC_API_URL trỏ API test ngay lúc build; xác minh bundle trước fixtures browser. Sau đó chạy typecheck/lint/build/test/test:integration/test:e2e/format:check. Không dùng development hoặc database restore chứa tài khoản thật làm fixtures; không dùng secrets tạm của harness làm tài khoản development.

Evidence nội bộ: %TEMP%\examspace-ui05-00c77839. Gồm before.json, source preservation, startup/exit records, node-diagnostics, từng lượt build/test/HTTP/browser logs, sai env diagnostic và security scan. Raw screenshots/HTML/cookies/secrets/profiles không commit. Báo cáo foundation giữ nguyên, báo cáo này chỉ ghi kết quả UI-05 theo thời điểm.
