# ExamSpace UI-08 — Exam Workspace & Safe Navigation

## 1. Executive summary — CHECKPOINT, CHƯA HOÀN TẤT

Ngày 02/11/2026, Asia/Saigon. Phiên thực hiện bị người dùng ngắt trong lúc kiểm thử. Đã lưu code và evidence; chưa nghiệm thu toàn bộ UI-08.

| Trạng thái         | Kết luận tại checkpoint                                                              |
| ------------------ | ------------------------------------------------------------------------------------ |
| UI                 | PARTIAL: đã triển khai source, còn gate cuối chưa đạt                                |
| Navigation         | PARTIAL: NAV-01–NAV-14 đạt trong lượt focused trước patch cuối; cần rerun build cuối |
| Autosave integrity | PARTIAL: ca mới có SQL/revision/recovery đạt; regression cuối chưa xanh              |
| Submission safety  | PARTIAL: pending/unknown/reconciliation/timeout đã kiểm, cần full regression cuối    |
| Tests              | FAIL ở full run cuối; không gộp các lượt thành PASS                                  |
| Runtime            | RUNTIME RISK OPEN — UNSTABLE, ROOT CAUSE UNKNOWN                                     |
| Production ready   | NO                                                                                   |

Không triển khai UI-09, không commit/push/merge/deploy, không sửa backend vì suy đoán native crash.

## 2. Git/worktree preservation

Worktree: C:/Môn Học/ThucTapNgheNghiep/ExamSpace-Stitch-UI. Branch feature/stitch-examspace-ui; HEAD a1e2891754e399aa4743e32c8218759938149bdc. Snapshot đầu 288 file UI và 250 file original. Repository Phase 3 gốc: 250/250 byte giữ nguyên, HEAD/branch/index/status không đổi. Backend 65/65 tracked files khớp byte HEAD, gồm schema/năm migrations. UI index/HEAD/branch giữ nguyên; không có file baseline bị mất.

Đã đọc AGENTS, các báo cáo Foundation/Admin/Teacher/Student/Runtime/Capture/V2 và source liên quan. Các báo cáo lịch sử được giữ nguyên.

## 3. Stitch resources đã đọc thật

Project 16397645008301072963 — Multi-Role Education Portal, PRIVATE; get_project trả updateTime 2026-11-02T04:42:25.009710Z. Academic Focus assets/5dc43d0355f042f999caea23b13210e7 version1.

- S08 dc01b574a74a400d91ca5c8a4efda87d: HTML files/1295778728022287710, 55.603 ký tự; screenshot files/6895719571395610481 JPEG1600×2877 đã tải và xem qua MCP.
- S09 c5586e30ca7244fb87e21c2baabc1895: HTML screens/<id>/fileEntries/html đã đọc, giống nguyên chuỗi S08. get_screen không cung cấp resource screenshot; không đoán/tải ảnh thiếu.
- S10 59c106effe8e42e3993e50c968ecc043, S01 f325ae1f243e4ef499f7a9ee8fed9500 và S06 17928e8b99df49249a2e157d92c5b3b1: gọi lại get_screen và tải/đọc HTML, tương ứng 45.226/47.754/35.341 ký tự. Không tuyên bố đã xem lại screenshot ba reference trong đợt này.

Không sửa Stitch hoặc đưa raw PRIVATE HTML/ảnh vào Git. Không port mock timer/proctor/inline handlers/CDN.

## 4. File ledger tại checkpoint

File baseline thay đổi byte (bao gồm generated declaration):

- apps/web/src/components/admin/admin-classes.tsx
- apps/web/src/components/admin/admin-shell.tsx
- apps/web/src/components/admin/admin-users.tsx
- apps/web/next-env.d.ts
- apps/web/src/components/attempt-workspace.tsx
- apps/web/src/components/providers.tsx
- apps/web/src/components/student-results.tsx
- apps/web/src/lib/api.ts
- package.json
- tests/p0-browser.test.cjs
- tests/p2-browser.test.cjs

File mới trước báo cáo này:

- apps/web/src/components/back-navigation.tsx
- apps/web/src/components/exam-workspace-dialog.tsx
- apps/web/src/components/exam-workspace.css
- apps/web/src/lib/safe-navigation.ts
- apps/web/tests/safe-navigation.test.mjs
- tests/ui-workspace.test.cjs

Bổ sung báo cáo hiện tại. next-env.d.ts bị Next build đổi đường dẫn generated types; cần đối chiếu/hoàn lại đúng byte baseline đã hash nếu tái dựng được, không đưa vào nội dung chức năng. Diff với HEAD còn gồm UI-01–UI-07 có sẵn; ledger trên là so với snapshot đầu UI-08.

## 5. Workspace architecture

