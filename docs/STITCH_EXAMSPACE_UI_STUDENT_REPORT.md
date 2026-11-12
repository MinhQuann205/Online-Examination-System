# ExamSpace UI-07 — Student Dashboard, Classes, Assigned Exams & Result History

## 1. Trạng thái và phạm vi

**UI IMPLEMENTED · TESTS PASS — 215 tests · RUNTIME RISK OPEN.** Phạm vi gồm StudentShell, Dashboard, Classes chỉ đọc, Assigned Exams, start/resume và Results Index. Thiết kế **ADAPTED** theo Academic Focus, không pixel-perfect. Ngày thực hiện: **02/11/2026, Asia/Saigon**.

Người dùng cho phép frontend/test-only UI-07 dù rủi ro native còn mở. **Trong UI-07 đã tái diễn exit3221226505 / 0xC0000409: RUNTIME UNSTABLE — ROOT CAUSE UNKNOWN.** Không còn dùng NOT REPRODUCED như trạng thái hiện tại của nhiệm vụ này; các báo cáo trước được giữ nguyên lịch sử. Không triển khai UI-08 phòng thi hoặc UI-09 result detail/reports, không phê duyệt production.

## 2. Git/worktree và source preservation

- Worktree UI: `C:\Môn Học\ThucTapNgheNghiep\ExamSpace-Stitch-UI`, branch `feature/stitch-examspace-ui`, HEAD `a1e2891754e399aa4743e32c8218759938149bdc`.
- Repository Phase 3 gốc: `C:\Môn Học\ThucTapNgheNghiep\Online-Examination-System-Git`; giữ nguyên branch/HEAD/index/status và **250/250 file** baseline, gồm local changes và `.env`.
- Snapshot đầu UI: **270 file tracked/untracked không bị ignore**, index hash riêng. Cuối đợt: **262 file giữ nguyên, 8 file sửa có chủ đích, 0 mất**, thêm 11 file gồm báo cáo này. `.env` UI có sẵn chỉ hash/đọc trong bộ nhớ khi scan, giữ nguyên; không copy secrets development vào worktree hoặc dùng chúng cho test services.
- **65 tracked backend files dưới apps/api khớp bytes HEAD**, gồm schema và năm migrations. API client/session lifecycle/exam guard/AnswerAutosave, attempt-workspace và student-results detail giữ nguyên byte baseline.
- Giữ UI-01–UI-06 chưa commit và cả bốn báo cáo cũ; mọi lệnh dự án dùng đúng workdir. Không stage/commit/push/fetch/checkout/reset/clean/stash/restore/rebase/merge hoặc đổi global config.

## 3. Stitch resources đã đọc thật

Project `projects/16397645008301072963` được `get_project` xác minh **Multi-Role Education Portal**, PRIVATE/OWNER, `updateTime=2026-11-01T04:50:14.924886Z`. Đã gọi lại `get_screen` cho cả bốn nguồn, `list_design_systems`, `download_file` HTML và screenshot từng screen; đọc HTML/CSS/handlers và xem ảnh thật. Academic Focus asset `5dc43d0355f042f999caea23b13210e7`, version 1.

| Nguồn              | Screen ID                          | HTML resource / độ dài                        | Screenshot đã xem                               |
| ------------------ | ---------------------------------- | --------------------------------------------- | ----------------------------------------------- |
| S01 Results        | `f325ae1f243e4ef499f7a9ee8fed9500` | `files/16768155128685514930`, 47.754 ký tự    | `files/5096944080255754896`, JPEG **1600×4220** |
| S08 Workspace      | `dc01b574a74a400d91ca5c8a4efda87d` | `files/1295778728022287710`, 55.603 ký tự     | `files/6895719571395610481`, JPEG **1600×2877** |
| S10 Homepage       | `59c106effe8e42e3993e50c968ecc043` | `screens/<id>/fileEntries/html`, 45.226 ký tự | `screens/<id>/fileEntries/screenshot`, PNG      |
| S06 Graded Answers | `17928e8b99df49249a2e157d92c5b3b1` | `screens/<id>/fileEntries/html`, 35.341 ký tự | `screens/<id>/fileEntries/screenshot`, PNG      |

