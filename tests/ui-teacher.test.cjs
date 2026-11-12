const { test, before, beforeEach, after } = require('node:test');
const { createRequire } = require('node:module');
const path = require('node:path'),
  fs = require('node:fs'),
  os = require('node:os');
const {
  assert,
  api,
  web,
  db,
  fixtures,
  call,
  login,
  assignment,
  start,
  suffix,
  waitUntil,
} = require('./p0-support.cjs');
const req = createRequire(path.resolve(__dirname, '../apps/web/package.json'));
const { chromium } = req('playwright');
const evidence =
  process.env.UI06_EVIDENCE_DIR ||
  fs.mkdtempSync(path.join(os.tmpdir(), 'examspace-ui06-browser-'));
fs.mkdirSync(evidence, { recursive: true });
const checks = [];
let f, browser;
before(async () => {
  f = await fixtures();
  browser = await chromium.launch({
    channel: process.env.P0_BROWSER_CHANNEL || 'msedge',
    headless: true,
  });
});
beforeEach(async () => {
  for (const actor of [f.admin, f.teacherA, f.teacherB, f.studentA, f.studentB])
    await login(actor);
});
after(async () => {
  fs.writeFileSync(
    path.join(evidence, 'checks.json'),
    JSON.stringify(checks, null, 2),
  );
  await browser?.close();
  await db.end();
});
async function context(actor = f.teacherA, width = 1440) {
  const c = await browser.newContext({ viewport: { width, height: 1000 } });
  await c.addCookies(
    Object.entries(actor.cookies).map(([name, value]) => ({
      name,
      value,
      url: api,
      httpOnly: true,
      sameSite: 'Lax',
    })),
  );
  const page = await c.newPage();
  page.setDefaultTimeout(10000);
  return { c, page };
}
const response = (page, method, endpoint) =>
  page.waitForResponse(
    (r) => r.url().endsWith(endpoint) && r.request().method() === method,
  );
const bankrow = (page, text) =>
  page.locator('article.teacher-question-row').filter({ hasText: text });
async function searchBank(page, text) {
  await page.getByPlaceholder('Tìm kiếm...', { exact: true }).fill(text);
  await page.waitForLoadState('networkidle');
}
async function axe(page) {
  await page.addScriptTag({ path: req.resolve('axe-core/axe.min.js') });
  return page.evaluate(async () =>
    (
      await window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
      })
    ).violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  );
}

test('UI06-01: real Teacher greeting/totals and quick actions', async () => {
  const { c, page } = await context();
  try {
    await page.goto(web + '/dashboard/teacher');
    await page
      .getByRole('heading', { name: 'Xin chào, ' + f.teacherA.fullName })
      .waitFor();
    const stats = page.getByRole('region', { name: 'Tổng quan giảng dạy' });
    await waitUntil(async () => !(await stats.innerText()).includes('…'));
    const q = (await call(f.teacherA, 'GET', '/questions', undefined, 200))
      .data;
    assert.equal(
      Number(
        await stats
          .locator('.admin-stat')
          .nth(1)
          .locator(':scope > strong')
          .textContent(),
      ),
      q.total,
    );
    await page.getByRole('link', { name: /Soạn đề thi mới/ }).click();
    await page.waitForURL('**/teacher/exams/new');
    await page
      .getByRole('heading', { name: 'Tạo đề thi', exact: true })
      .waitFor();
    checks.push({ case: 'dashboard', apiTotals: true });
  } finally {
    await c.close();
  }
});

