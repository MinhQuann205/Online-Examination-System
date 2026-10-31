# ExamSpace — Online Examination System

Monorepo pnpm cho hệ thống thi trực tuyến: Next.js App Router, NestJS modular monolith, PostgreSQL 16 và Prisma ORM 7. Frontend dùng React Hook Form, Zod, TanStack Query, Tailwind CSS và dnd-kit. Trạng thái nghiệm thu được ghi trong [lộ trình](docs/ROADMAP.md) và các báo cáo Phase 3; build thành công không thay thế kiểm thử nghiệp vụ.

## Chức năng hiện có

- Phase 1: JWT/Argon2, HttpOnly cookies, refresh rotation, logout/đổi mật khẩu thu hồi phiên, dashboard ADMIN/TEACHER/STUDENT.
- Phase 2: tạo/chi tiết/sửa/khóa tài khoản; lớp, phân công giảng viên và học viên; ngân hàng SINGLE_CHOICE/MULTIPLE_CHOICE/MATCHING, sửa/nhân bản/lưu trữ. Backend kiểm quyền tài nguyên.
- Phase 3: soạn/reorder/tổng điểm, publish version bất biến, chọn version giao lớp/cá nhân; lượt làm có deadline server, autosave revision, review flags, điều hướng/progress; chấm snapshot trong transaction; lịch sử, báo cáo và giám sát theo quyền, phân trang và chính sách công bố đáp án/điểm.
- Phase 4 chưa triển khai: proctoring, tích hợp bên ngoài và phân tích nâng cao. Không có tuyên bố production ready.

**Source Phase 3 có năm migrations. Development được xác minh ngày 30/10/2026 đã áp dụng đủ năm.** Trên máy khác phải kiểm tra trạng thái thực tế, không suy từ kết quả này rằng database của bạn đã migrate. Xem [tổng hợp phát hành và giới hạn](docs/PHASE3_RELEASE_SUMMARY.md) và [runbook backup/migration](docs/PHASE3_DEV_MIGRATION_PLAN.md).

## Yêu cầu

- Windows 10/11, Node.js 24, Corepack và Docker Desktop đang chạy.
- PostgreSQL chạy qua Docker Compose hoặc một PostgreSQL 16 tương thích.
- Các cổng mặc định: web `3000`, API `4000`, database `5432`.

## Cài đặt trên PowerShell

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Sửa `.env`: đặt `POSTGRES_PASSWORD` và cập nhật cùng mật khẩu trong `DATABASE_URL`; tạo **hai** giá trị ngẫu nhiên khác nhau dài ít nhất 32 ký tự cho `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`; đặt ba mật khẩu seed dài ít nhất 12 ký tự. Có thể tạo bí mật bằng PowerShell:

```powershell
[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Chạy lần lượt từ thư mục gốc:

```powershell
corepack enable
corepack pnpm install --frozen-lockfile
docker compose up -d postgres
corepack pnpm db:generate
# Kiểm tra trạng thái database đích trước khi tiếp tục:
corepack pnpm --filter @exam/api exec prisma migrate status
```

### Database mới, database hiện có và khởi động

- **Database mới, trống:** xác minh DATABASE_URL đúng đích rồi chạy `corepack pnpm db:migrate`. Có thể chạy `corepack pnpm db:seed` để tạo tài khoản mẫu development với mật khẩu đã cấu hình.
- **Database hiện có dữ liệu:** kiểm `prisma migrate status`; backup và thử restore vào database mới riêng trước khi deploy phần pending, theo runbook. Nếu đã đủ năm thì không cần chạy lại migration hay seed. Không dùng migrate reset hoặc db push để ép schema.
- **Database test:** dùng server riêng, tên `online_exam_phase3_test`, cấu hình guard ở mục Kiểm tra. Chỉ deploy migrations vào đích test sau xác minh; không dùng backup chứa tài khoản thật làm fixtures.

Sau khi schema đích sẵn sàng:

```powershell
corepack pnpm dev
```

Script dev tự chạy `dev:prepare`: generate Prisma Client → build `@exam/shared` → start API/web song song. Shared khai báo entry point trong dist, vì vậy bước build là bắt buộc trên checkout mới; không dựa vào dist có sẵn. Generate không áp migration. Sau khi sửa shared trong phiên dev, chạy lại build shared hoặc restart dev.

Nếu PowerShell chặn `pnpm.ps1`, dùng `corepack pnpm` như các lệnh trên hoặc chạy `pnpm.cmd`; không cần đổi execution policy. Mở `http://localhost:3000` và đăng nhập với một trong các email seed bên dưới. API Swagger ở `http://localhost:4000/docs`.

| Vai trò | Email                                                                     | Mật khẩu                                     |
| ------- | ------------------------------------------------------------------------- | -------------------------------------------- |
| Admin   | `admin@example.test`                                                      | Giá trị `SEED_ADMIN_PASSWORD` trong `.env`   |
| Teacher | `teacher@example.test`                                                    | Giá trị `SEED_TEACHER_PASSWORD` trong `.env` |
| Student | `student1@example.test`, `student2@example.test`, `student3@example.test` | Giá trị `SEED_STUDENT_PASSWORD` trong `.env` |

Seed chỉ chạy khi `NODE_ENV` khác `production`; chạy lại không tạo bản ghi trùng và không đổi mật khẩu tài khoản đã có. Nếu cần đổi mật khẩu, dùng endpoint `POST /auth/change-password` khi đã đăng nhập.

## Kiểm tra

