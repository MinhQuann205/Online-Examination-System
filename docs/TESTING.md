# Kiểm thử ExamSpace

Chạy lệnh từ root repository sau khi cài dependencies theo `pnpm-lock.yaml`, cấu hình `.env` và generate Prisma Client. Không dùng database development cho fixtures.

## Các nhóm kiểm tra

| Lệnh                                    | Nội dung                                                   | Cần database thật                         |
| --------------------------------------- | ---------------------------------------------------------- | ----------------------------------------- |
| `corepack pnpm typecheck`               | Build shared và kiểm TypeScript API/Web                    | Không                                     |
| `corepack pnpm lint`                    | ESLint các workspace                                       | Không                                     |
| `corepack pnpm build`                   | Build shared, API và Web                                   | Không; cần cấu hình URL phù hợp lúc build |
| `corepack pnpm test:tooling`            | Database guard và evidence helpers với mocks               | Không                                     |
| `corepack pnpm --filter @exam/web test` | Frontend helpers, autosave, validation, session/navigation | Không                                     |
| `corepack pnpm test`                    | Tooling, toàn bộ API Jest và frontend                      | Có: hai PostgreSQL-backed Jest suites     |
| `corepack pnpm test:integration`        | HTTP/SQL và migration preservation                         | Có, API và database test riêng            |
| `corepack pnpm test:e2e`                | Playwright trên ứng dụng thật                              | Có, thêm Web/browser và runner phù hợp    |
| `corepack pnpm format:check`            | Kiểm định dạng, không sửa file                             | Không                                     |

`db:generate` phải tạo được `apps/api/src/generated/prisma/client.ts` trước khi typecheck/build API. Nếu thiếu file này, nhiều lỗi mất model hoặc `$transaction` của PrismaService có thể xuất hiện theo sau. Kiểm lỗi generate đầu tiên thay vì thêm `any` hoặc sửa các service để bỏ lỗi.

Build/typecheck có thể sinh `dist`, `.next`, tsbuildinfo và generated declarations. Không đưa những file đó vào commit như thay đổi chức năng.

## Cấu hình test có database

| Biến                                     | Ý nghĩa                                                      |
| ---------------------------------------- | ------------------------------------------------------------ |
| `DATABASE_TEST_URL`                      | URL riêng tư tới `online_exam_phase3_test`                   |
| `TEST_DATABASE_HOST`                     | `127.0.0.1`                                                  |
| `TEST_DATABASE_PORT`                     | Khớp URL/instance; cấm cổng development 5432                 |
| `TEST_DATABASE_SYSTEM_IDENTIFIER`        | Cluster ID thật của instance test                            |
| `DEVELOPMENT_DATABASE_SYSTEM_IDENTIFIER` | ID development, phải khác test                               |
| `P0_API_URL`, `P0_WEB_URL`               | Địa chỉ API/Web test; mặc định cổng 4000/3000 trên localhost |

API dùng `DATABASE_URL` trỏ cùng target test, `NODE_ENV=test`, JWT secrets riêng và `WEB_ORIGIN` khớp Web. Web phải build với đúng `NEXT_PUBLIC_API_URL`; kiểm `API_INTERNAL_URL` nếu có. Guard đọc SQL để xác nhận database/cluster/recovery state trước fixtures. Không đặt ID giả hoặc đổi URL sang development để vượt lỗi.

Test database cần đủ năm migrations hiện có. Các ca có thể tạo user, lớp, câu, đề và attempt, chạy scheduler hoặc fault injection. Migration tests còn tạo database theo prefix giới hạn và giữ lại dữ liệu. Xác định process sở hữu, phạm vi ghi và cleanup trước khi chạy; không dùng API development đang mở sẵn.

## Browser và acceptance tests

Phần lớn suites đọc `P0_BROWSER_CHANNEL`, mặc định `msedge`; một số suite mới mặc định `chromium`. Kiểm browser đã cài trước khi chạy. Ca native zoom cần zoom thật, không thay bằng CSS zoom.

Một số tests được thiết kế cho lượt nghiệm thu có runner riêng, chưa portable sang mọi database test:

| File / nhóm                                      | Điều kiện bổ sung                                                                                          |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `ui113-business-journey.test.cjs`                | `UI113_ACCEPTANCE_APPROVED=1`, source fingerprint 64 ký tự hex và disposable cluster `7707490234436235289` |
| `ui114-api.test.cjs`, `ui114-workflows.test.cjs` | `UI114_FEATURE_RUNTIME_APPROVED=1`                                                                         |
| `ui115-api.test.cjs`, `ui115-web.test.cjs`       | `UI115_WEB_RUNTIME_APPROVED=1`                                                                             |
| `ui15-api.test.cjs`, `ui15-web.test.cjs`         | `UI15_RUNTIME_APPROVED=1`; cần chọn tường minh, không ở file lists mặc định                                |
| API recovery trong `ui-workspace.test.cjs`       | Runner điều khiển đúng API test và ghi nhận intentional stop/recovery                                      |

Biến opt-in không thay kiểm target. Không đặt tất cả thành 1 để chạy trên database tùy ý. Nếu cần hỗ trợ disposable cluster khác, phải review thay đổi harness và giữ identity/negative checks. Full integration/E2E sẽ không tự đạt trên checkout mới chỉ vì API/Web đã start.

## Ghi nhận kết quả

Ghi source/commit, môi trường, lệnh, exit code và pass/fail/skip của từng lượt. Phân biệt helper/service mocks, SQL thật và browser thật; không cộng reruns, requests hoặc screenshots thành số tests. Logs, config, cookies, profiles và backup nằm ngoài Git.
