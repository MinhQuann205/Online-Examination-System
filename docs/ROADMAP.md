# Lộ trình

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
