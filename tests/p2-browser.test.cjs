const { test, before, after } = require('node:test');
const { createRequire } = require('node:module');
const path = require('node:path');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const {
  assert,
  api,
  web,
  db,
  suffix,
  password,
  fixtures,
  assignment,
  start,
  answers,
  waitUntil,
  sleep,
} = require('./p0-support.cjs');
const { chromium } = createRequire(
  path.resolve(__dirname, '../apps/web/package.json'),
)('playwright');
let browser, f;
const gate = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
before(async () => {
  f = await fixtures();
  browser = await chromium.launch({
    channel: process.env.P0_BROWSER_CHANNEL || 'msedge',
    headless: true,
  });
});

for (const width of [390, 768, 1024, 1440]) {
  test(`NT07/08: ${width}px real pages, document overflow, accessible controls and axe`, async () => {
    const { login: apiLogin, call } = require('./p0-support.cjs');
    await apiLogin(f.teacherA);
    await apiLogin(f.studentA);
    await apiLogin(f.admin);
    const pending = await start(f, await assignment(f));
    const completed = await start(f, await assignment(f));
    await call(
      f.studentA,
      'POST',
      `/exam-attempts/${completed.id}/submit`,
      undefined,
      201,
    );
    const routes = [
      [null, '/login'],
      [f.admin, '/dashboard/admin'],
      [f.admin, '/admin/exams'],
      [f.admin, '/admin/users'],
      [f.admin, '/admin/classes'],
      [f.teacherA, '/teacher/exams'],
      [f.teacherA, '/teacher/exams/new'],
      [f.teacherA, '/teacher/assignments'],
      [f.teacherA, '/teacher/results'],
      [f.teacherA, '/teacher/questions'],
      [f.studentA, '/student/exams'],
      [f.studentA, `/student/attempts/${pending.id}`],
      [f.studentA, '/student/results'],
      [f.studentA, `/student/results/${completed.id}`],
    ];
    const evidence = [];
    for (const [actor, route] of routes) {
      const c = await browser.newContext({
        viewport: { width, height: 1000 },
        hasTouch: width === 390,
      });
      const page = await c.newPage();
      try {
        if (actor)
          await c.addCookies(
            Object.entries(actor.cookies).map(([name, value]) => ({
              name,
              value,
              url: api,
              httpOnly: true,
              sameSite: 'Lax',
            })),
          );
        await page.goto(web + route);
        await page.getByRole('heading').first().waitFor();
        await page.waitForLoadState('networkidle');
        await page.addScriptTag({
          path: createRequire(
            path.resolve(__dirname, '../apps/web/package.json'),
          ).resolve('axe-core/axe.min.js'),
        });
        const audit = await page.evaluate(async () => {
          const result = await axe.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
          });
          return result.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            nodes: v.nodes.map((n) => ({
              target: n.target,
              summary: n.failureSummary,
            })),
          }));
        });
        const overflow = await page.evaluate(() => ({
          viewport: innerWidth,
          document: document.documentElement.scrollWidth,
        }));
        evidence.push({ route, overflow, violations: audit });
        if (route === '/login') {
          // Public navigation and a skip link now precede the login form.
          await page.keyboard.press('Tab');
          assert.equal(
            await page.locator(':focus').textContent(),
            'Đến nội dung đăng nhập',
          );
          await page.keyboard.press('Enter');
          const email = page.getByLabel('Email', { exact: true });
          for (
            let index = 0;
            index < 12 &&
            !(await email.evaluate((el) => el === document.activeElement));
            index++
          )
            await page.keyboard.press('Tab');
          assert(
            await email.evaluate((el) => el === document.activeElement),
            'Email remains keyboard reachable after the skip link',
          );
        }
        if (route === '/dashboard/admin' && width < 1024) {
          await page
            .getByRole('button', { name: 'Mở menu', exact: true })
            .click();
          await page
            .getByRole('link', { name: 'Theo dõi bài thi', exact: true })
            .click();
          await page.waitForURL('**/admin/exams');
        }
      } finally {
        await c.close();
      }
    }
    const dir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'examspace-ui-viewport-'),
    );
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, `viewport-${width}.json`),
      JSON.stringify(evidence, null, 2),
    );
    assert.deepEqual(
      evidence
        .filter((x) => x.overflow.document > x.overflow.viewport + 1)
        .map((x) => x.route),
      [],
      'document overflow',
    );
    assert.deepEqual(
      evidence
        .filter((x) => x.violations.length)
        .map((x) => ({ route: x.route, ids: x.violations.map((v) => v.id) })),
      [],
      'axe violations; see viewport evidence',
    );
  });
}
after(async () => {
  if (browser) await browser.close();
  await db.end();
});

