# ExamSpace — Stitch UI-01–UI-04: Foundation, Homepage, Login & Logout

## 1. Kết luận và phạm vi

**IMPLEMENTATION PASS** trong phạm vi UI-01 Shared Design System, UI-02 Homepage S10, UI-03 Login S11 và UI-04 logout/session navigation hiện hữu trên môi trường test được mô tả dưới đây. Chưa redesign Admin/Teacher/Student management, Exams/Attempts/Results; chưa chứng nhận production hoặc WCAG toàn hệ thống.

- Ngày kiểm tra: **01/11/2026, Asia/Saigon**.
- Worktree triển khai: `C:\Môn Học\ThucTapNgheNghiep\ExamSpace-Stitch-UI`.
- Branch: `feature/stitch-examspace-ui`; baseline/HEAD: `a1e2891754e399aa4743e32c8218759938149bdc`.
- Repository Phase 3 gốc: `C:\Môn Học\ThucTapNgheNghiep\Online-Examination-System-Git`, branch `feature/phase-3-examination`, giữ nguyên HEAD, index, status và **250/250 file baseline** gồm các local changes và báo cáo private. Không chuyển branch trong working tree gốc.
- Worktree UI đã được tạo từ đúng baseline trong đợt foundation trước và được tái sử dụng cho yêu cầu UI-01–UI-04. Đầu đợt hoàn thiện đã xác minh branch/HEAD và snapshot 248 file; giữ các thay đổi UI có sẵn. Đợt hoàn thiện chỉ sửa tiếp sáu file source/tests và báo cáo này; không tạo worktree hoặc branch trùng. Chưa commit, stage, push, merge, rebase, reset hoặc clean; không sửa Pull Request Phase 3.
- Báo cáo này nằm trong **worktree UI**, không được ghi ngược vào repository gốc. Các báo cáo Stitch V1/V2 ở repository gốc đã được đọc và giữ nguyên.

## 2. Thiết kế Stitch đã đọc thật

Project được `get_project` xác minh: **Multi-Role Education Portal**, `16397645008301072963`, PRIVATE/OWNER; updateTime lúc đọc `2026-11-01T04:50:14.924886Z`.

| Nguồn            | ID/resource                                         | Bằng chứng sử dụng                                                                              |
| ---------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| S10 Homepage     | `59c106effe8e42e3993e50c968ecc043`                  | `get_screen`; `download_file` HTML và PNG; đọc HTML/CSS/handlers, xem ảnh desktop 2560×5508     |
| S11 Login/Logout | `12ddb4b383d049be95e4706b6ead4cfb`                  | `get_screen`; `download_file` HTML và PNG; đọc cả panel/modal hidden, xem ảnh desktop 2560×2990 |
| Academic Focus   | `assets/5dc43d0355f042f999caea23b13210e7`, version1 | Project theme và `list_design_systems`, tokens/typography/guidelines                            |

Hai file mỗi screen dùng resource `projects/16397645008301072963/screens/<screenId>/fileEntries/html` và `/fileEntries/screenshot` đúng tên MCP trả về. Không dùng signed URL để đoán assets; không sửa project/screens/design system. Đợt UI-01–UI-04 đã gọi lại cả bốn tools đọc bắt buộc và tải/xem lại HTML/PNG của hai screen; project updateTime, hai HTML và design-system version vẫn như đợt foundation. Screenshot chỉ là reference thị giác, không phải bằng chứng API hoạt động.

Tài liệu đã đối chiếu: AGENTS, bốn báo cáo Stitch V1/V2, Phase 3 release summary, source Auth/API/queue/schema và các route hiện hữu. Source implementation dựa baseline Phase 3 đã commit, không copy source từ workspace cũ hoặc mang dirty changes của repository gốc sang worktree.

## 3. Shared Design System

Đã áp semantic tokens trong [globals.css](../apps/web/src/app/globals.css), cập nhật [layout](../apps/web/src/app/layout.tsx), Button/Input/Card và thêm components dùng chung. Không thêm dependency, không đổi lockfile hoặc dùng Tailwind CDN/inline scripts của Stitch.