Các tests PostgreSQL yêu cầu cấu hình tường minh dưới đây; thiếu/sai cấu hình thì fail, không skip. Server test phải là instance riêng với development. Cổng test có thể thay đổi (ví dụ 15433), luôn cấm 5432; host chỉ nhận loopback 127.0.0.1. Không in connection string có credentials.

```powershell
$env:DATABASE_TEST_URL = '<URL bí mật của database online_exam_phase3_test trên server test riêng>'
$env:TEST_DATABASE_HOST = '127.0.0.1'
$env:TEST_DATABASE_PORT = '15433' # Phải khớp URL và server đã xác minh
$env:TEST_DATABASE_SYSTEM_IDENTIFIER = '<system identifier thật của server test>'
$env:DEVELOPMENT_DATABASE_SYSTEM_IDENTIFIER = '<system identifier thật của server development>'
```

Lấy identity bằng kết nối READ ONLY tới từng server đã xác minh: `SELECT current_database(), system_identifier::text FROM pg_control_system();` (cần quyền đọc hàm này). Hai identifiers phải khác nhau. Không tự điền ID giả để bỏ guard. Mọi runner kiểm lại identity SQL trước query/fixtures; migration test chỉ tạo tên có prefix giới hạn trên đúng server test. Không dùng URL development.

API test phải chạy với DATABASE_URL bằng DATABASE_TEST_URL, JWT secrets tạm khác nhau, NODE_ENV=test, WEB_ORIGIN=http://localhost:3000; web 3000 trỏ API 4000. Chuẩn bị DB test đủ năm migration, generate/build rồi start API/web trước integration/E2E. Thiết lập cùng các biến guard cho terminal chạy tests.

```powershell
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
corepack pnpm test
corepack pnpm test:integration
corepack pnpm test:e2e
corepack pnpm format:check
docker compose ps
```

Kiểm tra phiên thủ công: đăng nhập từng vai trò và xác nhận URL dashboard; thử gọi `/dashboard/teacher` bằng cookie của Student và phải nhận HTTP 403. API không trả token trong JSON; cookie có `HttpOnly`, `SameSite=Lax` và thêm `Secure` khi `NODE_ENV=production`.

`test` chạy tooling guard/evidence tests, Jest (gồm hai PostgreSQL suites) và unit autosave frontend. `test:integration` gọi API/PG thật và kiểm migration preservation; cần quyền CREATE DATABASE **trên server test**, giữ DB fixtures. `test:e2e` cần Edge/Playwright browser (`P0_BROWSER_CHANNEL`, mặc định `msedge`), API/web thật; fault injection chỉ giữ/abort mạng. Không đếm HTTP/browser vào Jest coverage. Log/backup/cookie jar không đưa vào Git.

## Môi trường và vận hành

- `.env` chỉ dùng local: `DATABASE_URL`, hai JWT secrets khác nhau tối thiểu 32 ký tự, `WEB_ORIGIN`, `API_PORT`; cấu hình Compose qua `POSTGRES_*`. Không in connection string chứa password.
- `NEXT_PUBLIC_API_URL` là URL public API được đóng vào bundle lúc build; `API_INTERNAL_URL` dùng khi Next server gọi API. Các biến phải khớp topology thực tế.
- CSRF kiểm exact Origin cho POST/PUT/PATCH/DELETE; chỉ khi thiếu Origin mới dùng Referer. `CSRF_TRUSTED_ORIGINS` là danh sách origin bổ sung phân cách dấu phẩy, không wildcard/path. Swagger trên API origin cần khai báo origin đó; CLI mutation cũng phải gửi trusted Origin.
- API Swagger: 4000/docs; web: 3000. `corepack pnpm --filter @exam/api start` và `corepack pnpm --filter @exam/web start` dùng sau build. Không đưa `.env`, Prisma Client sinh tự động hoặc backup vào commit.
- HTTPS/Secure cookie và reverse proxy phải được kiểm thử theo deployment thật. CORS chỉ giới hạn đọc response; CSRF middleware mới chặn unsafe side effect. Không coi HTTP localhost là nghiệm thu production.

## Cấu trúc

- `apps/web`: Next.js, Tailwind CSS, thành phần UI theo cấu trúc shadcn/ui, React Hook Form, Zod, TanStack Query.
- `apps/api`: NestJS modular monolith, Prisma schema/migrations/seed, JWT, RBAC, Swagger.
- `packages/shared`: kiểu dữ liệu và schema đầu vào dùng chung.
- `docs`: [kiến trúc](docs/ARCHITECTURE.md), [cơ sở dữ liệu](docs/DATABASE.md), [lộ trình](docs/ROADMAP.md).

Trong triển khai nhiều host, cấu hình `WEB_ORIGIN`, `NEXT_PUBLIC_API_URL` và API nội bộ (`API_INTERNAL_URL`) theo môi trường; cookie domain và chính sách CSRF cần được rà soát trước khi mở truy cập công cộng. Không commit `.env`, `node_modules` hoặc đầu ra Prisma Client.

### Kiểm scheduler sau restart

Đặt `EXAMSPACE_RESTART_RUN_ID` bằng UUID mới và `EXAMSPACE_RESTART_EVIDENCE_DIR` bằng thư mục evidence ngoài repository. Giữ nguyên hai biến và cấu hình database test giữa `node tests/p2-restart.cjs prepare` và `node tests/p2-restart.cjs verify`. Sau prepare, dừng **chỉ API test do mình khởi chạy**, đợi qua deadline rồi khởi động lại cùng build/config trước verify. Driver tạo thư mục run mới, từ chối reuse/overwrite, xác minh JSON/run/database/instance/IDs và ghi verification riêng. Không dùng API hoặc database development.