test('UI06-02: three question types create/edit/explanation/preview/duplicate/archive via UI and SQL', async () => {
  const { c, page } = await context();
  try {
    for (const type of ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'MATCHING']) {
      await page.goto(web + '/teacher/questions');
      const form = page.locator('form').first(),
        text = 'UI06 ' + type + ' ' + suffix;
      await form.getByPlaceholder('Nội dung câu hỏi').fill(text);
      await form.getByLabel('Loại câu hỏi', { exact: true }).selectOption(type);
      await form
        .getByLabel('Giải thích đáp án', { exact: true })
        .fill('UI06 explanation ' + type);
      if (type === 'MATCHING') {
        for (let i = 1; i <= 2; i++) {
          await form
            .getByPlaceholder('Nội dung cần ghép ' + i)
            .fill('Left ' + i);
          await form
            .getByPlaceholder('Đáp án đúng tương ứng ' + i)
            .fill('Right ' + i);
        }
      } else {
        await form.getByPlaceholder('Lựa chọn 1').fill('Yes');
        await form.getByPlaceholder('Lựa chọn 2').fill('No');
        if (type === 'MULTIPLE_CHOICE')
          await form.getByRole('checkbox').nth(1).check();
      }
      const posted = response(page, 'POST', '/questions');
      await form
        .getByRole('button', { name: 'Lưu câu hỏi', exact: true })
        .click();
      const p = await posted;
      assert.equal(p.status(), 201);
      const created = await p.json();
      await searchBank(page, text);
      await bankrow(page, text)
        .getByRole('button', { name: 'Xem chi tiết', exact: true })
        .click();
      const panel = page.locator('[aria-label="Chi tiết quản lý"]');
      await panel.getByText('Giải thích: UI06 explanation ' + type).waitFor();
      await panel
        .getByRole('button', { name: 'Chỉnh sửa', exact: true })
        .click();
      await panel.getByPlaceholder('Nội dung câu hỏi').fill(text + ' edited');
      const patch = response(page, 'PATCH', '/questions/' + created.id);
      await panel
        .getByRole('button', { name: 'Lưu câu hỏi', exact: true })
        .click();
      assert.equal((await patch).status(), 200);
      await searchBank(page, text + ' edited');
      const copied = response(
        page,
        'POST',
        '/questions/' + created.id + '/duplicate',
      );
      await bankrow(page, text + ' edited')
        .getByRole('button', { name: 'Nhân bản', exact: true })
        .click();
      const copy = await (await copied).json();
      await waitUntil(
        async () => (await bankrow(page, text + ' edited').count()) === 2,
      );
      const last = bankrow(page, text + ' edited')
        .filter({
          has: page.getByRole('button', { name: 'Lưu trữ', exact: true }),
        })
        .first();
      await last.getByRole('button', { name: 'Lưu trữ', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Lưu trữ câu hỏi?' });
      await dialog.getByRole('button', { name: 'Hủy bỏ' }).waitFor();
      await page.keyboard.press('Escape');
      assert.equal(await dialog.count(), 0);
      await last.getByRole('button', { name: 'Lưu trữ', exact: true }).click();
      const deleted = page.waitForResponse(
        (r) =>
          r.request().method() === 'DELETE' && r.url().includes('/questions/'),
      );
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Lưu trữ câu hỏi', exact: true })
        .click();
      assert.equal((await deleted).status(), 200);
      assert(
        (
          await db.query('SELECT "archivedAt" FROM "Question" WHERE id=$1', [
            copy.id,
          ])
        ).rows[0].archivedAt,
      );
    }
  } finally {
    await c.close();
  }
});

test('UI06-03: question search/filter 24 records paginate 20/4, loading, empty and network retry', async () => {
  const prefix = 'UI06 paging ' + suffix;
  for (let i = 0; i < 24; i++)
    await call(
      f.teacherA,
      'POST',
      '/questions',
      {
        type: 'SINGLE_CHOICE',
        content: prefix + ' ' + i,
        topic: 'UI06paging',
        options: [
          { content: 'Yes', isCorrect: true },
          { content: 'No', isCorrect: false },
        ],
      },
      201,
    );
  const { c, page } = await context();
  let release;
  try {
    await page.goto(web + '/teacher/questions');
    await searchBank(page, prefix);
    await waitUntil(
      async () =>
        (await page.locator('article.teacher-question-row').count()) === 20,
    );
    let held = false;
    const gate = new Promise((r) => (release = r));
    await page.route('**/questions?**', async (route) => {
      if (new URL(route.request().url()).searchParams.get('page') === '2') {
        held = true;
        await gate;
      }
      await route.continue();
    });
    await page.getByRole('button', { name: 'Trang sau', exact: true }).click();
    await waitUntil(() => held);
    await page.getByText('Đang tải câu hỏi...', { exact: true }).waitFor();
    release();
    await waitUntil(
      async () =>
        (await page.locator('article.teacher-question-row').count()) === 4,
    );
    await page.unroute('**/questions?**');
    await page.getByLabel('Lọc loại câu hỏi').selectOption('MATCHING');
    await page
      .getByRole('heading', { name: 'Chưa có câu hỏi.', exact: true })
      .waitFor();
    await page.getByLabel('Lọc loại câu hỏi').selectOption('');
    let failed = false;
    await page.route('**/questions?**', async (route) => {
      failed = true;
      await route.abort('failed');
    });
    await searchBank(page, prefix + ' absent');
    await waitUntil(() => failed);
    await page.locator('.admin-error').waitFor({ timeout: 15000 });
    await page.unroute('**/questions?**');
    await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await page
      .getByRole('heading', { name: 'Chưa có câu hỏi.', exact: true })
      .waitFor();
    checks.push({
      case: 'paging',
      pages: [20, 4],
      loading: true,
      errorRetry: true,
    });
  } finally {
    release?.();
    await c.close();
  }
});

test('UI06-04: Teacher class edit/member removal and reassignment hide cached roster', async () => {
  const { c, page } = await context();
  try {
    await page.goto(web + '/teacher/classes');
    await page
      .getByRole('button', { name: new RegExp(f.classes.A.name) })
      .click();
    const panel = page.locator('[aria-label="Chi tiết quản lý"]');
    await panel.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
    assert.equal(
      await panel.getByLabel('Giảng viên phụ trách', { exact: true }).count(),
      0,
    );
    await panel
      .getByLabel('Mô tả lớp', { exact: true })
      .fill('UI06 class description');
    const patch = response(page, 'PATCH', '/classes/' + f.classes.A.id);
    await panel
      .getByRole('button', { name: 'Lưu thay đổi', exact: true })
      .click();
    assert.equal((await patch).status(), 200);
    await page
      .getByRole('region', { name: 'Thành viên lớp', exact: true })
      .getByRole('button', { name: 'Xóa', exact: true })
      .click();
    const d = page.getByRole('dialog', { name: 'Xóa học viên khỏi lớp?' });
    await d.getByRole('button', { name: 'Hủy bỏ' }).click();
    const roster = page.getByRole('region', {
      name: 'Thành viên lớp',
      exact: true,
    });
    await roster.getByRole('button', { name: 'Xóa', exact: true }).click();
    const removed = response(
      page,
      'DELETE',
      '/classes/' + f.classes.A.id + '/students/' + f.studentA.id,
    );
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Xóa học viên', exact: true })
      .click();
    assert.equal((await removed).status(), 200);
    await page
      .getByRole('dialog', { name: 'Xóa học viên khỏi lớp?' })
      .waitFor({ state: 'hidden' });
    assert.equal(
      (
        await db.query(
          'SELECT count(*) FROM "ClassMember" WHERE "classId"=$1 AND "studentId"=$2',
          [f.classes.A.id, f.studentA.id],
        )
      ).rows[0].count,
      '0',
    );
    await page
      .getByPlaceholder('ID học viên', { exact: true })
      .fill(f.studentA.id);
    const validity = await page
      .getByPlaceholder('ID học viên', { exact: true })
      .evaluate((input) => ({
        valid: input.form.checkValidity(),
        invalid: [...input.form.elements]
          .filter((e) => e.willValidate && !e.checkValidity())
          .map((e) => ({
            tag: e.tagName,
            type: e.type,
            message: e.validationMessage,
            pattern: e.pattern,
          })),
      }));
    fs.writeFileSync(
      path.join(evidence, 'member-add-validity.json'),
      JSON.stringify(validity),
    );
    assert(validity.valid, JSON.stringify(validity));
    const added = response(
      page,
      'POST',
      '/classes/' + f.classes.A.id + '/students',
    );
    await page.getByRole('button', { name: 'Thêm', exact: true }).click();
    assert.equal((await added).status(), 201);
    await roster.getByText(f.studentA.email, { exact: true }).waitFor();

    await call(
      f.admin,
      'PATCH',
      '/classes/' + f.classes.A.id,
      { teacherId: f.teacherB.id },
      200,
    );
    await page.evaluate(() =>
      window.dispatchEvent(new Event('visibilitychange')),
    );
    await page.reload();
    await page
      .getByRole('heading', { name: 'Chưa có lớp học.', exact: true })
      .waitFor();
    assert(
      !(await page.locator('main').innerText()).includes(f.studentA.email),
    );
    await call(f.teacherA, 'GET', '/classes/' + f.classes.A.id, undefined, 403);
  } finally {
    await call(
      f.admin,
      'PATCH',
      '/classes/' + f.classes.A.id,
      { teacherId: f.teacherA.id },
      200,
    );
    if (
      (
        await db.query(
          'SELECT count(*) FROM "ClassMember" WHERE "classId"=$1 AND "studentId"=$2',
          [f.classes.A.id, f.studentA.id],
        )
      ).rows[0].count === '0'
    )
      await call(
        f.admin,
        'POST',
        '/classes/' + f.classes.A.id + '/students',
        { studentId: f.studentA.id },
        201,
      );
    await c.close();
  }
});

test('UI06-05: empty draft rejected locally; reordered cents persist, publish v1/v2 and pin v1 assignment', async () => {
  const { c, page } = await context();
  try {
    await page.goto(web + '/teacher/exams/new');
    await page
      .getByLabel('Tên đề thi', { exact: true })
      .fill('UI06 editor ' + suffix);
    await page
      .getByRole('button', { name: 'Lưu bản nháp', exact: true })
      .click();
    await page
      .getByRole('alert')
      .filter({ hasText: 'Chọn từ 1 đến 200' })
      .waitFor();
    await page.getByLabel('Tìm câu hỏi để chọn', { exact: true }).fill('P0 ');
    for (const [i, q] of f.questions.entries()) {
      const li = page.locator('li').filter({ hasText: q.content });
      await li.getByRole('checkbox').check();
      await li
        .getByLabel('Điểm', { exact: true })
        .fill(String([2.5, 1.25, 3][i]));
    }
    await page
      .getByRole('button', { name: 'Đưa câu 3 lên', exact: true })
      .click();
    await page.getByText('Tổng điểm: 6.75', { exact: true }).waitFor();
    const post = response(page, 'POST', '/exams');
    await page
      .getByRole('button', { name: 'Lưu bản nháp', exact: true })
      .click();
    const exam = await (await post).json();
    await page.waitForURL('**/teacher/exams/' + exam.id);
    let pub = response(page, 'POST', '/exams/' + exam.id + '/publish');
    await page.getByRole('button', { name: 'Xuất bản', exact: true }).click();
    const v1 = await (await pub).json();
    assert.deepEqual(
      v1.snapshot.questions.map((q) => q.questionId),
      [f.questions[0].id, f.questions[2].id, f.questions[1].id],
    );
    const frozen = (
      await db.query('SELECT snapshot FROM "ExamVersion" WHERE id=$1', [v1.id])
    ).rows[0].snapshot;
    await page
      .getByRole('button', { name: 'Tạo phiên bản mới', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Chỉnh sửa', exact: true })
      .waitFor();
    await page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
    await page
      .getByLabel('Tên đề thi', { exact: true })
      .fill('UI06 v2 ' + suffix);
    await page.getByLabel('Thời lượng (phút)', { exact: true }).fill('5');
    await page.getByLabel('Điểm câu 1', { exact: true }).fill('9');
    const saved = response(page, 'PATCH', '/exams/' + exam.id);
    await page
      .getByRole('button', { name: 'Lưu bản nháp', exact: true })
      .click();
    assert.equal((await saved).status(), 200);
    await page.waitForURL('**/teacher/exams/' + exam.id);
    pub = response(page, 'POST', '/exams/' + exam.id + '/publish');
    await page.getByRole('button', { name: 'Xuất bản', exact: true }).click();
    const v2 = await (await pub).json();
    assert.equal(v2.number, 2);
    assert.deepEqual(
      (
        await db.query('SELECT snapshot FROM "ExamVersion" WHERE id=$1', [
          v1.id,
        ])
      ).rows[0].snapshot,
      frozen,
    );
    await page.goto(web + '/teacher/assignments');
    await page.getByRole('combobox', { name: /^Đề thi/ }).selectOption(exam.id);
    await page
      .getByLabel('Phiên bản đề thi', { exact: true })
      .selectOption(v1.id);
    await page
      .getByLabel('Lớp học', { exact: true })
      .selectOption(f.classes.A.id);
    const as = response(page, 'POST', '/exam-assignments');
    await page.getByRole('button', { name: 'Giao bài', exact: true }).click();
    const asg = await (await as).json();
    assert.equal(asg.examVersion.id, v1.id);
    assert.equal(asg.exam.title, 'UI06 editor ' + suffix);
    const attempt = await start(f, asg);
    assert.equal(attempt.snapshot.durationMin, 30);
    assert.equal(attempt.snapshot.title, 'UI06 editor ' + suffix);
    await call(
      f.studentA,
      'POST',
      '/exam-attempts/' + attempt.id + '/submit',
      undefined,
      201,
    );
    checks.push({ case: 'versions', v1Frozen: true, v1Pinned: true });
  } finally {
    await c.close();
  }
});

test('UI06-06: schedule form surfaces true 409 with no SQL schedule change and roster scopes', async () => {
  const asg = await assignment(f, {
    opensAt: new Date(Date.now() - 60000).toISOString(),
  });
  const active = await start(f, asg);
  const { c, page } = await context();
  try {
    await page.goto(web + '/teacher/assignments');
    await page.getByLabel('Tìm kiếm', { exact: true }).fill(f.exam.title);
    const card = page.locator('[data-assignment-id="' + asg.id + '"]');
    await card
      .getByRole('button', { name: 'Chỉnh lịch / công bố', exact: true })
      .click();
    // Policy-only edits must preserve original schedule seconds/milliseconds.
    await card.getByLabel('Công bố điểm', { exact: true }).uncheck();
    const policy = response(page, 'PATCH', '/exam-assignments/' + asg.id);
    await card.getByRole('button', { name: 'Lưu lịch', exact: true }).click();
    assert.equal((await policy).status(), 200);
    assert.equal(
      Number(
        (
          await db.query(
            'SELECT extract(epoch from "opensAt")*1000 AS milliseconds FROM "ExamAssignment" WHERE id=$1',
            [asg.id],
          )
        ).rows[0].milliseconds,
      ),
      new Date(asg.opensAt).getTime(),
    );
    await card
      .getByRole('button', { name: 'Chỉnh lịch / công bố', exact: true })
      .click();
    await card
      .getByLabel('Đóng bài mới', { exact: true })
      .fill('2026-12-31T23:00');
    const patch = response(page, 'PATCH', '/exam-assignments/' + asg.id);
    await card.getByRole('button', { name: 'Lưu lịch', exact: true }).click();
    assert.equal((await patch).status(), 409);
    await card.locator('.admin-error').waitFor();
    assert.equal(
      (
        await db.query('SELECT "closesAt" FROM "ExamAssignment" WHERE id=$1', [
          asg.id,
        ])
      ).rows[0].closesAt,
      null,
    );
    await card.getByRole('button', { name: 'Học viên', exact: true }).click();
    await card.getByText(f.studentA.email, { exact: true }).waitFor();
    await call(
      f.studentA,
      'POST',
      '/exam-attempts/' + active.id + '/submit',
      undefined,
      201,
    );
    const saved = response(page, 'PATCH', '/exam-assignments/' + asg.id);
    await card.getByRole('button', { name: 'Lưu lịch', exact: true }).click();
    assert.equal((await saved).status(), 200);
    assert(
      (
        await db.query('SELECT "closesAt" FROM "ExamAssignment" WHERE id=$1', [
          asg.id,
        ])
      ).rows[0].closesAt,
    );
  } finally {
    await c.close();
  }
});

test('UI06-07: foreign exam/detail denied and Admin/Student Teacher routes redirect', async () => {
  const { c, page } = await context(f.teacherB);
  try {
    await page.goto(web + '/teacher/exams/' + f.exam.id + '/edit');
    await page.getByRole('alert').waitFor();
    assert(
      !(await page.locator('main').innerText()).includes(
        f.questions[0].content,
      ),
    );
  } finally {
    await c.close();
  }
  for (const actor of [f.admin, f.studentA]) {
    const x = await context(actor);
    try {
      await x.page.goto(web + '/teacher/questions');
      await x.page.waitForURL('**/dashboard/' + actor.role.toLowerCase());
      assert.equal(
        await x.page
          .getByRole('heading', { name: 'Ngân hàng câu hỏi', exact: true })
          .count(),
        0,
      );
    } finally {
      await x.c.close();
    }
  }
});

test('UI06-08: all Teacher screens reflow and axe at four widths, dark mode, keyboard drawer and focus', async () => {
  const { c, page } = await context();
  try {
    const routes = [
      '/dashboard/teacher',
      '/teacher/classes',
      '/teacher/questions',
      '/teacher/exams',
      '/teacher/exams/new',
      '/teacher/exams/' + f.exam.id,
      '/teacher/assignments',
    ];
    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of routes) {
        await page.goto(web + route);
        await page.getByRole('heading').first().waitFor();
        await page.waitForLoadState('networkidle');
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          'Teacher document overflow: ' + route + ' ' + width,
        );
        const violations = await axe(page);
        assert.deepEqual(violations, [], route + ' ' + width);
        for (const link of await page.locator('a.admin-primary-link').all())
          assert(
            await link.evaluate(
              (el) =>
                getComputedStyle(el).color !==
                getComputedStyle(el).backgroundColor,
            ),
            'Primary CTA text must contrast with its background',
          );
        const file = route.replaceAll('/', '-') + '-' + width + '.png';
        await page.screenshot({
          path: path.join(evidence, file),
          fullPage: true,
        });
        checks.push({ route, width, axe: 0, overflow: false, file });
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(web + '/dashboard/teacher');
    const menu = page.getByRole('button', { name: 'Mở menu', exact: true });
    await menu.focus();
    await page.keyboard.press('Enter');
    await page.getByRole('dialog', { name: 'Điều hướng giảng dạy' }).waitFor();
    assert.equal(
      await page.locator(':focus').getAttribute('aria-label'),
      'Đóng menu',
    );
    await page.keyboard.press('Escape');
    assert(await menu.evaluate((el) => el === document.activeElement));
    await page.getByRole('button', { name: 'Đổi giao diện sáng tối' }).click();
    await page.goto(web + '/teacher/questions');
    await page.waitForLoadState('networkidle');
    assert.deepEqual(await axe(page), []);
    await page.screenshot({
      path: path.join(evidence, 'questions-dark-390.png'),
      fullPage: true,
    });
  } finally {
    await c.close();
  }
});