AttemptForm tiếp tục giữ một AnswerAutosave instance theo attempt.id. Layout Academic Focus gồm header/timer, question cards, desktop palette, native dialog palette mobile và dialog rời/nộp bài. Tất cả câu vẫn được render như reference S08; current question được đánh dấu và điều hướng bằng scroll/focus. Không tạo queue thứ hai hoặc remount provider khi chuyển câu/theme/palette.

## 6. Question types

Giữ SINGLE_CHOICE optionId, MULTIPLE_CHOICE optionIds và MATCHING pairs UUID. Matching giữ DndContext mouse/keyboard/touch và select swap/clear; đổi text sang semantic muted token để sửa contrast. Không thêm Ordering/Essay/client grading.

## 7. Timer/deadline

Đếm từ deadlineAt backend; pinned duration/version từ snapshot. Timer aria-live off, cảnh báo theo ngưỡng thay vì mỗi giây. Khi đồng hồ thiết bị tới hạn, khóa chỉnh sửa và GET attempt để server finalize; không giả submit/chấm/thêm giờ. Network recovery yêu cầu kiểm tra trạng thái thật.

## 8. Question navigator

Desktop palette có current/answered/review và thống kê thật. Mobile dùng native modal, Escape/focus restore; palette selection đợi frame sau đóng để focus question. Patch focus cuối chưa hoàn tất full regression.

## 9. BackButton và tab navigation

Shared BackButton dùng Lucide/native button, fallback verified routes. InternalNavigation chỉ giữ tối đa32 routes trong memory, ràng buộc account ID/role/session epoch. Không lưu response/token/answers, không router.back mù hoặc nhận redirect query. Chặn route ngoài/encoded/query, Login và cross-role destinations. Không tự quay về active attempt từ history: resume là action tường minh.

WorkspaceShell Admin/Teacher/Student có BackButton. Admin inline detail dùng onClose để về list mà giữ local state. Student result detail chỉ thay navigation, không redesign kết quả. Direct detail dùng parent list; direct dashboard về public homepage. Teacher list filters/page hiện là useState và không được hứa giữ qua unmount. Question Previous/Next không tạo history; browser tabs không được coi là route navigation.

Browser Back tại attempt được bảo vệ bằng một same-document sentinel entry, capture popstate, trở lại entry hiện tại rồi mở leave dialog. Link rời workspace đi qua cùng guard. beforeunload giữ cảnh báo draft/error/conflict/submit/unknown. Không bảo đảm chặn mọi browser/system navigation, frozen tab hoặc mất process.

## 10. NAV-01–NAV-14

Focused run focus-702e4b57-72d3-4dcc-8489-6f95ba3f6c17 đã đạt tất cả ca NAV:01,02,03,04,05,06,07/14,08,09,10,11/13,12. Có kiểm actual routes, SQL revision/deadline, pending/failed/conflict saves, submit pending, account A→logout→B, Back/Forward, wrong role và mobile focus. Lượt này còn FAIL một ca UI08-01 do fixture matching; không coi cả suite PASS.

Sau đó đã sửa UUID matching, legacy locator, palette selection focus và dashboard fallback; full browser cuối trên source này chưa được chạy tới. Do đó NAVIGATION PARTIAL ở checkpoint.

## 11. Autosave integrity

AnswerAutosave core giữ nguyên byte. editVersion/confirmedVersion/revision, debounce/serialized writes, retry/conflict/flush không rewrite. Save status lấy chính SaveSnapshot; answered count không thay server confirmation. Có count chưa xác nhận/lỗi và retry thật. API client chỉ bổ sung timeout15s cho attempt read/answer save/submit để request mất mạng không chờ vô hạn.

## 12. Revision/conflict409

Test mới ghi revision1 từ phiên khác, tab local nhận409, giữ lựa chọn local, không overwrite trước xác nhận. Retry đọc revision thật rồi lưu revision2. Pending navigation/theme/palette đã kiểm không sinh write lặp.

## 13. Review

Dùng PUT review endpoint hiện hữu; không ghi answer revision để đánh dấu. Submission/leave khóa khi review mutation pending. Test mới đối chiếu answers trước/sau review; ca tổng hợp matching cần rerun sau sửa fixture.

## 14. Safe submit

Native confirmation hiện unanswered/review/pending/errors/conflict. Khóa edit, flush queue, POST thật và kiểm status response. Nếu request mất response/timeout, GET attempt để reconcile. Nếu cả GET thất bại, giữ UNKNOWN, khóa edit/nộp lặp/rời trang và cho kiểm tra lại. Không xóa local draft hoặc chuyển result giả. Back không submit/hủy attempt.

## 15. API crash/network scenarios

