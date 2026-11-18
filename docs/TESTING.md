# Kiểm thử ExamSpace

Chạy lệnh từ thư mục gốc của repository. Cài dependencies theo `pnpm-lock.yaml`, generate Prisma Client và build shared package trước khi chạy các nhóm riêng. Không dùng database development cho fixtures.

## Các lệnh có sẵn

| Lệnh                                    | Nội dung                                            | Điều kiện                                                                   |
| --------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------- |
| `corepack pnpm typecheck`               | Build shared rồi kiểm tra TypeScript API/Web        | Dependencies và Prisma Client đúng nền tảng                                 |
| `corepack pnpm lint`                    | ESLint các workspace                                | Dependencies                                                                |
| `corepack pnpm build`                   | Build shared, API và Web                            | Cấu hình API URL phù hợp lúc build                                          |
| `corepack pnpm test:tooling`            | Kiểm guard database và evidence helpers             | Không cần SQL thật                                                          |
| `corepack pnpm --filter @exam/web test` | Frontend helpers, autosave và session tests         | Node24, shared đã build                                                     |
| `corepack pnpm test`                    | Tooling, shared build, toàn bộ Jest API và frontend | Có hai PostgreSQL-backed Jest suites, cần DB test riêng                     |
| `corepack pnpm test:integration`        | HTTP/SQL và migration preservation                  | API thật, DB test, quyền tạo migration-test database và các opt-in bên dưới |
| `corepack pnpm test:e2e`                | Playwright trên ứng dụng thật                       | API/Web, browser, DB test, opt-in và điều khiển API test ở ca recovery      |
| `corepack pnpm format:check`            | Prettier                                            | Không sửa file                                                              |

Các lệnh typecheck/build có thể ghi `dist`, `.next` hoặc generated declarations. Không đưa các file sinh ra vào commit như thay đổi chức năng.

## Cấu hình database test

Test guard yêu cầu các biến sau. Giá trị thực được cấu hình riêng trong terminal test, không ghi vào repository:

| Biến                                     | Yêu cầu                                           |
| ---------------------------------------- | ------------------------------------------------- |
| `DATABASE_TEST_URL`                      | URL riêng tư của `online_exam_phase3_test`        |
| `TEST_DATABASE_HOST`                     | `127.0.0.1`                                       |
| `TEST_DATABASE_PORT`                     | Khớp URL và instance đã xác minh; cấm5432         |
| `TEST_DATABASE_SYSTEM_IDENTIFIER`        | Cluster ID thật của instance test                 |
| `DEVELOPMENT_DATABASE_SYSTEM_IDENTIFIER` | Cluster ID development, khác test                 |
| `P0_API_URL`, `P0_WEB_URL`               | Địa chỉ API/Web test; mặc định localhost4000/3000 |

Guard kiểm lại tên database, cluster ID và recovery state bằng SQL trước fixtures. Không đặt ID giả hoặc đổi URL sang development để vượt lỗi. Database test phải đủ năm migrations hiện có. Test migration có thể tạo thêm database theo prefix giới hạn và giữ lại chúng.

API dùng `DATABASE_URL` trỏ đúng DB test, `NODE_ENV=test`, hai JWT secrets test riêng và `WEB_ORIGIN` khớp Web. Web cần được build với đúng `NEXT_PUBLIC_API_URL`; `API_INTERNAL_URL` phải trỏ đúng API nếu được đặt. Đảm bảo các process này thuộc lượt test, không dùng API development đang mở sẵn.

## Browser và các ca cần điều phối

Phần lớn browser suites dùng `P0_BROWSER_CHANNEL`, mặc định `msedge`; một số suite mới mặc định `chromium`. Kiểm tra channel của từng file và browser đã cài. Không thay native browser zoom bằng CSS zoom để lấy kết quả đạt.

Một số ca không thể chạy bằng việc chỉ start API/Web rồi gọi full suite:

- `tests/ui113-business-journey.test.cjs`: yêu cầu `UI113_ACCEPTANCE_APPROVED=1`, `UI113_SOURCE_FINGERPRINT`64hex và hiện được khóa với disposable cluster`7707490234436235289` của lượt nghiệm thu. Nó sẽ từ chối một cluster mới; không sửa guard chỉ để chạy trên database khác.
- `tests/ui114-api.test.cjs` và `tests/ui114-workflows.test.cjs`: cần `UI114_FEATURE_RUNTIME_APPROVED=1`.
- `tests/ui115-api.test.cjs` và `tests/ui115-web.test.cjs`: cần `UI115_WEB_RUNTIME_APPROVED=1`.
- `tests/ui15-api.test.cjs` và `tests/ui15-web.test.cjs`: cần `UI15_RUNTIME_APPROVED=1`; không nằm trong hai file lists mặc định ở root, cần chọn tường minh nếu đưa vào một test plan.
- Ca UI08 API recovery cần runner điều khiển đúng API test, ghi nhận intentional stop/recovery và kiểm ownership. Không trỏ điều khiển này vào API development.

Các biến `*_APPROVED` là điều kiện opt-in của harness, không thay thế việc xác minh target hoặc quyền chạy workload. Không đặt tất cả biến thành1 rồi dùng database tùy ý. Nếu cần làm harness portable sang một disposable cluster mới, đó là thay đổi test infrastructure riêng cần review, giữ kiểm identity và negative assertions.

Full integration/browser chỉ phù hợp khi đã chốt source, DB identity, các fixtures được phép ghi, process ownership, timeout/request caps và cleanup. Những tests này có thể tạo user/lớp/đề/lượt làm, chạy fault injection và scheduler finalization. Không dùng chúng như smoke test chỉ đọc.

## Kết quả đã có và phạm vi chưa chạy

Lượt UI15 R2 đã xác minh373 scoped tests:242service trong22suites,103frontend,18tooling và10live (1critical,5HTTP,4browser). Typecheck/lint/build đạt trên candidate444file fingerprint`c542300d738120191154451f9689b211b785c51b2b650467f41b2afebc711363`. Journey kiểm Admin→Teacher→Student, answer revisions, snapshotV1 bất biến và server grade6.75/6.75.

Con số373 thuộc candidate/lượt chạy đó, không phải kết quả mới của việc sửa README hoặc đóng gói bản push. Full configured integration/E2E và hai PostgreSQL-backed Jest suites chưa được chạy trong final scoped acceptance này. Windows native exit và production readiness vẫn chưa được kết luận đã xử lý.

Khi thay đổi code, chạy lại đúng phạm vi bị ảnh hưởng và ghi rõ lệnh, source, môi trường, pass/fail/skip. Không cộng reruns, requests, SQL rows hay screenshots vào số test. Giữ logs/config/cookie/profile và database backup ở ngoài Git; chỉ đưa kết quả đã lọc vào PR khi cần.