| Token                  | LIGHT                 | DARK                  |
| ---------------------- | --------------------- | --------------------- |
| Canvas                 | `#faf8ff`             | `#111526`             |
| Surface / soft surface | `#ffffff` / `#f2f3ff` | `#1b2135` / `#242c45` |
| Main text / muted      | `#131b2e` / `#464555` | `#eef0ff` / `#c5c9df` |
| Primary / on-primary   | `#3525cd` / `#ffffff` | `#bcb7ff` / `#21146d` |
| Success / error        | `#006c49` / `#ba1a1a` | `#70e5b1` / `#ffb4ab` |
| Border / focus         | `#d9d7e6` / `#4f46e5` | `#414a65` / `#c3c0ff` |

Contrast tính theo sRGB: primary button LIGHT **9,14:1**, muted trên soft LIGHT **8,49:1**, primary button DARK **8,20:1**, muted trên soft DARK **8,41:1**. Đây là bốn cặp cụ thể, không đại diện mọi tổ hợp màu. Axe được chạy thêm trên DOM thực.

**Plus Jakarta Sans** được đóng gói local bằng Next local font, variable weight200–800, display swap, có OFL license tại `apps/web/src/app/fonts/OFL.txt`. Font lấy từ Google Fonts repository; kiểm cmap **104 ký tự tiếng Việt có dấu, 0 glyph thiếu** trong tập kiểm. Build/runtime không cần tải font từ Google. Lucide được tái sử dụng cho icons; logo ExamSpace bằng icon/text, không copy ảnh broken EduTest.

Layout dùng container tối đa1280–1440px, spacing dựa4/8/16/24/32, cards bo góc, controls tối thiểu44px ở navigation/password/dialog. Giữ scrollbar, focus-visible, skip links và semantic main/nav/form. Có reflow/mobile menu, reduced-motion rules. DARK là bộ thích nghi được kiểm tra, **không có screenshot DARK Stitch để tuyên bố khớp**.

## 4. Homepage S10

[Route `/`](../apps/web/src/app/page.tsx) đã là public landing thay vì redirect `/login`:

- Header logo, Trang chủ/Chức năng/Hướng dẫn, menu mobile hoạt động, theme toggle.
- Guest không có profile giả. `/auth/me` quyết định header authenticated và link `/dashboard/{role}`; có loading, guest401 và lỗi kiểm tra tài khoản kèm retry.
- Hero hai cột, hai CTA tới anchors thật, minh họa quy trình soạn → giao/làm → chấm/xem kết quả. Minh họa là hướng dẫn tĩnh, không phải dashboard/room trạng thái live.
- Ba role entry cards tới `/login?role=student|teacher|admin`; query chỉ chọn nội dung giới thiệu, không cấp quyền.
- Features thật: ngân hàng ba dạng câu hỏi, version/publish, assignments, autosave/review/nộp/kết quả theo policy.
- Hướng dẫn tối giản đã đối chiếu source: dùng tài khoản được cấp, xem lịch/số lượt bài được giao, theo dõi trạng thái lưu và nộp bài. Không bịa quy định giám sát, số điện thoại hoặc chính sách phúc khảo.
- Footer dùng routes/anchors có đích thật. Không còn CTA `href="#"` trong các components mới.

Không render thống kê thành tích, lịch thi công khai động, SBD/PIN, AI proctor, SSO/MFA, notifications unread hoặc cluster/SLA mẫu. Homepage tĩnh không có API CMS/schedule public mới và không công khai assignments/roster/private snapshot.

## 5. Login S11

[LoginForm](../apps/web/src/components/login-form.tsx) dùng [AuthPageShell](../apps/web/src/components/auth-page-shell.tsx): story bên trái, form card bên phải, ba role hints và email/password chung. Role hints là button group `aria-pressed`, không giả thành các tab có panel khác nhau hoặc quyền tài khoản khác nhau.