Focused đã kiểm abort trước save, giữ PUT tại mạng, error/retry, real409, response loss sau POST commit, submit+GET unavailable/UNKNOWN, near-deadline unavailable và actual15s submit timeout sau commit. UI08-05 dừng đúng API test child qua runner control, giữ local answer, recovery cùng test config và SQL revision1; intentional termination không là native reproduction. Các cross-tab/account lifecycle regressions có trong suites cũ nhưng full browser cuối chưa đạt.

## 16. SQL verification

Tất cả fixture/query dùng guard host/port/name/cluster riêng: online_exam_phase3_test tại127.0.0.1:15433; identity khác development, đủ5 migrations. Có assertions answer payload/revision, IN_PROGRESS/SUBMITTED/EXPIRED/deadline. Test tổng hợp mới yêu cầu v1 sau v2 và score6.75/6.75; lần đầu sai fixture identifier, đã sửa nhưng chưa xác nhận lượt cuối. Không ghi score test này PASS khi chưa rerun. Full E2E Phase3 cũng chưa hoàn tất sau patch cuối.

## 17. Responsive/accessibility

Lượt focused trước patch cuối:390/768/1024/1440 LIGHT và DARK, tổng8 axe checks0 violations trong wcag2a/wcag2aa/wcag21aa và không overflow. Native Edge zoom2.0 đã set/get thật ở workspace, viewport hiệu dụng707 CSSpx; không lấy CSS zoom làm native evidence. Có reduced motion, palette/dialog Escape/focus restore. Chưa screen reader/WCAG toàn hệ thống. Long-text fixture được thêm vào native zoom case nhưng chưa chốt lượt cuối.

## 18. Visual comparison

Đã xem screenshot Stitch S08 và ảnh app desktop LIGHT/mobile DARK/leave pending. Header/timer/card/options/palette: PARTIAL/ADAPTED theo tokens/font thật; form/payload/snapshot thực. Matching: ADAPTED, giữ controls đủ chức năng thay prototype static. Mobile/DARK/Back/unknown: ADAPTED; không có screenshot Stitch DARK. Proctor/AI/scratchpad/Ordering: GAP ngoài backend/scope. Không pixel-perfect.

## 19. Quality gates — không cộng các lượt

| Gate                       | Evidence hiện có                                            |
| -------------------------- | ----------------------------------------------------------- |
| Build                      | PASS, lần cuối sau navigation/locator patch                 |
| Typecheck                  | PASS trước patch nhỏ cuối; cần rerun final                  |
| Lint                       | PASS trước patch nhỏ cuối; cần rerun final                  |
| Root                       | 84 PASS (17tooling+47Jest+20frontend), trước patch nhỏ cuối |
| HTTP full đầu              | 54/54 PASS; browser sau đó bị native exit                   |
| HTTP full cuối             | 53/54 PASS,1FAIL; browser chưa chạy                         |
| UI08 focused cuối đã chạy  | 22/23 PASS,1FAIL fixture matching; đã sửa nhưng chưa rerun  |
| Final format/security/diff | Chưa hoàn tất final gate; diff check trước patch cuối đạt   |

HTTP final failing case:

- not ok 37 - NT04/05: 125 persisted expired attempts, scheduler row failure isolation and idempotent grading

Không có một lượt full green cuối, không tuyên bố242 tests PASS. db:generate không chạy lại vì không schema/dependency/generated-client contract change. Warnings pg concurrent-query/Node module detection vẫn hiện, không tắt rule/warning.

## 20. UI-01–UI-07 regression

Các file/cases cũ được giữ, chỉ sửa locator scope question UUID và submit DOM confirmation. Không hạ SQL/RBAC/IDOR/axe/negative assertions. Core queue/session lifecycle/exam session guard/backend giữ nguyên. Regression toàn hệ thống còn phải hoàn tất, không dùng kết quả lịch sử thay cho kết quả source cuối.

## 21. Runtime risk — đã tái diễn trong UI-08

API test Node24.15.0 PID27600, parent18300, start2026-11-02T05:11:47.117Z; unexpected exit2026-11-02T05:13:47.110Z, code3221226505, signalnull, intentionalfalse; uptime119.993s. Runner dừng dependent browser, giữ frozen7files+SHA tại native-exit-20261102T051347Z. Không có native stack/exception parameters/faulting module. Không chạy ProcDump/debugger/capture mới; không thay Node global/Nest/Prisma/Argon2/backend. ROOT CAUSE UNKNOWN, RUNTIME UNSTABLE.

Sau bảo toàn incident đã có một full run mới có kiểm soát; HTTP53/54 nên runner dừng trước browser và cleanup API có chủ đích. Không có native exit trong run thứ hai; không coi run này PASS hoặc runtime FIXED.

## 22. Known limitations

