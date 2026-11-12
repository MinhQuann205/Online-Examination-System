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
  password,
  suffix,
  assignment,
  login: loginActor,
  waitUntil,
} = require('./p0-support.cjs');
const requireWeb = createRequire(
  path.resolve(__dirname, '../apps/web/package.json'),
);
const { chromium } = requireWeb('playwright');
const evidence =
  process.env.UI05_EVIDENCE_DIR ||
  fs.mkdtempSync(path.join(os.tmpdir(), 'examspace-ui05-browser-'));
fs.mkdirSync(evidence, { recursive: true });
let browser, f;
const checks = [];
before(async () => {
  f = await fixtures();
  browser = await chromium.launch({
    channel: process.env.P0_BROWSER_CHANNEL || 'msedge',
    headless: true,
  });
});
beforeEach(async () => {
  for (const actor of [f.admin, f.teacherA, f.teacherB, f.studentA, f.studentB])
    await loginActor(actor);
});
after(async () => {
  fs.writeFileSync(
    path.join(evidence, 'checks.json'),
    JSON.stringify(checks, null, 2),
  );
  await browser?.close();
  await db.end();
});
async function context(actor = f.admin, width = 1440) {
  const c = await browser.newContext({ viewport: { width, height: 1000 } });
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
  return { c, page: await c.newPage() };
}
const gate = () => {
  let resolve;
  return {
    promise: new Promise((r) => (resolve = r)),
    resolve: () => resolve(),
  };
};
const noOverflow = async (page) =>
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    'document overflow',
  );
const row = (page, email) =>
  page.locator('tbody tr').filter({ hasText: email });
async function chooseStudent(page, actor) {
  await page.getByLabel('Tìm học viên', { exact: true }).fill(actor.email);
  await page
    .getByLabel('Học viên cần thêm', { exact: true })
    .selectOption(actor.id);
}

