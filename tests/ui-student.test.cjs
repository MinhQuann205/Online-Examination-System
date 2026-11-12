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
  call,
  login,
  password,
  assignment,
  start,
  waitUntil,
} = require('./p0-support.cjs');
const {
  studentFixtures,
  named,
  completed,
} = require('./ui-student-support.cjs');
const req = createRequire(path.resolve(__dirname, '../apps/web/package.json'));
const { chromium } = req('playwright');
const evidence = fs.mkdtempSync(
    path.join(os.tmpdir(), 'examspace-ui07-browser-'),
  ),
  checks = [];
let f, browser;
before(async () => {
  f = await studentFixtures();
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
async function context(actor = f.studentA, width = 1440) {
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
const card = (page, id) => page.locator('[data-assignment-id="' + id + '"]');
async function search(page, text) {
  await page.getByLabel('Tìm kiếm', { exact: true }).fill(text);
  await page.waitForLoadState('networkidle');
}
function gate() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
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

test('UI07-01: Student identity, exact scoped totals and recent assignments', async () => {
  const { c, page } = await context();
  try {
    await page.goto(web + '/dashboard/student');
    await page
      .getByRole('heading', { name: 'Xin chào, ' + f.studentA.fullName })
      .waitFor();
    await page.waitForLoadState('networkidle');
    const stats = page.getByRole('region', { name: 'Tổng quan học tập' });
    for (const [i, url] of [
      '/classes',
      '/exam-assignments',
      '/results',
    ].entries()) {
      const data = (await call(f.studentA, 'GET', url, undefined, 200)).data;
      assert.equal(
        Number(
          await stats
            .locator('.admin-stat')
            .nth(i)
            .locator(':scope > strong')
            .textContent(),
        ),
        data.total,
      );
    }
    assert.equal(await page.locator('.student-recent li').count(), 3);
    assert.equal(
      await page.getByRole('link', { name: /Xem bài thi được giao/ }).count(),
      1,
    );
    assert.equal(await page.locator('[data-assignment-id]').count(), 0);
    assert(
      !(await page.locator('main').innerText()).match(
        /GPA|Xếp hạng|AI mastery/,
      ),
    );
    checks.push({ case: 'dashboard', realTotals: true });
  } finally {
    await c.close();
  }
});

test('UI07-02: read-only Classes, search/empty/detail and revoked membership hide cached details', async () => {
  const { c, page } = await context();
  try {
    await page.goto(web + '/student/classes');
    await page
      .getByRole('heading', { name: f.classes.A.name, exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByRole('heading', { name: f.classes.B.name, exact: true })
        .count(),
      0,
    );
    assert.equal(
      await page
        .getByRole('button', { name: /Thêm|Xóa|Chỉnh sửa|Phân công/ })
        .count(),
      0,
    );
    await page
      .getByRole('button', { name: 'Xem chi tiết', exact: true })
      .click();
    const detail = page.getByRole('region', { name: 'Chi tiết lớp học' });
    await detail.getByText(f.teacherA.email, { exact: true }).waitFor();
    assert(!(await detail.innerText()).includes(f.studentA.email));
    await call(
      f.admin,
      'DELETE',
      '/classes/' + f.classes.A.id + '/students/' + f.studentA.id,
      undefined,
      200,
    );
    await detail.getByRole('button', { name: 'Làm mới chi tiết' }).click();
    await detail.getByRole('alert').waitFor();
    assert(!(await detail.innerText()).includes(f.teacherA.email));
    await page.getByRole('button', { name: 'Làm mới', exact: true }).click();
    await page.getByText('Chưa có lớp học phù hợp.', { exact: true }).waitFor();
    await call(
      f.admin,
      'POST',
      '/classes/' + f.classes.A.id + '/students',
      { studentId: f.studentA.id },
      201,
    );
    await page.getByRole('button', { name: 'Làm mới', exact: true }).click();
    await page
      .getByRole('heading', { name: f.classes.A.name, exact: true })
      .waitFor();
    await search(page, 'no-such-class-ui07');
    await page.getByText('Chưa có lớp học phù hợp.', { exact: true }).waitFor();
    await search(page, f.classes.A.code);
    await page
      .getByRole('heading', { name: f.classes.A.name, exact: true })
      .waitFor();
    checks.push({ case: 'classes', membershipRevoked: true, readOnly: true });
  } finally {
    const row = await db.query(
      'SELECT id FROM "ClassMember" WHERE "classId"=$1 AND "studentId"=$2',
      [f.classes.A.id, f.studentA.id],
    );
    if (!row.rows.length)
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

test('UI07-03: >20 assignment search/paging, pending, network error and retry without cached rows', async () => {
  const { c, page } = await context(),
    hold = gate(),
    entered = gate();
  try {
    await page.goto(web + '/student/exams');
    await search(page, f.paging.exam.title);
    await page.getByText('24 bản ghi · Trang 1 / 2', { exact: true }).waitFor();
    assert.equal(await page.locator('[data-assignment-id]').count(), 20);
    await page.route(
      (url) =>
        url.origin === api &&
        url.pathname === '/exam-assignments' &&
        url.searchParams.get('page') === '2',
      async (r) => {
        entered.resolve();
        await hold.promise;
        await r.continue();
      },
      { times: 1 },
    );
    await page.getByRole('button', { name: 'Trang sau', exact: true }).click();
    await entered.promise;
    await page
      .getByRole('status')
      .filter({ hasText: 'Đang tải danh sách' })
      .waitFor();
    assert.equal(await page.locator('[data-assignment-id]').count(), 0);
    hold.resolve();
    await page.getByText('24 bản ghi · Trang 2 / 2', { exact: true }).waitFor();
    assert.equal(await page.locator('[data-assignment-id]').count(), 4);
    await page.route(
      (url) => url.origin === api && url.pathname === '/exam-assignments',
      (r) => r.abort('failed'),
    );
    await page.getByRole('button', { name: 'Làm mới', exact: true }).click();
    await page.locator('main').getByRole('alert').waitFor();
    assert.equal(await page.locator('[data-assignment-id]').count(), 0);
    await page.unrouteAll({ behavior: 'wait' });
    await page
      .locator('main')
      .getByRole('button', { name: 'Thử lại', exact: true })
      .click();
    await page.getByText('24 bản ghi · Trang 2 / 2', { exact: true }).waitFor();
    assert.equal(
      await page.getByLabel('Tìm kiếm', { exact: true }).inputValue(),
      f.paging.exam.title,
    );
    await search(page, 'nothing-matches-ui07');
    await page
      .getByText('Chưa có bài kiểm tra được giao.', { exact: true })
      .waitFor();
    checks.push({ case: 'paging', records: 24, staleRowsHidden: true });
  } finally {
    hold.resolve();
    await c.close();
  }
});

test('UI07-04: real future/open/closed/max/archived/legacy states and backend rejection after stale schedule', async () => {
  const archived = await named(f, 'Archived Browser');
  await call(
    f.teacherA,
    'POST',
    '/exams/' + archived.exam.id + '/archive',
    undefined,
    201,
  );
  const legacy = await named(f, 'Legacy Browser');
  await db.query(
    'UPDATE "ExamAssignment" SET "examVersionId"=NULL WHERE id=$1',
    [legacy.asg.id],
  );
  const { c, page } = await context();
  try {
    await page.goto(web + '/student/exams');
    for (const [record, label] of [
      [f.future, 'Chưa đến giờ'],
      [f.closed, 'Đã đóng'],
      [f.max, 'Đã hết lượt làm bài'],
      [archived, 'Không còn khả dụng'],
    ]) {
      await search(page, record.exam.title);
      await card(page, record.asg.id)
        .getByText(label, { exact: true })
        .waitFor();
      assert.equal(
        await card(page, record.asg.id)
          .getByRole('button', { name: 'Bắt đầu làm bài' })
          .count(),
        0,
      );
    }
    await search(page, '');
    await card(page, legacy.asg.id)
      .getByText('Không còn khả dụng', { exact: true })
      .waitFor();
    await search(page, f.open.exam.title);
    await card(page, f.open.asg.id)
      .getByText('Đang mở', { exact: true })
      .waitFor();
    await call(
      f.teacherA,
      'PATCH',
      '/exam-assignments/' + f.open.asg.id,
      { closesAt: new Date(Date.now() - 1000).toISOString() },
      200,
    );
    const denied = page.waitForResponse(
      (r) => r.url() === api + '/exam-assignments/' + f.open.asg.id + '/start',
    );
    await card(page, f.open.asg.id)
      .getByRole('button', { name: 'Bắt đầu làm bài' })
      .click();
    assert.equal((await denied).status(), 400);
    await page.locator('main').getByRole('alert').waitFor();
    assert(new URL(page.url()).pathname === '/student/exams');
    assert.equal(await card(page, f.open.asg.id).count(), 0);
    await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await card(page, f.open.asg.id)
      .getByText('Đã đóng', { exact: true })
      .waitFor();
    checks.push({ case: 'states', realServerRejection: true });
  } finally {
    await call(
      f.teacherA,
      'PATCH',
      '/exam-assignments/' + f.open.asg.id,
      { closesAt: null },
      200,
    );
    await c.close();
  }
});

test('UI07-05: start waits for real POST, double click creates one attempt; resume keeps ID/deadline', async () => {
  const p = await named(f, 'Start Browser');
  const { c, page } = await context(),
    hold = gate(),
    entered = gate();
  let requests = 0;
  try {
    await page.goto(web + '/student/exams');
    await search(page, p.exam.title);
    await page.route(
      api + '/exam-assignments/' + p.asg.id + '/start',
      async (r) => {
        requests++;
        entered.resolve();
        await hold.promise;
        await r.continue();
      },
    );
    await card(page, p.asg.id)
      .getByRole('button', { name: 'Bắt đầu làm bài', exact: true })
      .dblclick();
    await entered.promise;
    assert.equal(new URL(page.url()).pathname, '/student/exams');
    assert.equal(
      await card(page, p.asg.id)
        .getByRole('button', { name: 'Đang mở bài...' })
        .isDisabled(),
      true,
    );
    assert.equal(
      Number(
        (
          await db.query(
            'SELECT count(*) FROM "ExamAttempt" WHERE "assignmentId"=$1',
            [p.asg.id],
          )
        ).rows[0].count,
      ),
      0,
    );
    const posted = page.waitForResponse(
      (r) => r.url() === api + '/exam-assignments/' + p.asg.id + '/start',
    );
    hold.resolve();
    const response = await posted;
    assert.equal(response.status(), 201);
    const attempt = await response.json();
    await page.waitForURL('**/student/attempts/' + attempt.id);
    await page.getByText('Đã lưu trên máy chủ', { exact: true }).waitFor();
    assert.equal(requests, 1);
    assert.equal(await page.locator('.student-workspace').count(), 0);
    await page.goto(web + '/student/exams');
    await search(page, p.exam.title);
    const get = page.waitForResponse(
      (r) =>
        r.url() === api + '/exam-attempts/' + attempt.id &&
        r.request().method() === 'GET',
    );
    await card(page, p.asg.id)
      .getByRole('button', { name: 'Tiếp tục làm bài', exact: true })
      .click();
    const resumed = await (await get).json();
    assert.equal(resumed.id, attempt.id);
    assert.equal(resumed.deadlineAt, attempt.deadlineAt);
    await page.waitForURL('**/student/attempts/' + attempt.id);
    assert.equal(requests, 1);
    assert.equal(
      Number(
        (
          await db.query(
            'SELECT count(*) FROM "ExamAttempt" WHERE "assignmentId"=$1',
            [p.asg.id],
          )
        ).rows[0].count,
      ),
      1,
    );
    checks.push({
      case: 'start-resume',
      onePost: true,
      deadlineUnchanged: true,
    });
  } finally {
    hold.resolve();
    await c.close();
  }
});

test('UI07-06: resume after server expiry goes to completed result, never resets deadline', async () => {
  const p = await named(f, 'Resume Expired');
  const attempt = await start(f, p.asg);
  const { c, page } = await context();
  try {
    await page.goto(web + '/student/exams');
    await search(page, p.exam.title);
    await card(page, p.asg.id)
      .getByText('Có bài đang làm dở', { exact: true })
      .waitFor();
    await db.query(
      'UPDATE "ExamAttempt" SET "deadlineAt"=now()-make_interval(secs => 1) WHERE id=$1',
      [attempt.id],
    );
    await card(page, p.asg.id)
      .getByRole('button', { name: 'Tiếp tục làm bài' })
      .click();
    await page.waitForURL('**/student/results/' + attempt.id);
    await page
      .getByRole('heading', { name: p.exam.title, exact: true })
      .waitFor();
    assert.equal(
      (
        await db.query('SELECT status FROM "ExamAttempt" WHERE id=$1', [
          attempt.id,
        ])
      ).rows[0].status,
      'EXPIRED',
    );
    assert.equal(await page.locator('.student-workspace').count(), 1);
    assert.equal(
      await page
        .locator('nav a[href="/student/results"]')
        .getAttribute('aria-current'),
      'page',
    );
    checks.push({ case: 'expired-resume', serverFinalized: true });
  } finally {
    await c.close();
  }
});

test('UI07-07: v1 pinned after v2; result visibility, >20 history and detail stays existing', async () => {
  const p = await named(f, 'Pinned Browser v1');
  await call(
    f.teacherA,
    'POST',
    '/exams/' + p.exam.id + '/new-version',
    undefined,
    201,
  );
  await call(
    f.teacherA,
    'PATCH',
    '/exams/' + p.exam.id,
    {
      title: 'UI07 Browser mutable v2',
      durationMin: 5,
      questions: [{ questionId: f.questions[0].id, points: 9 }],
    },
    200,
  );
  await call(
    f.teacherA,
    'POST',
    '/exams/' + p.exam.id + '/publish',
    undefined,
    201,
  );
  const done = await completed(f, p.asg);
  const { c, page } = await context();
  try {
    await page.goto(web + '/student/exams');
    await search(page, p.exam.title);
    await card(page, p.asg.id)
      .getByRole('heading', { name: p.exam.title, exact: true })
      .waitFor();
    await card(page, p.asg.id)
      .getByText('Phiên bản 1', { exact: true })
      .waitFor();
    await card(page, p.asg.id).getByText('30 phút', { exact: true }).waitFor();
    await page.goto(web + '/student/results');
    await page
      .locator('[data-result-id="' + done.id + '"]')
      .getByRole('heading', { name: p.exam.title, exact: true })
      .waitFor();
    const hidden = page.locator(
        '[data-result-id="' + f.hidden.attempt.id + '"]',
      ),
      visible = page.locator('[data-result-id="' + f.visible.attempt.id + '"]');
    await hidden.getByText('Điểm chưa được công bố', { exact: true }).waitFor();
    assert.equal(
      await hidden.locator('.student-result-score strong').count(),
      0,
    );
    assert.equal(
      Number(
        await visible.locator('.student-result-score strong').textContent(),
      ),
      0,
    );
    assert((await visible.innerText()).includes('/ 6.75'));
    const requested = [];
    page.on('request', (r) => {
      if (r.url().startsWith(api + '/results/')) requested.push(r.url());
    });
    await page.waitForLoadState('networkidle');
    assert.equal(requested.length, 0);
    await hidden
      .getByRole('link', { name: 'Xem bài làm', exact: true })
      .click();
    await page.waitForURL('**/student/results/' + f.hidden.attempt.id);
    await page
      .getByRole('heading', { name: f.hidden.exam.title, exact: true })
      .waitFor();
    assert.equal(await page.locator('.student-workspace').count(), 1);
    assert.equal(
      await page
        .locator('nav a[href="/student/results"]')
        .getAttribute('aria-current'),
      'page',
    );
    assert(
      (await page.locator('main').innerText()).includes(
        'Điểm chưa được công bố',
      ),
    );
    for (const asg of f.paging.assignments) await completed(f, asg);
    await page.goto(web + '/student/results');
    await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('[data-result-id]').count(), 20);
    await page.getByRole('button', { name: 'Trang sau', exact: true }).click();
    await page
      .locator('[aria-label="Phân trang"]')
      .getByText(/Trang 2/)
      .waitFor();
    await page.locator('[data-result-id]').first().waitFor();
    assert((await page.locator('[data-result-id]').count()) > 0);
    assert(
      (await page.locator('[aria-label="Phân trang"]').innerText()).includes(
        'Trang 2',
      ),
    );
    checks.push({
      case: 'history',
      pinnedMetadata: true,
      hiddenNull: true,
      paged: true,
    });
  } finally {
    await c.close();
  }
});

test('UI07-08: role/IDOR denial, cached results errors and unknown identity hide private data', async () => {
  for (const actor of [f.admin, f.teacherA]) {
    const { c, page } = await context(actor);
    let starts = 0;
    page.on('request', (r) => {
      if (r.method() === 'POST' && r.url().endsWith('/start')) starts++;
    });
    try {
      for (const route of [
        '/student/classes',
        '/student/exams',
        '/student/results',
        '/dashboard/student',
      ]) {
        await page.goto(web + route);
        await page.waitForURL('**/dashboard/' + actor.role.toLowerCase());
        assert.equal(await page.locator('.student-workspace').count(), 0);
      }
      assert.equal(starts, 0);
    } finally {
      await c.close();
    }
  }
  const b = await context(f.studentB);
  try {
    for (const [url, isolatedWorkspace] of [
      ['/student/attempts/' + f.visible.attempt.id, true],
      ['/student/results/' + f.visible.attempt.id, false],
    ]) {
      await b.page.goto(web + url);
      if (isolatedWorkspace) {
        await b.page.locator('main[role="alert"]').waitFor();
        assert.equal(await b.page.locator('.student-workspace').count(), 0);
      } else {
        await b.page.locator('.results-error-box[role="alert"]').waitFor();
        assert.equal(await b.page.locator('.student-workspace').count(), 1);
        assert.equal(
          await b.page
            .locator('nav a[href="/student/results"]')
            .getAttribute('aria-current'),
          'page',
        );
      }
      assert(
        !(await b.page.locator('main').innerText()).includes(
          f.visible.exam.title,
        ),
      );
    }
  } finally {
    await b.c.close();
  }
  const { c, page } = await context();
  try {
    await page.goto(web + '/student/results');
    await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('[data-result-id]').count(), 20);
    await page.route(
      (url) => url.origin === api && url.pathname === '/results',
      (r) => r.abort('failed'),
    );
    await page.getByRole('button', { name: 'Làm mới', exact: true }).click();
    await page.locator('main').getByRole('alert').waitFor();
    assert.equal(await page.locator('[data-result-id]').count(), 0);
    await page.unrouteAll({ behavior: 'wait' });
    await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await page.locator('[data-result-id]').first().waitFor();
    await page.route(api + '/auth/me', (r) => r.abort('failed'));
    await page.getByRole('link', { name: 'Trang chủ', exact: true }).click();
    await page.waitForURL(web + '/');
    await page.goBack();
    await page.waitForURL('**/student/results');
    await page
      .getByRole('heading', { name: 'Chưa xác thực được phiên', exact: true })
      .waitFor();
    assert(
      !(await page.locator('body').innerText()).includes(f.studentA.email),
    );
    assert.equal(await page.locator('[data-result-id]').count(), 0);
    await page.unrouteAll({ behavior: 'wait' });
    await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await page
      .getByRole('heading', { name: 'Lịch sử kết quả', exact: true })
      .waitFor();
    checks.push({
      case: 'security-cache',
      wrongRole: true,
      IDOR: true,
      unknownIdentityHidden: true,
    });
  } finally {
    await c.close();
  }
});

test('UI07-09: account A logout to B clears private data; locked Student session redirects', async () => {
  const { c, page } = await context();
  try {
    await page.goto(web + '/student/results');
    await page.locator('[data-result-id]').first().waitFor();
    await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
    await page
      .getByRole('button', { name: 'Đồng ý đăng xuất', exact: true })
      .click();
    await page.waitForURL('**/login');
    await page.getByLabel('Email', { exact: true }).fill(f.studentB.email);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL('**/dashboard/student');
    await page
      .getByRole('heading', { name: 'Xin chào, ' + f.studentB.fullName })
      .waitFor();
    await page.goto(web + '/student/results');
    await page
      .getByText('Chưa có kết quả hoàn thành.', { exact: true })
      .waitFor();
    assert(
      !(await page.locator('body').innerText()).includes(f.studentA.email),
    );
    assert.equal(await page.locator('[data-result-id]').count(), 0);
    await call(
      f.admin,
      'PATCH',
      '/users/' + f.studentB.id + '/status',
      { isActive: false },
      200,
    );
    await page.getByRole('button', { name: 'Làm mới', exact: true }).click();
    await page.waitForURL('**/login');
    assert.equal(await page.locator('.student-workspace').count(), 0);
    checks.push({
      case: 'account-change',
      BNoAHistory: true,
      inactive401: true,
    });
  } finally {
    await call(
      f.admin,
      'PATCH',
      '/users/' + f.studentB.id + '/status',
      { isActive: true },
      200,
    );
    await c.close();
  }
});

test('UI07-10: four Student routes at four widths, DARK/mobile/axe, reduced motion and drawer keyboard focus', async () => {
  const { c, page } = await context();
  try {
    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of [
        '/dashboard/student',
        '/student/classes',
        '/student/exams',
        '/student/results',
      ]) {
        await page.goto(web + route);
        await page.getByRole('heading', { level: 1 }).waitFor();
        await page.waitForLoadState('networkidle');
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        );
        assert.equal(overflow, false, route + ' ' + width);
        const violations = await axe(page);
        assert.deepEqual(violations, [], route + ' ' + width);
        const filename = route.replaceAll('/', '-') + '-' + width + '.png';
        await page.screenshot({
          path: path.join(evidence, filename),
          fullPage: true,
        });
        checks.push({
          route,
          width,
          overflow,
          violations,
          screenshot: filename,
        });
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(web + '/student/exams');
    await page.waitForLoadState('networkidle');
    await page
      .getByRole('button', { name: 'Đổi giao diện sáng tối', exact: true })
      .click();
    await page.waitForFunction(() =>
      document.documentElement.classList.contains('dark'),
    );
    assert.deepEqual(await axe(page), []);
    await page.screenshot({
      path: path.join(evidence, 'student-exams-dark390.png'),
      fullPage: true,
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(
      await page.evaluate(
        () => matchMedia('(prefers-reduced-motion: reduce)').matches,
      ),
      true,
    );
    const menu = page.getByRole('button', { name: 'Mở menu', exact: true });
    await menu.focus();
    await page.keyboard.press('Enter');
    const drawer = page.getByRole('dialog', {
      name: 'Điều hướng học tập',
      exact: true,
    });
    await drawer.waitFor();
    await waitUntil(() =>
      drawer
        .getByRole('button', { name: 'Đóng menu', exact: true })
        .evaluate((el) => el === document.activeElement),
    );
    await page.keyboard.press('Tab');
    assert.equal(
      await page.evaluate(() =>
        document
          .querySelector('[role="dialog"]')
          .contains(document.activeElement),
      ),
      true,
    );
    await page.keyboard.press('Escape');
    await waitUntil(() => menu.evaluate((el) => el === document.activeElement));
    assert.equal(
      await menu.evaluate((el) => el === document.activeElement),
      true,
    );
    await page.keyboard.press('Enter');
    await drawer
      .getByRole('link', { name: 'Lớp học của tôi', exact: true })
      .click();
    await page.waitForURL('**/student/classes');
    await drawer.waitFor({ state: 'hidden' });
    checks.push({
      case: 'responsive',
      lightRoutes: 16,
      darkMobile: true,
      keyboard: true,
      reducedMotion: true,
    });
  } finally {
    await c.close();
  }
});
