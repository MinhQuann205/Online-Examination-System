    # ExamSpace UI-10.4 — Environment & Ownership Recovery

    Ngày: **03/11/2026, Asia/Saigon**. Các mốc đo dưới đây là UTC.

    ## 1. Executive summary

    **DOCKER READ-ONLY INSPECTION BLOCKED BY PERMISSIONS.**
    **WINDOWS LISTENER ENUMERATION INCONSISTENT — GATE B BLOCKED.**

    Đã thực hiện inventory Docker chỉ đọc, rà soát Win32 ABI và một lượt canary có giới hạn: đúng một listener IPv4 và một IPv6, mỗi listener ba mẫu thời gian. Mỗi mẫu đối chiếu classes3/5 với buffer nguyên trạng, điền0 và0xA5. Cả36 nhóm kết quả native đều trả state0; không chuyển thành LISTEN.

    44/44 diagnostic tests PASS,0 FAIL/skip trong lượt mới; không phải tests ứng dụng. **Gate A BLOCKED · Gate B BLOCKED · Gate C NOT RUN.** API spawn0, HTTP ứng dụng0, full E2E NOT RUN. Không sửa source nghiệp vụ/runtime hoặc khởi động container.

    ## 2. Git/source preservation

    UI worktree C:/Môn Học/ThucTapNgheNghiep/ExamSpace-Stitch-UI; feature/stitch-examspace-ui; HEAD a1e2891754e399aa4743e32c8218759938149bdc. Baseline317 public files, fingerprint5f8e7e0c372522c1a289295d942c83ea0ad9759b1a56fe0dd4b7ecb6a864295e. Original238 files theo cùng scope loại ignored/generated/env contents; không thay số250 lịch sử.

    Chỉ ba báo cáo mới và sáu appendices được đề nghị ghi vào UI docs. Backend/schema/năm migrations, env, packages/lockfile, source UI-01–UI-10.3, HEAD/branch/index và repository gốc phải khớp hậu kiểm. Ledger cuối: summary/final-preservation.json. Không stage/commit/push/reset/clean/stash/restore/checkout/rebase/merge/deploy.

    ## 3. Three UI-10.3 reports reviewed

    Đã đọc Listener Ownership Report, Ownership Probe Matrix và API Observer Validation; giữ first state2 và final/ABI state0. Đọc thêm UI101/UI102, acceptance/readiness/handoff/runbook, AGENTS, Compose, test guard, runners, observer và API bootstrap/scheduler. Read ledger trong baseline/read-ledger.json. Old evidence được snapshot riêng trước đo; không chạy script cũ tại chỗ.

    ## 4. Docker inventory

    Docker CLI29.6.2, build dfc4efb. CLI context show trả default, nhưng cảnh báo không đọc được user Docker config; chưa chứng minh đó là intended owner context. Engine-version query exit1/PERMISSION_DENIED tại docker_engine named pipe. Không biết server version/health. Không đổi context, Docker Desktop, daemon, group, ACL hoặc token.

    ## 5. Test container identity

    Tên examspace-phase3-restore-20261030-115026 và mapping15433 là reference lịch sử, **không phải current identity VERIFIED**. Không có quyền Engine để đối chiếu ID, creation/image/Compose labels hoặc mounts. Compose hiện có mô tả postgres:16-alpine ở loopback5432 và volume postgres_data; không phải bằng chứng nó là dedicated test container. Không chạy Compose.

    ## 6. Exited(255) evidence

    UI-10.3 lưu lời người dùng báo container test Exited(255). UI-10.4 không inspect được State.Status/ExitCode/StartedAt/FinishedAt/OOMKilled/RestartCount/Health. Không trình bày255 như kết quả đo mới hoặc PostgreSQL error; không suy corruption.

    ## 7. Logs/inspect findings

    Dừng các thao tác Docker phụ thuộc ngay khi Engine bị từ chối. Không raw inspect, không đọc logs của container chỉ suy đoán, không env/raw SQL/credentials trong báo cáo. Bounded sanitized test-container logs, selected inspect fields và volume inspect đều BLOCKED/NOT RUN. Docker evidence: docker/read-only-inventory.json.

    ## 8. Exit cause classification

    **UNKNOWN.** Chưa có chứng cứ chọn POSTGRES_PROCESS_EXIT, CONTAINER_RUNTIME_EXIT, ENGINE_OR_DAEMON_INTERRUPTION, OOM_INDICATED, STORAGE_OR_MOUNT_ERROR, HEALTHCHECK_FAILURE hoặc HOST_RESTART_CORRELATION. PERMISSION_ERROR chỉ được xác nhận cho lần truy vấn của agent, không phải lý do container dừng.

    ## 9. Volume/mount preservation

    Actual volume name/type/destination/RW/driver/existence/Compose ownership chưa truy cập được: **BLOCKED**. Không mount volume vào container khác, không copy PGDATA, không repair/resetwal/initdb/fsck/restore. Agent không thực hiện lệnh thay đổi container/volume. Điều này không chứng minh volume hiện tồn tại hay SQL data nguyên vẹn.

    ## 10. Data integrity limits

    **NOT VERIFIED / DATA NOT ACCESSIBLE trong scope này.** Không xác nhận data loss hoặc corruption. Không suy SQL consistency từ một volume còn tồn tại, và ở đây ngay cả volume metadata cũng chưa xác minh. DB report ghi rõ phương án Case B Engine inaccessible; chưa đủ dữ liệu xin approval startup cụ thể.

    ## 11. PostgreSQL availability

    Một TCP probe giới hạn500ms tới127.0.0.1:15433 trả ECONNREFUSED lúc2026-11-03T04:49:51.993Z. Không SQL. TCP availability không chứng minh container owner hay database identity. Không kết nối development5432.

    ## 12. Cluster/migrations

    NOT VERIFIED. Historical test cluster7702318921920503846 và development7699697588847288354 chỉ là expected references. Chưa có current_database/pg_control_system hoặc năm migration records mới. Không đổi URLs, migrate/seed/db push/reset/drop hoặc restore. Test guard giữ nguyên.

    ## 13. Gate A

    **BLOCKED**: Docker container identity/state/volume chưa kiểm tra được, endpoint không kết nối, SQL identity/năm migrations chưa xác nhận. Không dùng PostgreSQL khác đang chạy để vượt gate.

    ## 14. Windows execution identity

    CodexSandboxOffline; admin token false; PowerShell5.1.26100.9818, FullLanguage. Baseline execution-context.json ghi SID/cwd/PID/thời điểm thật. Node24.15.0 x64; libuv1.51.0. Current installed Nest11.2.7/Prisma Client7.10.1/pg8.23.1/Argon2 0.44.0 chỉ là inventory, không loaded/faulting module của crash. Không đổi versions/PATH.

    ## 15. Get-NetTCPConnection/CIM

    Cả hai phép truy vấn trên canaries trả PERMISSION_DENIED/HRESULT0x80041003. Combined wrapper exit0 không biến lỗi từng operation thành success; từng status/errorId được lưu. Không RunAs/UAC/elevation/policy/namespace/ACL changes. Documented limited-process APIs vẫn đọc được đúng child identity khi đang chạy.

    ## 16. netstat

    Mỗi temporal sample chạy absolute netstat.exe -ano. Lưu command/exit/stderr/hash/byte counts, scoped raw target lines và parser riêng; không persist socket inventories cá nhân khác. Các mẫu không có accepted target listener row. Raw evidence quyết định có phải parser skip; không quy nguyên nhân từ boolean rỗng.

    ## 17. State2/state0 investigation

    UI103 state2/state0 lịch sử giữ nguyên. UI104 IPv4 PID29320/127.0.0.1:51243 và IPv6 PID25716/[::1]:62164: mỗi socket ba temporal samples; classes3/5 và fills -1/0/165 đều state0. OS return code0, đúng child PID/port, IPC socket vẫn mở trước/sau. Direct DWORD và struct đồng ý.

    Không thấy same-socket2→0 trong UI104. Những số2 lịch sử thuộc process/run khác; không dựng transition giả. TCP connect thành công cũng không thay được OS LISTEN proof.

    ## 18. ABI/table classes

    Review P/Invoke DWORD/BOOL/AF/class, buffer sizing và122 retry, bound checks, network-order port, row size24/56, header offset4, state offset0/48, PID offset20/52. Marshal layout và direct reads đồng ý trên canary-only raw bytes.

    Diagnostic fill0xA5 bị thay bằng0 ở state field; kết quả không phụ thuộc ba trạng thái ban đầu của buffer trong lượt này. Chưa có bằng chứng initial-memory residue hoặc sai JavaScript regex giải thích kết quả hiện tại. Không kết luận mọi ABI/runtime/OS vấn đề đều bị loại trừ.

    Microsoft references: [GetExtendedTcpTable](https://learn.microsoft.com/en-us/windows/win32/api/iphlpapi/nf-iphlpapi-getextendedtcptable), [IPv4 row](https://learn.microsoft.com/en-us/windows/win32/api/tcpmib/ns-tcpmib-mib_tcprow_owner_pid), [IPv6 row](https://learn.microsoft.com/en-us/windows/win32/api/tcpmib/ns-tcpmib-mib_tcp6row_owner_pid), [table classes](https://learn.microsoft.com/en-us/windows/win32/api/iprtrmib/ne-iprtrmib-tcp_table_class). Chỉ state2 được chấp nhận như LISTEN.

    ## 19. Synthetic results

    Predefined plan: một child/family, ba samples/same socket, minimum gap1s, tối đa90s/controller và10s/query, loopback ephemeral only. Không chọn best result hoặc retry đến xanh. Cả IPv4 và IPv6 BLOCKED.

    Controller đầu dừng sau khi lưu đủ IPv4; tool session trả1, thiếu exact Node exit/stderr: **cause UNKNOWN**, không native-API incident. Chỉ phần IPv6 chưa chạy được tiếp tục dưới supervisor mới, controller exit0; không đo lại IPv4. Kế hoạch, partial/final output và exception coverage được giữ.

    ## 20. Negative ownership tests

    Lượt mới44 PASS:36 ownership/parser/error +2 freeze/identity +6 observer. Wrong PID/port, stale start, wrong exe/parent, missing process, permission/error/timeout, malformed/empty output, state0/FIN_WAIT1, dev ports và TCP/READY-only đều bị chặn. Simulations không thay live positive acceptance. Không giảm44 cases từ UI103.

    ## 21. Harness fix

    **NOT APPLIED cho ownership decision/backend.** Harness cũ được copy và giữ nguyên logic gate; chỉ đổi test import path và thêm measurement collector/buffer-fill audit ngoài Git. Không có defect đủ chứng cứ để sửa ownership hoặc application. Collector continuation/supervisor phục vụ evidence loss, không là native fix hay gate workaround.

    ## 22. Gate B

    **BLOCKED**: cả hai live positives không đáp ứng predefined state2 consistency. Negative tests PASS chỉ là một subcheck. Nguồn PID/port đúng nhưng state0 vẫn UNKNOWN/rejected. Không quy state0 do sandbox/security/Node/Windows khi chưa có causal evidence.

    ## 23. Real API Gate C

    **NOT RUN** vì A và B không PASS. API spawn0; không PID/start/port4010 ownership/READY thật. Không HTTP fixtures/auth/attempts hoặc app tests để tăng counts.

    ## 24. HTTP observer

    Real API NOT RUN. Sáu observer units/default-OFF/route mapping/Promise tests PASS; không dùng synthetic UI10350-request success như current real API evidence. HTTP401/START/COMPLETE/correlation của UI104 đều NOT RUN.

    ## 25. Scheduler/PG/process metadata

    Live tick/duration/count/overlap, API resources và PG connection aggregates NOT RUN. Cadence15000ms source giữ nguyên, không ép expired fixtures/đổi interval/tắt scheduler. Due-count không là finalized-count. Canary process identity/lifecycle không là API resource observation.

    ## 26. Native crash disposition

    Historical0xC0000409 vẫn OPEN, ROOT CAUSE UNKNOWN. Không new ExamSpace API native exit vì API không chạy. Controller interruption không có exact native exit record nên không gắn nhãn0xC0000409. Không ProcDump/debugger/dump, version upgrade hoặc speculative fix.

    ## 27. Source/service preservation

    Hai child đóng bằng IPC sau reverify PID/start/executable/parent; exit0. Post-close OS rows không còn. Immediate native identity read sau exit có QUERY_FAILED/code31; không giả thành PROCESS_EXITED. Hậu kiểm .NET riêng trả NO_SUCH_PROCESS cho cả hai PID. Không kill process cá nhân hoặc dev3000/4000.

    Dev services và actual Docker/container state UNKNOWN; chỉ xác nhận không có agent lifecycle/volume/development SQL/security operation. Không tuyên bố user services healthy từ action log. Old evidence giữ nguyên, file ledger/hashes kiểm cuối.

    ## 28. Remaining blockers

    - Docker Engine/config permissions và current exact test identity/volume/state/log evidence.
    - Test15433 availability, cluster/database identity và năm migrations.
    - Invalid native state0 dù PID/port/ABI/canary lifetime phù hợp.
    - Chưa có qualified real API observer hoặc native exception/module/stack.

    ## 29. Approvals required

    Không tự xin/start container khi chưa biết volume. Platform owner cần cung cấp read-only selected metadata trong context đã có Docker access; mọi đổi execution privileges/context cần approval riêng. Sau khi xác minh exact container/image/mount và rủi ro startup mới trình controlled-start request cụ thể.

    Start có thể replay WAL, chạy recovery/checkpoints và sửa data files dù không recreate; không gọi hoàn toàn read-only. Không đề nghị blanket start/Compose up/restore/reset/ACL change. Không có approval mới hoặc state change trong nhiệm vụ này.

    ## 30. Next bounded runtime plan

    **Plan only, NOT AUTHORIZED while gates blocked.**

    1. Xác minh A bằng exact existing container/volume/SQL identities/five migrations.
    2. Xác minh B bằng predefined bounded synthetic positives/negatives; không chấp nhận0.
    3. W1: đúng một API4010 với fresh in-memory JWT/test env isolation và source/runtime hash. Gate C owner/start/exe/parent/READY trước traffic.
    4. Một GET/auth/me không credentials, expected401,1START/1COMPLETE cùng correlation, active0; HTTP3s/startup15s,1request/concurrency1.
    5. Một normal15s scheduler observation trong tối đa25s; resources/PG aggregate2s,200events/60s overall,0restart. Stop/freeze khi owner/schema/sanitizer/deadline/unexpected exit.
    6. W2 auth/W3 scoped reads/W4 Teacher/W5 Student/W6 expiry/W7 selected browser/W8 full candidate chỉ là future review, không được chạy trong UI104. Exact suite selection/request caps phải được chốt riêng trên frozen source/isolated build.

    ## 31. Integration/Staging readiness

    BLOCKED; full acceptance INCOMPLETE; runtime OPEN; production NOT APPROVED. Typecheck/lint/build/product root/HTTP/browser NOT RUN vì không sửa product và safety gates chặn execution; không ghi live .next hoặc đổi compiler rules. Historical270 PASS không phải UI104 acceptance.

    ## 32. Final verdict

    | Gate                         | Status                                                 |
    | ---------------------------- | ------------------------------------------------------ |
    | UI source preservation       | VERIFIED; documentation only, final hash checks        |
    | Original repository          | UNCHANGED in baseline238-file scope plus Git/index/env |
    | Docker read-only inventory   | PARTIAL; CLI/context obtained, Engine BLOCKED          |
    | Test container identity      | UNKNOWN                                                |
    | Container exit reason        | UNKNOWN                                                |
    | Test volume metadata         | BLOCKED                                                |
    | Test database data integrity | NOT VERIFIED                                           |
    | PostgreSQL test availability | BLOCKED; ECONNREFUSED                                  |
    | Cluster identity             | NOT VERIFIED                                           |
    | Five migrations              | NOT VERIFIED                                           |
    | Gate A                       | BLOCKED                                                |
    | Windows socket API analysis  | COMPLETE IN SCOPE; underlying mechanism UNKNOWN        |
    | IPv4 listener positive       | BLOCKED                                                |
    | IPv6 listener positive       | BLOCKED                                                |
    | Listener state0 handling     | REJECTED                                               |
    | Windows ownership root cause | UNKNOWN                                                |
    | Harness patch                | NOT APPLIED to ownership decision                      |
    | Negative ownership tests     | PASS in existing unit/simulation scope                 |
    | Gate B                       | BLOCKED                                                |
    | Real API Gate C              | NOT RUN                                                |
    | Observer v3 real API         | NOT RUN                                                |
    | Native root cause            | UNKNOWN                                                |
    | Full Browser E2E             | NOT RUN                                                |
    | Functional acceptance        | INCOMPLETE                                             |
    | Runtime stability            | OPEN                                                   |
    | Integration readiness        | BLOCKED                                                |
    | Staging readiness            | BLOCKED                                                |
    | Production readiness         | NOT APPROVED                                           |

    **DOCKER READ-ONLY INSPECTION BLOCKED BY PERMISSIONS.**

    **WINDOWS LISTENER ENUMERATION INCONSISTENT — GATE B BLOCKED.**

    Evidence: C:/Users/Admin/AppData/Local/Temp/examspace-ui104-20261103-9d202804. summary/evidence-sha256.json và summary/manifest-sha256.txt; scope/scan/preservation records trong summary. Không native fix hoặc production approval.

    ## API-104 acceptance mapping

    | ID         | Scenario                      | Expected            | Actual                                   | Evidence                                                | Status  |
    | ---------- | ----------------------------- | ------------------- | ---------------------------------------- | ------------------------------------------------------- | ------- |
    | API-104-01 | Correct test API4010 PID      | After Gate A+B PASS | Prerequisites blocked; API never spawned | listener/analysis.json; docker/read-only-inventory.json | BLOCKED |
    | API-104-02 | OS listener owner             | After Gate A+B PASS | Prerequisites blocked; API never spawned | listener/analysis.json; docker/read-only-inventory.json | BLOCKED |
    | API-104-03 | Observer READY                | After Gate A+B PASS | Prerequisites blocked; API never spawned | listener/analysis.json; docker/read-only-inventory.json | BLOCKED |
    | API-104-04 | HTTP401                       | After Gate A+B PASS | Prerequisites blocked; API never spawned | listener/analysis.json; docker/read-only-inventory.json | NOT RUN |
    | API-104-05 | Correlated START/COMPLETE     | After Gate A+B PASS | Prerequisites blocked; API never spawned | listener/analysis.json; docker/read-only-inventory.json | NOT RUN |
    | API-104-06 | Real API sanitizer            | After Gate A+B PASS | Prerequisites blocked; API never spawned | listener/analysis.json; docker/read-only-inventory.json | NOT RUN |
    | API-104-07 | Bounded normal scheduler tick | After Gate A+B PASS | Prerequisites blocked; API never spawned | listener/analysis.json; docker/read-only-inventory.json | NOT RUN |
    | API-104-08 | Guarded PG aggregates         | After Gate A+B PASS | Prerequisites blocked; API never spawned | listener/analysis.json; docker/read-only-inventory.json | NOT RUN |
    | API-104-09 | Bounded API resources         | After Gate A+B PASS | Prerequisites blocked; API never spawned | listener/analysis.json; docker/read-only-inventory.json | NOT RUN |
    | API-104-10 | No dev impact during API run  | After Gate A+B PASS | Prerequisites blocked; API never spawned | listener/analysis.json; docker/read-only-inventory.json | NOT RUN |
    | API-104-11 | Native classification on API  | After Gate A+B PASS | Prerequisites blocked; API never spawned | listener/analysis.json; docker/read-only-inventory.json | NOT RUN |
    | API-104-12 | Owned API cleanup/evidence    | After Gate A+B PASS | Prerequisites blocked; API never spawned | listener/analysis.json; docker/read-only-inventory.json | NOT RUN |

    44 diagnostic tests are counted once; matrix IDs/samples are assertion mappings, not extra application tests. Final report hashes and all historical evidence comparisons are retained in summary.
