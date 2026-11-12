# ExamSpace UI-10.5 — Controlled Test PostgreSQL Recovery

Ngày: **10/11/2026, Asia/Saigon**. Các mốc vận hành dưới đây là UTC.

## 1. Executive summary

**TEST POSTGRESQL RECOVERED — SQL IDENTITY VERIFIED — FIVE MIGRATIONS VERIFIED. GATE A PASS.**

User đã phê duyệt đúng một startup; guarded script được user thực thi trong PowerShell có Docker access. Đúng một lệnh docker start c53c8db640b1 exit0; existing container/image/volume/mapping không đổi. Fresh post-start logs có Ready1/checkpoint2/PANIC0/FATAL0; TCP15433 connected.

SQL test chỉ đọc xác nhận database online_exam_phase3_test, cluster7702318921920503846, recovery=false, transaction_read_only=on, đủ năm migrations hoàn tất/không rolled back. Metadata connection đã đóng.

Gate A PASS chỉ trong scope recovery/identity/history này. Gate B NOT RECHECKED (historical BLOCKED), API/Web/E2E NOT RUN, native0xC0000409 cause UNKNOWN, production NOT APPROVED. Không restore/reset/recreate/migrate/seed hoặc development SQL.

## 2. Git/source preservation

Worktree C:/Môn Học/ThucTapNgheNghiep/ExamSpace-Stitch-UI; branch feature/stitch-examspace-ui; HEAD a1e2891754e399aa4743e32c8218759938149bdc. Baseline320 public tracked/untracked files; fingerprint9609c89f2015a0e40ce7f78d0cf8fae927452f94e0957d383611d0af952691d3. Original238 files theo cùng scope loại ignored/generated/env contents.

Final comparison lưu preservation/final.json: toàn bộ320 baseline UI và238 original giữ nguyên byte; chỉ thêm báo cáo này. HEAD/branch/index/staged contents/env hashes và original status giữ nguyên. Không quy các thay đổi uncommitted có sẵn cho UI105. Không stage/commit/push/reset/clean/stash/restore/checkout/rebase/merge/deploy.

Independent source/database backup NOT VERIFIED. Hash manifest không phải backup có thể khôi phục data. Container startup có thể ghi PGDATA; không tuyên bố database data files giữ nguyên byte.

## 3. Current Docker context

Sandbox queries bị từ chối Docker config/context/Engine; không đổi quyền/context để vượt restriction. User capture dùng context desktop-linux (default=false), client/server29.6.2, read-only commands exit0. Executor được phân biệt rõ: user PowerShell hiện có Docker access, không agent RunAs/elevation.

Nguồn: docker/preflight.json, docker/owner-preflight.json, docker/owner-provenance.json. Collector source hashes khớp; raw env/State.Error/server logs không được xuất.

## 4. Test container identity

VERIFIED existing container:

- Full ID c53c8db640b1f710e35fafbd1766656ce6b704c2c70e8130fff956ba92527198.
- Name /examspace-phase3-restore-20261030-115026.
- Created2026-10-30T04:51:11.430275898Z.
- Trước startup exited255; sau startup running.
- New StartedAt2026-11-10T07:47:45.088578824Z.

Guarded script re-inspected exact ID/name/image/volume/port ngay trước action; không ID drift, replacement hoặc Compose recreate.

## 5. Historical Exit255

Prestart metadata xác nhận ExitCode255, OOMKilled=false, restartCount0, State.Error EMPTY, restart policy no; old StartedAt2026-11-02T08:55:46.404970285Z, FinishedAt2026-11-03T03:14:06.725099754Z.

Poststart running/ExitCode0/OOM=false/State.Error EMPTY. Docker còn giữ old FinishedAt; không dùng trường đó thay current Status để gọi container đã dừng lại. Old Exit255 cause vẫn UNKNOWN; recovery thành công không xác định nguyên nhân dừng cũ.

## 6. Image verification

Existing image postgres:16, Linux/amd64. Container Image và image inspect cùng sha256:f1c3376c26f2609ab9f29f71f824103fe2fcd8ee0346485cb6122a4f93df6f94. RepoDigest postgres@sha256:f1c3376c26f2609ab9f29f71f824103fe2fcd8ee0346485cb6122a4f93df6f94; image Created2026-08-25T00:42:01.8414474Z.

Pre/post image ID khớp. Không nhầm postgres:16-alpine của Compose development, không image pull/upgrade hoặc replacement.

## 7. Volume and mount

VERIFIED pre/post: volume examspace-phase3-restore-20261030-115026-data, driver local, scope local; mount type volume, RW=true, target /var/lib/postgresql/data. Không đổi mount/volume/network.

