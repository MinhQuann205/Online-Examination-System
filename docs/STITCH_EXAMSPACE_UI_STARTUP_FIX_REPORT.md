# ExamSpace — sửa lỗi theme và chạy đúng giao diện Stitch

Ngày: 02/11/2026, Asia/Saigon. Worktree: **ExamSpace-Stitch-UI**, nhánh
**feature/stitch-examspace-ui**, HEAD a1e2891754e399aa4743e32c8218759938149bdc.

## 1. Nguyên nhân

- Cổng 3000 ban đầu do Next dev của **Online-Examination-System-Git** phục vụ.
  Dashboard trong ảnh là DashboardShell Phase 3 cũ. Source Stitch UI-01–UI-07
  vẫn đầy đủ trong worktree UI riêng, không bị xóa hoặc mất sau restart.
- next-themes 0.4.6 render script bootstrap trong ThemeProvider. React DOM của
  phiên bản đang cài cảnh báo khi script đó được tạo qua client render.
  Đã tái hiện đúng thông báo trong ảnh bằng một React root mount hoàn toàn ở client.
  Tải trang/điều hướng thông thường và phép thử Fast Refresh trước sửa không tái hiện;
  chưa xác định sự kiện nào đã khiến trang người dùng đi qua nhánh client mount.

## 2. Bản sửa

- Thêm ThemeProvider nội bộ cho light/dark/system; giữ key localStorage **theme**,
  theo prefers-color-scheme, đồng bộ storage giữa tab và vẫn dùng được khi storage bị chặn.
- Bootstrap theme qua **next/script beforeInteractive trong root layout**.
  Provider phía client không render script. QueryClient và SessionChangeBoundary giữ nguyên.
- ThemeToggle và DashboardShell dùng provider này; toggle dựa resolvedTheme.
- Khai báo data-scroll-behavior theo smooth scrolling đang có.
- Thêm **dev:stitch**, **dev:stitch:web**, **start-stitch.cmd** và hướng dẫn README.
  Launcher neo cwd vào worktree chứa nó, kiểm source Teacher/Student và .env hiện hữu,
  từ chối cổng 3000 đang bận. Chế độ đầy đủ còn kiểm cổng API trước khi start.
- Đã dừng riêng hai tiến trình Next web cũ sau kiểm PID/start time/ancestry/path;
  chạy web Stitch tại 3000. **API 4000 đang có được giữ chạy**.

## 3. Cách chạy lại

Mở terminal trong **ExamSpace-Stitch-UI**. Nếu API 4000 đang chạy đúng:

```powershell
corepack pnpm dev:stitch:web
```

Nếu API và web đều đã dừng, dùng **corepack pnpm dev:stitch** hoặc mở
**start-stitch.cmd**. Các lệnh dùng cấu hình local của worktree; không migrate/reset/seed.
Dừng terminal web cũ trước khi mở lần mới. Mở http://localhost:3000 và Ctrl+Shift+R
nếu browser còn giữ bundle cũ. Terminal phải in **ExamSpace STITCH UI** cùng đúng worktree.
Không chạy pnpm dev từ repository Phase 3 gốc để xem các thay đổi UI chưa commit này.

## 4. Kiểm chứng

- Next dev: client mount trước sửa tái hiện script warning, sau sửa không còn warning đó.
- Next dev: system dark, toggle, reload, navigation, đồng bộ hai tab, thay đổi OS theme
  và storage bị chặn đều đạt. Không lọc/ghi đè console.error để che lỗi.
- Localhost 3000 thực: đã xem screenshot Homepage Stitch; kiểm Login/theme/reload,
  request auth/me đi tới **localhost:4000**, không có React script/hydration error trong lượt kiểm.
  Không đăng nhập hoặc tạo fixtures development để chụp ảnh này.
- Có regression browser **UI19** cho system/theme persistence/navigation/cross-tab/React errors.
- Typecheck, lint, build và root tests **81/81** đạt; HTTP/PostgreSQL **54/54** đạt.
- Browser đầy đủ **81/81** đạt, gồm UI19 mới; **216 tests PASS, 0 FAIL, 0 skipped** trong các lượt cuối. Không cộng focused probes/reruns hoặc tests lịch sử. Format và Git diff checks đạt.

Test services dùng API4010/web3010 và PostgreSQL test15433, xác minh SQL identity
khác development cùng năm migrations. Migration-preservation suite áp SQL hiện hữu
trong database test prefix mới; giữ dữ liệu/volume, không migrate database development.

## 5. Bảo toàn và giới hạn

- Repository Phase 3 gốc: **250/250 file giữ nguyên**, HEAD/branch/index/status không đổi.
- Backend/schema/năm migrations: **65/65 tracked file đúng bytes HEAD**.
- Giữ source UI-01–UI-07 có sẵn và các báo cáo lịch sử; không sửa auth, autosave,
  revision, snapshot, deadline, grading hoặc result visibility. Không nâng dependency/lockfile.
- Không stage/commit/push/merge/rebase/reset/clean/stash hoặc đổi cấu hình global.
- Next dev tự tạo AGENTS.md; đã đọc hướng dẫn, giữ bản sinh trong evidence ngoài source.
  Declaration Next được trả đúng hash baseline sau build, không sửa compiler rules.
- Lần typecheck/build đầu phát hiện một tham chiếu theme còn sót trong DashboardShell;
  đã sửa và chạy lại đạt. Hai probe đầu dùng private route underscore/nested context
  không kiểm được nhánh cần thử; kết quả đó không được tính là repro thành công.

**Sự cố API native 0xC0000409 vẫn OPEN/UNSTABLE — ROOT CAUSE UNKNOWN.**
Bản sửa này xử lý cảnh báo React/theme và chạy nhầm worktree, chưa chứng minh sửa được
native crash lịch sử. Không thay backend/runtime hoặc dùng functional PASS để đóng rủi ro đó.

## 6. File ledger của đợt này

Bảy file baseline sửa: README.md, package.json, app/layout.tsx,
components/providers.tsx, components/theme-toggle.tsx, components/dashboard-shell.tsx,
tests/ui-foundation.test.cjs (các đường dẫn app/components thuộc apps/web/src).

Năm file mới: apps/web/src/components/theme-provider.tsx,
apps/web/src/lib/theme-bootstrap.ts, scripts/dev-stitch.cjs, start-stitch.cmd,
docs/STITCH_EXAMSPACE_UI_STARTUP_FIX_REPORT.md.

Evidence private ngoài Git: **%TEMP%/examspace-ui-startup-725fc4e4** gồm baseline,
repro trước/sau, dev-theme checks, manual screenshot, process switch record, gate logs,
security scan và preservation. Không đưa env/cookies/tokens/raw evidence vào Git.

Cleanup: dừng riêng API4010/web3010 test theo PID/start/ancestry; không có unexpected API test exit trước cleanup. Sau dừng, test connections khác controller bằng 0; năm migrations vẫn đủ. Test container trở lại stopped, development container vẫn running. Giữ API4000 cũ và web Stitch3000 mới đang chạy; giữ test databases/volumes/evidence.
