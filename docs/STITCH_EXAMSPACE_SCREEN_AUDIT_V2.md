# Stitch → ExamSpace: Screen Audit V2 — Homepage, Login và Logout

## 1. Kết luận

Ngày kiểm tra: **01/11/2026, Asia/Saigon**. Đã đọc lại dữ liệu thật qua Stitch MCP và đối chiếu source hiện tại; nhiệm vụ này chỉ thêm hai báo cáo V2, chưa triển khai UI.

| Câu hỏi                       | Kết quả đã xác minh                                                                                                                                                                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Đúng project yêu cầu?         | Có: `projects/16397645008301072963`, **Multi-Role Education Portal**, PRIVATE, quyền OWNER. Các màn hình vẫn mang thương hiệu **EduTest**, chưa phải đặc tả ExamSpace đã chốt.                                                                                                 |
| Hiện có bao nhiêu screens?    | `list_screens` trả **10 mục = 9 UI + 1 brief**. Project có thêm **1 phòng thi hidden**. Tổng **11 screen resources = 10 UI resources + 1 brief**; hidden trùng HTML với phòng thi hiện, nên không phải 10 workflow độc lập. Design-system asset không tính là screen.          |
| Mới gì so với V1?             | **S10 Homepage** và **S11 Login & Logout**. Không có resource logout riêng hoặc dashboard Admin/Teacher/Student mới.                                                                                                                                                           |
| Screens cũ có đổi không?      | Cả **9 ID cũ còn nguyên**, metadata `get_screen` giống V1; **8/8 HTML cũ trùng nguyên nội dung/SHA-256**. S02 chỉ có brief. Ảnh cũ không tải lại trong V2, nên không kết luận byte ảnh cũ bất biến chỉ từ URL/reference.                                                       |
| Homepage là gì?               | Bố cục portal/landing dùng chung, nhưng header đang hard-code Teacher đã đăng nhập. Đây là thiết kế **trộn trạng thái public và authenticated**, chưa phải dashboard vai trò. Đề xuất `/` là public landing với header theo trạng thái thật; cần chốt UX trước thực hiện.      |
| Login đủ UI states chưa?      | Chưa. Có ba role tabs, hiện/ẩn mật khẩu và toast demo; thiếu validation/error/loading/disabled/no-JS/pre-hydration và redirect thật. Source ExamSpace đã có các trạng thái bảo vệ cơ bản cần giữ.                                                                              |
| Logout được thiết kế thế nào? | Icon header, hai nút current/all, modal xác nhận và hai nút hủy từng thiết bị nằm trong S11. JavaScript chỉ đổi DOM/toast; không gọi backend. Không có dropdown profile hoạt động hoặc đích sau logout được xác định.                                                          |
| Có cần API/migration mới?     | **Không** cho static landing + redesign email/password + logout theo chính sách hiện tại. **Có khoảng trống** nếu giữ SBD/PIN, SSO/MFA, danh sách thiết bị/current-device revoke, lịch công khai động, audit logs hoặc tính năng mở rộng V1. Không tự đưa chúng vào Phase 1–3. |

**Điểm cần chốt trước triển khai:** backend dùng `User.tokenVersion` chung và một `refreshTokenHash`; logout hợp lệ có phạm vi vô hiệu hóa token theo tài khoản. Nó không có cơ chế logout riêng một thiết bị như chữ “Đăng xuất thiết bị này” trong Stitch. Không nối cả current/all/per-device vào cùng endpoint rồi hứa ba ý nghĩa khác nhau.

V1 được giữ nguyên làm lịch sử: [Screen Audit V1](STITCH_EXAMSPACE_SCREEN_AUDIT.md), [Implementation Plan V1](STITCH_EXAMSPACE_IMPLEMENTATION_PLAN.md). Các nhận định V1 “chưa có Stitch Login/Homepage” được cập nhật bởi V2 này; không viết lại báo cáo cũ. Kế hoạch mới: [Implementation Plan V2](STITCH_EXAMSPACE_IMPLEMENTATION_PLAN_V2.md).

## 2. Phương pháp, Git và giới hạn bằng chứng

- Repository thực tế: `C:\Môn Học\ThucTapNgheNghiep\Online-Examination-System-Git`, không dùng source ở cwd `Online_Examination_System`.
- Branch: `feature/phase-3-examination`; HEAD: `a1e2891754e399aa4743e32c8218759938149bdc`; index trống. Đầu V2 có **11 tracked modified + 6 untracked**, gồm hai báo cáo V1. Không coi các thay đổi này là do V2.
- Đọc yêu cầu V2, AGENTS và hai báo cáo V1. Baseline chứng minh toàn bộ **246 file của V1** không đổi; chụp thêm hai báo cáo V1 thành **248 file có sẵn** cho V2, gồm hash `.env`/báo cáo private nhưng không xuất nội dung secrets.
- Source inventory V1 có **97 file** dưới các cây được yêu cầu: 96 TS/TSX gồm 14 specs và 1 CSS; đã đối chiếu toàn bộ source/schema/README/release summary khi audit V1. V2 tái đọc trực tiếp root/login/fallback/dashboard, LoginForm, DashboardShell, API client, AuthController/AuthService/guards/CSRF và schema/shared auth types. Các file source giữ nguyên hash so với V1; không thay việc đọc source bằng báo cáo PASS cũ.
- Chỉ dùng tool Stitch đọc: `get_project`, `list_screens`, `get_screen`, `download_file`, `list_design_systems`. Không gọi tool tạo/sửa screen/project/asset. Không gọi API ứng dụng hoặc đăng nhập tài khoản development.
- Không kết nối PostgreSQL, khởi động Docker, chạy migration hoặc chỉnh schema. Không fetch, reset, clean, stash, restore, checkout, rebase, merge, commit hoặc push.
- Nhận định API/authorization là **static source audit**, không phải HTTP/browser retest. Không chạy JavaScript prototype để coi toast là login/logout thành công.

## 3. Đồng bộ Stitch và danh sách resources

### 3.1 Metadata và bằng chứng truy cập