Volume development online-examination-system-git_postgres_data khác test volume. Không copy/mount PGDATA sang container khác, repair/initdb/resetwal/fsck/reset/restore hoặc xóa volume. Metadata xác nhận identity, không chứng nhận mọi data row nguyên vẹn.

## 8. Port binding verification

Configured mapping127.0.0.1:15433 ->5432/tcp, bridge; pre/post không đổi. Trước action:

- User báo exact Get-NetTCPConnection/State Listen filter15433 không có dòng nào/không lỗi.
- Immediate owner-script query07:47:44.570Z statusOK/rows0, TCP ECONNREFUSED.
- Docker running-binding check07:47:44.764Z exit0/conflictCount0.

Poststart TCP07:47:50.827Z CONNECTED, sau đó metadata SQL cũng kết nối đúng endpoint. TCP không được dùng thay cluster/database identity. Không port5432 SQL/fallback; không firewall/binding changes. Đây không là Gate B positive API ownership.

## 9. Development container isolation

Pre/post user metadata xác nhận full ID7394b929e8806dc5e472cacb41fc944efd43e97a6dd653b7ca3a6a95330194fb, name /online-examination-system-git-postgres-1, state running, loopback5432, volume online-examination-system-git_postgres_data.

Không stop/start/restart/exec SQL/copy/migrate development. UNTOUCHED by task actions; không gọi Healthy khi Health chưa được đo hoặc chứng nhận development SQL state.

## 10. Historical logs assessment

Prestart tail80 xử lý trong memory: checkpoint18, fixtureFault7, duplicateKey10, PANIC0, FATAL0, ready0. Lỗi test/duplicate không chứng minh lý do Exit255; log cũ kết thúc trước FinishAt nên không có causal shutdown trace.

Poststart snapshots giới hạn tail100 và --since exact startup request. Final categories: Ready1/checkpoint2/PANIC0/FATAL0; fixtureFault0/duplicate0. Không raw stdout/stderr server log/credentials/SQL/answers trong report hoặc Git. WAL/recovery details không được tách riêng thành counter; không suy “không recovery” từ dữ liệu đó. SQL recovery=false chỉ xác nhận current state.

## 11. Startup risk review

Approval nêu rõ WAL replay/crash recovery/checkpoint có thể ghi PGDATA; independent backup chưa VERIFIED; không cam kết physical data bytes bất biến. Không có quyền tự repair/reset/restore/retry/stop khi gặp critical error.

Bounded fresh logs/readiness/SQL không cho thấy startup fatal/panic trong scope đã đo; đây không phải kiểm định toàn bộ storage, backup hoặc business-data integrity.

## 12. User approval status

APPROVED. User trả lời “Đồng ý đúng một startup này”; receipt2026-11-10T04:06:14Z. startup/approval.json pin full target/image/volume/mapping và maxAttempts1, acknowledge startup writes/backup uncertainty, không cấp thêm recreate/reset/restore/migrate/dev SQL/API/E2E/security/stop permission.

Operator script checksum khớp approved hash; startup marker chứa approval hash/source hash. Không xin lại approval, không chuyển token/ACL/context của sandbox.

## 13. Startup command and result

Executed once by user PowerShell:

    docker start c53c8db640b1

Requested2026-11-10T07:47:44.765Z, completed07:47:45.537Z; elapsed768ms; exit0/signal null. Guarded script uses exclusive startup/start-once.json; recorded startupAttempts1, không retry hoặc restart.

startup/operator-result.json outcome START_COMMAND_PASS_POSTGRES_READY_SQL_PENDING đã được agent validate với exact identity/approval/source hashes. Hai post-start metadata snapshots là các read-only probes, không thêm startup attempts.

## 14. PostgreSQL readiness

PASS in bounded scope: current container running, State.Error EMPTY, OOM=false; fresh logs sau command có Ready1, PANIC0/FATAL0. Source filters --since startup request nên không lấy old Ready line làm PASS.

User operator outcome được đối chiếu với embedded metadata, original capture hashes và approved script. Captures lưu startup/captures/pre.json, post-0.json, post-1.json và capture-provenance.json.

## 15. TCP15433

PASS poststart: user-context TCP connected07:47:50.827Z; sandbox SQL connection established07:48:32.731Z. Không dùng connection success làm identity; SQL checks ở các mục sau. Không kết nối5432.

## 16. Database identity

VERIFIED: online_exam_phase3_test; PostgreSQL server16.15 (Debian 16.15-1.pgdg13+2). current_user được đọc trong memory, report chỉ lưu role-observed/hash thay credentials.