Draft chỉ ở memory, không durable storage: browser/process/system crash/đóng tab có thể mất phần chưa xác nhận. beforeunload/sentinel có giới hạn browser history, reload/frozen/mobile/system lifecycle. Client clock không là server authority. Filters/page Teacher không persist qua route unmount. Chưa xác nhận toàn bộ gate cuối hoặc screen reader/production HTTPS/multi-instance.

## 23. Trước UI-09

Tiếp tục từ source hiện tại; review HTTP failure cuối và frozen native evidence. Rerun matching grading/v1-v2, palette selection focus, toàn NAV và full regression; chạy typecheck/lint/root/format/security/diff cuối. Xử lý generated next-env delta chỉ khi xác minh đúng baseline bytes. Không mở UI-09 hoặc phê duyệt production từ checkpoint PARTIAL này.

## 24. Evidence và cleanup

Evidence riêng: %TEMP%/examspace-ui08-f814c42a. Baseline before.json, editor/runner scripts tạm, gate logs, từng focus/full run/start/exit/intentional-stop, preservation-current.json và frozen incident. Browser ảnh/axe: examspace-ui08-browser-*; lượt focused được xem s3Pw6u. Raw HTML/ảnh PRIVATE Stitch, config/tokens/cookies/profiles/dumps không đưa vào source.

Sau interruption, runner cuối đã tự cleanup API4010/web3010 do HTTP failure. Đã xác minh test connections ngoài controller0 trong run result, test container về stopped như ban đầu, development container vẫn running. Giữ database/fixtures/volumes/evidence; không SQL development, reset/drop/migrate/seed development. Source original250/250 giữ nguyên, backend65/65 đúngHEAD; UI277/288 baseline giữ nguyên và11delta (10source/test/config+1generated), không mất file, thêm6source/tests và báo cáo này. Không stage/commit/push.

**CHECKPOINT PARTIAL · TESTS FAIL · RUNTIME RISK OPEN · PRODUCTION READY: NO.**

# UI-08.1 FINALIZATION & ACCEPTANCE RESULTS

## 1. Executive summary

Ngày 02/11/2026, Asia/Saigon. Tiếp tục trên đúng source UI-08 đã lưu; checkpoint ở mục 1–24 phía trên được giữ nguyên byte. UI-08 FUNCTIONAL ACCEPTANCE PASSED IN ISOLATED TEST ENVIRONMENT — RUNTIME RISK OPEN — NOT PRODUCTION READY

| Nhóm               | Kết quả cuối                                    |
| ------------------ | ----------------------------------------------- |
| UI                 | IMPLEMENTED                                     |
| Navigation         | VERIFIED trong test scope                       |
| Autosave integrity | VERIFIED trong test scope                       |
| Submission safety  | VERIFIED trong test scope                       |
| Tests              | PASS — 246 tests trong các lượt final           |
| HTTP NT04/05       | PASS; nguyên nhân timeout lịch sử chưa xác nhận |
| Matching           | PASS — SQL6.75/6.75                             |
| Runtime            | RISK OPEN — UNSTABLE, ROOT CAUSE UNKNOWN        |
| Production ready   | NO                                              |

## 2. Checkpoint đầu vào

Đầu UI-08.1: 295 file UI, 250 file repository Phase 3 gốc; branch/HEAD đúng baseline. Source giữ đủ UI-01–UI-08 và theme/launcher hiện có. Đã đọc toàn bộ tài liệu bắt buộc; Stitch Audit/Plan V2 chỉ có ở repository gốc được đọc bằng đường dẫn tuyệt đối. Đã đọc full logs trong `examspace-ui08-f814c42a`, đối chiếu fixture, scheduler, grading, transaction, startup/cleanup. Không dựng lại workspace hoặc worktree.

## 3. Git/worktree preservation

Worktree `C:/Môn Học/ThucTapNgheNghiep/ExamSpace-Stitch-UI`, branch `feature/stitch-examspace-ui`, HEAD `a1e2891754e399aa4743e32c8218759938149bdc`. Mọi lệnh source dùng workdir này. Repository gốc giữ 250/250 hashes, HEAD/branch/index/status; backend 65/65 tracked files giữ byte HEAD gồm schema/năm migrations. Không stage/commit/push/fetch/checkout/reset/clean/stash/restore/rebase/merge. Không đổi Node global, dependencies, lockfile, Windows security hoặc config development.

## 4. Source changes trong UI-08.1

- `attempt-workspace.tsx`: leave dialog giải thích review mutation đang chờ, tiếp tục chặn rời, beforeunload cảnh báo khi review còn pending. Di chuyển effect sau mutation để dùng trạng thái đã khai báo, giữ cleanup listeners và queue.
- `ui-workspace.test.cjs`: đúng UUID snapshot/randomized matching options, assignment pin v1 trước v2 nhưng start sau v2; SQL payload/revision/score; NAV12 thêm768; UNKNOWN Back, flush thất bại, A→B→C và review pending/reload.
- Ba browser suites cũ được thích nghi locator cho header/dialog, mobile palette và conflict alert; giữ toàn bộ SQL/security/negative expectations.
- `next-env.d.ts`: xử lý generated paths theo đúng bytes/hash UI-08 trước build, không coi là thay đổi chức năng. Báo cáo chỉ append.

