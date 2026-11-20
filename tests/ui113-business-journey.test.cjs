const { chooseAssignmentOption } = require('./assignment-selection.cjs');
const { clickWebAction } = require('./web-confirmation.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');

// Loading this acceptance test must never implicitly authorize fixtures or runtime.
assert.equal(
  process.env.UI113_ACCEPTANCE_APPROVED,
  '1',
  'UI113_ACCEPTANCE_APPROVAL_REQUIRED',
);
assert.match(
  process.env.UI113_SOURCE_FINGERPRINT || '',
  /^[a-f0-9]{64}$/,
  'UI113_SOURCE_FINGERPRINT_REQUIRED',
);
assert.equal(
  process.env.TEST_DATABASE_SYSTEM_IDENTIFIER,
  '7707490234436235289',
  'UI113_DISPOSABLE_CLUSTER_REQUIRED',
);
const {
  api,
  web,
  db,
  fixtures,
  call,
  password,
  suffix,
  waitUntil,
} = require('./p0-support.cjs');
for (const [value, port] of [
  [api, '4010'],
  [web, '3010'],
]) {
  const url = new URL(value);
  assert.equal(url.protocol, 'http:');
  assert(['localhost', '127.0.0.1'].includes(url.hostname));
  assert.equal(url.port, port, 'UI113_TEST_PORT_REQUIRED');
}
const req = createRequire(path.resolve(__dirname, '../apps/web/package.json'));
const { chromium } = req('playwright');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');

