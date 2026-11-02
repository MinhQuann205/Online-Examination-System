# ExamSpace Phase 3 — Tổng hợp phát hành

## Phạm vi

Exams, Assignments, Attempts, Grading và Results tích hợp NestJS/PostgreSQL/Prisma với Next.js. Có version/snapshot bất biến, chọn version giao lớp/cá nhân, deadline server, autosave revision, matching chuột/cảm ứng/bàn phím, review/navigation/progress, chấm transaction, lịch sử/báo cáo theo scope và chính sách công bố.

Assignment/Results lớp chỉ cho Teacher hiện quản lý lớp; tác giả đề/người giao cũ không mặc nhiên giữ quyền. Direct assignment cần Teacher là người giao và còn quản lý học viên qua membership. Student chỉ xem dữ liệu của mình; counts chỉ tính activity của chính Student. Assignment lấy tên/thời lượng từ pinned version; Result lấy metadata từ snapshot attempt. Nếu legacy thiếu metadata, hiển thị không khả dụng thay vì gán tên hiện tại.

## Migration và vận hành

Source có năm migrations: 20261022000000_init, 20261023000000_management_fields, 20261024000000_exam_versions, 20261029000000_phase3_p1_review và 20261029001000_attempt_review_flags. Development được xác minh đủ năm ngày 30/10/2026; máy khác phải kiểm migrate status và schema diff theo môi trường. Không sửa migration đã áp dụng, không reset/db push. Backup database có dữ liệu và thử restore riêng trước deploy pending; xem [runbook](PHASE3_DEV_MIGRATION_PLAN.md).

## Kiểm thử và Git Review

Lịch sử P2 ghi nhận 119 tests PASS trong phạm vi kiểm tra lúc đó; không cộng vào kết quả chạy mới. Git Review ngày 30/10 phát hiện GR-01–GR-06 về quyền Assignment, cấu hình test DB, metadata snapshot, bootstrap checkout sạch, tài liệu migration và restart evidence. GR-01–GR-06 đã được khắc phục và retest; trạng thái Git Review sau sửa: **READY TO COMMIT**, chưa stage/commit/push hoặc phê duyệt merge.

Kết quả chạy cuối sau sửa, không cộng lặp lượt thử: **146 tests PASS, 0 FAIL, 0 skipped**: 17 tooling, 47 Jest (gồm 2 PostgreSQL), 9 autosave, 39 HTTP/PostgreSQL/migration và 34 Edge browser E2E. Generate/typecheck/lint/build/format/diff-check PASS. Prisma validate, status đủ năm và schema diff 0 đã được kiểm tra lại; kiểm development chỉ đọc. Checkout mô phỏng cách ly không node_modules/dist/.next/generated/.env đã install frozen từ pnpm store, generate/build shared, typecheck, chạy dev và mở giao diện Teacher bằng Edge thành công.

Guard test hỗ trợ cổng được cấu hình và kiểm database/cluster identity SQL khác development trước truy cập. Đã thử cổng test chính và một cổng TCP tùy chỉnh do harness sở hữu trỏ cùng test instance, không chỉ unit fake. Restart driver đã prepare trên thư mục mới, từ chối reuse/wrong run, rồi verify 115 lượt EXPIRED bằng SQL sau dừng/khởi động lại API; giữ nguyên prepared evidence. Số lượt fixture không được tính thành 115 tests.

Một lượt browser mất listener API không có diagnostic xác định nguyên nhân; lượt đầy đủ độc lập sau đó đạt 34/34, ghi nhận API/web chỉ dừng khi harness kết thúc. Không quy nguyên nhân cho nghiệp vụ khi chưa đủ bằng chứng. Coverage và production readiness không được suy từ số tests.

## Phạm vi công bố

Commit source/schema/migrations/tests/config và tài liệu dùng chung. Báo cáo audit/deployment bản gốc giữ private ngoài phạm vi commit, gồm đường dẫn máy, vị trí backup/evidence, cluster/container identifiers, fingerprints/counts môi trường. Bản gốc không bị sửa/xóa; summary không chứa credentials, tài khoản cá nhân, đường dẫn backup hay dữ liệu từng hàng. Danh sách chính xác ở [commit manifest](PHASE3_COMMIT_MANIFEST.md), cần kiểm lại trước khi stage; không dùng git add .

## Giới hạn

Không có phê duyệt merge hoặc production. HTTPS/Secure-cookie/reverse proxy/cross-site, refresh nhiều tab/process SSR, scheduler multi-instance/throughput và screen reader/WCAG toàn hệ thống cần nghiệm thu phù hợp topology. Tests browser/HTTP trên localhost không chứng minh những điều kiện này. Không triển khai Phase 4.