Resource paths có prefix `projects/16397645008301072963/`. Kích thước JPEG là metadata của file thực tải; không đánh đồng với layout size ở get_screen. Không đoán signed URL, không chỉnh project Stitch hoặc đưa raw PRIVATE HTML/images vào Git.

S01 thực tế có score summary, rank, phân tích/AI và đáp án từng câu; **không có Results Index độc lập đầy đủ**. UI-07 thích nghi hierarchy/card/status/score, không sao chép dữ liệu hoặc những panel ngoài contract. S08 chỉ tham khảo entry, không copy countdown simulation, scratchpad/proctor/Ordering. S06 giữ làm reference UI-09. Dashboard/Classes/Assigned Exams không có dedicated screen: **ADAPTED**.

Đã đối chiếu AGENTS, bốn báo cáo UI trước, Stitch Audit/Plan V2 trong repo gốc, dashboard/routes/components/API types và backend services/DTO thực tế.

## 4. File ledger

**8 file baseline sửa có chủ đích:**

```text
apps/web/src/components/admin/admin-shell.tsx
apps/web/src/app/dashboard/[role]/page.tsx
apps/web/src/app/student/classes/page.tsx
apps/web/src/app/student/results/page.tsx
apps/web/src/components/student-exams.tsx
package.json
tests/ui-admin.test.cjs
tests/p2-browser.test.cjs
```

**11 file mới, gồm báo cáo:**

```text
apps/web/src/app/student/layout.tsx
apps/web/src/components/student/student-shell.tsx
apps/web/src/components/student/student-ui.tsx
apps/web/src/components/student/student-dashboard.tsx
apps/web/src/components/student/student-classes.tsx
apps/web/src/components/student/student-results-index.tsx
apps/web/src/components/student/student.css
tests/ui-student-support.cjs
tests/ui-student-api.test.cjs
tests/ui-student.test.cjs
docs/STITCH_EXAMSPACE_UI_STUDENT_REPORT.md
```

Tổng **19 file nội dung** của đợt UI-07; diff với HEAD còn chứa foundation/Admin/Teacher có sẵn, không quy toàn bộ diff cho đợt này. Root package chỉ thêm hai Student test entries vào scripts hiện hữu; không nâng dependency/lockfile.

## 5. StudentShell và shared navigation

WorkspaceShell nhận role STUDENT tường minh; StudentShell có Tổng quan/Lớp học của tôi/Bài thi được giao/Kết quả của tôi. Brand, local Plus Jakarta Sans, semantic tokens LIGHT/DARK, ThemeToggle, tài khoản từ auth/me và LogoutDialog hiện hữu được tái sử dụng.

Chỉ mount Student children sau role STUDENT được xác nhận. auth/me lỗi che profile và private tree; 401 về login, sai role chuyển dashboard đúng. Dashboard SSR vẫn kiểm auth/me no-store/cookie và role trước render. Query failures không được dùng dữ liệu cached làm kết quả thành công.

Drawer có inert background, trap Tab/Shift+Tab, Escape/restore focus; sửa shared focus khi nút còn CSS hidden bằng việc đợi visible trước focus và hủy frame khi đóng/unmount. Regression Admin/Teacher vẫn giữ. Shell bypass `/student/attempts/*` và `/student/results/*`: hai presentation/guard hiện hữu không bị bọc lại hoặc redesign.

## 6. Student Dashboard

`/dashboard/student` hiển thị greeting tài khoản thật, ba totals lấy **response.total** từ Classes/ExamAssignments/Results, không lấy items.length trang 1. Totals mô tả rõ lớp hiện là thành viên, bài giao được phép xem, lượt SUBMITTED/EXPIRED của mình; không giả là số bài đang mở.

GET dashboard/student thật vẫn được gọi. Loading/error/retry riêng từng nguồn; ba bài giao mới nhất lấy từ trang đầu API order createdAt desc, có nhãn tối đa 3 và link danh sách. Quick actions/quy trình hướng dẫn tới routes thật. Không GPA/rank/AI mastery/analytics/proctor/global active count.

## 7. Student Classes

`/student/classes` có search theo name/code, pagination, list và inline detail read-only. Chỉ hiển thị teacher name/email, code/description mà API cấp; không render danh sách bạn học dù detail contract hiện cho thành viên đọc members. Không create/edit/reassign/add/remove controls.

