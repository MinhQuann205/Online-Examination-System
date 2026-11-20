# ExamSpace

Ứng dụng thi trực tuyến dành cho quản trị viên, giảng viên và học viên. Dự án được xây dựng trong quá trình thực tập, từ quản lý lớp và ngân hàng câu hỏi đến giao bài, làm bài và xem kết quả.

## Chức năng

- **Quản trị viên:** quản lý tài khoản, phân công giảng viên, quản lý lớp và thành viên, xem báo cáo bài thi.
- **Giảng viên:** soạn câu hỏi một đáp án, nhiều đáp án và ghép nối; chọn câu, sắp thứ tự và đặt điểm; phát hành phiên bản đề; giao bài cho lớp hoặc từng học viên; theo dõi tiến độ và kết quả.
- **Học viên:** xem bài được giao, làm bài có tự lưu, tiếp tục lượt đang làm, nộp bài và xem lịch sử theo quyền được công bố.

Đề đã phát hành được lưu theo phiên bản. Lượt làm và điểm được tính theo bản nội dung lúc bắt đầu, nên việc sửa ngân hàng câu hỏi hoặc phát hành đề mới không thay đổi kết quả cũ. Điểm và đáp án được công bố độc lập theo cấu hình bài giao.

## Công nghệ

Frontend dùng Next.js 16, React 19, TypeScript, Tailwind CSS, React Hook Form, Zod và TanStack Query. Backend dùng NestJS 11, Prisma ORM 7 và PostgreSQL 16. Mã nguồn được tổ chức thành pnpm monorepo; các module backend dùng chung Prisma provider.

```text
apps/web         Giao diện Next.js
apps/api         API NestJS, Prisma schema, migrations và seed
packages/shared  Kiểu dữ liệu và validation dùng chung
tests            Kiểm thử HTTP, trình duyệt và hạ tầng test
docs             Tài liệu kiến trúc, dữ liệu và kiểm thử
```

## Cài đặt

Cần Node.js 24, Corepack, pnpm 10.18.3 và PostgreSQL 16. Có thể chạy PostgreSQL bằng Docker Desktop hoặc dùng một instance đã chuẩn bị riêng.

Clone repository rồi mở terminal tại thư mục gốc:

```powershell
git clone https://github.com/MinhQuann205/Online-Examination-System.git
cd Online-Examination-System
corepack pnpm install --frozen-lockfile
if (-not (Test-Path -LiteralPath '.env')) {
    Copy-Item -LiteralPath '.env.example' -Destination '.env'
}
```

Sửa `.env` trước khi chạy:

- Đặt `POSTGRES_PASSWORD` và mật khẩu tương ứng trong `DATABASE_URL`.
- Đặt `JWT_ACCESS_SECRET` và `JWT_REFRESH_SECRET` thành hai giá trị khác nhau, mỗi giá trị ít nhất 32 ký tự.
- Giữ `WEB_ORIGIN`, `NEXT_PUBLIC_API_URL` và `API_PORT` khớp với địa chỉ thực tế. Mặc định Web ở `http://localhost:3000`, API ở `http://localhost:4000`.
- Nếu dùng seed, đặt ba biến `SEED_ADMIN_PASSWORD`, `SEED_TEACHER_PASSWORD`, `SEED_STUDENT_PASSWORD`, mỗi mật khẩu ít nhất 12 ký tự.

Không đưa `.env` hoặc mật khẩu vào Git. `NEXT_PUBLIC_API_URL` được đóng vào frontend lúc build; `API_INTERNAL_URL` có thể dùng để đặt địa chỉ API cho Next server.

### Database

Với môi trường local mới dùng Compose của dự án:

```powershell
docker compose up -d postgres
corepack pnpm db:generate
corepack pnpm --filter @exam/api exec prisma migrate status
```

Compose dùng cổng `127.0.0.1:5432` và volume lưu dữ liệu. Kiểm tra cổng và database đích trước khi chạy nếu máy đã có PostgreSQL. `db:generate` chỉ sinh Prisma Client, không cập nhật database.

Sau khi xác nhận đúng database mới, áp dụng migrations:

```powershell
corepack pnpm db:migrate
# Tùy chọn, chỉ cho dữ liệu minh họa local:
corepack pnpm db:seed
```

Nếu database đã có dữ liệu, kiểm tra migration status và backup trước khi áp dụng phần còn thiếu. Không dùng reset hoặc db push để ép schema. Nếu đã đủ migrations và tài khoản, không cần seed lại mỗi lần chạy.

### Khởi động ứng dụng

```powershell
corepack pnpm dev:stitch
```

Lệnh này kiểm tra cổng, generate Prisma Client, build shared package rồi chạy API và Web. Nó không tự start PostgreSQL, migrate hay seed. Mở:

- Web: <http://localhost:3000>
- Swagger: <http://localhost:4000/docs>

Nếu đã xác minh API đang chạy đúng source và database, có thể chỉ chạy Web bằng `corepack pnpm dev:stitch:web`. Khi cổng bị chiếm, kiểm tra terminal cũ trước; không tắt tất cả process Node.

### Tài khoản minh họa

Các tài khoản dưới chỉ có sau khi seed thành công trên đúng database:

| Vai trò | Email                                                                     | Mật khẩu                                          |
| ------- | ------------------------------------------------------------------------- | ------------------------------------------------- |
| Admin   | `admin@example.test`                                                      | Giá trị `SEED_ADMIN_PASSWORD` lúc tạo tài khoản   |
| Teacher | `teacher@example.test`                                                    | Giá trị `SEED_TEACHER_PASSWORD` lúc tạo tài khoản |
| Student | `student1@example.test`, `student2@example.test`, `student3@example.test` | Giá trị `SEED_STUDENT_PASSWORD` lúc tạo tài khoản |

Seed không chạy trong production và không đổi mật khẩu của tài khoản đã tồn tại. Thay mật khẩu seed trong `.env` không làm đổi mật khẩu tài khoản cũ.

## Kiểm thử

```powershell
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
corepack pnpm format:check
```

`corepack pnpm test` có hai suite cần PostgreSQL. `test:integration` và `test:e2e` cần API, database test riêng và cấu hình guard; chúng có thể ghi dữ liệu test. Không chạy các lệnh này vào database development. Xem [hướng dẫn kiểm thử](docs/TESTING.md) để biết các biến môi trường, browser và điều kiện chạy từng nhóm.

## Tài liệu và giới hạn

- [Kiến trúc](docs/ARCHITECTURE.md)
- [Thiết kế dữ liệu](docs/DATABASE.md)
- [Kiểm thử](docs/TESTING.md)

Các luồng chính đã được kiểm thử trong môi trường Linux cách ly. Lỗi native exit từng xảy ra trên Windows vẫn chưa xác định nguyên nhân; chưa có kết luận đã khắc phục. Dự án chưa được nghiệm thu production, chưa có proctoring, AI hoặc xuất PDF/Excel.