Các lượt lỗi được giữ riêng: focused23/24 do thứ tự matching options; full đầu có locator submit/mobile/conflict rồi native exit; full tiếp theo107/108 do hai conflict alerts trùng locator. Repro review pending thất bại trước sửa; lượt patch đầu chưa trúng mô tả dialog được targeted test bắt và giữ log. Các sửa locator chỉ scope đúng vùng DOM, không hạ SQL/negative assertions.

## 5. NT04/05 root cause và bằng chứng

**Nguyên nhân timeout lịch sử: UNCONFIRMED; không có causal fix.** Full log cũ cho thấy 124 lượt EXPIRED và poison vẫn IN_PROGRESS đã qua; assertion hỏng ở lần chờ poison EXPIRED sau DROP TRIGGER, line275. API còn sống, các ca sau vẫn chạy; test duration478273.9163ms. Không có lock/clock trace tại giây đó để kết luận race, timezone, transaction hoặc scheduler failure.

Đã kiểm 125 fixtures, trigger isolation, scan100/15s, row locking/finalize/idempotency và teardown. DB test hiện tại không có trigger lỗi/connection cũ tại kiểm tra đầu; có expired attempts từ fixtures lịch sử, không xóa chúng. Không dùng log fault injection làm native crash stack hoặc sửa nghiệp vụ theo phỏng đoán. Điều tra nguyên nhân lịch sử còn mở.

## 6. NT04/05 verification

Giữ nguyên test/125 attempts/two-stage poison assertion và thời gian chờ. Targeted1/1 PASS trong44074.8818ms; 44 activity/clock samples, max wall gap1017ms, 0 blocked samples được quan sát. Full HTTP tiếp theo54/54 PASS trong85428.0314ms. Lượt final: PASS trong39675.7318ms ở nguyên HTTP54; SQL row isolation/idempotent grading còn nguyên. Không tăng timeout, giảm fixtures, tắt scheduler hoặc mock SQL. PASS mới xác minh hành vi trong môi trường test; không biến nguyên nhân timeout cũ thành đã sửa.

## 7. Matching result

Backend sinh UUID mới cho snapshot matching left/right và shuffle matchingOptions mỗi lần đọc. Test cũ dùng ID ngân hàng hoặc thứ tự options là sai contract. Fixture mới ánh xạ theo leftText/rightText đã biết và UUID thực của attempt; chỉ canonicalize thứ tự matchingOptions khi so sánh hai public projection. Không sửa backend/randomization hoặc dùng option index làm authority. PASS trong browser full cuối; payload UUID/revision/reload/server grade được đối chiếu SQL. Lượt targeted matching trước đó cũng1/1 PASS, không cộng lặp vào tổng cuối.

## 8. ExamVersion v1/v2 regression

UI08-01 tạo ba loại câu, publish v1, giao pin v1, publish v2 rồi mới start. So sánh title/duration30/order/points[2.5,1.25,3], SQL examVersionId và toàn bộ examSnapshot với bản v1 trước v2; v1 record không đổi. Student làm đủ ba loại, SQL payload/revision, review không đổi answers, reload giữ answers, submit server chấm6.75/6.75. Student/Teacher/Admin được phép xem, Student khác403. Không lấy current Exam thay snapshot.

## 9. NAV-01–NAV-14 final results

| NAV    | Hành vi đã kiểm trên source cuối                | Kết quả |
| ------ | ----------------------------------------------- | ------- |
| NAV-01 | Student dashboard→Assigned Exams→Back           | PASS    |
| NAV-02 | Saved workspace leave/reopen, deadline/revision | PASS    |
| NAV-03 | Pending PUT/Browser Back giữ draft và queue     | PASS    |
| NAV-04 | Save error/cảnh báo/retry                       | PASS    |
| NAV-05 | Real409/local giữ trước confirmation            | PASS    |
| NAV-06 | Submit pending/UNKNOWN/Back/duplicate           | PASS    |
| NAV-07 | Previous/Next không remount queue               | PASS    |
| NAV-08 | Teacher detail→verified list; filter local      | PASS    |
| NAV-09 | Admin detail→list/current identity              | PASS    |
| NAV-10 | Direct URL/fallback đúng role/parent            | PASS    |
| NAV-11 | A logout→B/Browser Back/Forward                 | PASS    |
| NAV-12 | 390/768 palette/Back/Escape/focus               | PASS    |
| NAV-13 | Wrong-role history không vượt quyền             | PASS    |
| NAV-14 | Navigation không duplicate writes/submit        | PASS    |