`get_project({name:"projects/16397645008301072963"})` xác nhận title, visibility và OWNER. `createTime`: `2026-11-01T03:29:43.696316Z`; `updateTime` lúc đầu và lần đọc lại cuối V2 đều **`2026-11-01T04:50:14.924886Z`**. Có **12 screenInstances**: 11 source-screen instances và 1 design-system instance. Instance hidden S09 được lấy từ `sourceScreen`, không đoán ID từ title.

`list_screens({projectId:"16397645008301072963"})` trả 10 mục. Đã gọi `get_screen` cho cả **11 resources**, tải lại **10 HTML** qua `download_file` theo đúng resource name MCP trả về, đọc CSS/inline scripts. Đã tải và xem **hai screenshots mới S10/S11**. Ở S01–S08, V2 chỉ kiểm metadata/file reference; ảnh đã được xem trong V1. S09 tiếp tục không có screenshot; không gán ảnh S08 thành ảnh S09.

### 3.2 Inventory và đối chiếu ID

| Mã  | Screen title thực tế                                        | Screen ID                          | Vai trò theo tác vụ                     | Delta và bằng chứng V2                                             |
| --- | ----------------------------------------------------------- | ---------------------------------- | --------------------------------------- | ------------------------------------------------------------------ |
| S01 | Kết quả cá nhân & Báo cáo học viên                          | `f325ae1f243e4ef499f7a9ee8fed9500` | Student                                 | ID giữ nguyên; metadata và HTML giống V1; ảnh reference đọc lại    |
| S02 | image.png                                                   | `14080259993187939031`             | Brief chung                             | ID/metadata giữ nguyên; ảnh brief 482×200; không có HTML           |
| S03 | Chấm bài & Sửa lỗi trực tiếp (Giảng viên)                   | `da7e07a6d4314f01b0b83abfd4ed5cfc` | Teacher                                 | ID giữ nguyên; metadata và HTML giống V1; ảnh reference đọc lại    |
| S04 | Đề ôn tập thích ứng (Adaptive Mini-test) - Phụ đạo học sinh | `93d39920ec5f43dfa27f8d7321171646` | Student                                 | ID giữ nguyên; metadata và HTML giống V1; ảnh reference đọc lại    |
| S05 | Soạn đề & Quản lý (Giảng viên)                              | `f4223e051e7342cf95c9db2deda3e0b5` | Teacher                                 | ID giữ nguyên; metadata và HTML giống V1; ảnh reference đọc lại    |
| S06 | Bài làm đã chấm & Lời phê của giáo viên (Học sinh)          | `17928e8b99df49249a2e157d92c5b3b1` | Student                                 | ID giữ nguyên; metadata và HTML giống V1; ảnh reference đọc lại    |
| S07 | Báo cáo & Thống kê hệ thống (Admin & Giảng viên)            | `7715e0a7718c4f5890dcccc0e2677825` | Admin/Teacher, chung                    | ID giữ nguyên; metadata và HTML giống V1; ảnh reference đọc lại    |
| S08 | Phòng thi trực tuyến (Học viên)                             | `dc01b574a74a400d91ca5c8a4efda87d` | Student                                 | ID giữ nguyên; metadata và HTML giống V1; ảnh reference đọc lại    |
| S09 | EduTest - Online Examination & Assessment System            | `c5586e30ca7244fb87e21c2baabc1895` | Student, hidden                         | ID giữ nguyên; HTML giống V1 và **trùng S08**; không có screenshot |
| S10 | Trang chủ & Cổng thông tin (EduTest Portal)                 | `59c106effe8e42e3993e50c968ecc043` | Public/các vai trò, header mock Teacher | **Mới**; get_screen + HTML/CSS/JS + screenshot đã xem              |
| S11 | Đăng nhập phân quyền (Login by Role) & Đăng xuất            | `12ddb4b383d049be95e4706b6ead4cfb` | Guest và authenticated, ba vai trò      | **Mới**; get_screen + HTML/CSS/JS + screenshot đã xem              |

Không có mapping cũ → ID mới vì **0 ID bị thay, 0 resource bị xóa**. Không phát hiện chỉnh HTML/metadata của S01–S09; không mở rộng kết luận này sang byte screenshot cũ chưa tải lại.

Phân nhóm không cộng lặp: UI hiển thị có **4 Student riêng + 2 Teacher riêng + 1 Admin/Teacher chung + 2 portal/auth đa vai trò = 9**. Thêm hidden Student là 10 UI resources; thêm brief là 11. **Admin riêng vẫn 0**, nhưng có S07 dùng chung và hai screen portal/auth. Ba role cards/tabs trong S10/S11 không phải ba dashboard resources.

### 3.3 File truy cập ở hai screen mới

Tiền tố chung `projects/16397645008301072963/screens/`:

| Screen | HTML resource suffix                                | Screenshot resource suffix                                | Metadata screen                        | Nội dung đã đọc                                                                         |
| ------ | --------------------------------------------------- | --------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------- |
| S10    | `59c106effe8e42e3993e50c968ecc043/fileEntries/html` | `59c106effe8e42e3993e50c968ecc043/fileEntries/screenshot` | DESKTOP, 2560×5508; instance 1280×2790 | 45.226 ký tự HTML; 16 buttons, 18 anchors, 3 inputs, 1 form; PNG đã xem                 |
| S11    | `12ddb4b383d049be95e4706b6ead4cfb/fileEntries/html` | `12ddb4b383d049be95e4706b6ead4cfb/fileEntries/screenshot` | DESKTOP, 2560×2990; instance 1280×1495 | 48.182 ký tự HTML; 23 buttons, 12 anchors, 10 inputs + 1 select, **0 form**; PNG đã xem |

Số control gồm cả phần hidden trong HTML, không khẳng định mọi control xuất hiện trong screenshot mặc định. S11 screenshot không chứng minh các panel Teacher/Admin hoặc modal đã được chụp; những phần đó được đọc từ HTML/JS. Không có resource MOBILE/TABLET mới. Không dùng kích thước ảnh render thu nhỏ như kích thước screen gốc.

SHA-256 HTML S10: `86652547156e349efafa9c641829f6e41877e655d8d7f90a2c6c50a8333cf8b7`.

SHA-256 HTML S11: `b9506b87c0138c6a99f8318c72ec7e34b1672e750d774e42c700cdb5df85b072`.

## 4. Homepage S10: cấu trúc và trạng thái