Detail query riêng với staleTime/gcTime 0, có Làm mới chi tiết/error/retry. Sau remove membership, GET403 che chi tiết cũ; list refresh bỏ lớp. Empty/search, lỗi network, inactive/revoked401 và retry được kiểm. Backend vẫn quyết định membership, không dùng menu như authorization.

## 8. Assigned Exams và các states

`/student/exams` dùng Student-scoped GET exam-assignments?page&search: pinned title/version/duration, class/direct recipient, opensAt/closesAt, own count/max/remaining và publication policy. Search theo title trong pinned snapshot, legacy không có snapshot không được giả là có thể tìm bằng fallback label. Search đổi về trang 1; 24 records đã kiểm 20/4, loading không giữ rows trang cũ, network error che cached cards.

Các trạng thái dựa trường có thật: Chưa đến giờ, Đang mở, Đã đóng, hết maxAttempts, chưa có lượt, có IN_PROGRESS, Đã nộp/Hết giờ, archived/missing pin/metadata unavailable. Active attempt vẫn có resume vì backend giữ quyền owner theo contract; trạng thái lịch là gợi ý cho lượt mới.

Clock client cập nhật mỗi 15 giây và ngay khi Làm mới; **không là nguồn quyết định quyền hoặc deadline**. Backend có thể từ chối khi lịch thay đổi sau lần tải. Lỗi start/resume giữ tại danh sách, ẩn card vừa không xác minh được và cho refresh/retry; không chuyển tới workspace giả. Thời gian hiển thị theo múi giờ browser, null là không giới hạn, duration null không giả thành 0.

## 9. Start/Resume

Start gửi POST thật, chờ response rồi dùng ID/status backend. Khóa ref đồng bộ + pending disabled ngăn double-click; browser giữ request ở mạng đã chứng minh trước release chưa có attempt/redirect, sau release chỉ một POST và một SQL attempt.

Resume dùng ID IN_PROGRESS từ own assignment rồi GET attempt kiểm owner/status hiện tại. IN_PROGRESS vào workspace; server đã EXPIRED/SUBMITTED thì tới result detail. Kiểm ID/deadline/revision giữ nguyên, không POST mới hoặc reset timer. GET hết hạn được backend finalize/chấm trước trả; UI không tự gán EXPIRED/score.

Không thay AnswerAutosave, snapshot, grading, start locking, effective deadline hoặc result detail. Không room PIN/SBD, auto-start sau login hoặc thay maxAttempts.

## 10. Results Index / History

`/student/results` dùng component index mới, không sửa file student-results.tsx chứa detail. Cards status, pinned title/duration từ attempt snapshot, started/submitted dates, score/max khi API cho phép và link Xem bài làm.

Score null hiển thị **Điểm chưa được công bố**, không hiển thị 0; score 0 được công bố vẫn hiển thị 0/6.75 đúng thang snapshot, không ép thang 10. Không fetch result detail/private question data từ index để dựng chart/key; link chỉ mở detail hiện hữu khi người dùng chọn.

**Giới hạn contract được giữ:** GET results chỉ nhận page, không có search/filter hoặc examVersion number/id trong projection. UI không thêm search giả, không suy version từ mutable Exam hoặc fetch toàn bộ detail để bổ sung số version. Tiêu đề/thời lượng lịch sử vẫn đúng snapshot; muốn filter hoặc số version trên history cần API projection được review ở nhiệm vụ riêng. showScore/showAnswers độc lập, không suy quyền đáp án từ điểm nhìn thấy.

## 11. API/model integration

| UI                | API/request/response                                                                | Policy/model                                                  |
| ----------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Shell             | GET auth/me; refresh/logout hiện hữu                                                | JWT/CSRF/RBAC/tokenVersion; User                              |
| Dashboard         | GET dashboard/student → user,section; scoped totals từ ba lists                     | STUDENT, không analytics mới                                  |
| Classes           | GET classes?search&page; GET classes/:id → teacher/description/code                 | Current membership; Class/ClassMember/User                    |
| Assigned Exams    | GET exam-assignments?search&page → own summaries/count/attempt IDs, pinned metadata | Recipient scope; ExamAssignment/ExamVersion                   |
| Start             | POST exam-assignments/:id/start, không body authority từ client                     | STUDENT, recipient/schedule/max/version/row lock; ExamAttempt |
| Resume            | GET exam-attempts/:id → safe snapshot/deadline/revision/status                      | Owner, server expiry; ExamAttempt/AttemptAnswer               |
| History           | GET results?page → own completed summaries/total                                    | showScore projection; attempt snapshot                        |
| Detail navigation | /student/results/:id route hiện hữu gọi GET results/:id                             | Owner; independent showScore/showAnswers                      |

