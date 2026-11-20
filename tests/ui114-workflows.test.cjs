const { chooseAssignmentOption } = require('./assignment-selection.cjs');
const { clickWebAction } = require('./web-confirmation.cjs');
const { webFailure } = require('./web-failure.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
assert.equal(
  process.env.UI114_FEATURE_RUNTIME_APPROVED,
  '1',
  'UI114_LIVE_FEATURE_SCOPE_REQUIRED',
);
const fs = require('node:fs'),
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

test(
  'UI114 workflow: Admin restores roster → Teacher previews/pins V1 → Student detail/start/save/resume/submit/history',
  { timeout: 300000 },
  async () => {
    const folder = fs.mkdtempSync(
        path.join(os.tmpdir(), 'examspace-ui114-workflow-'),
      ),
      evidence = {
        startedAt: new Date().toISOString(),
        status: 'RUNNING',
        steps: [],
        artifacts: [],
      },
      contexts = [];
    let browser;
    const step = async (name, fn) => {
      const item = { name, status: 'RUNNING' };
      evidence.steps.push(item);
      try {
        const value = await fn();
        item.status = 'PASS';
        return value;
      } catch (error) {
        item.status = 'FAIL';
        Object.assign(item, webFailure(error));
        item.frames = String(error.stack)
          .split('\n')
          .filter((line) => /^\s+at /.test(line))
          .slice(0, 5);
        throw error;
      }
    };
    async function login(actor) {
      const c = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      });
      contexts.push(c);
      const page = await c.newPage();
      page.setDefaultTimeout(15000);
      await page.goto(web + '/login');
      await page.locator('#email').fill(actor.email);
      await page.locator('#password').fill(password);
      await page
        .getByRole('button', { name: 'Đăng nhập', exact: true })
        .click();
      await page.waitForURL(web + '/dashboard/' + actor.role.toLowerCase());
      actor.cookies = Object.fromEntries(
        (await c.cookies(api)).map((cookie) => [cookie.name, cookie.value]),
      );
      return page;
    }
    const mutation = async (page, method, route, action, status) => {
      const response = page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === route &&
          r.request().method() === method,
      );
      await action();
      const r = await response;
      assert.equal(r.status(), status);
      return r.json();
    };
    try {
      const f = await fixtures();
      browser = await chromium.launch({
        channel: process.env.P0_BROWSER_CHANNEL || 'msedge',
        headless: true,
      });
      const admin = await login(f.admin);
      await step('admin_teacher_total_and_filtered_list', async () => {
        const stat = admin
          .getByRole('region', { name: 'Tổng quan quản trị' })
          .locator('.admin-stat')
          .filter({ hasText: 'Giảng viên' });
        const expected = (
          await db.query(
            'SELECT count(*)::int n FROM "User" WHERE role=\'TEACHER\'',
          )
        ).rows[0].n;
        await waitUntil(
          async () =>
            Number(await stat.locator(':scope > strong').textContent()) ===
            expected,
        );
        await stat.getByRole('link', { name: 'Xem danh sách' }).click();
        await admin.waitForURL('**/admin/users?role=TEACHER');
        assert.equal(
          await admin.getByLabel('Vai trò', { exact: true }).inputValue(),
          'TEACHER',
        );
      });
      await step('admin_archive_restore_same_class_and_roster', async () => {
        const roster = async () =>
          (
            await db.query(
              'SELECT id,"studentId" FROM "ClassMember" WHERE "classId"=$1 ORDER BY id',
              [f.classes.A.id],
            )
          ).rows;
        const original = await roster();
        await admin.goto(web + '/admin/classes');
        await admin.getByPlaceholder('Tìm kiếm...').fill(f.classes.A.code);
        await admin
          .getByRole('button', {
            name: 'Quản lý ' + f.classes.A.name,
            exact: true,
          })
          .click();
        await admin
          .getByRole('button', { name: 'Lưu trữ lớp', exact: true })
          .click();
        const archived = await mutation(
          admin,
          'PATCH',
          '/classes/' + f.classes.A.id,
          () =>
            admin
              .getByRole('dialog')
              .getByRole('button', {
                name: 'Xác nhận lưu trữ lớp',
                exact: true,
              })
              .click(),
          200,
        );
        assert.equal(archived.isArchived, true);
        await admin
          .getByLabel('Trạng thái lớp', { exact: true })
          .selectOption('true');
        await admin
          .getByRole('button', {
            name: 'Quản lý ' + f.classes.A.name,
            exact: true,
          })
          .click();
        await admin
          .getByRole('button', { name: 'Khôi phục lớp', exact: true })
          .click();
        const restored = await mutation(
          admin,
          'PATCH',
          '/classes/' + f.classes.A.id,
          () =>
            admin
              .getByRole('dialog')
              .getByRole('button', {
                name: 'Xác nhận khôi phục lớp',
                exact: true,
              })
              .click(),
          200,
        );
        assert.equal(restored.id, f.classes.A.id);
        assert.equal(restored.isArchived, false);
        assert.deepEqual(await roster(), original);
      });
      const teacher = await login(f.teacherA);
      const assignment = await step(
        'teacher_historical_preview_to_exact_v1_assignment',
        async () => {
          await call(
            f.teacherA,
            'POST',
            '/exams/' + f.exam.id + '/new-version',
            undefined,
            201,
          );
          await call(
            f.teacherA,
            'PATCH',
            '/exams/' + f.exam.id,
            {
              title: 'UI114 Draft V2 ' + suffix,
              durationMin: 40,
              questions: f.questions.map((q) => ({
                questionId: q.id,
                points: 1,
              })),
            },
            200,
          );
          await teacher.goto(web + '/teacher/exams/' + f.exam.id);
          await teacher
            .getByRole('heading', {
              name: 'UI114 Draft V2 ' + suffix,
              exact: true,
            })
            .waitFor();
          await teacher
            .getByRole('button', { name: 'Xem phiên bản 1', exact: true })
            .click();
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
          await teacher
            .locator('form')
            .getByRole('group', { name: 'Đề thi', exact: true })
            .locator('[data-selected-id="' + f.exam.id + '"]')
            .waitFor({ state: 'visible' });
          assert.equal(
            await teacher
              .locator('form')
              .getByRole('group', { name: 'Đề thi', exact: true })
              .locator('[data-selected-id]')
              .getAttribute('data-selected-id'),
            f.exam.id,
          );
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
            .getByLabel('Công bố điểm sau khi nộp', { exact: true })
            .check();
          const a = await mutation(
            teacher,
            'POST',
            '/exam-assignments',
            () => clickWebAction(teacher, 'Giao bài'),
            201,
          );
          assert.equal(
            (
              await db.query(
                'SELECT "examVersionId" FROM "ExamAssignment" WHERE id=$1',
                [a.id],
              )
            ).rows[0].examVersionId,
            f.version.id,
          );
          return a;
        },
      );
      const student = await login(f.studentA);
      await step(
        'student_detail_start_acknowledged_save_resume_submit_and_history',
        async () => {
          await student.goto(web + '/student/exams/' + assignment.id);
          await student
            .getByRole('heading', { name: f.exam.title, exact: true })
            .waitFor();
          await student
            .getByText('Bạn chưa bắt đầu lượt làm nào.', { exact: true })
            .waitFor();
          let startRequests = 0;
          student.on('request', (r) => {
            if (
              r.method() === 'POST' &&
              new URL(r.url()).pathname ===
                `/exam-assignments/${assignment.id}/start`
            )
              startRequests++;
          });
          const attempt = await mutation(
            student,
            'POST',
            `/exam-assignments/${assignment.id}/start`,
            () =>
              student
                .getByRole('button', { name: 'Bắt đầu làm bài', exact: true })
                .click(),
            201,
          );
          await student.waitForURL(web + '/student/attempts/' + attempt.id);
          const question = attempt.snapshot.questions.find(
              (q) => q.type === 'SINGLE_CHOICE',
            ),
            option = question.options.find((o) => o.content === 'P0 A');
          await student
            .locator('#question-' + question.questionId)
            .getByRole('radio', { name: 'P0 A', exact: true })
            .check();
          await student
            .getByText('Đã lưu trên máy chủ', { exact: true })
            .waitFor();
          const answer = async () =>
            (
              await db.query(
                'SELECT answer,revision FROM "AttemptAnswer" WHERE "attemptId"=$1 AND "questionId"=$2',
                [attempt.id, question.questionId],
              )
            ).rows[0];
          await waitUntil(async () => Boolean(await answer()));
          const saved = await answer();
          assert.deepEqual(saved.answer, { optionId: option.id });
          assert.equal(saved.revision, 1);
          await student.goto(web + '/student/exams/' + assignment.id);
          await student
            .getByRole('button', { name: 'Tiếp tục làm bài', exact: true })
            .click();
          await student.waitForURL(web + '/student/attempts/' + attempt.id);
          await student.reload();
          await student
            .getByText('Đã lưu trên máy chủ', { exact: true })
            .waitFor();
          await waitUntil(
            async () =>
              await student
                .locator('#question-' + question.questionId)
                .getByRole('radio', { name: 'P0 A', exact: true })
                .isChecked(),
          );
          assert.deepEqual(await answer(), saved);
          assert.equal(startRequests, 1);
          await student
            .getByRole('button', { name: 'Nộp bài', exact: true })
            .click();
          await mutation(
            student,
            'POST',
            `/exam-attempts/${attempt.id}/submit`,
            () =>
              student
                .getByRole('dialog')
                .getByRole('button', { name: 'Xác nhận nộp bài', exact: true })
                .click(),
            201,
          );
          await student.waitForURL(web + '/student/results/' + attempt.id);
          const row = (
            await db.query(
              'SELECT status,score,"maxScore","examVersionId","examSnapshot" FROM "ExamAttempt" WHERE id=$1',
              [attempt.id],
            )
          ).rows[0];
          assert.equal(row.status, 'SUBMITTED');
          assert.equal(row.score, '2.50');
          assert.equal(row.maxScore, '6.75');
          assert.equal(row.examVersionId, f.version.id);
          assert.deepEqual(row.examSnapshot, f.version.snapshot);
          await student.goto(web + '/student/exams/' + assignment.id);
          await student
            .getByRole('link', { name: 'Xem kết quả lượt làm', exact: true })
            .click();
          await student.waitForURL(web + '/student/results/' + attempt.id);
          await student.getByText(/2\.5(?:0)?\s*\/\s*6\.75/).waitFor();
          assert.equal(
            await student.getByText('Đáp án đúng', { exact: true }).count(),
            0,
          );
          const file = path.join(folder, 'student-v1-result.png');
          await student.screenshot({ path: file, fullPage: true });
          evidence.artifacts.push(file);
        },
      );
      evidence.status = 'PASS';
    } catch (error) {
      evidence.status = 'FAIL';
      throw error;
    } finally {
      for (const c of contexts) await c.close();
      await browser?.close();
      await db.end();
      evidence.finishedAt = new Date().toISOString();
      fs.writeFileSync(
        path.join(folder, 'workflow.json'),
        JSON.stringify(evidence, null, 2),
      );
    }
  },
);