- Giữ RHF/Zod và contract `POST /auth/login {email,password}`. `GET /auth/me`, refresh CAS, HttpOnly cookies, credentials include, CSRF giữ nguyên.
- Redirect dựa **role backend trả về**, không hint/query/localStorage. Browser đã đăng nhập cả ba role với hint cố tình khác role thật.
- Email/password có labels, autocomplete, aria-invalid/describedby và error alert; có show/hide password với accessible names.
- Keyboard Enter, validation, pending/disabled, sai password/inactive401, CSRF403 và lỗi network được kiểm thật.
- Giữ `useSyncExternalStore` pre-hydration guard, disabled fieldset; `method="post" action="/login/unavailable"`, noscript và fallback POST400/no-store không parse/log body. No-JS và chặn bundle trước hydration vẫn không đưa password vào URL.
- Cancel/clear cache cũ khi đổi tài khoản; không thêm demo bypass, social login hoặc token storage mới.
- Trước đổi tài khoản, kiểm tra phòng thi đang mở như logout để tránh đổi cookie giữa một lượt làm bài. Hiển thị đúng lý do guard trả về; không báo có phòng thi khi thực tế browser thiếu BroadcastChannel.
- Authenticated revisit: thông báo tài khoản thật và link tiếp tục theo role từ `/auth/me`, dù role hint khác. Form vẫn cho đổi tài khoản có kiểm tra tab thi; không tự logout hoặc chuyển quyền theo hint. Khi `/auth/me` lỗi, ẩn cả identity cũ ở header lẫn thông báo này.
- Lỗi timeout có thông báo riêng, không khẳng định đã đăng nhập/đăng xuất thành công. Browser đã giữ request hơn 15 giây thực tế; retry gửi request thật và thành công.

Không có fields SBD/room PIN/department/OTP/remember8h; không tạo AuthService theo role hoặc public forgot-password API. Hướng dẫn quên mật khẩu/tài khoản là liên hệ quản trị viên phụ trách, không nút reset giả.

## 6. Logout và session safety

### 6.1 Một action hiện hữu, không quản lý thiết bị giả

[LogoutDialog](../apps/web/src/components/logout-dialog.tsx) được dùng trong PublicHeader authenticated và DashboardShell. Native modal dialog có title/description, initial focus ở Hủy, Escape/cancel và restore focus; confirm disabled khi pending, error alert, retry và thông báo trạng thái.

Luồng thành công: kiểm tra phòng thi → `POST /auth/logout` thật → nhận response → cancel queries/clear query cache → **document replace `/login`**. Việc tải document mới cũng bỏ Next router cache/component state của user cũ; không chỉ đổi URL trong khi giữ private tree.

Lỗi network/403 không chạy success cleanup/redirect trong `finally` như trước. Dialog nói rõ chưa xác nhận đăng xuất, phiên có thể còn hiệu lực và cho retry. Request login/logout có timeout15 giây ở bước gửi request; refresh đang chạy cũng có timeout15 giây trước khi mutation tài khoản được gửi. Đây là hai ngưỡng riêng: có thể chờ phần thời gian refresh còn lại rồi mới bắt đầu ngưỡng mutation. Không dùng redirect để chứng minh server revocation.

**Giới hạn contract backend được giữ nguyên:** 204 clear cookies nhưng không có response phân biệt refresh invalid/missing, số phiên hoặc kết quả CAS. Với signed refresh/version hợp lệ và update thành công, backend tăng account tokenVersion và clear hash; không phải current-device-only logout. UI không hứa thu hồi bao nhiêu phiên hoặc cô lập từng thiết bị. Không sửa AuthService để thêm các semantics đó.

### 6.2 Stale responses và nhiều tab

[SessionLifecycle](../apps/web/src/lib/session-lifecycle.ts) dùng generation fence cho API client: private response của epoch cũ, kể cả JSON body hoàn thành muộn, không được trả lại query cache. Khi login/logout thay cookie, chặn request/refresh mới và đợi refresh đang chạy kết thúc trước mutation để giữ thứ tự ghi cookie. Refresh coalescing/generation hiện có được giữ và retest qua HTTP/PG.

BroadcastChannel chỉ truyền thông báo account-changed + ID document, **không token, role hay PII**. [SessionChangeBoundary](../apps/web/src/components/session-change-boundary.tsx) bỏ qua thông báo tự phát, hủy/cache-clear và tải lại trang login ở tab khác để không giữ dữ liệu A khi cookie đã đổi sang B. Request cũ bị fence trước khi cache cập nhật.