**0 API backend mới, 0 migration mới, 0 dependency upgrade.** Không có schema/change SQL được đề xuất cho phạm vi này.

## 12. Responsive và accessibility

Student kiểm **4 routes × 390/768/1024/1440 = 16 lượt LIGHT**, document không tràn ngang, axe wcag2a/wcag2aa/wcag21aa. Assigned Exams DARK390 kiểm riêng. Layout chuyển cards/meta về một cột; link/button có accessible name, loading/status/error, pagination thật, focus-visible và min touch area cho các CTA/navigation.

Keyboard Enter mở drawer, initial focus, Tab ở trong, Escape trả trigger và navigation đóng drawer; reduced-motion media được bật thật. Không dựa screenshot hoặc axe để chứng nhận WCAG toàn hệ thống; chưa NVDA/VoiceOver. Các native zoom200%, keyboard/matching/mobile của suites cũ tiếp tục chạy, không cộng chúng thành coverage mới riêng UI-07.

## 13. Visual fidelity

| Phần                                | Đánh giá                     | Thích nghi                                                                       |
| ----------------------------------- | ---------------------------- | -------------------------------------------------------------------------------- |
| Brand/font/palette/surfaces/sidebar | MATCHED về ngôn ngữ thiết kế | Reuse Academic Focus và foundation                                               |
| Dashboard/Classes/Assigned Exams    | ADAPTED                      | Không dedicated screen; data/permissions thật                                    |
| Results Index S01                   | PARTIAL/ADAPTED              | Score/status/card hierarchy; không rank, AI/knowledge matrix, certificate/appeal |
| S08/S06                             | Reference only               | Không redesign workspace/detail hoặc copy timer/OCR/voice                        |
| DARK                                | ADAPTED                      | Không có reference Stitch DARK                                                   |

Ảnh thật đã xem: Dashboard desktop, Results mobile và Assigned Exams LIGHT/DARK; có screenshot/axe metadata ngoài Git. Thông tin tài khoản/số liệu trong ảnh là fixture test, không dashboard production.

## 14. Quality gates

| Gate                      | Kết quả mới                                             |
| ------------------------- | ------------------------------------------------------- |
| db:generate               | PASS, ignored Client                                    |
| typecheck                 | PASS shared/API/web                                     |
| lint                      | PASS                                                    |
| build                     | PASS shared/Nest/Next với API test4010 tại build        |
| root tests                | PASS **81** = tooling17 + Jest47/14 suites + frontend17 |
| HTTP/PostgreSQL/migration | PASS **54** = baseline48 + Student6                     |
| Browser E2E               | PASS **80** = baseline70 + Student10                    |
| Format/Git diff/security  | PASS ở hậu kiểm cuối                                    |

**215 tests PASS, 0 FAIL, 0 skipped** trong các lượt cuối. Counts cuối chỉ tính một lượt đầy đủ mỗi script, không cộng focused runs/reruns/fixtures hoặc baseline UI-06 lịch sử199. Jest47 gồm45 unit và2 PostgreSQL service tests; frontend17 gồm9 autosave và8 session/API. Không đo coverage mới hoặc tuyên bố CI/production đạt threshold.

## 15. Security negative tests và Phase1–3/UI regression

Student mới kiểm own dashboard/totals/classes/membership removal, forbidden management controls/API, >20 search/paging, schedule future/closed/max, archived/missing pin, stale-schedule400, start/resume/double click, expiry-result navigation, v1 sau v2, revision409/deadline/score2.50/max6.75, hidden null vs visible0, no list key, wrong role/IDOR, inactive401, A logout→B/empty own history, query/cache/me errors và retry.

