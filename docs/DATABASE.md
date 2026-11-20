# Dữ liệu ExamSpace

Schema nằm ở `apps/api/prisma/schema.prisma`, migrations ở `apps/api/prisma/migrations/`. Database sử dụng PostgreSQL 16; API truy cập qua Prisma ORM và PostgreSQL driver adapter.

## Các model

| Model            | Dữ liệu và quan hệ chính                                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `User`           | Tài khoản, role, trạng thái, password/refresh hash và tokenVersion; liên kết lớp, nội dung do Teacher soạn và các lượt làm |
| `Class`          | Tên, mã unique, Teacher phụ trách và trạng thái lưu trữ                                                                    |
| `ClassMember`    | Quan hệ Class–Student; unique `(classId, studentId)`                                                                       |
| `Question`       | Tác giả, loại câu, nội dung, độ khó, chủ đề, giải thích và trạng thái lưu trữ                                              |
| `QuestionOption` | Các lựa chọn và key đúng của câu trắc nghiệm                                                                               |
| `MatchingPair`   | Các cặp trái/phải đúng của câu ghép nối                                                                                    |
| `Exam`           | Đề hiện tại: tác giả, metadata, trạng thái, thời lượng và số phiên bản                                                     |
| `ExamQuestion`   | Cấu hình câu của đề: version, thứ tự, điểm và question snapshot                                                            |
| `ExamVersion`    | Phiên bản đã phát hành, số version, snapshot và thời điểm publish                                                          |
| `ExamAssignment` | Đề/phiên bản được giao, lớp hoặc Student nhận, người giao, lịch, quota và policy kết quả                                   |
| `ExamAttempt`    | Lượt làm của Student, assignment/version, snapshot, deadline, review flags, trạng thái và điểm                             |
| `AttemptAnswer`  | Answer JSON, revision và điểm từng câu; unique `(attemptId, questionId)`                                                   |

Không có bảng Result riêng. API dựng kết quả từ `ExamAttempt`, `AttemptAnswer`, snapshot và policy của bài giao.

## Quan hệ và ràng buộc

Teacher phụ trách nhiều lớp và soạn nhiều câu/đề. Student tham gia lớp qua `ClassMember`. Một đề có nhiều câu cấu hình, nhiều phiên bản đã phát hành và nhiều bài giao; mỗi bài giao có các lượt làm, mỗi lượt có các câu trả lời.

Khóa chính dùng UUID. Các unique constraint bảo vệ email, mã lớp, membership, số version và thứ tự câu. `ExamQuestion.points`, score/maxScore và awarded sử dụng `Decimal(8,2)`.

Migration SQL còn có CHECK cho thời lượng dương, điểm câu dương, maxAttempts dương, lịch đóng sau lịch mở khi cả hai được đặt, và đúng một người nhận giữa classId/studentId. Vai trò, ownership, quyền thành viên, payload thuộc snapshot và revision được kiểm thêm tại service/transaction; không thể suy các điều kiện này chỉ từ FK.

`AttemptAnswer.questionId` là UUID thuộc snapshot, không phải FK tới câu hỏi ngân hàng đang chỉnh sửa. `examVersionId` ở assignment/attempt nullable để tương thích dữ liệu cũ; luồng giao/bắt đầu mới yêu cầu version hợp lệ và không tự thay bằng latest khi thiếu hoặc sai pin.

## Snapshot, điểm và lịch sử

Publish tạo `ExamVersion.snapshot`. Khi bắt đầu, hệ thống lưu `ExamAttempt.examSnapshot` cùng version và deadline. Sau đó việc sửa câu hỏi hay tạo đề mới không thay căn cứ chấm của lượt cũ.

Answer được lưu với revision để phát hiện ghi đè/xung đột. Review flags lưu riêng, không tăng answer revision và không ảnh hưởng điểm. Khi submit hoặc hết hạn, server khóa hàng lượt làm, chấm snapshot và commit trạng thái/điểm cùng nhau.

Xóa membership không xóa attempt lịch sử. Membership hiện tại ảnh hưởng quyền list/start và scope Teacher; Student vẫn chỉ đọc lượt/kết quả thuộc mình theo contract. Điểm chưa công bố khác với điểm 0; đáp án đúng chỉ được trả theo policy cho phép.

## Migrations

| Thứ tự | Migration                             | Nội dung                                 |
| ------ | ------------------------------------- | ---------------------------------------- |
| 1      | `20261022000000_init`                 | Bảng, quan hệ và các ràng buộc ban đầu   |
| 2      | `20261023000000_management_fields`    | Độ khó/chủ đề/lưu trữ và indexes quản lý |
| 3      | `20261024000000_exam_versions`        | ExamVersion, pin version và deadline     |
| 4      | `20261029000000_phase3_p1_review`     | Index lịch sử ExamVersion                |
| 5      | `20261029001000_attempt_review_flags` | Mảng UUID đánh dấu câu xem lại           |

Đây là danh sách migration trong source, không phải xác nhận database của người đọc đã áp dụng đủ.

### Cài mới và cập nhật

Từ root, `corepack pnpm db:generate` sinh Client cục bộ; không áp schema hoặc ghi dữ liệu. Prisma config đang đọc `DATABASE_URL`, vì vậy cần cấu hình `.env` theo README trước khi generate. Client được ignore và không commit.

Kiểm database đích bằng `corepack pnpm --filter @exam/api exec prisma migrate status`. Chỉ chạy `corepack pnpm db:migrate` sau khi xác nhận đúng instance và phần pending; root script gọi `prisma migrate deploy`. Không sửa migration cũ, checksum hoặc `_prisma_migrations` để ép thành công.

Với database có dữ liệu, cần backup ngoài Git và thử restore vào database mới cách ly trước khi triển khai. SQL thêm index/cột có thể chờ hoặc giữ lock, nên xem transaction dài và thời gian bảo trì. Sau deploy, kiểm migration history, schema/indexes và ứng dụng trên đúng môi trường. Không dùng reset/db push hoặc restore đè dữ liệu hiện có để xử lý lỗi.

Database test phải là instance riêng với development; guard kiểm tên, host/port và cluster identity trước fixtures. Xem [README](../README.md) để cài đặt và [TESTING](TESTING.md) để chạy tests.