### 4.1 Các phần quan sát được

| Phần                 | HTML/screenshot thực tế                                                                                                 | Dữ liệu và quyết định mapping                                                                                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Header               | EduTest/logo placeholder bị lỗi; sáu navigation links, role pill, help, notifications, avatar/name Teacher, logout icon | Profile/name/role phải lấy `/auth/me`; không giữ tên mock hoặc cho dropdown đổi quyền. Header logout có nhãn nhưng không có handler.                               |
| Announcement         | Thông báo lịch thi, badge AI proctor sẵn sàng, link quy chế                                                             | Nội dung và trạng thái tĩnh demo; không có API notifications/proctor health. Nội dung thông tin đã được duyệt có thể là static.                                    |
| Hero                 | Hai cột; tiêu đề hệ thống khảo thí, mô tả, hai CTA, mock card giám sát/timer/progress                                   | CTA chính dẫn `#role-portals`; CTA Teacher dẫn `#teacher-portal-card`. Không có start request. Số liệu 45.000+, 1.200+, 99,8% là mock, không phải metrics backend. |
| Role portals         | Ba cards Student, Teacher, Admin, CTA login và shortcut; banner 2FA bắt buộc                                            | Đổi thành entry navigation, không phải quyền hoặc dashboard. SSO/MFA/SBD/AI claims chưa có backend.                                                                |
| Lịch thi             | Một table năm cột, ba rows demo năm 2024; trạng thái mở/chưa đến giờ/test thiết bị; filter Khoa/Khối và tải PDF         | Không có lịch công khai trong source. Student đã đăng nhập có thể dùng assignments **của mình**; không công khai nguyên API protected hoặc roster/answer key.      |
| Quy định/hỗ trợ      | Cards quy chế, cấu hình thiết bị, phúc khảo, số hỗ trợ mẫu                                                              | Static content cần phê duyệt và đích link thật; phúc khảo/workflow helpdesk chưa có. Không coi mô tả chuyển tab là backend enforcement.                            |
| Features             | AI proctor đa kênh, bút phê tự luận, IRT/chuẩn hóa phổ điểm                                                             | Chưa thuộc Phase 1–3 hiện có. Cần sửa copy theo chức năng thật hoặc tách roadmap được xác nhận.                                                                    |
| Footer               | EduTest ©2024 và ba links quy chế/hỗ trợ/privacy                                                                        | Chốt thương hiệu/năm/nội dung, tạo trang hoặc section tĩnh nếu cần; không tự thêm API CMS.                                                                         |
| Student modal hidden | SBD + PIN phòng thi, “Lưu mã”, quên SBD và “Xác nhận & Bắt đầu làm bài”                                                 | Không khớp `{email,password}`. JS chỉ preventDefault → alert → đóng modal. Không có xác thực hoặc start thật.                                                      |

S10 chứa landing marketing và Teacher profile cùng lúc. Không có dữ liệu việc cần làm theo tài khoản hoặc KPI scoped để gọi đây là dashboard. **Phương án đề xuất:** `/` public, guest header chỉ entry/login; sau xác thực hiển thị tên/role thật và link “Không gian làm việc”. Lịch public tĩnh đã duyệt khác với lịch assignments cá nhân ở `/student/exams`. Cần thiết kế guest/loading/authenticated/auth-check-error rõ ràng; không tự suy một variant guest đã tồn tại trong Stitch.

### 4.2 Navigation và toàn bộ nhóm control mới ở S10

| Control/link/form                                               | API/request → response có thể dùng                                                                  | Role/policy và gap                                                                                                                                                                                          |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trang chủ / Đăng nhập                                           | Không cần mutation; `/` / `/login`                                                                  | `FRONTEND MISSING` cho landing, login cần redesign. Các `href="#"` hiện không phải route thật.                                                                                                              |
| Phòng thi / Kết quả cá nhân                                     | `GET /exam-assignments?page&search` → paginated items; `GET /results?page` → own results            | STUDENT; guest đi login, Teacher/Admin dùng không gian đúng role.                                                                                                                                           |
| Soạn đề / Báo cáo                                               | Exams/questions/assignments APIs; `GET /results/exams/:id`                                          | TEACHER ownership/scope; Admin monitor/report theo quyền. Không map link chỉ bằng role tab.                                                                                                                 |
| Hai CTA hero                                                    | Scroll tới hai IDs thực sự tồn tại                                                                  | Không gọi API. Nếu đổi CTA thành login/deep link phải chốt UX/validate destination riêng.                                                                                                                   |
| Ba nút đăng nhập                                                | `/login`; `POST /auth/login {email,password}` → safe CurrentUser                                    | Teacher và Admin buttons chưa có handler. “Admin SSO” không phải API hiện hữu; UI baseline dùng email/password.                                                                                             |
| Kho ngân hàng câu hỏi                                           | `/teacher/questions`; `GET /questions?...`                                                          | TEACHER/ADMIN theo controller; câu của Teacher khác không được cấp quyền qua card.                                                                                                                          |
| Tra cứu phòng/SBD, Xem SBD                                      | Không có API candidate number/room lookup                                                           | `BACKEND API MISSING / NEEDS CLARIFICATION`; không dùng User UUID làm SBD hoặc PIN làm password.                                                                                                            |
| Vào phòng                                                       | Chọn assignment thật; `POST /exam-assignments/:assignmentId/start` → attempt; GET owner để continue | STUDENT recipient; kiểm giờ/maxAttempts/archive/version ở server. Không login thành công rồi auto-start một mock room.                                                                                      |
| Kiểm tra thiết bị                                               | Chưa có nghiệp vụ proctor/preflight                                                                 | Một màn hướng dẫn/browser feature check có thể chỉ frontend sau chốt; camera/mic monitoring/telemetry cần scope riêng.                                                                                      |
| Lọc Khoa/Khối                                                   | Source không có faculty/grade field/filter tương ứng                                                | Không gửi key tùy ý vào assignments rồi coi đã lọc. Có thể dùng search/filter hiện hữu với nhãn đúng nghĩa.                                                                                                 |
| Tải file PDF                                                    | Chưa có endpoint export schedule chính thức                                                         | In nội dung tĩnh có thể xử lý client sau chốt; PDF động/scoped chính thức cần contract riêng.                                                                                                               |
| Audit Logs / notifications                                      | Không có API audit/session notification store                                                       | `BACKEND API MISSING`; không render dấu thông báo hoặc báo log an toàn từ dữ liệu mock.                                                                                                                     |
| Help, Tất cả, cards quy chế/hardware/phúc khảo, ba footer links | Đề xuất trang/section nội dung tĩnh đã duyệt                                                        | `FRONTEND MISSING / NEEDS CLARIFICATION`; không cần CMS API chỉ vì có link. Link phúc khảo không chứng minh có API appeal.                                                                                  |
| Header logout                                                   | `POST /auth/logout` → 204, xem mục 6                                                                | Hiện không có binding; đề xuất dùng action chung, không route GET gây logout.                                                                                                                               |
| Mở/đóng Student modal                                           | State frontend                                                                                      | Cần dialog semantics/focus/escape; ưu tiên đưa về LoginForm chuẩn thay hai luồng login khác nhau.                                                                                                           |
| Submit modal SBD/PIN + remember + forgot SBD                    | Không có contract này trong Auth                                                                    | Form không có method/action; ba inputs không có name. Không chứng minh password đã lộ query trong bản Stitch này; **không port default-GET form** thành form credential có name. Giữ POST fallback của app. |

