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

Phase 2 bổ sung enum `Difficulty` và các trường `Question.difficulty`, `Question.topic`, `Question.archivedAt`, `Class.isArchived` trong migration `20261023000000_management_fields`. Migration chỉ thêm cột/index với default an toàn, không xóa dữ liệu hiện có.

## Schema Phase 3 hiện tại

Các đoạn mô tả Phase 1 ở trên là bối cảnh lịch sử; service tạo đề/làm/chấm hiện đã có trong Phase 3, không thuộc Phase 2.

| Model                                    | Dữ liệu và quan hệ hiện tại                                                                                                                                                                   |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User                                     | UUID, email unique, role/isActive, Argon2 passwordHash/refreshTokenHash, tokenVersion; không trả các trường hash trong JSON                                                                   |
| Class / ClassMember                      | teacherId FK User; code unique; membership unique classId/studentId; xóa membership không cascade xóa attempt                                                                                 |
| Question / QuestionOption / MatchingPair | FK author/question, nội dung ba loại, difficulty/topic/archive; lựa chọn/cặp có unique questionId/position                                                                                    |
| Exam                                     | FK author; nháp hiện tại, version number/status/duration; index authorId/status                                                                                                               |
| ExamVersion                              | FK Exam onDelete Restrict; number, snapshot JSON và publishedAt; unique examId/number; index examId/publishedAt                                                                               |
| ExamQuestion                             | FK Exam/Question; version/position/points Decimal(8,2)/questionSnapshot; unique examId/version/position và examId/version/questionId                                                          |
| ExamAssignment                           | FK Exam, nullable ExamVersion, Class hoặc Student và createdBy User; opensAt/closesAt, maxAttempts, showScore/showAnswers                                                                     |
| ExamAttempt                              | FK Exam/Assignment/Student, nullable ExamVersion; examVersion number, examSnapshot JSON, startedAt/deadlineAt/submittedAt/status, Decimal score/maxScore, reviewQuestionIds UUID[] default [] |
| AttemptAnswer                            | FK attempt onDelete Cascade; questionId thuộc snapshot (kiểm service, không FK ngân hàng); answer JSON, awarded Decimal, revision Int default 0; unique attemptId/questionId                  |

FK version nullable tương thích dữ liệu cũ, không cho phép service start assignment thiếu pin: trả 400 và cần review version đúng, không gán latest. Snapshot đã publish/lượt thi là nguồn chấm; sửa ngân hàng/nháp không thay lịch sử. Deadline legacy null được suy ra/persist dưới transaction và lock. Review flags độc lập answer, revision và điểm.

### Index và CHECK

Ngoài unique/PK, schema có: User(role,isActive); Class(teacherId), (isArchived,teacherId); ClassMember(studentId); Question(authorId,type), (authorId,archivedAt,difficulty), (topic); QuestionOption(questionId,isCorrect); Exam(authorId,status); ExamVersion(examId,publishedAt); ExamQuestion(questionId); Assignment(examId), (classId,opensAt), (studentId,opensAt), (examVersionId); Attempt(studentId,startedAt), (examId,status), (assignmentId,studentId), (status,deadlineAt). Các unique QuestionOption/MatchingPair(questionId,position) hỗ trợ thứ tự.

SQL migration giữ năm CHECK: durationMin > 0; points > 0; assignment đúng một đích classId/studentId; opensAt < closesAt khi cả hai có giá trị; maxAttempts > 0. Prisma validate/status không chứng minh CHECK/index thực tế: cần inspect PostgreSQL và migrate diff. Các quy tắc owner/role/answer thuộc snapshot, tập đáp án, lịch khi đang làm và revision được service kiểm trong transaction.

### Lịch sử và quyền

Assignment lớp dùng membership hiện tại cho list/start. Báo cáo hợp roster với Student có attempt hoàn thành, giữ người đã rời lớp/khóa. Teacher hiện phụ trách lớp có quyền lịch sử; tác giả đề không mặc nhiên đọc kết quả lớp khác. Direct assignment cần Teacher là người giao và đang quản lý Student. Admin toàn hệ thống, Student chỉ của mình; chính sách công bố hiện tại chi phối score/answer key.

## Migration và triển khai

| Thứ tự | Migration                           | Development xác minh 30/10/2026 | Test       |
| ------ | ----------------------------------- | ------------------------------- | ---------- |
| 1      | 20261022000000_init                 | Đã áp dụng                      | Đã áp dụng |
| 2      | 20261023000000_management_fields    | Đã áp dụng                      | Đã áp dụng |
| 3      | 20261024000000_exam_versions        | Đã áp dụng                      | Đã áp dụng |
| 4      | 20261029000000_phase3_p1_review     | Đã áp dụng                      | Đã áp dụng |
| 5      | 20261029001000_attempt_review_flags | Đã áp dụng                      | Đã áp dụng |

Migration 4 chỉ CREATE INDEX thường, có thể chặn ghi trên ExamVersion trong lúc tạo; cần maintenance window nếu bảng lớn. Migration 5 ADD COLUMN UUID[] NOT NULL với constant default rỗng, PostgreSQL 16 hỗ trợ fast default nhưng vẫn cần ACCESS EXCLUSIVE lock ngắn; chờ transaction dài có thể kéo dài downtime. Không thay score/key/snapshot/answer hoặc sửa lịch sử migration. Client P1 đọc cột mới nên database phải migrate trước chạy binary mới.

Development cổng 5432 không dùng làm fixtures. Test harness chỉ nhận tên online_exam_phase3_test, loopback và cổng test cấu hình tường minh khác 5432; kiểm SQL database/cluster system identifier khác development trước mọi truy cập. Test migration dùng DB prefix riêng trên cùng server đã xác minh. Xem cấu hình trong [README](../README.md). Migrate status đủ năm chưa đủ chứng minh đồng bộ; migrate diff test cần exit 0. Xem [kế hoạch backup/deploy/recovery](PHASE3_DEV_MIGRATION_PLAN.md); không reset hoặc db push. Trên máy khác cần kiểm trạng thái riêng và backup database có dữ liệu trước triển khai.