Nếu một thay đổi phiên ngoài luồng bình thường gặp phòng thi vẫn mở, boundary không unmount queue hay âm thầm bỏ draft: che private view bằng dialog, giải thích chưa nộp/bỏ nháp và chỉ cho rời sau xác nhận mất dữ liệu chưa được server xác nhận. Đây không phải cơ chế phục hồi phiên đa thiết bị mới.

### 6.3 Phòng thi và draft

[Exam session guard](../apps/web/src/lib/exam-session-guard.ts) được đăng ký từ AttemptForm khi IN_PROGRESS, đọc state lưu hiện hữu; **không sửa AnswerAutosave core**. Logout/đổi tài khoản kiểm tra document hiện tại và hỏi các tab cùng origin. Nếu có phòng thi mở, chặn mutation và hướng dẫn quay lại xử lý bài làm/rời phòng thi trước. Không tự flush/submit/discard hoặc hứa “mọi đáp án đã lưu”. Pending/error/conflict có beforeunload confirmation để tránh đóng tab âm thầm.

Browser đã giữ PUT ở mạng, chọn đáp án, thử logout từ tab dashboard: **0 request logout**, SQL vẫn IN_PROGRESS và chưa có answer row; sau release request, queue lưu thật/reload state; đóng tab phòng thi rồi retry logout thành công.

Guard là cơ chế phối hợp client cùng origin với cửa sổ probe350ms, **không chứng nhận trạng thái mọi thiết bị/process hoặc tab bị đóng băng**. Browser không có BroadcastChannel bị chặn bởi guard; cần quyết định UX tương thích riêng nếu hỗ trợ các browser đó. Không tạo Session model để giả giải quyết giới hạn này.

## 7. Backend và database

| API tái sử dụng                                                     | UI sử dụng / quyền                                                       |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `POST /auth/login`                                                  | Email/password, safe CurrentUser/cookies; role từ backend                |
| `GET /auth/me`                                                      | Header/account identity, không lấy mock identity                         |
| `POST /auth/refresh`                                                | Existing rotation/CAS/coalescing; không role authority ở frontend        |
| `POST /auth/logout`                                                 | Generic logout, 204/cookie cleanup theo policy hiện hữu                  |
| `GET /dashboard/{role}`                                             | ADMIN/TEACHER/STUDENT theo backend; routes hiện hữu, không thêm KPI mock |
| Existing Users/Classes/Questions/Exams/Assignments/Attempts/Results | Regression thật; không viết lại modules/backend                          |

**0 API backend mới, 0 migration UI mới.** Mọi tracked file dưới `apps/api`, gồm AuthService/guards/CSRF/schema và **năm SQL migrations**, giữ đúng bytes tại HEAD. Các migration/checksums được đối chiếu trong evidence, không sửa migration history.

PostgreSQL test `127.0.0.1:15433/online_exam_phase3_test` trên container test hiện hữu, xác minh current_database/cluster identity SQL khác development. API4010 và web3010 dùng cấu hình test riêng, JWT secrets random trong TEMP; Playwright contexts/profile tách khỏi browser cá nhân. Không đọc `.env` development để start API, không seed/fixtures hoặc query database development. `.env` gốc chỉ được đọc trong bộ nhớ khi scan secrets, không copy sang worktree.

HTTP integration có migration preservation test: tạo database mới tên prefix test, áp **SQL hiện hữu** để kiểm dữ liệu/checksum. Không deploy vào development, không reset/drop database hoặc xóa volume; giữ các database test/evidence. Development container đang chạy ban đầu được giữ chạy; test container ban đầu stopped được dừng lại khi kết thúc.

## 8. Kết quả kiểm thử cuối

