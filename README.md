# Online Examination System — Phase 1

Monorepo cho hệ thống thi trực tuyến: Next.js App Router, NestJS, PostgreSQL và Prisma ORM. Phase 1 có đăng nhập, phiên HttpOnly cookie, phân quyền ba vai trò và dashboard lấy thông tin người dùng từ API thật. Các chức năng tạo đề, làm bài và thống kê nằm trong [lộ trình](docs/ROADMAP.md).

## Yêu cầu

- Windows 10/11, Node.js 24, Corepack và Docker Desktop đang chạy.
- PostgreSQL chạy qua Docker Compose hoặc một PostgreSQL 16 tương thích.
- Các cổng mặc định: web `3000`, API `4000`, database `5432`.

## Cài đặt trên PowerShell

```powershell
Copy-Item .env.example .env
```

Sửa `.env`: đặt `POSTGRES_PASSWORD` và cập nhật cùng mật khẩu trong `DATABASE_URL`; tạo **hai** giá trị ngẫu nhiên khác nhau dài ít nhất 32 ký tự cho `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`; đặt ba mật khẩu seed dài ít nhất 12 ký tự. Có thể tạo bí mật bằng PowerShell:

```powershell
[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Chạy lần lượt từ thư mục gốc:

```powershell
corepack enable
corepack pnpm install
docker compose up -d postgres
corepack pnpm db:generate
corepack pnpm db:migrate
corepack pnpm db:seed
corepack pnpm dev
```

Nếu PowerShell chặn `pnpm.ps1`, dùng `corepack pnpm` như các lệnh trên hoặc chạy `pnpm.cmd`; không cần đổi execution policy. Mở `http://localhost:3000` và đăng nhập với một trong các email seed bên dưới. API Swagger ở `http://localhost:4000/docs`.

| Vai trò | Email                                                                     | Mật khẩu                                     |
| ------- | ------------------------------------------------------------------------- | -------------------------------------------- |
| Admin   | `admin@example.test`                                                      | Giá trị `SEED_ADMIN_PASSWORD` trong `.env`   |
| Teacher | `teacher@example.test`                                                    | Giá trị `SEED_TEACHER_PASSWORD` trong `.env` |
| Student | `student1@example.test`, `student2@example.test`, `student3@example.test` | Giá trị `SEED_STUDENT_PASSWORD` trong `.env` |

Seed chỉ chạy khi `NODE_ENV` khác `production`; chạy lại không tạo bản ghi trùng và không đổi mật khẩu tài khoản đã có. Nếu cần đổi mật khẩu, dùng endpoint `POST /auth/change-password` khi đã đăng nhập.

## Kiểm tra

```powershell
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
corepack pnpm test
corepack pnpm format:check
docker compose ps
```

Kiểm tra phiên thủ công: đăng nhập từng vai trò và xác nhận URL dashboard; thử gọi `/dashboard/teacher` bằng cookie của Student và phải nhận HTTP 403. API không trả token trong JSON; cookie có `HttpOnly`, `SameSite=Lax` và thêm `Secure` khi `NODE_ENV=production`.

## Cấu trúc

- `apps/web`: Next.js, Tailwind CSS, thành phần UI theo cấu trúc shadcn/ui, React Hook Form, Zod, TanStack Query.
- `apps/api`: NestJS modular monolith, Prisma schema/migrations/seed, JWT, RBAC, Swagger.
- `packages/shared`: kiểu dữ liệu và schema đầu vào dùng chung.
- `docs`: [kiến trúc](docs/ARCHITECTURE.md), [cơ sở dữ liệu](docs/DATABASE.md), [lộ trình](docs/ROADMAP.md).

Trong triển khai nhiều host, cấu hình `WEB_ORIGIN`, `NEXT_PUBLIC_API_URL` và API nội bộ (`API_INTERNAL_URL`) theo môi trường; cookie domain và chính sách CSRF cần được rà soát trước khi mở truy cập công cộng. Không commit `.env`, `node_modules` hoặc đầu ra Prisma Client.