Hai anchor `#quy-che` và `#quick-guide` không có element ID đích trong S10; `#role-portals` và `#teacher-portal-card` có. Các anchor `#` còn lại chỉ placeholders. Không tự tạo route từ `data-path` tiếng Việt.

## 5. S11: Login và contract xác thực

### 5.1 Những gì thiết kế thực sự có

S11 trộn login guest với banner phiên Teacher đang hoạt động và panel thiết bị. Ba panel `form-student`, `form-lecturer`, `form-admin` là **div, không phải HTML form**; login buttons chỉ gọi `triggerLoginSuccess` để hiện toast. Không có fetch/XHR/axios tới Auth. Quick Demo chỉ đổi tab và toast; không xác thực hoặc cấp role thật.

| Thành phần S11                                                        | Source ExamSpace hiện tại                                        | Mapping đề xuất                                                                                                                     |
| --------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Student SBD hoặc email + password                                     | `loginSchema` chỉ email hợp lệ + password                        | Baseline đổi label thành Email, không chấp nhận SBD giả. Candidate identifier là scope riêng.                                       |
| Mã phòng nhanh tùy chọn                                               | Không có room code resolver; start dùng UUID assignmentId        | Không truyền room vào login DTO hoặc tự chọn assignment.                                                                            |
| Teacher email/password                                                | Khớp Auth chung                                                  | Tái dùng LoginForm, không viết Auth Teacher riêng.                                                                                  |
| Teacher Khoa/Bộ môn select                                            | Không có model/field tương ứng                                   | Không gửi department làm quyền; bỏ/tách sau chốt.                                                                                   |
| Admin ID/password + OTP 6 số                                          | Backend vẫn email/password, không MFA/Hardware Key               | Không bỏ qua OTP nhưng vẫn gắn badge “2FA OK”; baseline bỏ lời hứa MFA, extension cần thiết kế enrollment/challenge/recovery.       |
| Remember session / “8 tiếng”                                          | Cookie access 15 phút, refresh 7 ngày; DTO không có remember/TTL | Không thay TTL chỉ ở client. Có thể bỏ checkbox trong baseline; đổi policy cần backend review. Không lưu password/PIN localStorage. |
| Google Workspace / Microsoft Teams; SSO/VNeID/LDAP/SAML được quảng bá | Không có provider/redirect/callback/link-account                 | Chưa hỗ trợ; không thêm OAuth trong đợt UI nếu chưa được giao.                                                                      |
| Forgot password/SBD, recover Teacher, hardware-key recovery           | Admin có reset-password, không có public self-service recovery   | Không dùng Admin reset API làm public forgot-password. Cần quy trình xác minh riêng nếu nhận scope.                                 |
| Hiện/ẩn mật khẩu                                                      | Inline JS đổi input type                                         | Có thể bổ sung frontend với label/pressed state, không lộ mật khẩu qua URL/log/toast.                                               |
| Ba role tabs                                                          | Role chỉ có `ADMIN`, `TEACHER`, `STUDENT` từ backend             | UI `lecturer` là nhãn Teacher; tab chỉ gợi ý nội dung. Login response role quyết định redirect, không tab đã bấm.                   |
| Quick Demo ba tài khoản và dữ liệu prefill                            | Source thật không có auth bypass                                 | Không port credential mẫu hoặc instant role switch vào production login.                                                            |

### 5.2 Login states: thiết kế so với code

| State                      | Stitch S11                                                                | Source đang có / yêu cầu giữ khi redesign                                                                                       |
| -------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Initial                    | Student panel prefilled, hai panel khác hidden; Teacher profile luôn hiện | Email/password trống trong LoginForm; guest không nhìn profile mock.                                                            |
| Client validation          | Không có form submit validation thật                                      | RHF/Zod, email/password errors, field associations giữ nguyên.                                                                  |
| Submitting/double click    | Toast thành công ngay, không loading thực                                 | `isSubmitting`, disabled fieldset/button; không gửi hai request vì thay tab/Enter.                                              |
| 401 sai mật khẩu/inactive  | Không có UI riêng                                                         | `serverError` role alert; ở lại login, không hiện role workspace trước khi xác thực.                                            |
| CSRF 403                   | Không có                                                                  | Hiện lỗi; sửa cấu hình trusted Origin khi cần, không bypass middleware.                                                         |
| Network/5xx                | Không có                                                                  | Hiện lỗi retry hợp lý; không coi toast demo là thành công.                                                                      |
| Success + role redirect    | Chỉ toast, không navigation                                               | `api.login(email,password)` → safe CurrentUser → `/dashboard/${role.toLowerCase()}` + refresh.                                  |
| No JavaScript              | Các div/buttons không đăng nhập được                                      | Giữ `method="post" action="/login/unavailable"`, noscript, route POST 400/no-store; không credential GET.                       |
| Trước hydration            | Không có ready gate                                                       | `useSyncExternalStore` ready false ở SSR; khóa inputs/submit đến khi ready.                                                     |
| Session hết hạn / refresh  | Chưa có                                                                   | API client credentials include, refresh rotation và coalescing theo module/tab; không suy đã giải quyết mọi SSR/multi-tab race. |
| Đã login truy cập `/login` | Banner mock đồng thời với login form                                      | Cần chốt “về workspace”/đổi tài khoản; không tự gọi logout khi render page hoặc đổi role tab.                                   |