Admin denial test được thích nghi vì Student dashboard sau redirect được phép gọi Classes total. Vẫn chặn Users/Exams của Admin, kiểm response Classes thuộc membership bằng SQL test guard và giữ mutation403. Không xóa negative assertion để làm xanh.

Các suites cũ giữ Auth/Users/Classes/Questions/Exams/Assignments/Attempts/Results, CSRF/refresh/logout CAS, ownership/roster scope, snapshots/pinned metadata, autosave delay/abort/2 tabs/flush/revision, matching mouse/keyboard/touch, review flags/deadline/races/rollback/scheduler, result policy. Main UI E2E vẫn Teacher tạo ba dạng câu → publish/giao → Student start/save/reload/submit → PostgreSQL chấm6.75/6.75 → các role đọc đúng scope; không mock HTTP success.

## 16. Runtime, database safety và lỗi trong quá trình kiểm

API test direct Node24.15.0 PID24968 start `2026-11-01T17:18:18.066Z`, **unexpected exit3221226505 / 0xC0000409 lúc `2026-11-01T17:40:33.016Z`** (22 phút14,950 giây), signal null. Không có intentional stop của API trước exit; lần dừng web/E2E để rebuild được ghi riêng, không dùng chúng giải thích thay cho API crash. Diagnostic fatal/uncaught flags đã loại env/network nhưng **0 Node reports**, Application events trong cửa sổ query mới **0 matching node/c0000409**. Không có exception parameters/stack/faulting module. Browser đang ở F20 Admin edit/reassign; chưa có request trace tại giây chết nên không quy endpoint hay Prisma/Argon2 gây lỗi. Logs rollback/scheduler fault injection trước đó thuộc tests đã PASS, không phải native crash stack.

Lượt full browser đó **23 PASS/57 FAIL, exit1**; các lỗi về sau chủ yếu không kết nối API. Giữ nguyên toàn bộ logs/process/exit/hash trong `native-exit-20261101T174033Z`, không đổi thành PASS. Chỉ **một lần restart có kiểm soát**, API PID32748 start `2026-11-01T17:41:29.644Z`, để chạy lại nguyên suite; không sửa runtime/source backend hoặc tăng timeout nhằm giấu crash. API4010, Next production3010, Edge headless/profile riêng. Test DB duy nhất `127.0.0.1:15433/online_exam_phase3_test`, guard SQL cluster khác development và đủ5 migrations. JWT test secrets mới trong memory/env; không dùng `.env` development cho API/web tests.

Migration preservation dùng SQL hiện hữu trên database test prefix mới, giữ database/evidence; không migrate/reset/db push/drop hoặc query SQL development, không xóa volumes. Development container vốn running giữ nguyên; test container trở lại stopped khi cleanup. Không attach debugger/ProcDump hoặc sửa Windows security/global Node.

Các lỗi giữ trong evidence, không tính PASS:

- Combined P2 browser entry dùng ancestor theo cấu trúc legacy để tìm duration/start. Metadata nay ở phần riêng trong article, nên locator cũ timeout. Đổi scope sang chính assignment article, giữ assertions v1/30 phút/start/order/revision/deadline/score6.75/roster/report. Không sửa backend hoặc bỏ combined E2E. Lượt browser sau restart có **79/80 PASS**, đúng một lỗi locator này; không ghi lượt đó PASS. Đã giữ log riêng và chạy lại nguyên script sau sửa trên cùng API, không restart thêm.

1. Test CJS đầu bị quote SQL interval; sửa syntax harness trước chạy. HTTP test có biến q bị shadow trong find, không tìm thấy fixture correct option; đổi tên biến và full HTTP54 đã đạt.
2. Locator IDOR cũ tìm alert bên trong main trong khi main chính là alert; legacy search không có projection fallback title; page2 chờ networkidle trước React fetch. Sửa locator/waits theo contract, giữ assertion.
3. Auth error test dùng visibility event nhưng không đổi focus-manager state nên không refetch; chuyển qua Next navigation Home→Back trong cùng context/cache, abort request thật, chứng minh identity/private tree bị ẩn.
4. **Lỗi UI thật**: focus chạy khi close button vẫn CSS hidden, kể cả thử trì hoãn một/hai frame. Diagnostic focus trace xác minh focus-call không thành công trước sửa. Đợi target visible và chặn Tab từ ngoài drawer; kiểm lại trên browser thật.
5. **Lỗi UI thật**: Làm mới giữ clock cũ tới15s, khiến status sau schedule400 còn hiện mở. Refresh cập nhật Date.now ngay; backend authorization không đổi.
6. Next generated production/dev route types không đồng bộ sau thêm Student layout: typecheck báo LayoutRoutes thiếu /student trong dev artifact. Khởi động riêng Next dev test3012 để regenerate ignored types, dừng đúng process; Next tự sửa tsconfig và tạo apps/web/AGENTS.md. Đã lưu hai outputs trong evidence, trả tsconfig đúng SHA baseline và chuyển đúng file AGENTS mới do framework tạo ra ngoài source. Không chỉnh compiler rules để bỏ lỗi. Typecheck sau regeneration PASS; next-env giữ đúng bytes baseline.