| Gate                                                   | Kết quả                                                                                 |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `corepack pnpm install --frozen-lockfile --offline`    | PASS ở đợt khởi tạo; không cài lại ở đợt hoàn thiện vì dependencies/lockfile giữ nguyên |
| `corepack pnpm db:generate`                            | PASS; chỉ generated ignored artifacts                                                   |
| `corepack pnpm typecheck`                              | PASS shared/API/web                                                                     |
| `corepack pnpm lint`                                   | PASS, không lỗi/cảnh báo lint                                                           |
| `corepack pnpm build`                                  | PASS shared/Nest/Next; local font không cần network lúc build                           |
| `corepack pnpm test`                                   | PASS: **17 tooling + 47 Jest (14 suites) + 17 frontend = 81 tests**                     |
| `corepack pnpm test:integration`                       | PASS: **39 HTTP/PostgreSQL/migration tests**                                            |
| `corepack pnpm test:e2e`                               | PASS: **52 browser tests = 34 Phase 1–3 + 18 UI foundation**                            |
| `corepack pnpm format:check`                           | PASS toàn worktree sau chuẩn hóa checkout newline và file report                        |
| `git diff --check`, index/security/source preservation | PASS                                                                                    |

**172 tests PASS, 0 FAIL, 0 skipped trong các lượt cuối**, không cộng lặp focused runs/reruns hoặc 165 tests của đợt foundation trước. Root81 + HTTP/PostgreSQL39 + browser52. 47 Jest gồm45 unit +2 PostgreSQL service tests; frontend gồm9 autosave +8 session/API tests. HTTP/browser không được tính thành coverage Jest. Không đo coverage mới hoặc tuyên bố CI/production đạt chuẩn.

### Browser evidence

- S10/S11 được chụp ở390/768/1024/1440; không tràn ngang document. Tám lượt axe trên Homepage/Login LIGHT, thêm Login DARK và authenticated revisit: 0 violations trong tập wcag2a/wcag2aa/wcag21aa đã chạy.
- P2 regression vẫn kiểm14 routes thật ở mỗi độ rộng, giữ assertions axe và overflow; cập nhật keyboard để đi qua skip link/navigation mới rồi tới Email.
- Keyboard/Tab/Enter/Escape, password toggle, dialog initial/restored focus, reduced motion, DARK, JS disabled và trước hydration được kiểm trong browser.
- Zoom native Edge **2.0** được set/get bằng extension test trong profile tạm cách ly cho cả Homepage và Login; viewport hiệu dụng khoảng707 CSS px từ cửa sổ1440, không tràn ngang. Có screenshots native zoom. Accelerator Ctrl++ không thay zoom trong headless; không dùng accelerator đó làm bằng chứng PASS. CSS zoom2 được kiểm bổ sung, không thay thế native zoom.
- Login thật ba role, empty/invalid email, wrong-password, inactive account, network và pending; Enter và double click gửi đúng một login; hint sai không nâng quyền. Logout cancel/error/retry/403, SQL tokenVersion, cookie clearing; A→logout→B, Back/direct wrong-role URL, delayed response và cross-tab cache đều đạt.
- UI07 chuyển tiếp response403 thật từ backend cho UI quan sát; **không mock success**. Native sibling-origin/no-cors attack được kiểm riêng bởi F06, SQL không có side effect.
- Các regression snapshot/version/metadata/roster scope, CSRF/refresh/logout CAS, autosave abort/delay/2 tabs/flush, matching keyboard/touch/mouse, deadline/races/rollback/scheduler và RBAC/IDOR tiếp tục đạt. Main E2E tạo ba dạng câu → publish/giao → làm/lưu/reload/nộp → PG chấm **6.75/6.75** → Student/Teacher/Admin xem kết quả đúng scope.

## 9. So sánh trực quan với Stitch

`MATCHED` là tương ứng cấu trúc/thành phần được quan sát, **không pixel-perfect**. `PARTIAL` là thích nghi theo baseline đã giao; `GAP` là phần reference chưa triển khai hoặc cố ý loại phạm vi.