### 5.3 Auth API hiện hữu, request/response và quyền

Nguồn chính: [AuthController](../apps/api/src/auth/auth.controller.ts), [AuthService](../apps/api/src/auth/auth.service.ts), [guards](../apps/api/src/auth/guards.ts), [CSRF middleware](../apps/api/src/common/csrf.ts), [LoginForm](../apps/web/src/components/login-form.tsx), [API client](../apps/web/src/lib/api.ts), [fallback POST](../apps/web/src/app/login/unavailable/route.ts).

| Contract có sẵn              | Request                                                              | Response / chính sách                                                                                                                                  |
| ---------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST /auth/login`           | JSON `{email,password}`; credentials include; trusted Origin/Referer | 200 `{id,email,fullName,role}` + hai HttpOnly cookies. Không trả access/refresh token hoặc passwordHash trong JSON. Active user + Argon2; 401 khi sai. |
| `GET /auth/me`               | Access cookie                                                        | 200 safe user theo AuthGuard hoặc 401; backend kiểm role thực/isActive/tokenVersion. Header phải đọc từ đây, không hard-code.                          |
| `POST /auth/refresh`         | Refresh cookie, trusted Origin/Referer                               | 200 safe user + cookie rotation; CAS stored hash chống replay. Không nhận role/session TTL từ tab login.                                               |
| `POST /auth/logout`          | Refresh cookie nếu có, trusted Origin/Referer                        | 204 và clear cả hai cookies; phạm vi invalidation có điều kiện ở mục 6. Không có JSON list thiết bị/revoked count.                                     |
| `POST /auth/change-password` | Authenticated JSON `{currentPassword,newPassword}`                   | 204 + clear cookies; hash mới và tăng tokenVersion. Không phải forgot-password public.                                                                 |
| `POST /login/unavailable`    | Native form fallback tại Next, không parse/log credentials           | 400 text/no-store, yêu cầu bật JS; là fallback an toàn, không phải hệ thống login server mới.                                                          |

Login/refresh/logout có `@Public` vì chưa có access token vẫn cần dùng; **CSRF middleware vẫn áp dụng mọi mutation**. Cookie SameSite Lax/path `/`, Secure khi production. Browser không tự đọc/ghi HttpOnly token để xây session management. CLI cũng cần trusted Origin theo cấu hình hiện hành.

## 6. Logout: thiết kế, source và phạm vi phiên

### 6.1 Bốn dạng control, không có resource thứ ba

1. Header S10/S11 có logout icon, `aria-label/title`, nhưng không có handler. Profile/role pill có mũi tên trang trí; không có dropdown profile điều khiển được trong HTML.
2. S11 banner có “Đăng xuất thiết bị này” và “Đăng xuất tất cả phiên”, mở cùng `logout-modal` với hai đoạn copy khác nhau.
3. Modal hidden có “Hủy bỏ” và “Đồng ý đăng xuất”; JS `executeLogoutAction` xóa banner rồi toast. Không gửi request, không clear cookie/cache, không redirect.
4. Hai cards thiết bị có “Hủy phiên”; `terminateSession` chỉ giảm opacity/disable nút/toast. Ba devices, IP/location/browser/last seen đều mock, không phải phiên thật của tài khoản development.

Không có route đích hoặc trang hậu logout trong Stitch. `/login` là đích của **source hiện tại**, không phải destination đã xác nhận trong thiết kế mới. Đề xuất giữ `/login`; nếu đổi về public `/`, cần chốt guest header và cache behavior.

### 6.2 Chính sách source thực tế

[DashboardShell](../apps/web/src/components/dashboard-shell.tsx) đang `await api.logout()` rồi ở `finally` gọi `queryClient.clear()`, `router.replace('/login')`, `router.refresh()`. Đây là logout có gọi backend, không chỉ redirect. Tuy nhiên, lỗi network/403 vẫn vào `finally`: **điều hướng không chứng minh server đã vô hiệu hóa phiên**. Khi triển khai UI phải phân biệt pending/error/cookie cleanup và không báo “đã thu hồi tất cả” khi chưa biết kết quả.

[AuthService.logout](../apps/api/src/auth/auth.service.ts) xác minh refresh JWT được ký, chưa hết hạn và đúng kind. CAS `where {id,tokenVersion:payload.version}` rồi clear `refreshTokenHash`, increment `tokenVersion`. AuthGuard so version trên mỗi access request: các access JWT cũ cùng version của tài khoản mất hiệu lực sau cập nhật thành công, không chỉ JWT trên browser bấm logout. Một User chỉ có **một refreshTokenHash**, không có Session/device model hoặc claim session ID.

Không có/invalid refresh cookie thì controller vẫn trả 204 và clear browser cookies; service cũng bắt lỗi. Vì response không trả số phiên hoặc trạng thái revoke, **không coi mọi 204 là bằng chứng đã thu hồi account-wide thành công**. Rotation CAS không biến một hash chung thành inventory nhiều thiết bị. Login mới thay refresh hash, không tạo bản ghi device/session có thể liệt kê.

| Ý định UI                                                      | Backend hiện tại đáp ứng tới đâu?                                                    | Kết luận triển khai                                                                                                       |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Một nút “Đăng xuất” theo policy hiện hữu                       | Có endpoint/cookie clearing/version invalidation                                     | `UI NEEDS REDESIGN`; có thể dùng API cũ, copy phản ánh chính sách, tests kiểm server và cache.                            |
| “Chỉ thiết bị này”, các thiết bị khác tiếp tục refresh độc lập | Chưa có session isolation/per-device hashes                                          | `BACKEND API MISSING`, có thể `DATABASE CHANGE REQUIRED` nếu nhận scope. Không hứa current-only bằng API logout hiện tại. |
| “Tất cả phiên” với inventory/revoked count chính xác           | Có global version invalidation có điều kiện, nhưng không list/count/session registry | Không dựng con số 3 từ mock. Scope all-vs-current riêng cần thiết kế hợp đồng và fail cases.                              |
| List thiết bị và hủy một device cụ thể                         | Không có endpoint/model/metadata thực                                                | `BACKEND API MISSING / DATABASE CHANGE REQUIRED` có điều kiện. Chưa đề nghị migration trong đợt baseline.                 |

### 6.3 Luồng đề xuất cho UI Phase 1–3

Nhấn action → dialog có focus đúng → nếu có draft/pending autosave, hiển thị trạng thái thật và áp chính sách rời trang được chốt → disable confirm trong request → `POST /auth/logout` qua client/cookie/CSRF hiện có → xử lý response/error rõ ràng → chặn các request cũ cập nhật lại UI, xóa cache dữ liệu riêng và state phiên → replace `/login` + refresh → Back/Forward/direct URL không được hiện dữ liệu người trước.

Không tự submit bài thi khi logout. Không in dòng Stitch “mọi bài làm/nháp đã lưu an toàn” nếu AnswerAutosave còn dirty/in-flight/error/conflict. Cần chọn flush thành công, retry hoặc xác nhận bỏ local draft; deadline và scheduler backend vẫn hoạt động. Không clear queue trước quyết định làm mất đáp án. Không đọc hoặc xóa HttpOnly cookie bằng JavaScript; khi request chưa tới server, redirect không bảo đảm cookie/server revoke.

`queryClient.clear()` là nền hiện có; cần test/cân nhắc hủy query đang chạy, session generation, unmount state và cache key theo user để response cũ không tái xuất hiện. Cross-tab broadcast/cache clearing chưa có bằng chứng được triển khai; đây là hạng mục cần thiết kế/test, không tuyên bố đã có trong source.

## 7. Mapping V2: screen → route/API/UI gap/backend gap

Route đặt trong dấu ngoặc “đề xuất” chưa tồn tại. `ALREADY IMPLEMENTED` chỉ mô tả năng lực API/source, không chứng nhận UI bằng Stitch hoặc runtime PASS.

| Stitch screen           | Screen ID                                            | Role           | Next.js route                                                                | Existing API                                                          | UI gap                                                             | Backend gap                                                                                    |
| ----------------------- | ---------------------------------------------------- | -------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| S01 kết quả cá nhân     | `f325ae1f243e4ef499f7a9ee8fed9500`                   | Student        | `/student/results`, `/student/results/[id]`                                  | `GET /results`, `GET /results/:id`                                    | `UI NEEDS REDESIGN`: score/history/policy states                   | Rank/mastery/certificate/AI chưa có; không đổi core Results                                    |
| S02 brief               | `14080259993187939031`                               | Chung          | Không route                                                                  | Không áp dụng                                                         | Brief, không tạo page                                              | Không áp dụng                                                                                  |
| S03 grading studio      | `da7e07a6d4314f01b0b83abfd4ed5cfc`                   | Teacher        | `/teacher/results/[id]` hiện chỉ detail; studio là đề xuất                   | Results đọc, GradingService nội bộ                                    | `FRONTEND MISSING` cho studio                                      | `BACKEND API MISSING`: essay/rubric/manual review/annotation/audio/OCR; migration có điều kiện |
| S04 adaptive practice   | `93d39920ec5f43dfa27f8d7321171646`                   | Student        | Practice route mới chỉ đề xuất                                               | Questions/renderer tái sử dụng có kiểm soát                           | `FRONTEND MISSING`                                                 | Practice session/hints/AI/mastery chưa có; không nới deadline/answer-key của exam              |
| S05 soạn đề             | `f4223e051e7342cf95c9db2deda3e0b5`                   | Teacher        | `/teacher/exams`, `/new`, `/[id]`, `/[id]/edit`; bank/questions; assignments | Questions, Exams/preview/publish/new-version/versions, Assignments    | `UI NEEDS REDESIGN`, giữ order/points/version selector             | Core đã có; ordering/partial credit/media/AI ngoài baseline                                    |
| S06 bài đã chấm         | `17928e8b99df49249a2e157d92c5b3b1`                   | Student        | `/student/results/[id]`                                                      | `GET /results/:id`                                                    | `UI NEEDS REDESIGN` cho core; feedback cá nhân thiếu               | Annotation/voice/appeal/essay chưa có; lời giải snapshot có sẵn                                |
| S07 reports             | `7715e0a7718c4f5890dcccc0e2677825`                   | Admin/Teacher  | `/admin/exams`, `/teacher/results`, `/teacher/exams/[id]/results`            | Exams counts/list, Assignments, `GET /results/exams/:id`              | `UI NEEDS REDESIGN`, bảng/paging/scope thật                        | Histogram/item analysis/export/cohort actions nâng cao chưa có                                 |
| S08 phòng thi           | `dc01b574a74a400d91ca5c8a4efda87d`                   | Student        | `/student/exams` → `/student/attempts/[id]`                                  | Start/get/answer/review/submit                                        | `UI NEEDS REDESIGN`, ba types hiện có và queue giữ nguyên          | Ordering/proctor/AI/scratchpad persistence chưa có contract; core không cần mới                |
| S09 hidden phòng thi    | `c5586e30ca7244fb87e21c2baabc1895`                   | Student        | Cùng route S08                                                               | Cùng S08                                                              | HTML trùng; không tạo route/workflow thứ hai                       | Cùng S08                                                                                       |
| **S10 Public Homepage** | `59c106effe8e42e3993e50c968ecc043`                   | Guest/các role | **`/` (đề xuất landing)**; hiện redirect `/login`                            | Optional `/auth/me` cho header; static content không cần API          | `FRONTEND MISSING`, chốt guest/auth variants và nav                | Không gap cho static baseline; public live schedule/SSO/SBD/audit thiếu nếu giữ                |
| **S11 Login**           | `12ddb4b383d049be95e4706b6ead4cfb`                   | Guest, ba role | `/login`, fallback `/login/unavailable`                                      | `/auth/login`, `/auth/me`, `/auth/refresh`                            | `UI NEEDS REDESIGN`, bảo toàn states hiện có                       | Core email/password `ALREADY IMPLEMENTED`; SBD/PIN/MFA/OAuth/recovery là gap riêng             |
| **S11 Logout action**   | `12ddb4b383d049be95e4706b6ead4cfb` (icon cũng ở S10) | Authenticated  | Action trong shell; đích `/login` hiện tại; không cần GET `/logout`          | `POST /auth/logout`                                                   | Dialog/loading/error/cache/back-history cần thiết kế               | API hiện có cho generic logout; current-only/devices không có                                  |
| **Admin Dashboard**     | Không có resource riêng                              | Admin          | `/dashboard/admin`                                                           | `GET /dashboard/admin` → `{user,section}`, Users/Classes/monitor APIs | `NEEDS CLARIFICATION` về thiết kế; không coi S07 là toàn dashboard | Không có KPI system/session/proctor feed; không cần API mới để hiển thị account/nav            |
| **Teacher Dashboard**   | Không có resource riêng                              | Teacher        | `/dashboard/teacher`                                                         | `GET /dashboard/teacher` → `{user,section}`; owned/scoped module APIs | `NEEDS CLARIFICATION`; role card S10 không phải screen này         | KPI mới cần contract riêng, không lấy số mẫu làm data                                          |
| **Student Dashboard**   | Không có resource riêng                              | Student        | `/dashboard/student`                                                         | `GET /dashboard/student` → `{user,section}`, own assignments/results  | `NEEDS CLARIFICATION`; giữ entry navigation                        | Không có adaptive/rank/proctor metrics trong dashboard API                                     |

Users/Admin Classes/Teacher Classes/Question Bank/Assignments/Student assigned list vẫn cần giữ routes, form/detail/edit/pagination dù Stitch không có resource độc lập. Không thay chúng bằng role portal cards. Mapping 20 nhóm K01–K20 và contracts C01–C18 trong V1 vẫn có hiệu lực vì source/HTML cũ giữ nguyên.

### 7.1 Models được tái sử dụng

- Auth/header: `User`, `Role`; không trả passwordHash/refreshTokenHash/tokenVersion như profile DTO.
- Homepage lịch cá nhân: `ExamAssignment`/recipient ClassMember và pinned `ExamVersion`; không expose roster hoặc private snapshot ra public.
- Exam editor: `Question`, `QuestionOption`, `MatchingPair`, `Exam`, `ExamQuestion`, `ExamVersion`.
- Workspace/results: `ExamAttempt`/`AttemptAnswer`, reviewQuestionIds, revision, deadlineAt và attempt snapshot; metadata/grade giữ đúng version.
- Không có Session/device, SBD/PIN/room-code, Department/Faculty, MFA provider, Notification/AuditLog nghiệp vụ, practice/OCR/annotation models. Tạo bảng mới chỉ sau yêu cầu/contract/migration review riêng.

## 8. Design system, responsive và accessibility

`list_design_systems` đọc được **Academic Focus**, `assets/5dc43d0355f042f999caea23b13210e7`, version **1**. So sánh canonical JSON: design-system payload và project designTheme **giống V1**. Không phải design-system mới chỉ vì thêm hai screens.

| Nhóm                | Giá trị thật / gap                                                                                                                                           | Hướng triển khai đề xuất                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Colors              | Machine/HTML primary `#3525cd`, primary-container `#4f46e5`, secondary `#006c49`, error `#ba1a1a`; surface `#faf8ff`, lowest `#ffffff`, on-surface `#131b2e` | CSS semantic tokens/on-color, focus/disabled/error; prose MD còn dùng primary `#4f46e5`, green `#10b981`, slate khác. Chốt một palette thay vì âm thầm chọn theo class name. |
| Type/icons          | Plus Jakarta Sans 400/600/700; display40/52, mobile30/38; body15/24 và18/28; Material Symbols                                                                | Dùng font pipeline và icon components của app; kiểm glyph tiếng Việt. Không đưa CDN Tailwind/inline scripts vào Next.                                                        |
| Radius/spacing      | Project ROUND_EIGHT; prose base8px nhưng HTML default4/lg8/xl12; gutters24/mobile12, margins32/mobile16                                                      | Chốt scale rồi map Tailwind 4/CSS vars; không copy toàn tailwind.config CDN.                                                                                                 |
| Layout S10          | Hero flex column → lg row, role grid md2/lg3, schedule grid, footer stack                                                                                    | Giữ reading order; mobile nav hiện `hidden xl:flex`, không có menu drawer/toggle thay thế. Cần bổ sung nav truy cập được.                                                    |
| Layout S11          | Login grid lg12 chia5/7, role tabs stack ở nhỏ, devices stack/md row                                                                                         | Screenshot chỉ desktop. Test 390/768/1024/1440, zoom200%, keyboard; form không clip/overflow.                                                                                |
| Shell/auth states   | Guest/auth UI bị trộn; tên/avatar/role và số devices hard-code                                                                                               | Shared PublicHeader/AuthenticatedNav/AuthStatus; nhận CurrentUser thật, guest/error/pending riêng, nav theo role.                                                            |
| Modal               | `student-modal`/`logout-modal` là div hidden, không role dialog/aria-modal                                                                                   | Focus trap, labelledby/describedby, Escape/cancel, restore focus, inert background; confirm/error announcement.                                                              |
| Form/tabs/toast     | S11 có labels nhưng thiếu form semantics; role-tab buttons không ARIA tabs đầy đủ; password icon không có accessible name riêng; toast không live region     | Native form Enter/submit; label-for, autocomplete, aria-invalid/describedby, tabs keyboard hoặc đơn giản button-group phù hợp; live status/alert có nhãn.                    |
| Tables/links        | Schedule table có header; filter chưa có control; nhiều links# hoặc anchor thiếu đích                                                                        | Caption/scope labels, focus-visible, filter search labels/reset, pagination thật; horizontal overflow trong container. Không đếm placeholder làm chức năng.                  |
| Scroll/motion/theme | Global scrollbar hidden, overscroll none; DOM fade/timer toast; chỉ LIGHT design                                                                             | Không ẩn scrollbar toàn app; reduced motion; giữ dark mode hiện có hoặc chốt riêng; kiểm contrast thực, không suy “WCAG đạt” từ prose.                                       |

