const { chooseAssignmentOption } = require('./assignment-selection.cjs');
const assert = require('node:assert/strict');
assert.equal(
  process.env.UI115_WEB_RUNTIME_APPROVED,
  '1',
  'UI115_LIVE_SCOPE_REQUIRED',
);
const { test } = require('node:test'),
  fs = require('node:fs'),
  os = require('node:os'),
  path = require('node:path'),
  { createRequire } = require('node:module');
const {
  api,
  web,
  fixtures,
  call,
  password,
  suffix,
  db,
  waitUntil,
} = require('./p0-support.cjs');
const { chromium } = createRequire(
  path.resolve(__dirname, '../apps/web/package.json'),
)('playwright');
const { clickWebAction } = require('./web-confirmation.cjs');
const { webFailure } = require('./web-failure.cjs');

test(
  'UI115 web: reloadable Admin filters → confirmed Teacher version/assignment → persistent detail/Student metadata → scoped result links',
  { timeout: 240000 },
  async () => {
    const folder = fs.mkdtempSync(
        path.join(os.tmpdir(), 'examspace-ui115-web-'),
      ),
      steps = [],
      contexts = [];
    let browser,
      outcome = 'FAIL';
    const step = async (name, action) => {
      const row = { name, status: 'RUNNING' };
      steps.push(row);
      try {
        const value = await action();
        row.status = 'PASS';
        return value;
      } catch (error) {
        row.status = 'FAIL';
        Object.assign(row, webFailure(error));
        throw error;
      }
    };
    async function login(actor, width = 1440) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
      });
      contexts.push(context);
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      await page.goto(web + '/login');
      await page.locator('#email').fill(actor.email);
      await page.locator('#password').fill(password);
      await page
        .getByRole('button', { name: 'Đăng nhập', exact: true })
        .click();
      await page.waitForURL(web + '/dashboard/' + actor.role.toLowerCase());
      actor.cookies = Object.fromEntries(
        (await context.cookies(api)).map((c) => [c.name, c.value]),
      );
      return page;
    }
    try {
      const f = await fixtures();
      browser = await chromium.launch({
        channel: process.env.P0_BROWSER_CHANNEL || 'msedge',
        headless: true,
      });
      const admin = await login(f.admin);
      await step(
        'Admin role/search/status filters survive native reload',
        async () => {
          await admin.goto(web + '/admin/users?role=TEACHER');
          await admin
            .getByLabel('Vai trò', { exact: true })
            .selectOption('TEACHER');
          await admin
            .getByLabel('Tìm kiếm', { exact: true })
            .fill(f.teacherA.email);
          await admin
            .getByLabel('Trạng thái', { exact: true })
            .selectOption('true');
          await waitUntil(
            async () =>
              new URL(admin.url()).searchParams.get('search') ===
              f.teacherA.email,
          );
          await admin.reload();
          assert.equal(
            await admin.getByLabel('Vai trò', { exact: true }).inputValue(),
            'TEACHER',
          );
          assert.equal(
            await admin.getByLabel('Tìm kiếm', { exact: true }).inputValue(),
            f.teacherA.email,
          );
          assert.equal(
            await admin.getByLabel('Trạng thái', { exact: true }).inputValue(),
            'true',
          );
          await admin
            .getByRole('table', { name: 'Danh sách người dùng' })
            .getByText(f.teacherA.email, { exact: true })
            .waitFor();
          await admin.screenshot({
            path: path.join(folder, 'admin-filters.png'),
            fullPage: true,
          });
        },
      );
      const teacher = await login(f.teacherA);
      let mutationStarts = 0;
      teacher.on('request', (r) => {
        if (
          r.method() === 'POST' &&
          new URL(r.url()).pathname.endsWith('/new-version')
        )
          mutationStarts++;
      });
      await step(
        'Lifecycle Cancel is read-only; confirmed new draft is acknowledged once',
        async () => {
          await teacher.goto(web + '/teacher/exams/' + f.exam.id);
          await teacher
            .getByRole('button', { name: 'Tạo phiên bản mới', exact: true })
            .click();
          const dialog = teacher.getByRole('dialog', {
            name: 'Tạo bản nháp mới?',
            exact: true,
          });
          await dialog.waitFor();
          assert.equal(mutationStarts, 0);
          await dialog
            .getByRole('button', { name: 'Hủy bỏ', exact: true })
            .click();
          assert.equal(mutationStarts, 0);
          await clickWebAction(teacher, 'Tạo phiên bản mới');
          assert.equal(mutationStarts, 1);
          await teacher
            .getByRole('button', { name: 'Chỉnh sửa', exact: true })
            .click();
          await teacher
            .getByLabel('Mô tả', { exact: true })
            .fill('UI115 V2 draft description ' + suffix);
          await teacher
            .getByRole('button', { name: 'Lưu bản nháp', exact: true })
            .click();
          await teacher.waitForURL(web + '/teacher/exams/' + f.exam.id);
        },
      );
      await step(
        'Historical V1 survives refresh and malformed version query is not substituted',
        async () => {
          await teacher
            .getByRole('button', { name: 'Xem phiên bản 1', exact: true })
            .click();
          await waitUntil(
            async () =>
              new URL(teacher.url()).searchParams.get('versionId') ===
              f.version.id,
          );
          await teacher.reload();
          await teacher
            .getByRole('heading', { name: f.exam.title, exact: true })
            .waitFor();
          assert.equal(
            await teacher
              .getByRole('button', { name: 'Xuất bản', exact: true })
              .count(),
            0,
          );
          await teacher
            .getByText('UI115 V2 draft description ' + suffix, { exact: true })
            .waitFor({ state: 'hidden' });
          await teacher.goto(
            web + '/teacher/exams/' + f.exam.id + '?versionId=invalid',
          );
          await teacher
            .getByRole('heading', { name: 'Liên kết phiên bản không hợp lệ' })
            .waitFor();
          await teacher.goto(
            web + '/teacher/exams/' + f.exam.id + '?versionId=' + f.version.id,
          );
          await teacher
            .getByRole('group', { name: 'Thao tác đề thi', exact: true })
            .getByRole('link', { name: 'Giao bài', exact: true })
            .click();
          await teacher.waitForURL('**/teacher/assignments?*');
          await waitUntil(
            async () =>
              (await teacher
                .getByLabel('Phiên bản đề thi', { exact: true })
                .inputValue()) === f.version.id,
          );
        },
      );
      let assignmentPosts = 0;
      teacher.on('request', (r) => {
        if (
          r.method() === 'POST' &&
          new URL(r.url()).pathname === '/exam-assignments'
        )
          assignmentPosts++;
      });
      const asg = await step(
        'Cancel creates nothing; confirmation captures V1 even when V2 publishes meanwhile',
        async () => {
          await chooseAssignmentOption(
            teacher,
            'Lớp học',
            f.classes.A.id,
            f.classes.A.name,
          );
          await teacher
            .getByLabel('Số lượt làm tối đa', { exact: true })
            .fill('2');
          await teacher
            .getByRole('button', {
              name: 'Kiểm tra trước khi giao',
              exact: true,
            })
            .click();
          let dialog = teacher.getByRole('dialog', {
            name: 'Xác nhận giao bài?',
            exact: true,
          });
          await dialog.waitFor();
          assert.equal(assignmentPosts, 0);
          await dialog
            .getByRole('button', { name: 'Hủy bỏ', exact: true })
            .click();
          assert.equal(assignmentPosts, 0);
          await teacher
            .getByRole('button', {
              name: 'Kiểm tra trước khi giao',
              exact: true,
            })
            .click();
          dialog = teacher.getByRole('dialog', {
            name: 'Xác nhận giao bài?',
            exact: true,
          });
          await dialog.getByText(/v1/).waitFor();
          await call(
            f.teacherA,
            'POST',
            `/exams/${f.exam.id}/publish`,
            undefined,
            201,
          );
          const response = teacher.waitForResponse(
            (r) =>
              new URL(r.url()).pathname === '/exam-assignments' &&
              r.request().method() === 'POST',
          );
          await dialog
            .getByRole('button', { name: 'Xác nhận giao bài', exact: true })
            .click();
          const r = await response;
          assert.equal(r.status(), 201);
          const value = await r.json();
          assert.equal(assignmentPosts, 1);
          assert.equal(value.examVersion.id, f.version.id);
          assert.equal(
            (
              await db.query(
                'SELECT "examVersionId" FROM "ExamAssignment" WHERE id=$1',
                [value.id],
              )
            ).rows[0].examVersionId,
            f.version.id,
          );
          return value;
        },
      );
      await step(
        'Created assignment → detail → refresh → current recipients without another mutation',
        async () => {
          await teacher
            .getByRole('link', {
              name: 'Xem chi tiết bài vừa giao',
              exact: true,
            })
            .click();
          await teacher.waitForURL(web + '/teacher/assignments/' + asg.id);
          await teacher.reload();
          await teacher
            .getByRole('heading', { name: f.exam.title, exact: true })
            .waitFor();
          await teacher
            .getByRole('table', { name: 'Lượt làm của người nhận bài giao' })
            .getByText(f.studentA.email, { exact: true })
            .waitFor();
          assert.equal(
            await teacher
              .locator('a[href="/teacher/results/' + f.studentA.id + '"]')
              .count(),
            0,
          );
          assert.equal(assignmentPosts, 1);
          await teacher.screenshot({
            path: path.join(folder, 'teacher-assignment-detail.png'),
            fullPage: true,
          });
        },
      );
      const student = await login(f.studentA, 390);
      await step(
        'Student detail keeps V1 public metadata; finalized attempt links to its real scoped result',
        async () => {
          await student.goto(web + '/student/exams/' + asg.id);
          await student
            .getByRole('heading', { name: f.exam.title, exact: true })
            .waitFor();
          await student
            .getByText('UI115 V2 draft description ' + suffix, { exact: true })
            .waitFor({ state: 'hidden' });
          const response = student.waitForResponse(
            (r) =>
              new URL(r.url()).pathname.endsWith('/start') &&
              r.request().method() === 'POST',
          );
          await student
            .getByRole('button', { name: 'Bắt đầu làm bài', exact: true })
            .click();
          const attempt = await (await response).json();
          assert.equal(attempt.version, 1);
          await student.waitForURL(web + '/student/attempts/' + attempt.id);
          // The existing UI113/UI114 full journeys cover answering/autosave/reload/submit.
          // This focused case finalizes via the real API to exercise the new management rows.
          await call(
            f.studentA,
            'POST',
            `/exam-attempts/${attempt.id}/submit`,
            undefined,
            201,
          );
          await teacher.reload();
          const link = teacher.getByRole('link', {
            name: 'Xem kết quả',
            exact: true,
          });
          await link.waitFor();
          assert.equal(
            await link.getAttribute('href'),
            '/teacher/results/' + attempt.id,
          );
          await link.click();
          await teacher.waitForURL(web + '/teacher/results/' + attempt.id);
          await call(
            f.studentB,
            'GET',
            `/exam-attempts/${attempt.id}`,
            undefined,
            403,
          );
          await call(
            f.teacherB,
            'GET',
            `/exam-assignments/${asg.id}`,
            undefined,
            403,
          );
          await call(
            f.studentB,
            'GET',
            `/results/${attempt.id}`,
            undefined,
            403,
          );
          const stored = (
            await db.query(
              'SELECT status,score FROM "ExamAttempt" WHERE id=$1',
              [attempt.id],
            )
          ).rows[0];
          assert.equal(stored.status, 'SUBMITTED');
          assert.equal(Number(stored.score), 0);
          await student.screenshot({
            path: path.join(folder, 'student-workspace-mobile.png'),
            fullPage: true,
          });
        },
      );
      outcome = 'PASS';
    } finally {
      for (const context of contexts) await context.close();
      await browser?.close();
      await db.end();
      fs.writeFileSync(
        path.join(folder, 'workflow.json'),
        JSON.stringify(
          {
            outcome,
            steps,
            screenshots: [
              'admin-filters.png',
              'teacher-assignment-detail.png',
              'student-workspace-mobile.png',
            ],
            credentialsRetained: false,
          },
          null,
          2,
        ),
      );
    }
  },
);