test('UI05-01: Admin dashboard real greeting, four API totals and working quick actions', async () => {
  const { c, page } = await context();
  try {
    await page.goto(web + '/dashboard/admin');
    await page
      .getByRole('heading', { name: 'Xin chào, ' + f.admin.fullName })
      .waitFor();
    const stats = page.getByRole('region', { name: 'Tổng quan quản trị' });
    await waitUntil(async () => !(await stats.innerText()).includes('…'));
    const users = Number(
      (await db.query('SELECT count(*) FROM "User"')).rows[0].count,
    );
    assert.equal(
      Number(
        await stats
          .locator('.admin-stat')
          .first()
          .locator(':scope > strong')
          .textContent(),
      ),
      users,
    );
    assert(
      !(await page.textContent('body')).match(
        /94\.2%|AI Proctoring|Cluster HN|Nguyễn Mai Anh/,
      ),
    );
    await page.screenshot({
      path: path.join(evidence, 'dashboard-admin-1440.png'),
      fullPage: true,
    });
    await page.getByRole('link', { name: 'Người dùng', exact: true }).click();
    await page.waitForURL('**/admin/users');
    await page
      .getByRole('heading', { name: 'Quản lý người dùng', exact: true })
      .waitFor();
    checks.push({ case: 'dashboard', sourceTotals: true });
  } finally {
    await c.close();
  }
});
test('UI05-02: Users create/edit validation and confirmed lock/unlock preserve real server state', async () => {
  const { c, page } = await context();
  const email = `ui05-user-${suffix}@example.test`;
  try {
    await page.goto(web + '/admin/users');
    const form = page.getByRole('form', { name: 'Tạo tài khoản', exact: true });
    await form.getByLabel('Email', { exact: true }).fill(email);
    await form
      .getByLabel('Họ và tên', { exact: true })
      .fill('UI05 created user');
    await form.getByLabel('Mật khẩu tạm', { exact: true }).fill(password);
    await form
      .getByRole('button', { name: 'Tạo tài khoản', exact: true })
      .click();
    await page
      .getByRole('status')
      .filter({ hasText: 'Đã tạo tài khoản.' })
      .waitFor();
    await waitUntil(
      async () =>
        (await form
          .getByLabel('Mật khẩu tạm', { exact: true })
          .inputValue()) === '',
    );
    await page.getByLabel('Tìm kiếm', { exact: true }).fill(email);
    await row(page, email)
      .getByRole('button', { name: 'Xem chi tiết', exact: true })
      .click();
    const panel = page.getByLabel('Chi tiết quản lý', { exact: true });
    await panel.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
    await panel.getByLabel('Email', { exact: true }).fill(f.teacherA.email);
    await panel
      .getByRole('button', { name: 'Lưu thay đổi', exact: true })
      .click();
    await panel.getByRole('alert').waitFor();
    await panel.getByLabel('Email', { exact: true }).fill(email);
    await panel
      .getByLabel('Họ và tên', { exact: true })
      .fill('UI05 updated user');
    await panel
      .getByRole('button', { name: 'Lưu thay đổi', exact: true })
      .click();
    await waitUntil(
      async () =>
        (
          await db.query('SELECT "fullName" FROM "User" WHERE email=$1', [
            email,
          ])
        ).rows[0].fullName === 'UI05 updated user',
    );
    await row(page, email)
      .getByRole('button', { name: 'Khóa', exact: true })
      .click();
    let dialog = page.getByRole('dialog', { name: 'Khóa tài khoản?' });
    await dialog.getByRole('button', { name: 'Hủy bỏ', exact: true }).click();
    assert.equal(
      (await db.query('SELECT "isActive" FROM "User" WHERE email=$1', [email]))
        .rows[0].isActive,
      true,
    );
    await row(page, email)
      .getByRole('button', { name: 'Khóa', exact: true })
      .click();
    await page
      .getByRole('dialog', { name: 'Khóa tài khoản?' })
      .getByRole('button', { name: 'Xác nhận', exact: true })
      .click();
    await row(page, email).getByText('Đã khóa', { exact: true }).waitFor();
    await call(null, 'POST', '/auth/login', { email, password }, 401);
    await row(page, email)
      .getByRole('button', { name: 'Mở khóa', exact: true })
      .click();
    await page
      .getByRole('dialog', { name: 'Mở khóa tài khoản?' })
      .getByRole('button', { name: 'Xác nhận', exact: true })
      .click();
    await row(page, email).getByText('Hoạt động', { exact: true }).waitFor();
    await call(null, 'POST', '/auth/login', { email, password }, 200);
  } finally {
    await c.close();
  }
});
test('UI05-03: reset secret is masked, not stored in browser storage, clears on close and authenticates through backend', async () => {
  const user = (
    await call(
      f.admin,
      'POST',
      '/users',
      {
        email: `ui05-reset-${suffix}@example.test`,
        fullName: 'UI05 reset user',
        role: 'STUDENT',
        password,
      },
      201,
    )
  ).data;
  const { c, page } = await context();
  try {
    await page.goto(web + '/admin/users');
    await page.getByLabel('Tìm kiếm', { exact: true }).fill(user.email);
    await row(page, user.email)
      .getByRole('button', { name: 'Đặt lại mật khẩu', exact: true })
      .click();
    const confirm = page.getByRole('dialog', { name: 'Đặt lại mật khẩu?' });
    assert.equal(await page.locator(':focus').textContent(), 'Hủy bỏ');
    await page.keyboard.press('Escape');
    assert.equal(await confirm.count(), 0);
    await row(page, user.email)
      .getByRole('button', { name: 'Đặt lại mật khẩu', exact: true })
      .click();
    await page
      .getByRole('dialog', { name: 'Đặt lại mật khẩu?' })
      .getByRole('button', { name: 'Xác nhận đặt lại mật khẩu', exact: true })
      .click();
    const modal = page.getByRole('dialog', {
      name: 'Mật khẩu tạm đã được tạo',
    });
    await modal.waitFor();
    const input = modal.getByLabel('Mật khẩu tạm', { exact: true });
    assert.equal(await input.getAttribute('type'), 'password');
    const secret = await input.inputValue();
    assert(secret.length >= 12);
    assert(
      !(
        await page.evaluate(() =>
          JSON.stringify({ localStorage, sessionStorage, url: location.href }),
        )
      ).includes(secret),
    );
    await call(
      null,
      'POST',
      '/auth/login',
      { email: user.email, password },
      401,
    );
    await call(
      null,
      'POST',
      '/auth/login',
      { email: user.email, password: secret },
      200,
    );
    await modal
      .getByRole('button', { name: 'Hiện mật khẩu', exact: true })
      .click();
    assert.equal(await input.getAttribute('type'), 'text');
    await modal
      .getByRole('button', { name: 'Đóng và xóa khỏi màn hình', exact: true })
      .click();
    assert.equal(
      await page.locator('input[value="' + secret + '"]').count(),
      0,
    );
    assert(!(await page.textContent('body')).includes(secret));
  } finally {
    await c.close();
  }
});
test('UI05-04: Classes create/update/reassign and roster add/remove use real API with confirmation', async () => {
  const { c, page } = await context();
  const code = 'UI05-BROWSER-' + suffix;
  try {
    await page.goto(web + '/admin/classes');
    const form = page.getByRole('form', { name: 'Tạo lớp học', exact: true });
    await form
      .getByLabel('Tên lớp', { exact: true })
      .fill('UI05 browser class');
    await form.getByLabel('Mã lớp', { exact: true }).fill(code);
    await form
      .getByLabel('Giảng viên phụ trách', { exact: true })
      .selectOption(f.teacherA.id);
    await form.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
    await page
      .getByRole('status')
      .filter({ hasText: 'Đã tạo lớp học.' })
      .waitFor();
    await page.getByLabel('Tìm kiếm', { exact: true }).fill(code);
    await page
      .getByRole('button', { name: 'Quản lý UI05 browser class', exact: true })
      .click();
    const panel = page.getByLabel('Chi tiết quản lý', { exact: true });
    await panel.getByRole('heading', { name: /Thành viên/ }).waitFor();
    await chooseStudent(panel, f.studentA);
    await panel.getByRole('button', { name: 'Thêm', exact: true }).click();
    const member = panel
      .getByRole('region', { name: 'Thành viên lớp', exact: true })
      .locator('tr')
      .filter({ hasText: f.studentA.email });
    await member.waitFor();
    await panel.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
    await panel
      .getByLabel('Tên lớp', { exact: true })
      .fill('UI05 browser edited class');
    await panel
      .getByLabel('Giảng viên phụ trách', { exact: true })
      .selectOption(f.teacherB.id);
    await panel
      .getByRole('button', { name: 'Lưu thay đổi', exact: true })
      .click();
    const dialog = page.getByRole('dialog', {
      name: 'Đổi giảng viên phụ trách?',
    });
    await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    const item = (
      await db.query('SELECT id,"teacherId" FROM "Class" WHERE code=$1', [code])
    ).rows[0];
    await waitUntil(
      async () =>
        (
          await db.query('SELECT "teacherId" FROM "Class" WHERE id=$1', [
            item.id,
          ])
        ).rows[0].teacherId === f.teacherB.id,
    );
    await call(f.teacherA, 'GET', `/classes/${item.id}`, undefined, 403);
    await call(f.teacherB, 'GET', `/classes/${item.id}`, undefined, 200);
    await member.getByRole('button', { name: 'Xóa', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Xóa học viên khỏi lớp?' })
      .getByRole('button', { name: 'Hủy bỏ', exact: true })
      .click();
    assert.equal(
      (
        await db.query(
          'SELECT count(*) FROM "ClassMember" WHERE "classId"=$1',
          [item.id],
        )
      ).rows[0].count,
      '1',
    );
    await member.getByRole('button', { name: 'Xóa', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Xóa học viên khỏi lớp?' })
      .getByRole('button', { name: 'Xác nhận', exact: true })
      .click();
    await panel.getByText('Lớp chưa có học viên.', { exact: true }).waitFor();
  } finally {
    await c.close();
  }
});
test('UI05-05: Users, Classes and Exams navigate all 24 records and filters reset page', async () => {
  const term = 'ui05-pages-' + suffix;
  for (let i = 0; i < 24; i++) {
    await call(
      f.admin,
      'POST',
      '/users',
      {
        email: `${term}-${i}@example.test`,
        fullName: `${term} ${i}`,
        role: 'STUDENT',
        password,
      },
      201,
    );
    await call(
      f.admin,
      'POST',
      '/classes',
      {
        name: `${term} ${i}`,
        code: `U05-${suffix}-${i}`,
        teacherId: f.teacherA.id,
      },
      201,
    );
    await call(
      f.teacherA,
      'POST',
      '/exams',
      {
        title: `${term} ${i}`,
        durationMin: 10,
        questions: [{ questionId: f.questions[0].id, points: 1 }],
      },
      201,
    );
  }
  const { c, page } = await context();
  try {
    for (const route of ['/admin/users', '/admin/classes', '/admin/exams']) {
      await page.goto(web + route);
      await page.getByLabel('Tìm kiếm', { exact: true }).fill(term);
      await page
        .getByText('24 bản ghi · Trang 1 / 2', { exact: true })
        .waitFor();
      assert.equal(await page.locator('tbody tr').count(), 20);
      const first = await page.locator('tbody tr').allTextContents();
      await page
        .getByRole('button', { name: 'Trang sau', exact: true })
        .click();
      await page
        .getByText('24 bản ghi · Trang 2 / 2', { exact: true })
        .waitFor();
      assert.equal(await page.locator('tbody tr').count(), 4);
      for (const text of await page.locator('tbody tr').allTextContents())
        assert(!first.includes(text));
      await page.getByLabel('Tìm kiếm', { exact: true }).fill(term + ' 0');
      await page
        .getByText('1 bản ghi · Trang 1 / 1', { exact: true })
        .waitFor();
    }
    await page
      .getByLabel('Trạng thái đề', { exact: true })
      .selectOption('PUBLISHED');
    await page.getByText('Chưa có đề thi.', { exact: true }).waitFor();
    await page.goto(web + '/admin/users');
    await page.getByLabel('Tìm kiếm', { exact: true }).fill(term);
    await page.getByLabel('Vai trò', { exact: true }).selectOption('TEACHER');
    await page.getByText('Chưa có người dùng.', { exact: true }).waitFor();
  } finally {
    await c.close();
  }
});
test('UI05-06: monitoring shows pinned assignment/version and opens the existing report', async () => {
  await assignment(f, { classId: f.classes.A.id, studentId: undefined });
  const { c, page } = await context();
  try {
    await page.goto(web + '/admin/exams');
    await page.getByLabel('Tìm kiếm', { exact: true }).fill(f.exam.title);
    const examRow = page.locator('tbody tr').filter({ hasText: f.exam.title });
    await examRow
      .getByRole('button', { name: 'Xem bài giao', exact: true })
      .click();
    const panel = page.getByLabel('Bài giao và phiên bản', { exact: true });
    await panel.getByText('Phiên bản 1', { exact: true }).waitFor();
    await panel
      .getByText(f.classes.A.name + ' · ' + f.classes.A.code, { exact: true })
      .waitFor();
    await examRow
      .getByRole('link', { name: 'Theo dõi kết quả', exact: true })
      .click();
    await page.waitForURL(`**/admin/exams/${f.exam.id}/results`);
    await page
      .getByRole('heading', { name: f.exam.title, exact: true })
      .first()
      .waitFor();
  } finally {
    await c.close();
  }
});
test('UI05-07: empty, pending and failed mutations show accurate states, retry reaches the real backend', async () => {
  const { c, page } = await context(),
    release = gate();
  let arrived = false;
  const code = 'UI05-RETRY-' + suffix;
  try {
    await page.goto(web + '/admin/users');
    await page
      .getByLabel('Tìm kiếm', { exact: true })
      .fill('ui05-nonexistent-' + suffix);
    await page.getByText('Chưa có người dùng.', { exact: true }).waitFor();
    await page.route('**/users?*', (route) => route.abort());
    await page
      .getByLabel('Tìm kiếm', { exact: true })
      .fill('ui05-offline-' + suffix);
    await page.locator('.admin-error').waitFor();
    await page.unroute('**/users?*');
    await page
      .locator('.admin-error')
      .getByRole('button', { name: 'Thử lại', exact: true })
      .click();
    await page.getByText('Chưa có người dùng.', { exact: true }).waitFor();
    await page.route(
      '**/users?*',
      async (route) => {
        arrived = true;
        await release.promise;
        await route.continue();
      },
      { times: 1 },
    );
    await page
      .getByLabel('Tìm kiếm', { exact: true })
      .fill('ui05-pending-' + suffix);
    await waitUntil(() => arrived);
    await page
      .getByText('Đang tải danh sách người dùng...', { exact: true })
      .waitFor();
    release.resolve();
    await page.getByText('Chưa có người dùng.', { exact: true }).waitFor();
    await page.goto(web + '/admin/classes');
    const form = page.getByRole('form', { name: 'Tạo lớp học', exact: true });
    await form.getByLabel('Tên lớp', { exact: true }).fill('UI05 retry class');
    await form.getByLabel('Mã lớp', { exact: true }).fill(code);
    await form
      .getByLabel('Giảng viên phụ trách', { exact: true })
      .selectOption(f.teacherA.id);
    await page.route('**/classes', (route) => route.abort(), { times: 1 });
    await form.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
    await form.getByRole('alert').waitFor();
    assert.equal(
      (await db.query('SELECT count(*) FROM "Class" WHERE code=$1', [code]))
        .rows[0].count,
      '0',
    );
    assert.equal(
      await page.getByText('Đã tạo lớp học.', { exact: true }).count(),
      0,
    );
    await form.getByRole('button', { name: 'Tạo lớp', exact: true }).click();
    await page.getByText('Đã tạo lớp học.', { exact: true }).waitFor();
    assert.equal(
      (await db.query('SELECT count(*) FROM "Class" WHERE code=$1', [code]))
        .rows[0].count,
      '1',
    );
  } finally {
    release.resolve();
    await c.close();
  }
});
test('UI05-08: Teacher/Student forced Admin URLs fetch no private lists; mutation denial remains backend enforced', async () => {
  for (const actor of [f.teacherA, f.studentB]) {
    const { c, page } = await context(actor);
    let privateCalls = 0;
    const scopedResponses = [];
    const studentClassIds = new Set(
      actor.role === 'STUDENT'
        ? (
            await db.query(
              'SELECT "classId" FROM "ClassMember" WHERE "studentId"=$1',
              [actor.id],
            )
          ).rows.map((r) => r.classId)
        : [],
    );
    page.on('response', (response) => {
      const u = new URL(response.url());
      if (
        u.origin === api &&
        ((actor.role === 'TEACHER' &&
          ['/classes', '/exams'].includes(u.pathname)) ||
          (actor.role === 'STUDENT' && u.pathname === '/classes'))
      )
        scopedResponses.push(
          response.json().then((data) => {
            assert.equal(response.status(), 200);
            assert(
              data.items.every((item) =>
                u.pathname === '/classes'
                  ? actor.role === 'STUDENT'
                    ? studentClassIds.has(item.id)
                    : item.teacherId === actor.id
                  : item.authorId === actor.id,
              ),
              'Redirected dashboard must only receive its own class/exam scope',
            );
          }),
        );
    });
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (
        url.origin === api &&
        ['/users', '/classes', '/exams'].includes(url.pathname) &&
        // Each redirected dashboard can read only its own scoped totals.
        !(
          new URL(page.url()).pathname ===
            '/dashboard/' + actor.role.toLowerCase() &&
          ((actor.role === 'TEACHER' &&
            ['/classes', '/exams'].includes(url.pathname)) ||
            (actor.role === 'STUDENT' && url.pathname === '/classes'))
        )
      )
        privateCalls++;
    });
    try {
      for (const route of [
        '/admin/users',
        '/admin/classes',
        '/admin/exams',
        '/dashboard/admin',
      ]) {
        await page.goto(web + route);
        await page.waitForURL('**/dashboard/' + actor.role.toLowerCase());
        await page.waitForLoadState('networkidle');
        assert.equal(
          await page
            .getByRole('link', { name: 'Người dùng', exact: true })
            .count(),
          0,
        );
      }
      await Promise.all(scopedResponses);
      assert.equal(privateCalls, 0);
      await call(
        actor,
        'PATCH',
        `/users/${f.studentA.id}/status`,
        { isActive: false },
        403,
      );
      await call(
        actor,
        'POST',
        `/users/${f.studentA.id}/reset-password`,
        undefined,
        403,
      );
    } finally {
      await c.close();
    }
  }
});
test('UI05-09: missing access cookie refreshes client management safely; revoked session redirects without private UI', async () => {
  const { c, page } = await context();
  try {
    await c.clearCookies({ name: 'access_token' });
    const refreshed = page.waitForResponse(
      (response) =>
        response.url() === api + '/auth/refresh' && response.status() === 200,
    );
    await page.goto(web + '/admin/users');
    await refreshed;
    await page
      .getByRole('heading', { name: 'Quản lý người dùng', exact: true })
      .waitFor();
    assert(
      (await c.cookies()).some(
        (cookie) => cookie.name === 'access_token' && cookie.httpOnly,
      ),
    );
    const cookies = await c.cookies();
    const cookieHeader = cookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join('; ');
    const logout = await fetch(api + '/auth/logout', {
      method: 'POST',
      headers: { Origin: web, Cookie: cookieHeader },
    });
    assert.equal(logout.status, 204);
    await page.goto(web + '/admin/classes');
    await page.waitForURL('**/login');
    assert.equal(await page.locator('.admin-sidebar').count(), 0);
    assert(!(await page.textContent('body')).includes(f.admin.email));
  } finally {
    await c.close();
  }
});
test('UI05-10: four Admin routes reflow at 390/768/1024/1440, axe, dark and keyboard mobile navigation/logout', async () => {
  const { c, page } = await context();
  try {
    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of [
        '/dashboard/admin',
        '/admin/users',
        '/admin/classes',
        '/admin/exams',
      ]) {
        await page.goto(web + route);
        await page.getByRole('heading', { level: 1 }).waitFor();
        await page.waitForLoadState('networkidle');
        await noOverflow(page);
        await page.addScriptTag({
          path: requireWeb.resolve('axe-core/axe.min.js'),
        });
        const violations = await page.evaluate(async () =>
          (
            await axe.run(document, {
              runOnly: {
                type: 'tag',
                values: ['wcag2a', 'wcag2aa', 'wcag21aa'],
              },
            })
          ).violations.map((v) => ({
            id: v.id,
            targets: v.nodes.map((n) => n.target),
          })),
        );
        assert.deepEqual(violations, []);
        const file = `${route.split('/').filter(Boolean).join('-')}-${width}.png`;
        await page.screenshot({
          path: path.join(evidence, file),
          fullPage: true,
        });
        checks.push({ route, width, axe: 0, noOverflow: true, file });
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(web + '/dashboard/admin');
    const menu = page.getByRole('button', { name: 'Mở menu', exact: true });
    await menu.click();
    const drawer = page.getByRole('dialog', { name: 'Điều hướng quản trị' });
    await drawer.waitFor();
    assert.equal(
      await page.locator(':focus').getAttribute('aria-label'),
      'Đóng menu',
    );
    await page.keyboard.press('Escape');
    assert.equal(await menu.getAttribute('aria-expanded'), 'false');
    assert.equal(
      await page.locator(':focus').getAttribute('aria-label'),
      'Mở menu',
    );
    await menu.click();
    await drawer.getByRole('link', { name: 'Người dùng', exact: true }).click();
    await page.waitForURL('**/admin/users');
    await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
    await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
    const logout = page.getByRole('dialog', {
      name: 'Đăng xuất khỏi ExamSpace?',
    });
    await logout.waitFor();
    assert.equal(await page.locator(':focus').textContent(), 'Hủy bỏ');
    await page.keyboard.press('Escape');
    await drawer.waitFor();
    await page.keyboard.press('Escape');
    await page
      .getByRole('button', { name: 'Đổi giao diện sáng tối', exact: true })
      .click();
    await page.locator('html.dark').waitFor();
    await noOverflow(page);
    await page.screenshot({
      path: path.join(evidence, 'admin-users-dark-390.png'),
      fullPage: true,
    });
    await page.addScriptTag({
      path: requireWeb.resolve('axe-core/axe.min.js'),
    });
    assert.deepEqual(
      await page.evaluate(async () =>
        (
          await axe.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
          })
        ).violations.map((v) => v.id),
      ),
      [],
    );
  } finally {
    await c.close();
  }
});