| Phần                                 | Đánh giá                         | So sánh thực tế                                                                                      |
| ------------------------------------ | -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Palette/font/light surface           | MATCHED                          | Academic Focus, Plus Jakarta Sans local, indigo/green/slate, card hierarchy                          |
| S10 header/navigation                | PARTIAL                          | Brand ExamSpace, public/auth states thật, menu mobile; bỏ profile/notifications mẫu và nav trái role |
| S10 hero hai cột                     | PARTIAL                          | Giữ hierarchy/CTAs/card đối diện; dùng quy trình có thật thay ảnh phòng giám sát/timer/proctor giả   |
| S10 ba role cards                    | MATCHED                          | Student/Teacher/Admin cards, icon, mô tả, list, entry CTA; copy theo Phase 1–3                       |
| S10 lịch/metrics/proctor claims      | GAP, ngoài scope                 | Không có public schedule API hoặc metrics đã xác minh; không dựng dữ liệu giả                        |
| S10 features/guide/footer            | PARTIAL                          | Giữ sections và footer; tối giản nội dung được kiểm chứng, bỏ AI/OCR/IRT/phone giả                   |
| S11 hai cột, role choices, card/form | MATCHED về cấu trúc              | Có story/role summary và form card; hint không cấp role                                              |
| S11 credential/SSO/OTP/device panels | PARTIAL/GAP ngoài scope          | Email/password thật; không SBD/room/department/MFA/demo-login/devices                                |
| S11 logout dialog                    | PARTIAL                          | Confirmation visual tương ứng, thêm states thật/focus/error/retry; một action generic đúng backend   |
| DARK                                 | GAP reference, có implementation | Stitch chỉ LIGHT; bộ DARK thích nghi riêng, có ảnh và axe test                                       |

Screenshots app ở thư mục `examspace-ui-browser-*` trong TEMP; đường dẫn lượt cuối nằm trong evidence metadata. Các ảnh đã xem trực tiếp gồm desktop Homepage/Login, mobile, DARK, native zoom và dialog logout; không đưa raw screenshot/HTML PRIVATE Stitch vào repository.

## 10. File sửa/thêm

**16 tracked files sửa nội dung:**

```text
apps/web/src/app/globals.css
apps/web/src/app/layout.tsx
apps/web/src/app/login/page.tsx
apps/web/src/app/page.tsx
apps/web/src/components/attempt-workspace.tsx
apps/web/src/components/dashboard-shell.tsx
apps/web/src/components/login-form.tsx
apps/web/src/components/providers.tsx
apps/web/src/components/ui/button.tsx
apps/web/src/components/ui/card.tsx
apps/web/src/components/ui/input.tsx
apps/web/src/lib/api.ts
package.json
tests/p0-browser.test.cjs
tests/p2-api.test.cjs
tests/p2-browser.test.cjs
```

**17 file mới, gồm báo cáo:**

```text
apps/web/src/app/fonts/OFL.txt
apps/web/src/app/fonts/PlusJakartaSans.ttf
apps/web/src/components/auth-page-shell.tsx
apps/web/src/components/brand.tsx
apps/web/src/components/logout-dialog.tsx
apps/web/src/components/public-footer.tsx
apps/web/src/components/public-header.tsx
apps/web/src/components/role-portal-card.tsx
apps/web/src/components/session-change-boundary.tsx
apps/web/src/components/theme-toggle.tsx
apps/web/src/lib/exam-session-guard.ts
apps/web/src/lib/session-lifecycle.ts
apps/web/tests/api-session.test.mjs
apps/web/tests/session-lifecycle.test.mjs
tests/load-web-client.cjs
tests/ui-foundation.test.cjs
docs/STITCH_EXAMSPACE_UI_FOUNDATION_REPORT.md
```

Tổng **33 file nội dung**. Root package chỉ bổ sung UI suite vào `test:e2e`; không nâng dependency/lockfile. P0 browser chỉ nhận thêm thông báo network đã Việt hóa. P2 API loader compile dependency TS thật của API client; P2 browser thích nghi keyboard navigation và evidence directories mới, giữ mọi negative/axe/overflow assertions. Không sửa core AnswerAutosave hoặc backend.

## 11. Các lỗi trong quá trình triển khai và cách xử lý