## 10. BackButton behavior

Dùng verified internal history theo account/role/session epoch, tối đa32 routes trong memory. Reject external/encoded/query/login/cross-role destinations; không quay vào active attempt từ history. Direct detail về parent list; direct dashboard về public homepage. Back không submit/hủy attempt. Teacher filter/page còn useState, không hứa persist qua unmount; Admin inline detail giữ list state qua onClose. Browser tab switch không là navigation câu/trang.

## 11. Mobile palette focus

NAV12 ở390 và768 kiểm Enter/Tab/Escape, focus trap/restore trigger, chọn câu đóng dialog rồi focus đúng question target, Tab tới review button, không hidden/inert focus và SQL revision không đổi. NAV07/14 kiểm queue không remount khi chuyển câu/theme/palette. P1 mobile legacy mở palette trước khi tìm question buttons, không chuyển test sang desktop để né responsive.

## 12. Autosave integrity

AnswerAutosave core giữ nguyên byte. SaveSnapshot/editVersion/confirmedVersion/revision, serialized writes/retry/flush giữ contract. UI08-09 gate A pending, edit B→C, release A rồi C: đúng hai payload A,C, không hiển thị saved trước C, SQLrevision2/C và reloadC. NAV03/04/07/14, UI08-05 kiểm draft local, abort/pending/retry/recovery và không duplicate writes. Không thêm localStorage hoặc durable draft claims.

## 13. Revision/conflict409

NAV05 và NT01 hai tab dùng response409 thật: giữ local answer, không ghi đè row của tab khác trước xác nhận, retry đọc revision thật và lưu revision tiếp theo; SQL/reload đối chiếu. Locator legacy dùng role alert vì warning không còn là span; giữ conflict-confirmation và SQL assertions. Không giảm backend revision validation.

## 14. Safe submission

Dialog có unanswered/review/pending/errors/conflict, khóa edit và flush trước POST. NAV06 kiểm pending/duplicate; UI08-08 abort saves làm flush thất bại, 0submit/0answer SQL, giữ local draft rồi recover/retry và chỉ một POST thành công. UI08-02 mất response sau commit GET reconcile; UI08-03 POST+GET unavailable giữ UNKNOWN, Back bị chặn, kiểm lại IN_PROGRESS mới cho retry. UI08-07 giữ request thực15s sau commit rồi reconcile, không kết luận timeout nghĩa là server chưa nhận. SUBMITTED/EXPIRED do backend quyết định, không reopen hay chấm ở client.

## 15. API failure/recovery

UI08-05 xác minh PID/PPID/executable/start time bằng Win32_Process trước stop đúng API test4010. Intentional stop mid-save rồi đúng một recovery cùng config, local answer giữ và SQLrevision1 sau retry. Runner ghi intentional trước termination; không attach development4000. Native exit ngoài dự kiến được ghi riêng, dừng dependent worker và freeze evidence. Không ProcDump/debugger/capture mới, không autorestart vô hạn.

## 16. SQL verification

Guard kiểm host127.0.0.1/port15433/nameonline_exam_phase3_test/cluster identity7702318921920503846 khác development7699697588847288354 trước query/fixture; đủ5 migrations. Assertions kiểm attempt/question IDs, answers, revisions, IN_PROGRESS/SUBMITTED/EXPIRED, deadline/submittedAt, pinned snapshot, grades/result policy. Migration preservation tests dùng SQL hiện hữu trên database test prefix mới và giữ chúng. Không SQL development/reset/drop/db push/development seed hoặc xóa volume.

## 17. Responsive/keyboard/touch/axe

Browser full cuối có4 widths390/768/1024/1440 ×LIGHT/DARK =8 axe checks0violations (wcag2a/wcag2aa/wcag21aa), document không overflow. Native Edge zoom2.0 được set/get bằng extension trong profile tạm; content dài, reflow và screenshot CDP physical layout để tránh crop. Reduced-motion, keyboard/Enter/Space/Escape/focus trap/restore và matching mouse/keyboard/touch/select swap/clear của P1 giữ assertions. Timer không aria-live mỗi giây. Chưa NVDA/VoiceOver hoặc chứng nhận WCAG toàn hệ thống.

