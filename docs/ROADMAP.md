# Lộ trình ExamSpace

## Trạng thái hiện tại (30/10/2026)

- Phase 1: đã triển khai đăng nhập/JWT/HttpOnly cookies/refresh rotation/logout/change-password/RBAC và dashboard ba vai trò; tiếp tục chạy regression khi thay đổi.
- Phase 2: đã triển khai Users/Classes/Questions, chi tiết/chỉnh sửa, roster/phân công, ownership/validation, pagination và archive/duplicate. Bổ sung UI/tests thiếu trong P0/P1. Không coi coverage hiện tại là chứng nhận mọi biến thể.
- Phase 3: **nghiệm thu chức năng trên DB test PASS trong phạm vi kiểm tra P2**, gồm 119 automated tests và luồng UI thật v1/v2. Xem [tổng hợp phát hành và giới hạn](PHASE3_RELEASE_SUMMARY.md). Sẵn sàng chuẩn bị PR review, chưa phê duyệt merge hoặc production; không đánh đồng ba trạng thái. Development đã được xác minh đủ năm migrations ngày 30/10; máy khác cần kiểm trạng thái, backup và quy trình triển khai riêng. Sáu finding GR-01–GR-06 đã khắc phục/retest; Git Review sau sửa READY TO COMMIT với 146 tests chạy cuối PASS, xem release summary. Chưa stage/commit hoặc phê duyệt merge. HTTPS/CI/AT và các deployment gates còn chờ.
- Phase 4: chưa triển khai. Proctoring, tích hợp ngoài, phân tích nâng cao và triển khai production không nằm trong đợt này.

## Phạm vi Phase 3

Soạn đề có thứ tự/tổng điểm, publish version bất biến, giao version cho lớp/cá nhân, deadline/số lượt, autosave CAS và khôi phục, matching chuột/touch/bàn phím, review/navigation/progress, transaction grading snapshot, lịch sử và báo cáo theo scope, chính sách công bố, phân trang. Gate gồm typecheck/lint/build/unit/HTTP-PG/browser/format/Prisma diff. Production HTTPS, refresh concurrency, scheduler recovery/load và accessibility phải báo bằng chứng/giới hạn riêng.

## Kế hoạch lịch sử

Các mục bên dưới lưu kế hoạch ban đầu; tạo đề/giao/làm/chấm được chuyển sang Phase 3. Trạng thái mới ở phần trên và báo cáo nghiệm thu thay thế các ghi chú “follow-up” bên dưới.

## Phase 1

Monorepo, Docker PostgreSQL, schema và migration, seed development, JWT/Argon2/cookies/RBAC, Swagger, dashboard ba vai trò và kiểm thử xác thực.

## Phase 2

1. Quản lý tài khoản, quyền và lớp học; ràng buộc giáo viên/học viên tại service.
2. Ngân hàng câu hỏi một đáp án, nhiều đáp án và ghép nối; kiểm tra tính hợp lệ theo loại.
3. Tạo đề, phát hành version bất biến, giao cho lớp hoặc cá nhân theo khung thời gian.
4. Bắt đầu lượt làm, tự lưu đáp án, kiểm soát thời gian và số lượt; chấm bằng snapshot khi nộp.
5. Lịch sử, thống kê Recharts, các bài kiểm thử tích hợp và e2e.

Sử dụng dnd-kit cho thao tác sắp xếp/ghép nối khi xây giao diện câu hỏi; không thêm chức năng giả vào dashboard Phase 1.

## Phase 2 implementation status

User, class, and question APIs are implemented under `apps/api/src/{users,classes,questions}` with real Prisma queries, scoped access, pagination, validation, and archive behavior. Management pages are available at `/admin/users`, `/admin/classes`, `/teacher/classes`, `/student/classes`, and `/teacher/questions`. These screens are an initial management workflow; editing question/user details and richer class roster selection remain follow-up work. Run the workspace checks and apply migrations before using them against a database.