async function login(page, actor) {
  const seen = [];
  page.on('request', (request) => {
    if (request.url().includes('/login'))
      seen.push({ url: request.url(), method: request.method() });
  });
  await page.goto(web + '/login');
  await page.getByLabel('Email', { exact: true }).fill(actor.email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  const request = page.waitForRequest((r) => r.url() === api + '/auth/login');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  assert.equal((await request).method(), 'POST');
  await page.waitForURL(`**/dashboard/${actor.role.toLowerCase()}`);
  assert(seen.every((r) => !new URL(r.url).searchParams.has('password')));
  assert(
    !(await page.evaluate(() => JSON.stringify(localStorage))).includes(
      password,
    ),
  );
  assert(
    (await page.context().cookies())
      .filter((c) => c.name.endsWith('_token'))
      .every((c) => c.httpOnly),
  );
}
async function contextFor(actor, mobile = false) {
  const context = await browser.newContext({
    viewport: mobile
      ? { width: 390, height: 844 }
      : { width: 1440, height: 1000 },
    ...(mobile ? { isMobile: true, hasTouch: true } : {}),
  });
  await context.addCookies(
    Object.entries(actor.cookies).map(([name, value]) => ({
      name,
      value,
      url: api,
      httpOnly: true,
      sameSite: 'Lax',
    })),
  );
  return context;
}
async function workspace(mobile = false) {
  const asg = await assignment(f),
    attempt = await start(f, asg);
  const context = await contextFor(f.studentA, mobile),
    page = await context.newPage();
  page.setDefaultTimeout(10000);
  await page.goto(`${web}/student/attempts/${attempt.id}`);
  await page.getByText('Đã lưu trên máy chủ', { exact: true }).waitFor();
  return { context, page, attempt };
}
const saved = (page) =>
  page.getByText('Đã lưu trên máy chủ', { exact: true }).waitFor();
async function select(page, question, which) {
  const card = page.locator('#question-' + question.questionId);
  if (question.type === 'SINGLE_CHOICE')
    await card
      .getByLabel(question.options[which].content, { exact: true })
      .check();
  else if (question.type === 'MULTIPLE_CHOICE')
    await card
      .getByLabel(question.options[which].content, { exact: true })
      .check();
  else
    await page
      .getByLabel(`Ghép ${question.matchingPairs[0].leftText}`, { exact: true })
      .selectOption(question.matchingOptions[which].id);
}
test('NT01: independent questions survive two tabs; offline same-question edit requires conflict confirmation', async () => {
  const x = await workspace();
  const other = await contextFor(f.studentA);
  const tab = await other.newPage();
  try {
    await tab.goto(`${web}/student/attempts/${x.attempt.id}`);
    await saved(tab);
    const [single, multi] = x.attempt.snapshot.questions;
    await select(x.page, single, 0);
    await saved(x.page);
    await select(tab, multi, 0);
    await saved(tab);
    assert.equal((await answers(x.attempt.id)).length, 2);
    await other.setOffline(true);
    await select(tab, single, 1);
    await tab
      .getByRole('button', { name: 'Thử lưu lại', exact: true })
      .waitFor({ timeout: 20000 });
    await other.setOffline(false);
    await tab.getByRole('button', { name: 'Thử lưu lại', exact: true }).click();
    await tab
      .locator('.exam-save-box')
      .getByRole('alert')
      .filter({ hasText: /Đáp án đã thay đổi ở phiên khác/ })
      .waitFor();
    assert.deepEqual(
      (await answers(x.attempt.id)).find(
        (r) => r.questionId === single.questionId,
      ).answer,
      { optionId: single.options[0].id },
    );
    tab.once('dialog', (dialog) => dialog.accept());
    await tab.getByRole('button', { name: 'Thử lưu lại', exact: true }).click();
    await saved(tab);
    assert.deepEqual(
      (await answers(x.attempt.id)).find(
        (r) => r.questionId === single.questionId,
      ).answer,
      { optionId: single.options[1].id },
    );
    await x.page.reload();
    await saved(x.page);
    assert(
      await x.page
        .getByRole('radio', { name: single.options[1].content, exact: true })
        .isChecked(),
    );
    assert(
      await x.page
        .getByRole('checkbox', { name: multi.options[0].content, exact: true })
        .isChecked(),
    );
  } finally {
    await x.context.close();
    await other.close();
  }
});

test('P2 final combined UI E2E: Teacher creates 3 types, publishes/assigns; Student reloads/submits; Teacher/Admin results', async () => {
  const actors = { ...f, classes: { ...f.classes } };
  const tc = await browser.newContext(),
    sc = await browser.newContext(),
    ac = await browser.newContext();
  const teacher = await tc.newPage(),
    student = await sc.newPage(),
    admin = await ac.newPage(),
    questions = [];
  try {
    await login(admin, actors.admin);
    for (const role of ['TEACHER', 'STUDENT']) {
      await admin.goto(web + '/admin/users');
      const email = `p2-final-${role}-${suffix}@example.test`;
      await admin.getByPlaceholder('Email', { exact: true }).fill(email);
      await admin
        .getByPlaceholder('Họ và tên', { exact: true })
        .fill(`P2 final ${role}`);
      await admin.locator('form select').selectOption(role);
      await admin
        .getByPlaceholder('Mật khẩu tạm (ít nhất 12 ký tự)', { exact: true })
        .fill(password);
      const posted = admin.waitForResponse(
        (r) => r.url() === api + '/users' && r.request().method() === 'POST',
      );
      await admin
        .getByRole('button', { name: 'Tạo tài khoản', exact: true })
        .click();
      const response = await posted;
      assert.equal(response.status(), 201);
      const actor = { ...(await response.json()), cookies: {} };
      if (role === 'TEACHER') actors.teacherA = actor;
      else actors.studentA = actor;
    }
    await admin.goto(web + '/admin/classes');
    await admin
      .getByPlaceholder('Tên lớp', { exact: true })
      .fill(`P2 final class ${suffix}`);
    await admin
      .getByPlaceholder('Mã lớp', { exact: true })
      .fill(`P2-${suffix}`);
    await admin.locator('form select').selectOption(actors.teacherA.id);
    const classPosted = admin.waitForResponse(
      (r) => r.url() === api + '/classes' && r.request().method() === 'POST',
    );
    await admin.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
    const classResponse = await classPosted;
    assert.equal(classResponse.status(), 201);
    actors.classes.A = await classResponse.json();
    await admin
      .getByRole('button', { name: new RegExp(`P2 final class ${suffix}`) })
      .click();
    await admin
      .getByLabel('Tìm học viên', { exact: true })
      .fill(actors.studentA.email);
    await admin
      .getByLabel('Học viên cần thêm', { exact: true })
      .selectOption(actors.studentA.id);
    const memberPosted = admin.waitForResponse(
      (r) => r.url().endsWith('/students') && r.request().method() === 'POST',
    );
    await admin.getByRole('button', { name: 'Thêm', exact: true }).click();
    assert.equal((await memberPosted).status(), 201);
    await login(teacher, actors.teacherA);
    await teacher.goto(web + '/teacher/questions');
    for (const type of ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'MATCHING']) {
      const form = teacher.locator('form').first();
      await form.locator('select').first().selectOption(type);
      await form
        .getByPlaceholder('Nội dung câu hỏi')
        .fill(`P2 UI ${type} ${suffix}`);
      if (type === 'MATCHING') {
        for (let i = 1; i <= 2; i++) {
          await form
            .getByPlaceholder(`Nội dung cần ghép ${i}`)
            .fill(`UI Left ${i}`);
          await form
            .getByPlaceholder(`Đáp án đúng tương ứng ${i}`)
            .fill(`UI Right ${i}`);
        }
      } else {
        await form.getByPlaceholder('Lựa chọn 1').fill(`UI ${type} A`);
        await form.getByPlaceholder('Lựa chọn 2').fill(`UI ${type} B`);
        if (type === 'MULTIPLE_CHOICE')
          await form.getByRole('checkbox').nth(1).check();
      }
      const posted = teacher.waitForResponse(
        (r) =>
          r.url() === api + '/questions' && r.request().method() === 'POST',
      );
      await form
        .getByRole('button', { name: 'Lưu câu hỏi', exact: true })
        .click();
      const response = await posted;
      assert.equal(response.status(), 201);
      questions.push(await response.json());
    }
    await teacher.goto(web + '/teacher/exams/new');
    await teacher
      .getByLabel('Tên đề thi', { exact: true })
      .fill(`P2 UI Exam ${suffix}`);
    await teacher.getByLabel('Thời lượng (phút)', { exact: true }).fill('30');
    for (const [i, q] of questions.entries()) {
      const item = teacher.locator('li').filter({ hasText: q.content });
      await item.getByRole('checkbox').check();
      await item
        .getByLabel('Điểm', { exact: true })
        .fill(String([2.5, 1.25, 3][i]));
    }
    const posted = teacher.waitForResponse(
      (r) => r.url() === api + '/exams' && r.request().method() === 'POST',
    );
    await teacher
      .getByRole('button', { name: 'Đưa câu 3 lên', exact: true })
      .click();
    await teacher
      .getByRole('button', { name: 'Đưa câu 2 lên', exact: true })
      .click();
    await teacher.getByText('Tổng điểm: 6.75', { exact: true }).waitFor();
    await teacher
      .getByRole('button', { name: 'Lưu bản nháp', exact: true })
      .click();
    const exam = await (await posted).json();
    await teacher.waitForURL(`**/teacher/exams/${exam.id}`);
    const published = teacher.waitForResponse(
      (r) => r.url().endsWith('/publish') && r.request().method() === 'POST',
    );
    await teacher
      .getByRole('button', { name: 'Xuất bản', exact: true })
      .click();
    const v1response = await published;
    assert.equal(v1response.status(), 201);
    const v1 = await v1response.json();
    assert.deepEqual(
      v1.snapshot.questions.map((q) => q.questionId),
      [questions[2].id, questions[0].id, questions[1].id],
    );
    const newVersion = teacher.waitForResponse((r) =>
      r.url().endsWith('/new-version'),
    );
    await teacher
      .getByRole('button', { name: 'Tạo phiên bản mới', exact: true })
      .click();
    await newVersion;
    await teacher.goto(`${web}/teacher/exams/${exam.id}/edit`);
    await teacher.getByLabel('Điểm câu 1', { exact: true }).fill('9');
    await teacher.getByLabel('Thời lượng (phút)', { exact: true }).fill('5');
    await teacher
      .getByRole('button', { name: 'Lưu bản nháp', exact: true })
      .click();
    await teacher.waitForURL(`**/teacher/exams/${exam.id}`);
    const published2 = teacher.waitForResponse((r) =>
      r.url().endsWith('/publish'),
    );
    await teacher
      .getByRole('button', { name: 'Xuất bản', exact: true })
      .click();
    const v2Response = await published2;
    assert.equal(v2Response.status(), 201);
    const v2 = await v2Response.json();
    assert.equal(v2.snapshot.questions[0].points, 9);
    assert.equal(v2.snapshot.durationMin, 5);
    await teacher
      .getByRole('button', { name: 'Giao bài', exact: true })
      .click();
    await teacher
      .getByRole('combobox', { name: /^Đề thi/ })
      .selectOption(exam.id);
    await teacher
      .getByLabel('Phiên bản đề thi', { exact: true })
      .selectOption(v1.id);
    await teacher.getByLabel('Lớp học').selectOption(actors.classes.A.id);
    await teacher
      .getByLabel('Công bố điểm sau khi nộp', { exact: true })
      .check();
    await teacher
      .getByLabel('Công bố đáp án sau khi nộp', { exact: true })
      .check();
    const assigned = teacher.waitForResponse(
      (r) =>
        r.url() === api + '/exam-assignments' &&
        r.request().method() === 'POST',
    );
    await teacher
      .getByRole('button', { name: 'Giao bài', exact: true })
      .click();
    assert.equal((await assigned).status(), 201);
    await login(student, actors.studentA);
    await student.goto(web + '/student/exams');
    const heading = student.getByRole('heading', {
      name: exam.title,
      exact: true,
    });
    const assignedCard = heading.locator('xpath=ancestor::article');
    await assignedCard.getByText(/30 phút/).waitFor();
    const started = student.waitForResponse(
      (r) => r.url().endsWith('/start') && r.request().method() === 'POST',
    );
    await assignedCard.getByRole('button', { name: /Bắt đầu/ }).click();
    const attempt = await (await started).json();
    assert.equal(attempt.version, 1);
    assert(!JSON.stringify(attempt.snapshot).includes('isCorrect'));
    await student.waitForURL(`**/student/attempts/${attempt.id}`);
    await saved(student);
    await student.getByLabel('UI SINGLE_CHOICE A', { exact: true }).check();
    await saved(student);
    await student.getByLabel('UI MULTIPLE_CHOICE A', { exact: true }).check();
    await student.getByLabel('UI MULTIPLE_CHOICE B', { exact: true }).check();
    await saved(student);
    // Fully pair incorrectly, then repair on desktop before confirming/reloading.
    const matching = questions.find((q) => q.type === 'MATCHING');
    const safeMatch = attempt.snapshot.questions.find(
      (q) => q.questionId === matching.id,
    );
    for (const [i, pair] of matching.matchingPairs.entries()) {
      const wrong = matching.matchingPairs[1 - i];
      await student
        .getByLabel(`Ghép ${pair.leftText}`, { exact: true })
        .selectOption(
          safeMatch.matchingOptions.find((o) => o.rightText === wrong.rightText)
            .id,
        );
      await saved(student);
    }
    for (const pair of matching.matchingPairs) {
      const safe = attempt.snapshot.questions.find(
        (q) => q.questionId === matching.id,
      );
      const right = safe.matchingOptions.find(
        (option) => option.rightText === pair.rightText,
      );
      await student
        .getByLabel(`Ghép ${pair.leftText}`, { exact: true })
        .selectOption(right.id);
      await saved(student);
    }
    const reviewSaved = student.waitForResponse(
      (r) => r.url().includes('/review/') && r.request().method() === 'PUT',
    );
    await student
      .getByRole('button', { name: 'Đánh dấu xem lại', exact: true })
      .first()
      .click();
    await reviewSaved;
    await student.getByRole('button', { name: 'Câu sau', exact: true }).click();
    await student.getByRole('button', { name: /Đến câu 1:/ }).click();
    await student.reload();
    await saved(student);
    assert(
      await student
        .getByLabel('UI SINGLE_CHOICE A', { exact: true })
        .isChecked(),
    );
    assert.equal((await answers(attempt.id)).length, 3);
    await student
      .getByRole('button', { name: 'Bỏ đánh dấu xem lại', exact: true })
      .waitFor();
    const persisted = (
      await db.query(
        'SELECT "deadlineAt" AT TIME ZONE \'UTC\' AS "deadlineAt","reviewQuestionIds","examVersionId" FROM "ExamAttempt" WHERE id=$1',
        [attempt.id],
      )
    ).rows[0];
    assert.equal(persisted.examVersionId, v1.id);
    assert.equal(persisted.deadlineAt.toISOString(), attempt.deadlineAt);
    assert.deepEqual(persisted.reviewQuestionIds, [matching.id]);
    student.once('dialog', (dialog) => dialog.accept());
    await student.getByRole('button', { name: 'Nộp bài', exact: true }).click();
    await student
      .getByRole('button', { name: 'Xác nhận nộp bài', exact: true })
      .click();
    await student.waitForURL(`**/student/results/${attempt.id}`);
    await student.getByText('6.75 / 6.75', { exact: false }).waitFor();
    const stored = (
      await db.query(
        'SELECT status,score,"maxScore" FROM "ExamAttempt" WHERE id=$1',
        [attempt.id],
      )
    ).rows[0];
    assert.deepEqual(stored, {
      status: 'SUBMITTED',
      score: '6.75',
      maxScore: '6.75',
    });
    await teacher.goto(`${web}/teacher/exams/${exam.id}/results`);
    const resultRow = teacher
      .locator('tr')
      .filter({ hasText: actors.studentA.fullName });
    await resultRow.getByText('6.75 / 6.75', { exact: true }).waitFor();
    await resultRow
      .getByRole('link', { name: 'Chi tiết', exact: true })
      .click();
    await teacher.waitForURL(`**/teacher/results/${attempt.id}`);
    await admin.goto(web + '/dashboard/admin');
    await admin
      .getByRole('link', { name: 'Theo dõi bài thi', exact: true })
      .click();
    const examHeading = admin.getByRole('heading', {
      name: exam.title,
      exact: true,
    });
    await examHeading
      .locator('xpath=ancestor::tr')
      .getByRole('link', { name: 'Theo dõi kết quả', exact: true })
      .click();
    await admin
      .locator('tr')
      .filter({ hasText: actors.studentA.fullName })
      .getByText('6.75 / 6.75', { exact: true })
      .waitFor();
    fs.writeFileSync(
      path.join(
        fs.mkdtempSync(path.join(os.tmpdir(), 'examspace-ui-combined-')),
        'final-e2e.json',
      ),
      JSON.stringify(
        {
          examId: exam.id,
          versionId: v1.id,
          attemptId: attempt.id,
          version: attempt.version,
          questionOrder: v1.snapshot.questions.map((q) => q.questionId),
          reviewQuestionIds: persisted.reviewQuestionIds,
          deadlineAt: attempt.deadlineAt,
          ...stored,
          uiSteps: 25,
          result: 'PASS',
        },
        null,
        2,
      ),
    );
  } finally {
    await tc.close();
    await sc.close();
    await ac.close();
  }
});

