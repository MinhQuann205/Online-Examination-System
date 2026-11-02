# Runbook triển khai database Phase 3

Source có năm migrations; development của đợt xác minh 30/10/2026 đã đủ năm. Đây là quy trình cho từng môi trường, không phải lệnh yêu cầu deploy lại. Xem [release summary](PHASE3_RELEASE_SUMMARY.md) và [README](../README.md).

## 1. Xác minh trước triển khai

- Kiểm Git root, nhánh, status/diff và giữ mọi thay đổi chưa commit.
- Xác minh host, port, database, role, container/volume và PostgreSQL system identifier của đích, không in credentials hoặc toàn bộ Docker environment.
- Chụp counts/fingerprint dữ liệu, metadata và lịch sử migration bằng READ ONLY. Kiểm migrations không lỗi/unfinished; đối chiếu SQL/checksum với source. Khác newline phải được kiểm nội dung riêng, không sửa file/history để che lỗi.
- Từ apps/api chạy `corepack pnpm exec prisma migrate status`. Chỉ triển khai phần pending đã review; không mặc định mọi máy có cùng lịch sử.

## 2. Backup và checkpoint

Ngừng ghi trong maintenance window phù hợp. Tạo backup bằng pg_dump custom format vào vị trí ngoài Git có quyền truy cập hạn chế và tên duy nhất; không redirect binary qua PowerShell text. Kiểm exit code, size, SHA-256 và pg_restore --list. Thử restore bằng pg_restore --exit-on-error --single-transaction vào **database mới** trên server cách ly; đối chiếu schema, dữ liệu/fingerprint, migration history và mapping quyền sở hữu. Không restore đè hoặc drop database cũ.

Trình baseline, backup/restore đã kiểm chứng, SQL pending, locks/transaction dài, maintenance/recovery plan để phê duyệt việc triển khai database có dữ liệu. Backup phải còn phù hợp với trạng thái trước deploy; thay đổi dữ liệu/schema sau backup cần kiểm tra lại hoặc backup mới. Không tự kill client đang giữ lock.

## 3. Deploy sau phê duyệt

Không sửa năm migration hiện có. Hai P1 là 20261029000000_phase3_p1_review (thêm index ExamVersion examId/publishedAt) và 20261029001000_attempt_review_flags (thêm UUID[] NOT NULL default rỗng). CREATE INDEX thường và ALTER TABLE có thể chờ/chặn locks; không cam kết downtime chỉ dựa vào số hàng. Nếu cần chiến lược khác, review migration additive riêng.

Đặt DATABASE_URL đúng đích đã xác minh, từ root chạy `corepack pnpm db:migrate`, kiểm exit code. Không reset/db push/resolve hay sửa _prisma_migrations để ép thành công.

## 4. Hậu kiểm

- Migrate status đủ năm; từ apps/api chạy `corepack pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`, mong đợi exit 0.
- Kiểm index ExamVersion_examId_publishedAt_idx và cột ExamAttempt.reviewQuestionIds UUID[] NOT NULL default mảng rỗng.
- Đối chiếu checksum lịch sử và fingerprint dữ liệu; khi so schema additive chỉ loại cột mới mặc định khỏi hash giá trị cũ, không bỏ bảng/score/answer/snapshot khỏi kiểm tra.
- Generate Client, typecheck/lint/build/tests trên DB test riêng. Chỉ start binary mới sau schema gate. Smoke đúng môi trường và quyền ba vai trò; không dùng hàng loạt acceptance fixtures trên development.
- Lưu evidence đã che bí mật ngoài Git, chỉ mở ghi lại sau hậu kiểm.

## 5. Recovery

Nếu lỗi, giữ trạng thái và logs/locks để điều tra; không xóa index/cột, reset hoặc sửa migration history thủ công. Nếu cần khôi phục, restore backup vào database mới cách ly, kiểm dữ liệu/quyền rồi xin phê duyệt đổi kết nối. Không ghi đè database cũ. Binary có review flags cần schema tương ứng; không chạy với schema cũ để kết luận ứng dụng hỏng.