Client dùng exact loopback15433/database path từ private test config đã qua testDatabaseConfig guard. Session startup options default_transaction_read_only=on/statement_timeout; SELECT xác nhận read_only=on. Không copy config vào repo, không in URL/password/token.

Metadata verification07:48:32.731Z–07:48:32.817Z, helper exit0; connectionEstablished=true/connectionClosed=true. Hai SELECT metadata: identity và migration history. Không schema/business mutation, không đọc passwords/tokens/answers/correct keys.

## 17. Cluster identifier

VERIFIED actual7702318921920503846, khớp expected test. Khác historical development reference7699697588847288354; không query development để đo ID mới. pg_is_in_recovery=false.

Đây là current test SQL proof, không suy identity từ container name/volume/TCP. Không privilege grant, database credential change hoặc metadata bypass.

## 18. Five migrations

VERIFIED exactly five records, đều finished/applied=true, rolled_back=false, không extra/pending/failed record trong migration history được đọc:

1. 20261022000000_init
2. 20261023000000_management_fields
3. 20261024000000_exam_versions
4. 20261029000000_phase3_p1_review
5. 20261029001000_attempt_review_flags

Raw checksum comparison4/5 khớp current UI bytes. Management-fields stored checksum khác raw LF UI file; bounded read-only investigation xác nhận stored checksum khớp chính xác CRLF conversion và file repository gốc. Current UI file bằng Git HEAD sau normalize line endings. Đây là byte line-ending difference có bằng chứng, không source/SQL content fix.

Chi tiết migrations/verification.json và checksum-investigation.json giữ cả raw mismatch/variants. Không sửa migration/checksum/history hoặc chạy migrate resolve/deploy. Names/checksum/history không chứng minh schema không drift; không thực hiện schema-diff certification.

## 19. Database integrity limits

VERIFIED IN SCOPE: service endpoint, original container/image/volume identity, expected current database/cluster và five applied migrations. Business rows, full storage/data consistency, schema drift và independent backup NOT VERIFIED.

Không restore/reinitialize/recreate/reset/seed/migrate. Startup server/internal writes được user cho phép; không tuyên bố PGDATA unchanged byte. Historical exit cause và native API crash cause chưa xác định.

## 20. Evidence hashes

Evidence root C:/Users/Admin/AppData/Local/Temp/examspace-ui105-20261110-2598d8fc.

baseline/source-before.json, historical-evidence.json; docker/owner-preflight.json/provenance, owner-port-reply.json; startup/approval.json/start-once.json/operator-result.json/post-start-verified.json/captures; identity/sql-metadata.json/helper-exit.json; migrations/source-manifest.json/verification.json/checksum-investigation.json; preservation/final.json; summary/secret-scan.json/evidence-sha256.json/manifest-sha256.txt.

Approved-pending checkpoint giữ riêng tại summary/checkpoints/approved-pending; final checkpoint/manifest chốt sau nghiệm thu. Old UI101–UI104 evidence giữ byte/hashes; không raw private Docker logs/env/native dumps. Collector synthetic checks2 PASS (không database/app tests); preparation syntax failure của checker được giữ riêng và sửa trước checks.

## 21. Cleanup/state changes

Đúng một authorized existing-container start; test container được để running phục vụ test, không tự stop sau recovery. Development metadata vẫn running/separate volume; không task action/SQL. Metadata client đã đóng; không app/API/Web/E2E/worker được khởi chạy.

No recreate/reset/restore/migration/seed/delete/prune/security/context/runtime/dependency/credential changes. Không second startup hoặc Docker Desktop/Engine restart.

## 22. Gate A acceptance

PASS trong scope UI105: exact existing container/image/volume verified pre/post; approval recorded; one startup exit0; fresh readiness/no critical sampled fatal/panic; TCP reachable; current test DB/cluster match; exactly five completed/non-rolled-back migrations; no development fallback/destructive operation.

Không biến Gate A PASS thành full product/runtime acceptance. No full-data or staging/production certification.

## 23. Remaining Gate B blocker

NOT RECHECKED trong UI105; last UI104 live positives state0/BLOCKED. Prestart no-listener query không là verified owned API listener. Không chạy canary/Gate B/API4010/Web3010/observer v3 hoặc E2E. Native0xC0000409 root cause UNKNOWN.

## 24. Recommended next steps

Chuyển sang một phase Windows ownership riêng: bounded owned IPv4/IPv6 canary trong context được phép quan sát, giữ state2 requirement/process identity/negative tests và source/evidence preservation. Không normalize state0, cấp quyền hoặc bypass để lấy PASS.