Hậu kiểm ảnh native zoom của full suite phát hiện ảnh chụp quá sớm, chỉ có phần đầu trang; ảnh đó không được dùng để chứng minh nội dung dài đã reflow. Đã chạy bổ sung UI08-06 từ bản test TEMP trên cùng frozen source/build, đợi saved/câu hỏi dài/fonts/two animation frames trước đo và chụp. Run `focus-5ef4e6ad-b1c4-4770-8711-04f514bf3f82`:1/1 PASS,0skip; zoom2.0, viewport707CSSpx, scrollWidth707/scrollHeight1226; PNG1414×2453 đã xem trực tiếp chứa đủ câu hỏi240 ký tự X và đáp án dài. Back→leave→Escape restore focus và palette→question focus được kiểm thật. Evidence `%TEMP%/examspace-ui08-browser-rcKN3y`; không sửa source và không cộng rerun này vào246. Giới hạn readiness của screenshot trong ca source cũ được ghi rõ, không dùng ảnh crop làm evidence đầy đủ.

## 18. Visual comparison

Giữ mapping Stitch thật ở mục3; không cần tải lại khi chưa có thay đổi thiết kế mới. Header/timer/cards/palette/single/multiple là PARTIAL theo Academic Focus; Matching/Back/save/review/leave/submit/error/UNKNOWN/mobile/DARK là ADAPTED theo backend/lifecycle thật; proctor/AI/scratchpad/Ordering GAP ngoài scope. Không pixel-perfect. Đã xem ảnh app desktop LIGHT, mobile DARK, matching v1, palette/leave/submit và native zoom; fixtures là dữ liệu test, không dashboard production. Không đưa raw PRIVATE Stitch HTML/images vào Git.

## 19. Final typecheck/lint/build

Typecheck/lint/build đều exit0 trên source freeze2026-11-02T08:13:39.643Z. Root tests cũng exit0; thời điểm/commands lưu trong final-results.json và gate logs. Build nhận NEXT_PUBLIC_API_URL test4010 ngay từ build; runner xác minh chunks có4010, không4000. db:generate không chạy lại vì không schema/dependency/generated-client contract change; client hiện có được sử dụng. Không chỉnh compiler rules để che lỗi.

## 20. Root tests

84 PASS = tooling17 + Jest47/14suites + frontend20. Jest47 gồm45unit+2PostgreSQL service tests; frontend20 gồm9autosave+8session/API+3navigation. Lượt final chạy sau fingerprint mới, không lấy root84 cũ. Không đo coverage mới hoặc cộng HTTP/browser vào Jest coverage.

## 21. HTTP/PostgreSQL

54/54 PASS,0FAIL/0skip trong lượt final full-d0ae1d06-2513-4334-a3b3-012a8805c967. Nguyên danh sách tám file trong package test:integration, concurrency1, không filter/skip/only. Giữ Auth/CSRF/refresh/logoutCAS/ownership/roster/pinned metadata/deadline/row isolation/idempotent grading/resultvisibility và migration preservation.

## 22. Browser E2E

108/108 PASS,0FAIL/0skip trong lượt final full-d0ae1d06-2513-4334-a3b3-012a8805c967; gồm baseline81+workspace27 (NAV12 có2 widths, visual có4 cases). Nguyên chín file trong package test:e2e, concurrency1, không filter/skip/only. Focused/failed/native-aborted/reruns không cộng vào unique final total. Tổng mới:84root+54HTTP+108browser =246tests. Không cộng reruns, requests, SQL rows hoặc kết quả lịch sử.

## 23. Final format/security/diff

Format toàn worktree, git diff --check/cached --check, preservation và secret scan đạt trong hậu kiểm cuối; metadata lưu ngoài Git. Scan toàn bộ text source public so exact config secrets trong memory và private-key/GitHub/AWS/JWT patterns; không in giá trị .env/test secrets. Đây là scan có phạm vi, không chứng nhận không thể có mọi dạng secret/lỗ hổng. Không tắt pg concurrent-query hoặc Node module detection warnings.

## 24. Source fingerprint/freeze

294 file public ngoài báo cáo được hash sau patch cuối, trước typecheck/lint/build/root/full tests. Hậu kiểm294/294 hashes khớp,0mutation bất ngờ. Prefix checkpoint và .env hai worktrees giữ đúng bytes/hash. Generated declaration chỉ được hoàn lại khi current hash đúng known build output và bản đích khớp SHA UI-08 baseline `0f70629890b72a0a82e91972cc032c04b658b26c265373cb711cf576bfbf8fcc`. Không Git restore/reset hoặc sửa tsconfig. .env hai worktrees giữ hash; prefix checkpoint report kiểm byte, chỉ append.

## 25. UI-01–UI-07 regression

Nguyên Foundation/Admin/Teacher/Student suites giữ login/logout/cache/accountchange/cross-tab/activeexam guards, SSR role, form validation, noJS, nativezoom, axe/responsive, scoped totals/classes/questions/exams/versions/assignments/history và negativeRBAC/IDOR. Shared session lifecycle/exam guard/queue giữ byte. Không mock success hoặc bỏ các negative assertions để xanh.

## 26. Runtime 0xC0000409

