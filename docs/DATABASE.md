# Thiết kế cơ sở dữ liệu

Prisma schema nằm ở `apps/api/prisma/schema.prisma`, migration SQL đầu tiên ở `apps/api/prisma/migrations/20261022000000_init`. PostgreSQL dùng UUID cho khóa chính, khóa ngoại có chỉ mục phù hợp, các bảng nội dung có `createdAt`/`updatedAt` (riêng `ClassMember` có thêm `joinedAt`). Migration thêm CHECK cho đích giao bài, thời gian, số lượt, thời lượng và điểm mỗi câu.

| Nhóm                | Bảng                                             | Quan hệ chính                                                                                      |
| ------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Tài khoản           | `User`, `Class`, `ClassMember`                   | Giáo viên dạy lớp; học viên tham gia lớp với unique `(classId, studentId)`                         |
| Ngân hàng câu hỏi   | `Question`, `QuestionOption`, `MatchingPair`     | Một câu có lựa chọn hoặc cặp ghép; loại câu xác định bằng enum                                     |
| Đề thi              | `Exam`, `ExamQuestion`                           | `(examId, version, position)` là duy nhất; mỗi câu chứa `questionSnapshot` và điểm                 |
| Giao bài và kết quả | `ExamAssignment`, `ExamAttempt`, `AttemptAnswer` | Giao cho đúng một lớp hoặc học viên; mỗi lần làm lưu `examVersion`, `examSnapshot`, đáp án và điểm |

Đề thi đã phát hành phải tạo version mới khi chỉnh sửa. Khi bắt đầu lượt làm, service Phase 2 sẽ sao chép nội dung version vào `ExamAttempt.examSnapshot`; khi chấm, dùng snapshot đó thay vì câu hỏi hiện tại. Nhờ vậy lịch sử không thay đổi khi ngân hàng câu hỏi được sửa. Chưa có API tạo/sửa đề hoặc chấm điểm trong Phase 1.

Các bất biến xuyên bảng như “giáo viên của lớp”, “người nhận giao bài là học viên” và “đáp án thuộc snapshot” sẽ được kiểm tra trong service và transaction ở Phase 2. Prisma không biểu diễn được hết các CHECK trong schema; giữ nguyên chúng trong migration SQL.