Chỉ khi Gate B PASS mới xem xét API-specific Gate C, rồi minimal observer W1 theo approval/scope riêng. Không tự chạy UI tests sau khi DB recovered.

Typecheck/lint/build/application root/HTTP/browser NOT RUN: không product changes và task recovery/metadata-only. Hai collector checks không cộng vào historical application acceptance.

## 25. Final verdict

| Gate                    | Result                                                                     |
| ----------------------- | -------------------------------------------------------------------------- |
| Source preservation     | VERIFIED; one diagnostic report added, existing source preserved           |
| Docker Engine           | ACCESSIBLE user context; sandbox permission limitation retained            |
| Test container identity | VERIFIED exact existing full ID                                            |
| Image                   | VERIFIED existing postgres:16/pinned immutable image                       |
| Volume                  | VERIFIED same existing named volume metadata                               |
| Mount                   | VERIFIED RW /var/lib/postgresql/data                                       |
| Port mapping            | VERIFIED unchanged127.0.0.1:15433->5432                                    |
| Exit cause              | UNKNOWN historical255                                                      |
| User startup approval   | APPROVED one pinned startup                                                |
| Container startup       | PASS; exactly one command/exit0                                            |
| PostgreSQL readiness    | PASS bounded fresh logs/running/SQL scope                                  |
| TCP15433                | PASS owner TCP and actual metadata SQL connection                          |
| Database name           | VERIFIED online_exam_phase3_test                                           |
| Cluster identifier      | VERIFIED7702318921920503846                                                |
| Five migrations         | VERIFIED exact five completed/non-rolled-back; checksum CRLF note retained |
| Development PostgreSQL  | UNTOUCHED by task; pre/post metadata running/separate volume, no SQL       |
| Gate A                  | PASS recovery/identity/history scope                                       |
| Gate B                  | NOT RECHECKED; historical BLOCKED                                          |
| Real API observer       | NOT RUN                                                                    |
| Native cause            | UNKNOWN                                                                    |
| Full E2E                | NOT RUN                                                                    |
| Production              | NOT APPROVED                                                               |

## DB-105 verification matrix

| ID        | Scenario                  | Expected        | Actual                                                                                  | Evidence                                                  | Status              |
| --------- | ------------------------- | --------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------- |
| DB-105-01 | Docker Engine accessible  | Accessible      | Client/server29.6.2 in user context; sandbox still restricted                           | owner-preflight.json; captures                            | PASS user context   |
| DB-105-02 | Correct test container    | Verified        | Exact full ID/name preserved pre/post                                                   | post-start-verified.json                                  | PASS                |
| DB-105-03 | Image identity            | Verified        | Same cached postgres:16 immutable image ID                                              | pre/post captures                                         | PASS                |
| DB-105-04 | Volume identity           | Verified        | Same expected local volume; distinct dev volume                                         | same                                                      | PASS metadata scope |
| DB-105-05 | Mount target              | Correct         | Same RW /var/lib/postgresql/data                                                        | same                                                      | PASS                |
| DB-105-06 | Port15433 binding         | Correct         | Loopback15433->5432 unchanged; no prestart conflicts                                    | immediate-port.json; captures                             | PASS                |
| DB-105-07 | Dev5432 isolated          | Preserved       | Same dev ID/running5432/separate volume; no SQL                                         | pre/post dev metadata                                     | PASS task scope     |
| DB-105-08 | Exit255 metadata reviewed | Complete        | State/exit/error/OOM/restart +bounded logs reviewed; cause unknown                      | pre captures; user-reference                              | PASS review scope   |
| DB-105-09 | Startup risk reviewed     | Complete        | WAL/recovery/data-write and backup limits acknowledged                                  | approval.json; report                                     | PASS                |
| DB-105-10 | Explicit approval         | Required        | User explicitly approved exact target/one attempt                                       | approval.json                                             | PASS                |
| DB-105-11 | One authorized startup    | Correct target  | docker start c53c8db640b1 once, exit0                                                   | start-once.json; operator-result.json                     | PASS                |
| DB-105-12 | PostgreSQL ready          | Ready           | Fresh ready1, PANIC0/FATAL0; running and SQL connected                                  | fresh post captures; sql-metadata.json                    | PASS bounded scope  |
| DB-105-13 | TCP15433                  | Reachable       | CONNECTED after startup; SQL target confirmed                                           | operator-result.json; sql-metadata.json                   | PASS                |
| DB-105-14 | Database name             | Correct         | online_exam_phase3_test                                                                 | identity/sql-metadata.json                                | PASS                |
| DB-105-15 | Cluster identifier        | Match           | 7702318921920503846; not historical dev ID                                              | same                                                      | PASS                |
| DB-105-16 | Five migrations           | Applied         | Exactly expected five; finished true/rolledback false; one raw checksum CRLF-equivalent | migrations/verification.json; checksum-investigation.json | PASS metadata scope |
| DB-105-17 | Failed migrations         | None            | Exactly five history records; none unfinished/rolled back                               | identity/sql-metadata.json                                | PASS history scope  |
| DB-105-18 | No dev SQL mutation       | Preserved       | No development SQL/commands; no5432 connection                                          | command/source ledger                                     | PASS task scope     |
| DB-105-19 | No destructive actions    | Preserved       | Only one approved existing-container start; no reset/restore/recreate/migrate           | operator source/approval/result                           | PASS                |
| DB-105-20 | Gate A                    | PASS or BLOCKED | PASS in defined recovery/identity/history scope                                         | final report +evidence                                    | PASS                |

