# Quy tắc phát triển

- Giữ monorepo pnpm và NestJS modular monolith. Business logic nằm trong service, controller chỉ xử lý HTTP.
- Mọi endpoint dữ liệu phải có AuthGuard; quyền vai trò phải đặt ở backend bằng `@Roles` và kiểm thử trường hợp bị từ chối.
- Đầu vào mới cần xác thực bằng Zod hoặc cơ chế validation tương đương. Không đưa token hoặc password hash vào JSON response.
- Mọi thay đổi schema cần migration được review; không dùng `db push --accept-data-loss` hay reset dữ liệu đang có.
- Không commit `.env`, secrets, Prisma Client được generate, `node_modules` hoặc dữ liệu demo production.
- Đề đã phát hành và lượt làm phải chấm theo snapshot/version; chỉnh sửa phải tạo version mới.
- Trước khi hoàn thành thay đổi, chạy typecheck, lint, build, tests và nêu rõ bước nào chưa chạy được.