Components cần xây khi được giao: tokens/typography, logo đã chốt, public header/footer, role entry card, schedule/information section, auth form shell, password toggle, role-hint group, auth status, authenticated profile navigation, logout dialog, loading/error/empty/status states; tái sử dụng Button/Input/Card/Pagination. Không tạo SessionDeviceCard nối dữ liệu giả trong baseline.

## 9. Backend gap và migration theo phạm vi

| Phạm vi                                            | API mới?                                                         | Migration mới?                                | Quyết định                                                                                                         |
| -------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Static landing/approved help/privacy               | Không                                                            | Không                                         | Frontend content/routes; không dựng CMS backend để thay copy demo.                                                 |
| Existing email/password/refresh/me/logout          | Không                                                            | Không                                         | Tái dùng hệ hiện tại; UI phải phản ánh chính sách thực và error states.                                            |
| Role-aware nav/current account/dashboard account   | Không                                                            | Không                                         | Dùng CurrentUser/server role; không client role escalation.                                                        |
| Schedule cá nhân                                   | Không cho dữ liệu hiện có                                        | Không                                         | Dùng assignments scoped, pin version, pagination; không public hóa.                                                |
| Schedule public trực tiếp/live và faculty/code/PDF | Có thể cần public projection/export; faculty/code chưa có domain | Chỉ nếu phải lưu domain mới                   | Chốt thông tin được công bố và source-of-truth, không trả private key/recipients.                                  |
| Current/all/per-device sessions                    | Cần contract session inventory/revoke nếu nhận đủ UI             | Có điều kiện, thường cần Session model/claims | Giữ global tokenVersion cho revoke-all; thiết kế per-session hash/sid/revokedAt riêng, review security trước code. |
| SBD/PIN/room login                                 | Cần identifier/resolver/auth policy                              | Có thể cần unique identifier, room/token/TTL  | Rate limit, tránh enumeration, ownership/recipient; không thay email contract tự phát.                             |
| OAuth/SSO/MFA/self-service recovery                | Cần flows/provider/challenge/recovery                            | Có điều kiện theo storage cần thiết           | Không chốt provider hoặc thêm dependency trong audit.                                                              |
| Notifications/audit/proctor/analytics nâng cao     | Chưa có contract tương ứng                                       | Theo retention/events/domain đã duyệt         | Không lấy log file hoặc thông tin cluster làm API public.                                                          |
| AI/OCR/manual grading/adaptive/ordering            | Theo N01–N12 V1                                                  | Theo đặc tả riêng                             | Không nhập vào UI Phase 1–3 chỉ vì xuất hiện trên landing mới.                                                     |