test(
  'UI113 business journey: real Admin → Teacher → Student → V1 submit/grading → scoped Results',
  { timeout: 300_000 },
  async () => {
    const folder = fs.mkdtempSync(
      path.join(os.tmpdir(), 'examspace-ui113-journey-'),
    );
    const evidence = {
      startedAt: new Date().toISOString(),
      fingerprint: process.env.UI113_SOURCE_FINGERPRINT,
      status: 'RUNNING',
      steps: [],
      http: [],
      artifacts: [],
      fixtureIds: {},
      secretsRetained: false,
    };
    let browser;
    const contexts = [];
    const sanitize = (message) =>
      String(message)
        .split(password)
        .join('[REDACTED]')
        .replace(
          /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
          '[REDACTED_JWT]',
        )
        .slice(0, 1500);
    const step = async (name, action) => {
      const record = {
        name,
        startedAt: new Date().toISOString(),
        status: 'RUNNING',
      };
      evidence.steps.push(record);
      try {
        const value = await action();
        record.status = 'PASS';
        return value;
      } catch (error) {
        record.status = 'FAIL';
        record.error = sanitize(error.message);
        throw new Error('UI113_' + name + ': ' + record.error);
      } finally {
        record.finishedAt = new Date().toISOString();
      }
    };
    const http = async (actor, method, route, body, status) => {
      const value = await call(actor, method, route, body, status);
      evidence.http.push({ method, route, status: value.status });
      return value.data;
    };
    const response = (page, method, route) =>
      page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname === route &&
          r.request().method() === method,
      );
    const mutateUI = async (page, method, route, action, expected) => {
      const pending = response(page, method, route);
      await action();
      const r = await pending;
      evidence.http.push({
        method,
        route,
        status: r.status(),
        via: 'BROWSER_UI',
      });
      assert.equal(r.status(), expected);
      return r.json();
    };
    const loginUI = async (actor) => {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      });
      contexts.push(context);
      const page = await context.newPage();
      page.setDefaultTimeout(15_000);
      await page.goto(web + '/login');
      await page.locator('#email').fill(actor.email);
      await page.locator('#password').fill(password);
      await mutateUI(
        page,
        'POST',
        '/auth/login',
        () =>
          page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(),
        200,
      );
      await page.waitForURL(web + '/dashboard/' + actor.role.toLowerCase());
      actor.cookies = Object.fromEntries(
        (await context.cookies(api)).map((c) => [c.name, c.value]),
      );
      return page;
    };
    const screenshot = async (page, name) => {
      const file = path.join(folder, name + '.png');
      await page.screenshot({ path: file, fullPage: true });
      evidence.artifacts.push({
        path: file,
        sha256: sha(fs.readFileSync(file)),
      });
    };
    try {
      // fixtures() creates a dedicated bootstrap Admin and auxiliary negative actors;
      // the journey's Teacher/Student/class/questions/exam are then created through UI.
      const f = await step('guarded_bootstrap', () => fixtures());
      browser = await chromium.launch({
        channel: process.env.P0_BROWSER_CHANNEL || 'msedge',
        headless: true,
      });
      const admin = await step('admin_login', () => loginUI(f.admin));
      const teacher = {
        email: `ui113-teacher-${suffix}@example.test`,
        fullName: 'UI113 Teacher ' + suffix,
        role: 'TEACHER',
      };
      const student = {
        email: `ui113-student-${suffix}@example.test`,
        fullName: 'UI113 Student ' + suffix,
        role: 'STUDENT',
      };
      await step('admin_create_users_ui_and_sql', async () => {
        await admin.goto(web + '/admin/users');
        const form = admin.getByRole('form', {
          name: 'Tạo tài khoản',
          exact: true,
        });
        for (const actor of [teacher, student]) {
          await form.getByLabel('Email', { exact: true }).fill(actor.email);
          await form
            .getByLabel('Họ và tên', { exact: true })
            .fill(actor.fullName);
          await form.getByLabel('Vai trò tài khoản').selectOption(actor.role);
          await form.getByLabel('Mật khẩu tạm').fill(password);
          const created = await mutateUI(
            admin,
            'POST',
            '/users',
            () =>
              form
                .getByRole('button', { name: 'Tạo tài khoản', exact: true })
                .click(),
            201,
          );
          actor.id = created.id;
          const row = (
            await db.query(
              'SELECT email, role, "isActive" FROM "User" WHERE id=$1',
              [actor.id],
            )
          ).rows[0];
          assert.equal(row.email, actor.email);
          assert.equal(row.role, actor.role);
          assert.equal(row.isActive, true);
          await form.getByLabel('Mật khẩu tạm').waitFor({ state: 'visible' });
          await waitUntil(
            async () =>
              (await form.getByLabel('Mật khẩu tạm').inputValue()) === '',
          );
        }
        evidence.fixtureIds.teacher = teacher.id;
        evidence.fixtureIds.student = student.id;
      });
      const classroom = await step(
        'admin_create_class_and_roster_ui_sql',
        async () => {
          await admin.goto(web + '/admin/classes');
          const form = admin.getByRole('form', {
            name: 'Tạo lớp học',
            exact: true,
          });
          const name = 'UI113 Class ' + suffix;
          await form.getByLabel('Tên lớp', { exact: true }).fill(name);
          await form
            .getByLabel('Mã lớp', { exact: true })
            .fill('UI113-' + suffix);
          await form
            .getByLabel('Giảng viên phụ trách')
            .selectOption(teacher.id);
          const value = await mutateUI(
            admin,
            'POST',
            '/classes',
            () =>
              form
                .getByRole('button', { name: 'Tạo lớp', exact: true })
                .click(),
            201,
          );
          await admin
            .getByRole('button', { name: 'Quản lý ' + name, exact: true })
            .click();
          const detail = admin.getByLabel('Chi tiết quản lý', { exact: true });
          await detail
            .getByLabel('Tìm học viên', { exact: true })
            .fill(student.email);
          await detail
            .getByLabel('Học viên cần thêm', { exact: true })
            .selectOption(student.id);
          await mutateUI(
            admin,
            'POST',
            `/classes/${value.id}/students`,
            () =>
              detail.getByRole('button', { name: 'Thêm', exact: true }).click(),
            201,
          );
          const rows = (
            await db.query(
              'SELECT c."teacherId", m."studentId" FROM "Class" c JOIN "ClassMember" m ON m."classId"=c.id WHERE c.id=$1',
              [value.id],
            )
          ).rows;
          assert.deepEqual(rows, [
            { teacherId: teacher.id, studentId: student.id },
          ]);
          evidence.fixtureIds.class = value.id;
          await screenshot(admin, 'admin-created-class-roster');
          return value;
        },
      );
      const teacherPage = await step('teacher_login', () => loginUI(teacher));
      const questions = await step(
        'teacher_authors_three_types_ui_sql',
        async () => {
          await teacherPage.goto(web + '/teacher/questions');
          const form = teacherPage.locator('#teacher-create-question form');
          const values = [];
          for (const [index, type] of [
            'SINGLE_CHOICE',
            'MULTIPLE_CHOICE',
            'MATCHING',
          ].entries()) {
            await form
              .getByLabel('Loại câu hỏi', { exact: true })
              .selectOption(type);
            await form
              .getByLabel('Nội dung câu hỏi', { exact: true })
              .fill(`UI113 ${type} ${suffix}`);
            await form
              .getByLabel('Giải thích đáp án', { exact: true })
              .fill('UI113 pinned explanation ' + index);
            if (type === 'MATCHING') {
              for (const n of [1, 2]) {
                await form
                  .getByLabel('Nội dung cần ghép ' + n, { exact: true })
                  .fill('Left ' + n);
                await form
                  .getByLabel('Đáp án đúng tương ứng ' + n, { exact: true })
                  .fill('Right ' + n);
              }
            } else {
              await form
                .getByLabel('Lựa chọn 1', { exact: true })
                .fill('Choice A');
              await form
                .getByLabel('Lựa chọn 2', { exact: true })
                .fill('Choice B');
              if (type === 'MULTIPLE_CHOICE')
                await form
                  .getByRole('checkbox', { name: 'Đúng', exact: true })
                  .nth(1)
                  .check();
            }
            const value = await mutateUI(
              teacherPage,
              'POST',
              '/questions',
              () =>
                form
                  .getByRole('button', { name: 'Lưu câu hỏi', exact: true })
                  .click(),
              201,
            );
            values.push(value);
            assert.equal(
              (
                await db.query(
                  'SELECT "authorId", type FROM "Question" WHERE id=$1',
                  [value.id],
                )
              ).rows[0].authorId,
              teacher.id,
            );
          }
          await teacherPage.reload();
          for (const value of values)
            await teacherPage
              .getByRole('heading', { name: value.content, exact: true })
              .waitFor();
          evidence.fixtureIds.questions = values.map((q) => q.id);
          await screenshot(teacherPage, 'teacher-question-bank');
          return values;
        },
      );
      const exam = await step('teacher_draft_publish_v1_ui_sql', async () => {
        await teacherPage.goto(web + '/teacher/exams/new');
        await teacherPage
          .getByLabel('Tên đề thi', { exact: true })
          .fill('UI113 V1 ' + suffix);
        await teacherPage
          .getByLabel('Thời lượng (phút)', { exact: true })
          .fill('30');
        for (const [index, question] of questions.entries()) {
          const item = teacherPage
            .locator('li')
            .filter({ hasText: question.content })
            .filter({ has: teacherPage.getByRole('checkbox') });
          await item.getByRole('checkbox').check();
          await teacherPage
            .getByLabel('Điểm câu ' + (index + 1), { exact: true })
            .fill(['2.5', '1.25', '3'][index]);
        }
        const value = await mutateUI(
          teacherPage,
          'POST',
          '/exams',
          () =>
            teacherPage
              .getByRole('button', { name: 'Lưu bản nháp', exact: true })
              .click(),
          201,
        );
        await teacherPage.waitForURL(web + '/teacher/exams/' + value.id);
        await teacherPage.reload();
        const version = await mutateUI(
          teacherPage,
          'POST',
          `/exams/${value.id}/publish`,
          () => clickWebAction(teacherPage, 'Xuất bản'),
          201,
        );
        assert.equal(version.number, 1);
        evidence.fixtureIds.exam = value.id;
        evidence.fixtureIds.v1 = version.id;
        return { ...value, v1: version };
      });
      const assignment = await step(
        'teacher_assigns_pinned_v1_ui_sql',
        async () => {
          await teacherPage.goto(web + '/teacher/assignments');
          await chooseAssignmentOption(
            teacherPage,
            'Đề thi',
            exam.id,
            exam.title,
          );
          await teacherPage
            .getByLabel('Phiên bản đề thi', { exact: true })
            .selectOption(exam.v1.id);
          await chooseAssignmentOption(
            teacherPage,
            'Lớp học',
            classroom.id,
            classroom.name,
          );
          await teacherPage
            .getByLabel('Công bố điểm sau khi nộp', { exact: true })
            .check();
          await teacherPage
            .getByLabel('Công bố đáp án sau khi nộp', { exact: true })
            .check();
          const value = await mutateUI(
            teacherPage,
            'POST',
            '/exam-assignments',
            () => clickWebAction(teacherPage, 'Giao bài'),
            201,
          );
          const row = (
            await db.query(
              'SELECT "examVersionId", "classId" FROM "ExamAssignment" WHERE id=$1',
              [value.id],
            )
          ).rows[0];
          assert.equal(row.examVersionId, exam.v1.id);
          assert.equal(row.classId, classroom.id);
          evidence.fixtureIds.assignment = value.id;
          return value;
        },
      );
      const studentPage = await step('student_login', () => loginUI(student));
      const attempt = await step(
        'student_starts_assigned_v1_ui_sql',
        async () => {
          await studentPage.goto(web + '/student/exams');
          const card = studentPage
            .locator('article')
            .filter({ hasText: 'UI113 V1 ' + suffix });
          const value = await mutateUI(
            studentPage,
            'POST',
            `/exam-assignments/${assignment.id}/start`,
            () =>
              card
                .getByRole('button', { name: 'Bắt đầu làm bài', exact: true })
                .click(),
            201,
          );
          await studentPage.waitForURL(web + '/student/attempts/' + value.id);
          const row = (
            await db.query(
              'SELECT "examVersionId", "examSnapshot", "deadlineAt" FROM "ExamAttempt" WHERE id=$1',
              [value.id],
            )
          ).rows[0];
          assert.equal(row.examVersionId, exam.v1.id);
          assert.equal(value.version, 1);
          assert.deepEqual(row.examSnapshot, exam.v1.snapshot);
          evidence.fixtureIds.attempt = value.id;
          evidence.pinnedSnapshotSha256 = sha(JSON.stringify(row.examSnapshot));
          return value;
        },
      );
      await step(
        'teacher_publishes_v2_after_student_start_v1_immutable',
        async () => {
          await teacherPage.goto(web + '/teacher/exams/' + exam.id);
          await mutateUI(
            teacherPage,
            'POST',
            `/exams/${exam.id}/new-version`,
            () => clickWebAction(teacherPage, 'Tạo phiên bản mới'),
            201,
          );
          await teacherPage
            .getByRole('button', { name: 'Chỉnh sửa', exact: true })
            .click();
          await teacherPage
            .getByLabel('Tên đề thi', { exact: true })
            .fill('UI113 V2 ' + suffix);
          await teacherPage
            .getByLabel('Thời lượng (phút)', { exact: true })
            .fill('40');
          await mutateUI(
            teacherPage,
            'PATCH',
            `/exams/${exam.id}`,
            () =>
              teacherPage
                .getByRole('button', { name: 'Lưu bản nháp', exact: true })
                .click(),
            200,
          );
          await teacherPage.waitForURL(web + '/teacher/exams/' + exam.id);
          const v2 = await mutateUI(
            teacherPage,
            'POST',
            `/exams/${exam.id}/publish`,
            () => clickWebAction(teacherPage, 'Xuất bản'),
            201,
          );
          assert.equal(v2.number, 2);
          assert.deepEqual(
            (
              await db.query('SELECT snapshot FROM "ExamVersion" WHERE id=$1', [
                exam.v1.id,
              ])
            ).rows[0].snapshot,
            exam.v1.snapshot,
          );
          assert.equal(
            (
              await db.query(
                'SELECT "examVersionId" FROM "ExamAssignment" WHERE id=$1',
                [assignment.id],
              )
            ).rows[0].examVersionId,
            exam.v1.id,
          );
        },
      );
      await step(
        'student_answers_three_types_autosave_sql_reload_resume',
        async () => {
          for (const question of attempt.snapshot.questions) {
            const card = studentPage.locator(
              '#question-' + question.questionId,
            );
            if (question.type === 'SINGLE_CHOICE')
              await card
                .getByRole('radio', { name: 'Choice A', exact: true })
                .check();
            else if (question.type === 'MULTIPLE_CHOICE') {
              await card
                .getByRole('checkbox', { name: 'Choice A', exact: true })
                .check();
              await card
                .getByRole('checkbox', { name: 'Choice B', exact: true })
                .check();
            } else
              for (const pair of question.matchingPairs) {
                const choice = question.matchingOptions.find(
                  (o) => o.rightText === pair.leftText.replace('Left', 'Right'),
                );
                assert(choice);
                await card
                  .getByLabel('Ghép ' + pair.leftText, { exact: true })
                  .selectOption(choice.id);
              }
          }
          await waitUntil(
            async () =>
              Number(
                (
                  await db.query(
                    'SELECT count(*) FROM "AttemptAnswer" WHERE "attemptId"=$1',
                    [attempt.id],
                  )
                ).rows[0].count,
              ) === 3,
          );
          await studentPage
            .getByText('Đã lưu trên máy chủ', { exact: true })
            .waitFor();
          const rows = async () =>
            (
              await db.query(
                'SELECT "questionId", answer, revision FROM "AttemptAnswer" WHERE "attemptId"=$1 ORDER BY "questionId"',
                [attempt.id],
              )
            ).rows;
          const before = await rows();
          assert(before.every((row) => row.revision >= 1));
          const current = await http(
            student,
            'GET',
            '/exam-attempts/' + attempt.id,
            undefined,
            200,
          );
          for (const row of before)
            assert.deepEqual(
              current.answers.find((a) => a.questionId === row.questionId),
              row,
            );
          await studentPage.reload();
          await studentPage
            .getByRole('heading', { name: 'UI113 V1 ' + suffix, exact: true })
            .waitFor();
          await studentPage
            .getByText('Đã lưu trên máy chủ', { exact: true })
            .waitFor();
          for (const question of attempt.snapshot.questions) {
            const card = studentPage.locator(
              '#question-' + question.questionId,
            );
            if (question.type === 'SINGLE_CHOICE')
              assert(
                await card
                  .getByRole('radio', { name: 'Choice A', exact: true })
                  .isChecked(),
              );
            else if (question.type === 'MULTIPLE_CHOICE')
              for (const text of ['Choice A', 'Choice B'])
                assert(
                  await card
                    .getByRole('checkbox', { name: text, exact: true })
                    .isChecked(),
                );
            else
              for (const pair of question.matchingPairs)
                assert.equal(
                  await card
                    .getByLabel('Ghép ' + pair.leftText, { exact: true })
                    .inputValue(),
                  question.matchingOptions.find(
                    (o) =>
                      o.rightText === pair.leftText.replace('Left', 'Right'),
                  ).id,
                );
          }
          assert.deepEqual(await rows(), before);
          evidence.acknowledgedAnswers = before.map((row) => ({
            questionId: row.questionId,
            revision: row.revision,
            answerSha256: sha(JSON.stringify(row.answer)),
          }));
          await screenshot(studentPage, 'student-v1-resumed-acknowledged');
        },
      );
      await step('student_submits_v1_server_grade_675_sql', async () => {
        await studentPage
          .getByRole('button', { name: 'Nộp bài', exact: true })
          .click();
        await mutateUI(
          studentPage,
          'POST',
          `/exam-attempts/${attempt.id}/submit`,
          () =>
            studentPage
              .getByRole('dialog')
              .getByRole('button', { name: 'Xác nhận nộp bài', exact: true })
              .click(),
          201,
        );
        await studentPage.waitForURL(web + '/student/results/' + attempt.id);
        const row = (
          await db.query(
            'SELECT status, score, "maxScore", "examVersionId", "examSnapshot" FROM "ExamAttempt" WHERE id=$1',
            [attempt.id],
          )
        ).rows[0];
        assert.equal(row.status, 'SUBMITTED');
        assert.equal(row.score, '6.75');
        assert.equal(row.maxScore, '6.75');
        assert.equal(row.examVersionId, exam.v1.id);
        assert.deepEqual(row.examSnapshot, exam.v1.snapshot);
        await studentPage.getByText('6.75 / 6.75', { exact: true }).waitFor();
        await screenshot(studentPage, 'student-v1-result');
        evidence.grade = {
          score: row.score,
          maxScore: row.maxScore,
          status: row.status,
          snapshotPinned: true,
        };
      });
      await step('teacher_admin_results_and_security_boundaries', async () => {
        for (const [actor, page, route] of [
          [teacher, teacherPage, '/teacher/exams/'],
          [f.admin, admin, '/admin/exams/'],
        ]) {
          await page.goto(web + route + exam.id + '/results');
          await page
            .getByText(student.fullName, { exact: true })
            .first()
            .waitFor();
          const report = await http(
            actor,
            'GET',
            '/results/exams/' + exam.id,
            undefined,
            200,
          );
          assert(
            report.assignments.some(
              (a) =>
                a.id === assignment.id &&
                a.students.some(
                  (s) =>
                    s.id === student.id &&
                    s.attempts.some(
                      (t) => t.id === attempt.id && t.score === '6.75',
                    ),
                ),
            ),
          );
          await screenshot(page, actor.role.toLowerCase() + '-v1-report');
        }
        for (const route of [
          '/exam-attempts/' + attempt.id,
          '/results/' + attempt.id,
        ])
          await http(f.studentB, 'GET', route, undefined, 403);
        await http(
          f.teacherB,
          'GET',
          '/questions/' + questions[0].id,
          undefined,
          403,
        );
        await http(
          f.teacherB,
          'GET',
          '/results/exams/' + exam.id,
          undefined,
          403,
        );
        await http(null, 'GET', '/auth/me', undefined, 401);
        await http(
          student,
          'PATCH',
          '/users/' + teacher.id + '/status',
          { isActive: false },
          403,
        );
      });
      await step(
        'independent_result_visibility_policies_real_api_ui',
        async () => {
          for (const showScore of [false, true])
            for (const showAnswers of [false, true]) {
              await http(
                teacher,
                'PATCH',
                '/exam-assignments/' + assignment.id,
                { showScore, showAnswers },
                200,
              );
              const result = await http(
                student,
                'GET',
                '/results/' + attempt.id,
                undefined,
                200,
              );
              assert.equal(result.score, showScore ? '6.75' : null);
              assert.equal(
                'isCorrect' in
                  result.questions.find((q) => q.type === 'SINGLE_CHOICE')
                    .options[0],
                showAnswers,
              );
              const matching = result.questions.find(
                (q) => q.type === 'MATCHING',
              );
              assert.equal('rightId' in matching.matchingPairs[0], showAnswers);
              assert.equal('explanation' in result.questions[0], showAnswers);
              await studentPage.reload();
              await studentPage
                .getByText(
                  showScore ? '6.75 / 6.75' : 'Điểm chưa được công bố',
                  { exact: true },
                )
                .waitFor();
              assert.equal(
                (await studentPage
                  .getByText('Đáp án đúng', { exact: true })
                  .count()) > 0,
                showAnswers,
              );
            }
          await http(
            teacher,
            'PATCH',
            '/exam-assignments/' + assignment.id,
            { showScore: true, showAnswers: true },
            200,
          );
        },
      );
      evidence.status = 'PASS';
    } catch (error) {
      evidence.status = 'FAIL';
      throw error;
    } finally {
      for (const context of contexts) await context.close();
      await browser?.close();
      await db.end();
      evidence.finishedAt = new Date().toISOString();
      evidence.retention =
        'Retain dedicated fixtures and sanitized evidence; no main reset/drop/seed';
      fs.writeFileSync(
        path.join(folder, 'journey.json'),
        JSON.stringify(evidence, null, 2),
      );
    }
  },
);