1. Ghép code vào baseline CRLF khiến một số thay thế import/signature chưa áp đủ; typecheck bắt được, đã sửa và rerun. Không tính lượt lỗi đó PASS.
2. HTTP client harness cũ chỉ compile `api.ts`, không resolve dependency TS mới; đã thêm loader thực cho relative dependencies, giữ assertions refresh/CAS và chạy lại39/39.
3. Tiếp tục request với Origin giả ở browser khiến CORS có thể che status403; UI07 đổi sang chuyển tiếp response403 thật, trong khi F06 vẫn kiểm native attack riêng. Không thay backend hoặc mock response success.
4. BroadcastChannel ban đầu tự báo lại cho cùng document, gây race redirect; browser regression bắt được. Thêm sender/document ID và bỏ qua self-notification; login ba role, đổi tab và full browser suite đã rerun.
5. Keyboard regression cũ giả định Email là focus đầu tiên, không còn đúng khi thêm header/skip link. Thay bằng kiểm skip link và Email keyboard-reachable; giữ axe/overflow và chạy lại đầy đủ.
6. Git hệ thống `core.autocrlf=true` tạo CRLF trong worktree mới, làm format gate báo129 file. Chỉ đưa checkout-added newline về bytes HEAD khi chứng minh không đổi ký tự. Formatter ban đầu còn chọn paths theo stat; đã thu hẹp sang content diff/untracked, đưa các format ngoài scope về đúng bytes HEAD. Hậu kiểm chỉ còn16 tracked content diffs có chủ đích; backend/schema/migrations đúng bytes HEAD và original250 files không đổi. Không thay global Git config.

7. Native zoom đã đúng2.0 và reflow không tràn, nhưng Playwright fullPage clip theo CSS pixels làm crop ảnh. Đã chuyển native-zoom screenshots sang CDP layout coordinates, xác minh PNG width và chạy lại12 UI tests; không thay UI hoặc giảm assertions zoom.

Evidence các lượt lỗi/aborted được giữ riêng, không cộng hoặc chuyển chúng thành PASS. Còn warning runtime pg concurrent-query deprecation, Node TS module detection và pnpm ignored scarf build script; không tắt rule/warning để làm xanh.

8. Đợt hoàn thiện UI-01–UI-04 bổ sung sáu browser cases và một unit case. Lượt browser đầu có bốn harness assertions sai: tên B trùng ở header và thông báo revisit; footer Login bị tính nhầm vào trạng thái header unknown; Next route announcer trùng alert; ca refresh chưa cách ly request qua navigation từ document cũ. Đã scope locator theo vùng và khởi tạo ca refresh từ cookies do HTTP login thật cấp trước document đầu tiên. Không sửa backend hoặc hạ số request mong đợi; focused bốn ca và toàn bộ52 browser tests được chạy lại. Giữ log lượt lỗi, không đánh dấu lượt48/52 đó PASS. Một lượt tổng hợp tiếp theo có worker P1 dừng sớm sau khoảng0,8s, chỉ báo test failed; chưa có diagnostic xác định nguyên nhân. P1 riêng với TAP đạt9/9. Một lượt sau đó API test thoát với status3221226505, các ca sau nhận ECONNREFUSED; không có diagnostic gốc xác định nguyên nhân. Khởi động lại riêng API test từ cùng bản build, bật Node fatal/uncaught diagnostic với env/network bị loại khỏi report, rồi chạy lại nguyên script để chốt kết quả cuối. Không bỏ file/case hoặc sửa backend theo phỏng đoán; đây vẫn là hạn chế độ ổn định runtime cần theo dõi.

## 12. Tồn đọng trước các đợt UI tiếp theo

- Admin/Teacher/Student dashboards/management/editor/workspace/results chưa được redesign trong đợt này; còn style legacy ngoài primitives/font chung. Cần chốt màn hình/contract theo audit V2 trước từng đợt.
- SSO/MFA/SBD/PIN, session inventory/per-device revoke, public live schedule, notifications/audit nghiệp vụ, AI/OCR/manual grading/adaptive/IRT/ordering/export chưa hỗ trợ, không có controls giả hoạt động.
- Không có API để phân biệt global revocation thành công với missing/invalid refresh trong response204; không thêm contract ngoài scope.
- Cross-tab guard không là nguồn sự thật đa thiết bị hoặc cam kết cho frozen tabs. Policy tương thích browser không BroadcastChannel, phục hồi sau đổi phiên ngoài ứng dụng và refresh nhiều process/SSR cần thiết kế/kiểm riêng.
- Đã kiểm semantic roles/labels/focus/axe cơ bản; chưa chạy NVDA/VoiceOver hoặc chứng nhận WCAG toàn hệ thống. Không suy production HTTPS/Secure-cookie/proxy/cross-site hoặc scheduler multi-instance từ localhost tests.
- Worktree UI không có `.env` development. Muốn chạy thủ công, mở đúng worktree, cấp env local theo README và schema hiện hữu; không dùng secrets/fixtures tạm của harness làm tài khoản development. Chưa deploy bản UI vào development/production.