**Không đề xuất thực thi migration nào trong nhiệm vụ này.** Cả năm SQL migrations hiện hữu và schema giữ nguyên; các model ở cột đề xuất không phải SQL đã được phê duyệt.

## 10. Quyết định còn thiếu và rủi ro Phase 1–3

1. **Brand/content:** đổi EduTest → ExamSpace; logo hợp lệ; footer/năm/thông tin hỗ trợ; bỏ hoặc xác nhận các tuyên bố AI/SSO/2FA/SLA/thành tích. Không công bố số mẫu như số thật.
2. **Homepage:** chốt `/` public và guest/auth variants; nội dung lịch tĩnh công khai hay own assignments; link login so với workspace khi đã login; mobile navigation.
3. **Login:** một form chung email/password, role tabs là hint hay bỏ; không có SBD/PIN/department/OTP/remember8h/quickdemo trong baseline; entry link không đồng nghĩa auto-start.
4. **Logout:** một action theo policy hiện tại hay mở rộng session isolation; wording account-wide có điều kiện; destination `/login` hoặc `/`; pending/error/retry/cancel; draft loss và cache/back navigation.
5. **Separate sessions:** chỉ có quyết định và contract riêng mới triển khai devices/all/current; dữ liệu IP/location/last seen kéo theo privacy/retention/metadata accuracy.
6. **Dashboard:** cần thiết kế thích nghi/chốt riêng cho ba vai trò; không có màn thật để gọi “đã phân tích layout dashboard mới”.
7. **Safety:** không thay JWT/CSRF/RBAC, ownership/roster scope, version snapshot, autosave revision/409, deadline/scheduler, grading hoặc visibility vì UI mới. Không cho public landing query dữ liệu của học viên khác; private header/response phải tránh public cache.