**TEST POSTGRESQL RECOVERED — SQL IDENTITY VERIFIED — FIVE MIGRATIONS VERIFIED.**

**GATE A PASS · GATE B NOT RECHECKED · API/E2E NOT RUN · NATIVE CAUSE UNKNOWN · PRODUCTION NOT APPROVED.**

## UI-10.6 checkpoint addendum — 10/11/2026

Historical conclusions above retained. Fresh guarded SQL metadata verifies correct test DB/cluster/five completed migrations, read_only=on and connection closed. Current Docker no-replacement check pending operator; Gate A overall PARTIAL at this checkpoint. No repeated startup/Docker lifecycle/dev SQL.

Codex IPv4PID31196/65510 and IPv6PID1300/65511 each returned native class3/5 state0 with matching numeric owner. First invalid sample stopped that listener; planned remaining samples NOT RUN. Get-NetTCPConnection/CIM PermissionDenied; netstat no target listener. Both child IPC close/exit0/target rows absent. Gate B BLOCKED, state0 REJECTED;44diagnostic tests PASS do not substitute for positives.

User-context canary/current Docker metadata handoff prepared and source-reviewed, explicit execution pending. CC02/03/04 NOT RUN; no confirmed context-dependent mechanism yet. No API4010/Web3010/HTTP/scheduler/API resource/PG aggregates/full E2E, no W1 consent inferred. Native cause UNKNOWN, runtime OPEN, integration/staging BLOCKED, production NOT APPROVED.

Details: [UI-10.6 report](EXAMSPACE_UI106_WINDOWS_OWNERSHIP_AND_API_OBSERVABILITY_REPORT.md), [matrix](EXAMSPACE_UI106_CROSS_CONTEXT_SOCKET_MATRIX.md), [operator handoff](EXAMSPACE_UI106_OPERATOR_VERIFICATION_HANDOFF.md). Evidence C:\Users\Admin\AppData\Local\Temp\examspace-ui106-20261110-35f95d0c. Product source/versions/env/index/original repository preserved; no source fix, security change or native dump.

## UI-10.6 final measured results — 10/11/2026

This completes the user-context checkpoint above. User explicitly approved and executed the reviewed operator once: outer9c814479-bbeb-48ed-958b-22d743ccc12f/inner75cd1362-7074-48d8-b4f7-cb992c795b09. Source/runtime/context/lifetime/result hashes validated; provenance is local user-operated consistency, not independent cryptographic authentication.

Current exact Docker container/image/volume/loopback15433 mapping verified running, original StartedAt unchanged. Fresh guarded read-only SQL 2026-11-10T13:32:27.559Z verifies correct database/cluster and exactly five completed/non-rolled-back migrations; connection closed. Gate A PASS at measured times; no lifecycle/development SQL/data mutation, no full-data/schema/backup certification.

User IPv4PID14536/60072 and IPv6PID9044/60075 both native state0 with matching owner, as in Codex. User CIM works while Codex is denied; user Get-NetTCPConnection projection threw on null State. A separate null-safe TEMP collector variant is offline verified; native state0 remains unexplained, live positive not verified.47/47diagnostics PASS in final invocation, not44+47 or application tests. Gate B BLOCKED in both contexts, state0/null rejected; CC03/04 simultaneous cross queries NOT RUN.

No API/W1/observer/scheduler/API resources/PG aggregates/full regression, native capture or source/runtime/security change. W1 approval not applicable while B blocked. ROOT CAUSE UNKNOWN, RUNTIME OPEN, integration/staging BLOCKED, production NOT APPROVED. Original pending-checkpoint text and historical conclusions retained. See [UI-10.6 final report](EXAMSPACE_UI106_WINDOWS_OWNERSHIP_AND_API_OBSERVABILITY_REPORT.md).