## 13. Bảo toàn và evidence

Evidence foundation trước ở `%TEMP%\examspace-ui-foundation`, gồm baseline original, MCP source, source/security/migration checks, font glyph result và preservation. Evidence UI-01–UI-04 hiện tại ở `%TEMP%\examspace-ui0104-e73d2cf4`: baseline worktree/report, MCP re-read metadata, generate/typecheck/lint/build/root81/integration39/browser52, source preservation, security và cleanup. Browser screenshots/axe/visual metadata lượt UI-01–UI-04 cuối ở `%TEMP%\examspace-ui-browser-5lt3Hl` (ghi trong evidence của đợt mới); các lượt foundation trước ở `%TEMP%\examspace-ui-browser-OMfZec` và `%TEMP%\examspace-ui-browser-VRu65z` là lịch sử, không cộng vào 172; không commit raw logs, `.env`, cookie jar, test secrets hoặc profiles.

Hậu kiểm: original250/250 hashes giữ nguyên; HEAD/branch/index/status gốc không đổi. Worktree UI index trống, HEAD vẫn baseline; backend/schema/năm migrations đúng bytes HEAD, secrets scan phạm vi source public không có match thực. Generated client/dist/.next/node_modules ignored; không có stage/commit/push/merge. Dừng đúng API/web test và test container đã tạo/khởi động trong đợt; giữ dữ liệu/volumes và development đang chạy.

**Kết luận:** UI foundation, public Homepage, Login và generic Logout đã triển khai và có bằng chứng kiểm thử thật. Có thể review diff trên branch/worktree UI trước khi giao đợt Admin/Teacher/Student tiếp theo.

## 14. Trạng thái bắt buộc UI-01–UI-04

| Nhóm                                                                 | Bằng chứng thực thi                                                                                         |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Empty/invalid email, wrong password, show/hide, Enter, pending       | UI04/UI14, login validation và request thật                                                                 |
| Inactive account                                                     | UI13 khóa fixture qua Admin API, login401, không có auth cookies; mở lại trong finally                      |
| CSRF403, backend unavailable                                         | UI07/UI13 và P0 F04/F06, response403 từ API thật hoặc network abort                                         |
| Double click                                                         | UI14 mouse dblclick, một POST login và dashboard đúng role                                                  |
| Login/logout timeout                                                 | UI15 giữ request tại mạng, timeout15s thực, không success giả; retry thành công, SQL tokenVersion được kiểm |
| Refresh đang chạy                                                    | Unit mới + UI18: đợi refresh hết ngưỡng rồi login B; không chồng mutation cookies                           |
| Authenticated revisit/unknown                                        | UI16: role thật, bốn viewport, axe, ẩn identity cached khi me lỗi và retry khôi phục                        |
| Browser thiếu BroadcastChannel                                       | UI17: đúng thông báo khả năng browser, không gửi login hoặc bịa trạng thái phòng thi                        |
| No-JS/pre-hydration                                                  | P0 F04 browser, native POST fallback, không password query                                                  |
| Logout cancel/error/retry, cache, Back, nhiều tab, phòng thi pending | UI05–UI12 và Phase3 regression; giữ revision/deadline/grading phía server                                   |

Sáu file được hoàn thiện tiếp trong đợt này: globals.css, login-form.tsx, logout-dialog.tsx, api.ts, api-session.test.mjs và ui-foundation.test.cjs. Các file UI còn lại đã có được giữ nguyên. Trên snapshot248 file,241 giữ nguyên byte và7 thay đổi có chủ đích tính cả báo cáo. Source runtime hiện tại đã qua build/gates; không có API/schema/migration mới. API test đã có một lần thoát status3221226505 chưa rõ nguyên nhân; việc suite đạt sau restart không chứng minh đã sửa được độ ổn định runtime dài hạn.