test('NT05: moving the browser clock backwards cannot save past the server deadline', async () => {
  const { login: apiLogin } = require('./p0-support.cjs');
  await apiLogin(f.studentA);
  await apiLogin(f.teacherA);
  const x = await workspace();
  try {
    await x.page.evaluate(() => {
      const real = Date.now.bind(Date);
      Date.now = () => real() - 7200000;
    });
    await db.query(
      'UPDATE "ExamAttempt" SET "deadlineAt"=now()-interval \'1 second\' WHERE id=$1',
      [x.attempt.id],
    );
    const response = x.page.waitForResponse(
      (r) =>
        r.url().includes(`/exam-attempts/${x.attempt.id}/answers/`) &&
        r.request().method() === 'PUT',
    );
    await select(x.page, x.attempt.snapshot.questions[0], 0);
    const rejectedSave = await response;
    if (rejectedSave.status() === 200) {
      assert.deepEqual(await rejectedSave.json(), {
        saved: false,
        status: 'EXPIRED',
      });
    } else {
      // The periodic scheduler may have committed EXPIRED before this request.
      assert.equal(rejectedSave.status(), 409);
    }
    assert.equal((await answers(x.attempt.id)).length, 0);
    assert.equal(
      (
        await db.query('SELECT status FROM "ExamAttempt" WHERE id=$1', [
          x.attempt.id,
        ])
      ).rows[0].status,
      'EXPIRED',
    );
  } finally {
    await x.context.close();
  }
});

test('NT02 SSR boundary: dashboard without access cookie redirects; it does not rotate in a server component', async () => {
  const { login: apiLogin } = require('./p0-support.cjs');
  await apiLogin(f.studentA);
  const c = await contextFor(f.studentA);
  try {
    await c.clearCookies({ name: 'access_token' });
    const page = await c.newPage();
    let refreshed = false;
    page.on('request', (r) => {
      if (r.url().endsWith('/auth/refresh')) refreshed = true;
    });
    await page.goto(web + '/dashboard/student');
    await page.waitForURL('**/login');
    assert.equal(refreshed, false);
    assert.equal(new URL(page.url()).search, '');
  } finally {
    await c.close();
  }
});