Thứ tự đã cập nhật theo yêu cầu: **Shared DS → Homepage → Login → Logout/session navigation → Admin → Teacher → Student → Workspace → Results/Reports → Integration/browser E2E**. Tích hợp và regression thực hiện ở từng bước, không chờ bước cuối mới test auth/queue. Chi tiết gates và extensions trong kế hoạch V2.

## 11. Kiểm tra báo cáo và bảo toàn

- Chỉ thêm `STITCH_EXAMSPACE_SCREEN_AUDIT_V2.md` và `STITCH_EXAMSPACE_IMPLEMENTATION_PLAN_V2.md`; giữ nguyên byte hai báo cáo V1 và **248/248 file baseline**. HEAD/branch/index và mọi local changes có sẵn giữ nguyên.
- Format hai file V2, kiểm các liên kết local và đủ screen IDs, đối chiếu 9 resource cũ/2 mới/8 HTML cũ, Git diff check và exact-path preservation. Evidence ghi riêng ngoài repository.
- **Không chạy typecheck/lint/build/unit/integration/browser ứng dụng**: đây là audit/document-only, không có app code được chỉnh. Không ghi các bước đó PASS; không cộng tests lịch sử thành tests V2. Responsive/a11y được phân tích HTML/ảnh, chưa browser/axe retest.
- Evidence: `%TEMP%\examspace-stitch-v2-20261101-4e6ac5b2`, gồm baseline hashes, MCP metadata/HTML, comparison, cuối project/list, quality và preservation. HTML/screenshots là project PRIVATE; không đưa raw assets, credentials hoặc nội dung `.env` vào repo.

**Kết luận V2:** hai screen mới đã được đọc thật. Có thể lập đợt UI Phase 1–3 trên backend đang có sau khi chốt các quyết định trên; chưa có code redesign hoặc API/session migration nào được thực hiện.
