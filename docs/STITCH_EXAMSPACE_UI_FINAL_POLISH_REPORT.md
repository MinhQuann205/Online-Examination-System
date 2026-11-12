# ExamSpace UI-10 — Final Polish & System Acceptance Report

Ngày đánh giá: 02/11/2026, Asia/Saigon  
Worktree: `C:\Môn Học\ThucTapNgheNghiep\ExamSpace-Stitch-UI`  
Branch/HEAD: `feature/stitch-examspace-ui` / `a1e2891754e399aa4743e32c8218759938149bdc`

## Kết luận

**UI-10 FINAL ACCEPTANCE CHƯA ĐẠT — TEST RUN BỊ NGẮT DO NATIVE API EXIT — RUNTIME UNSTABLE / ROOT CAUSE UNKNOWN — PRODUCTION DEPLOYMENT NOT APPROVED.**

UI-01–UI-09 source được giữ nguyên. Không có lỗi UI/source độc lập được tái hiện để sửa; không đổi application/backend/schema/migrations/dependencies/Node/security config. UI-10 bổ sung năm tài liệu bàn giao. UI-09 results chỉ là historical evidence.

## Phạm vi

Đã inventory App Router, parent layouts/role shells, static navigation references và local run scripts. Không thấy `TODO`, `FIXME` hay gọi trực tiếp `router.back()` trong web source. Static search không chứng minh mọi dynamic route đã được chạy. Academic Focus/Plus Jakarta Sans và các luồng stateful cũ được giữ; không thêm mock Stitch metrics.

## Quality gates mới

| Gate              | Kết quả                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------- |
| Lint monorepo     | PASS                                                                                    |
| Root              | **87/87 PASS** (17 tooling + 47 Jest/14 suites + 23 frontend), với test-only env hợp lệ |
| HTTP/PostgreSQL   | **60/60 PASS**, cùng full runner                                                        |
| Browser E2E       | **28 PASS, sau đó API test native-exit; suite 123 chưa hoàn tất**                       |
| Typecheck         | Chưa chạy: Next dev đang dùng worktree ở port 3000; tránh thao tác trên cùng `.next`    |
| Build             | Chưa chạy vì cùng live Next dev/`.next`; UI source không đổi sau UI-09 build gate       |
| Format            | PASS                                                                                    |
| Git diff checks   | PASS, không có whitespace error                                                         |
| Secret scan       | 305 text files; 0 matches trong phạm vi scan                                            |
| Preservation      | Snapshot UI 306/306 unchanged; original repo 250/250; API 65 files trùng HEAD           |
| HEAD/branch/index | Không đổi; không stage                                                                  |

Lượt root đầu thiếu `DATABASE_TEST_URL` nên hai integration suites fail-closed ở setup; không tính lượt đó. Root rerun với test-only config trong memory đạt 87/87. UI-09 root87 + HTTP60 + browser123 là lịch sử, không cộng vào số UI-10.

## Native exit UI-10

API test PID **17996**, Node **24.15.0**, executable SHA-256 `3331e1ffe19874215472217c5e94f5a0c6d8e18c4ac7111d3937aa0ad5e9b4a5`. Start **2026-11-02T11:55:52.937Z**, unexpected exit **2026-11-02T11:59:34.004Z**, code **3221226505 / 0xC0000409**, signal null, intentional false. Browser đã tới case 28/123; runner dừng workload phụ thuộc, không restart. Web test cleanup là intentional.

Test DB identity được guard trước khi query; sau cleanup `backendsAfterStop=[]`. Không query/sửa development SQL. Không có native exception parameters, stack hoặc faulting module; không dùng ProcDump/debugger, không tạo dump. **Root cause UNKNOWN.**

## Source / services

UI snapshot trước tài liệu: 306 files; hậu kiểm 306 unchanged, 0 missing/added. Repository Phase 3 gốc 250 unchanged; UI worktree `apps/api` 65 tracked files trùng HEAD. Không reset/clean/stash/restore/checkout/rebase/merge/commit/push/deploy. API development/Next 4000/3000 không bị runner dừng; runner chỉ sở hữu API4010/Next3010.

## Còn mở

- Browser E2E 123-case chưa hoàn tất; typecheck/build chưa rerun trong lượt này.
- Native API crash tái diễn, chưa xác định nguyên nhân; HTTP PASS không loại trừ crash lúc browser workload.
- Chỉ câu trả lời được API xác nhận mới được đảm bảo lưu; draft pending có thể mất khi browser/process/system dừng.
- Chưa nghiệm thu production soak/load, HTTPS/proxy/cross-site cookies, refresh nhiều process, scheduler nhiều instance, backup/restore, screen reader/WCAG.

Trước khi chốt cần native investigation theo quy trình duyệt riêng, rồi source freeze + typecheck/build + full regression, không restart để che incident.

**Trạng thái: UI-01–UI-09 retained · UI-10 audit/docs prepared · UI-10 full acceptance INCOMPLETE · Runtime UNSTABLE · Production NOT APPROVED.**