**RUNTIME UNSTABLE — ROOT CAUSE UNKNOWN. Không runtime fix.** UI-08 cũ PID27600 exit05:13:47.110Z vẫn giữ evidence. UI-08.1 có ít nhất hai incident mới:

| Run                                        | Start/exitUTC               | Kết quả                                                                                           |
| ------------------------------------------ | --------------------------- | ------------------------------------------------------------------------------------------------- |
| focus-73ce418b-283c-432d-9834-df7177fdde63 | 07:38:41.744Z→07:38:47.598Z | PID27740; code3221226505/signalnull/intentionalfalse;5.854s                                       |
| full-97502414-f3a4-412a-a308-891e03868c80  | 07:42:21.033Z→07:47:35.032Z | PID13000; HTTP54PASS, browser bị dừng tại khoảng ca39; code3221226505/signalnull/intentionalfalse |

Cả hai được freeze logs/JSON/activity và hashes (17/23files), không đổi thành PASS. Không có exception parameters/native stack/faulting module; không quy Prisma/Argon2/Nest/Node từ exit code. Các intentional stop/recovery và fixture fault injection tách riêng. Lượt final full-d0ae1d06-2513-4334-a3b3-012a8805c967 không unexpected API exit; có đúng một intentional stop/recovery của UI08-05 và intentional cleanup. Điều này không chứng minh đã sửa lỗi native. Node24.15.0/executable giữ nguyên, không ProcDump/dump/security change.

## 27. Known limitations

Local draft chủ yếu ở memory: crash/browserclose/systemloss có thể mất phần chưa server-confirmed. beforeunload/sentinel không bảo đảm mọi reload/history/frozen/mobile/system lifecycle. Client clock không là deadline authority. Teacher filter/page không persist qua unmount. Runtime native cause và NT04 historical timeout cause còn chưa xác nhận. Chưa productionHTTPS/Securecookie/proxy/crosssite/refreshmultiprocessSSR/schedulermultiinstance/throughput/screenreader certification. Không durable recovery hoặc production readiness claims.

## 28. File ledger UI-08.1

7file baseline thay đổi so với đầu UI-08.1:

```text
apps/web/src/components/attempt-workspace.tsx
tests/ui-workspace.test.cjs
tests/p0-browser.test.cjs
tests/p1-browser.test.cjs
tests/p2-browser.test.cjs
apps/web/next-env.d.ts
docs/STITCH_EXAMSPACE_UI_EXAM_WORKSPACE_REPORT.md
```

Trong đó5file source/tests,1generated hygiene,1append report;0file mới/0mất,288/295 baseline giữ byte. Không sửa package.json trong UI-08.1. So sánh với295-file baseline UI-08.1, không quy toàn bộ diff với HEAD cho lần này. Không thêm dependency/API/migration; UI-01–UI-08 có sẵn giữ nguyên ngoài ledger này.

## 29. Evidence và cleanup

Evidence ngoài Git: `%TEMP%/examspace-ui081-964fd8ee`: before/source-before/env hashes, document/input ledger, NT04 analysis/activity, frozen native incidents, final source freeze/gate logs, process start/exit/intentional records, secret/preservation/fingerprint checks. Full run cuối: `full-d0ae1d06-2513-4334-a3b3-012a8805c967`; browser workspace screenshot/axe: `C:\Users\Admin\AppData\Local\Temp\examspace-ui08-browser-WsnwPm`. Failed/focused runs giữ nguyên, không overwrite hoặc tính PASS. API4010/web3010 do runner tạo đã dừng đúng ownership; test connections ngoài controller0, năm migrations/checksums giữ nguyên. Test container về stopped như đầu đợt, development container và API4000 còn chạy; port3000 không có listener ở hậu kiểm, nhiệm vụ này không start/stop web3000; không xóa databases/fixtures/volumes/evidence. Không commit raw logs/config/cookies/profiles/dumps/PRIVATE Stitch assets hoặc secrets.

## 30. Điều kiện UI-09 test-only

Có thể review/chốt phạm vi UI-09 cho test-only sau khi người dùng chấp nhận rõ runtime risk còn mở; nghiệm thu này chỉ xác nhận UI-08 trong môi trường test cách ly. Không tự mở đợt UI-09 hoặc coi runtime gate đã đóng. Không triển khai UI-09 trong nhiệm vụ này, không phê duyệt production. Review source/UI08 report và chấp nhận runtime UNSTABLE phải giữ rõ ở đợt sau; tiếp tục test identity/observer/queue/revision/deadline/snapshot/servergrading/resultpolicy và bounded failure handling.

**UI-08 FUNCTIONAL ACCEPTANCE PASSED IN ISOLATED TEST ENVIRONMENT — RUNTIME RISK OPEN — NOT PRODUCTION READY**