Còn warnings pg concurrent-query deprecation, Node TS module detection và TEMP formatter shell deprecation; không tắt rule/warning. Functional PASS sau restart không đóng native runtime risk đã tái diễn trong nhiệm vụ này. Không có causal before-fail/after-pass native fix hoặc production soak chứng nhận.

## 17. Ngoài scope và trước UI-08

Không redesign attempt-workspace/result detail/reports; không AI/OCR/essay/manual grading/partial credit/Ordering, certificates/appeals/ranking/GPA, public analytics/export, SBD/PIN/SSO/MFA/devices hoặc adaptive learning. Không tạo Session model/API analytics hoặc migration để giả hỗ trợ. Bản `.next` hiện tại được build cho API test4010; chạy thủ công cần dev/build lại bằng cấu hình local đúng worktree, không dùng test secrets/fixtures của harness như tài khoản development.

**Chưa đóng runtime gate để nghiệm thu UI-08 hoặc production.** Trước UI-08 cần review diff/entry navigation, tiếp tục giữ runtime **OPEN**, test isolation/SQL identity, queue/revision/deadline/snapshot/server grading/policy và cross-tab guard. Không thay countdown backend bằng Stitch simulation, không unmount draft queue khi session đổi mà bỏ xác nhận hiện hữu. HTTPS/Secure-cookie/proxy/cross-site, refresh nhiều process/SSR, scheduler multi-instance/throughput và screen reader/WCAG vẫn cần gates riêng.

## 18. Evidence và kết luận

Evidence private: `%TEMP%\examspace-ui07-e3ee9e98`, gồm before hashes/Git, MCP read metadata, process/start/exit/intentional stop, các logs failed/final, focus diagnostics, SQL identity/connections, security/preservation và gate summaries. Browser screenshots/axe nằm ở `examspace-ui07-browser-*`; lượt cuối: `%TEMP%\examspace-ui07-browser-0hlyqH`. Giữ fixtures/test databases/volumes; không commit raw HTML/images PRIVATE Stitch, logs, secrets/cookies/profiles/dumps.

**UI IMPLEMENTED · TESTS PASS · RUNTIME RISK OPEN.** Root81 + HTTP54 + browser80 = **215 unique tests**. Final browser exit0 tại 2026-11-01T17:56:21.813Z; không cộng lượt focused/failed/aborted. Một lượt full browser đã được dừng có chủ đích trước hoàn tất để bổ sung guard hủy focus khi sidebar bị tháo khỏi DOM; giữ log riêng, không coi lượt đó PASS. Nguyên script80 đã chạy lại hoàn tất trên build cuối.

API đầu PID24968 đã native exit ngoài dự kiến như mục16; API sau đúng một restart PID32748 không có unexpected exit trước cleanup; đã ghi intentional stop trước khi dừng Windows process, không coi đó là graceful app.close hoặc native crash. API exit record cuối: {"code":4294967295,"signal":null,"at":"2026-11-01T17:56:34.797Z"}. Cleanup theo đúng PID/start time/ancestry; test connections khác controller =0 sau dừng API, đủ5 migrations, test container stopped và development container vẫn running. Giữ databases/volumes/evidence. Hậu kiểm source/Git/index/.env và security được lưu riêng; không stage/commit/push/deploy. Native risk0xC0000409 vẫn OPEN/UNSTABLE, đã tái diễn và chưa có root cause/runtime fix.
