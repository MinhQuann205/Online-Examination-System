const { test, before, beforeEach, after } = require('node:test');
const { createRequire } = require('node:module');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {
  assert,
  api,
  web,
  db,
  password,
  fixtures,
  assignment,
  start,
  call,
  answers,
  waitUntil,
  login: loginActor,
} = require('./p0-support.cjs');
const requireWeb = createRequire(
  path.resolve(__dirname, '../apps/web/package.json'),
);
const { chromium } = requireWeb('playwright');
const evidence =
  process.env.UI_EVIDENCE_DIR ||
  fs.mkdtempSync(path.join(os.tmpdir(), 'examspace-ui-browser-'));
fs.mkdirSync(evidence, { recursive: true });
let browser, f;
const visual = [];
before(async () => {
  f = await fixtures();
  browser = await chromium.launch({
    channel: process.env.P0_BROWSER_CHANNEL || 'msedge',
    headless: true,
  });
});
after(async () => {
  fs.writeFileSync(
    path.join(evidence, 'visual-checks.json'),
    JSON.stringify(visual, null, 2),
  );
  await browser?.close();
  await db.end();
});
beforeEach(async () => {
  for (const actor of [f.admin, f.teacherA, f.studentA, f.studentB])
    await loginActor(actor);
});
const gate = () => {
  let resolve;
  return {
    promise: new Promise((r) => (resolve = r)),
    resolve: () => resolve(),
  };
};
async function login(page, actor, hint = 'student') {
  await page.goto(web + '/login?role=' + hint);
  await page.getByLabel('Email', { exact: true }).fill(actor.email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL('**/dashboard/' + actor.role.toLowerCase());
}
async function logoutDialog(page) {
  const trigger = page.getByRole('button', { name: 'Đăng xuất', exact: true });
  if (!(await trigger.isVisible()))
    await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
  await trigger.click();
  await page.getByRole('dialog').waitFor();
}
async function confirmLogout(page, retry = false) {
  await page
    .getByRole('dialog')
    .getByRole('button', {
      name: retry ? 'Thử lại' : 'Đồng ý đăng xuất',
      exact: true,
    })
    .click();
}
async function noOverflow(page) {
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    'document horizontal overflow',
  );
}

test('UI01: guest homepage and login reflow at four widths, local Vietnamese font, axe and real screenshots', async () => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  try {
    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of ['/', '/login']) {
        await page.goto(web + route);
        await page.evaluate(() => document.fonts.ready);
        await page
          .getByRole('link', { name: 'Đăng nhập', exact: true })
          .first()
          .waitFor({ state: width < 1200 ? 'attached' : 'visible' });
        await noOverflow(page);
        assert(
          !(await page.textContent('body')).match(
            /45,000|99\.8%|Đăng xuất thiết bị này|SBD|2FA OK|Nguyễn Mai Anh/,
          ),
        );
        await page.addScriptTag({
          path: requireWeb.resolve('axe-core/axe.min.js'),
        });
        const violations = await page.evaluate(
          async () =>
            (
              await axe.run(document, {
                runOnly: {
                  type: 'tag',
                  values: ['wcag2a', 'wcag2aa', 'wcag21aa'],
                },
              })
            ).violations,
        );
        fs.writeFileSync(
          path.join(
            evidence,
            `axe-${route === '/' ? 'home' : 'login'}-${width}.json`,
          ),
          JSON.stringify(violations, null, 2),
        );
        assert.deepEqual(
          violations.map((v) => v.id),
          [],
        );
        const file = `${route === '/' ? 'home' : 'login'}-${width}.png`;
        await page.screenshot({
          path: path.join(evidence, file),
          fullPage: true,
        });
        visual.push({ route, width, file, noOverflow: true, axeViolations: 0 });
      }
    }
    const family = await page.evaluate(
      () => getComputedStyle(document.body).fontFamily,
    );
    assert(
      family.includes('localFont') ||
        family.includes('jakarta') ||
        family.includes('__'),
    );
    await page.goto(web + '/');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
    await page.getByRole('link', { name: 'Chức năng', exact: true }).click();
    assert.equal(new URL(page.url()).hash, '#chuc-nang');
    await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
    await page.keyboard.press('Escape');
    assert.equal(
      await page
        .getByRole('button', { name: 'Mở menu', exact: true })
        .getAttribute('aria-expanded'),
      'false',
    );
  } finally {
    await context.close();
  }
});

test('UI02: keyboard, 200 percent browser zoom, dark mode and reduced motion remain usable', async () => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  try {
    await page.goto(web + '/login');
    await page.getByLabel('Email', { exact: true }).waitFor();
    await page.keyboard.press('Tab');
    assert.equal(
      await page.locator(':focus').textContent(),
      'Đến nội dung đăng nhập',
    );
    await page.getByRole('button', { name: 'Đổi giao diện sáng tối' }).click();
    await page.waitForFunction(() =>
      document.documentElement.classList.contains('dark'),
    );
    await page.screenshot({
      path: path.join(evidence, 'login-dark.png'),
      fullPage: true,
    });
    await page.addScriptTag({
      path: requireWeb.resolve('axe-core/axe.min.js'),
    });
    const result = await page.evaluate(
      async () =>
        (
          await axe.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
          })
        ).violations,
    );
    assert.deepEqual(
      result.map((v) => v.id),
      [],
    );
    // Chromium browser zoom via keyboard; verify the effective viewport actually changes.
    const originalWidth = await page.evaluate(() => innerWidth);
    await page.keyboard.press('Control+0');
    for (let i = 0; i < 4; i++) await page.keyboard.press('Control++');
    const zoomedWidth = await page.evaluate(() => innerWidth);
    // Some headless builds ignore accelerator zoom. Use CDP device scale separately,
    // and record the limitation instead of claiming keyboard zoom passed.
    visual.push({
      check: 'keyboard-browser-zoom',
      originalWidth,
      zoomedWidth,
      acceleratorSupported: zoomedWidth < originalWidth,
    });
    await page.evaluate(() => {
      document.documentElement.style.zoom = '2';
    });
    await noOverflow(page);
    await page.screenshot({
      path: path.join(evidence, 'login-css-zoom200.png'),
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(
        () => matchMedia('(prefers-reduced-motion: reduce)').matches,
      ),
      true,
    );
  } finally {
    await context.close();
  }
});

test('UI03: all three roles authenticate through UI; presentation hint cannot grant a different role', async () => {
  for (const actor of [f.admin, f.teacherA, f.studentA]) {
    const context = await browser.newContext(),
      page = await context.newPage();
    try {
      await login(page, actor, actor.role === 'ADMIN' ? 'student' : 'admin');
      await page
        .getByRole('heading', { name: 'Xin chào, ' + actor.fullName })
        .waitFor();
      const cookies = await context.cookies();
      assert(
        cookies
          .filter((c) => c.name.endsWith('_token'))
          .every((c) => c.httpOnly),
      );
      await page.goto(web + '/');
      await page.getByRole('link', { name: 'Không gian làm việc' }).waitFor();
      assert.equal(
        await page
          .getByRole('link', { name: 'Không gian làm việc' })
          .getAttribute('href'),
        '/dashboard/' + actor.role.toLowerCase(),
      );
      assert(
        !(await page.evaluate(() => JSON.stringify(localStorage))).includes(
          password,
        ),
      );
    } finally {
      await context.close();
    }
  }
});

test('UI04: validation, password visibility, Enter submit, pending and wrong password states', async () => {
  const context = await browser.newContext(),
    page = await context.newPage(),
    release = gate();
  try {
    await page.goto(web + '/login');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    assert.equal(
      await page
        .getByLabel('Email', { exact: true })
        .getAttribute('aria-invalid'),
      'true',
    );
    await page.getByLabel('Email', { exact: true }).fill(f.studentA.email);
    await page
      .getByLabel('Mật khẩu', { exact: true })
      .fill('Wrong-password-only');
    await page
      .getByRole('button', { name: 'Hiện mật khẩu', exact: true })
      .click();
    assert.equal(
      await page.getByLabel('Mật khẩu', { exact: true }).getAttribute('type'),
      'text',
    );
    await page
      .getByRole('button', { name: 'Ẩn mật khẩu', exact: true })
      .click();
    await page.route('**/auth/login', async (route) => {
      await release.promise;
      await route.continue();
    });
    await page.getByLabel('Mật khẩu', { exact: true }).press('Enter');
    await page.getByRole('button', { name: 'Đang đăng nhập...' }).waitFor();
    assert(await page.getByLabel('Email', { exact: true }).isDisabled());
    release.resolve();
    await page
      .getByText(
        'Email hoặc mật khẩu không đúng, hoặc tài khoản không còn hoạt động.',
      )
      .waitFor();
    assert.equal(new URL(page.url()).pathname, '/login');
  } finally {
    release.resolve();
    await context.close();
  }
});

test('UI05: logout confirmation supports cancel, Escape, focus restoration and no mutation on cancel', async () => {
  const context = await browser.newContext(),
    page = await context.newPage();
  let requests = 0;
  page.on('request', (r) => {
    if (r.url() === api + '/auth/logout') requests++;
  });
  try {
    await login(page, f.teacherA);
    await logoutDialog(page);
    await page.screenshot({
      path: path.join(evidence, 'logout-confirm.png'),
      fullPage: true,
    });
    assert.equal(await page.locator(':focus').textContent(), 'Hủy bỏ');
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert((await page.locator(':focus').textContent()).includes('Đăng xuất'));
    await logoutDialog(page);
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Hủy bỏ' })
      .click();
    assert.equal(requests, 0);
    assert(new URL(page.url()).pathname.includes('/dashboard/teacher'));
  } finally {
    await context.close();
  }
});

test('UI06: failed logout never redirects or revokes the server session; retry really logs out', async () => {
  const context = await browser.newContext(),
    page = await context.newPage();
  try {
    await login(page, f.teacherA);
    const version = (
      await db.query('SELECT "tokenVersion" FROM "User" WHERE id=$1', [
        f.teacherA.id,
      ])
    ).rows[0].tokenVersion;
    await page.route('**/auth/logout', (route) =>
      route.abort('connectionfailed'),
    );
    await logoutDialog(page);
    await confirmLogout(page);
    await page.getByText(/Không thể xác nhận đăng xuất/).waitFor();
    await page.screenshot({
      path: path.join(evidence, 'logout-network-error.png'),
      fullPage: true,
    });
    assert(new URL(page.url()).pathname.includes('/dashboard/teacher'));
    assert.equal(
      (
        await db.query('SELECT "tokenVersion" FROM "User" WHERE id=$1', [
          f.teacherA.id,
        ])
      ).rows[0].tokenVersion,
      version,
    );
    await page.unroute('**/auth/logout');
    await confirmLogout(page, true);
    await page.waitForURL('**/login');
    assert(!(await context.cookies()).some((c) => c.name.endsWith('_token')));
    assert.equal(
      (
        await db.query('SELECT "tokenVersion" FROM "User" WHERE id=$1', [
          f.teacherA.id,
        ])
      ).rows[0].tokenVersion,
      version + 1,
    );
  } finally {
    await context.close();
  }
});

test('UI07: CSRF failure is explicit and does not clear the server session', async () => {
  const context = await browser.newContext(),
    page = await context.newPage();
  try {
    await login(page, f.admin);
    const version = (
      await db.query('SELECT "tokenVersion" FROM "User" WHERE id=$1', [
        f.admin.id,
      ])
    ).rows[0].tokenVersion;
    await page.route('**/auth/logout', async (route) => {
      // Forward the real backend's denied response; this is not a mocked success.
      // Native sibling-origin browser attacks are independently covered by F06.
      const response = await route.fetch({
        headers: {
          ...route.request().headers(),
          origin: 'http://localhost:3104',
        },
      });
      assert.equal(response.status(), 403);
      await route.fulfill({ response });
    });
    await logoutDialog(page);
    await confirmLogout(page);
    await page.getByText(/403.*Chưa xác nhận đăng xuất/).waitFor();
    assert.equal(
      (
        await db.query('SELECT "tokenVersion" FROM "User" WHERE id=$1', [
          f.admin.id,
        ])
      ).rows[0].tokenVersion,
      version,
    );
    assert(new URL(page.url()).pathname.includes('/dashboard/admin'));
  } finally {
    await context.close();
  }
});

test('UI08: account A logout and B login discard delayed private requests, router cache and Back history', async () => {
  const context = await browser.newContext(),
    page = await context.newPage(),
    release = gate();
  try {
    await login(page, f.teacherA);
    let held = false;
    await page.route('**/dashboard/teacher', async (route) => {
      if (route.request().resourceType() === 'fetch') {
        held = true;
        await release.promise;
      }
      try {
        await route.continue();
      } catch {
        /* document may have been discarded */
      }
    });
    await page.reload();
    await waitUntil(() => held);
    await logoutDialog(page);
    await confirmLogout(page);
    await page.waitForURL('**/login');
    release.resolve();
    await page.unroute('**/dashboard/teacher');
    await login(page, f.studentB);
    await page
      .getByRole('heading', { name: 'Xin chào, ' + f.studentB.fullName })
      .waitFor();
    assert(!(await page.textContent('body')).includes(f.teacherA.email));
    await page.goBack();
    assert(!(await page.textContent('body')).includes(f.teacherA.email));
    await page.goto(web + '/dashboard/teacher');
    await page.waitForURL('**/dashboard/student');
    assert(!(await page.textContent('body')).includes(f.teacherA.email));
  } finally {
    release.resolve();
    await context.close();
  }
});

test('UI09: an open exam tab with pending autosave prevents logout and preserves the answer queue', async () => {
  const context = await browser.newContext(),
    page = await context.newPage(),
    release = gate();
  let logoutRequests = 0;
  try {
    await login(page, f.studentA);
    const asg = await assignment(f),
      attempt = await start(f, asg);
    const exam = await context.newPage();
    await exam.route('**/exam-attempts/*/answers/*', async (route) => {
      await release.promise;
      await route.continue();
    });
    await exam.goto(web + '/student/attempts/' + attempt.id);
    await exam.getByRole('radio').first().check();
    await exam
      .getByText(/Đang lưu/)
      .first()
      .waitFor();
    page.on('request', (r) => {
      if (r.url() === api + '/auth/logout') logoutRequests++;
    });
    await logoutDialog(page);
    await confirmLogout(page);
    await page.getByText(/Một phòng thi đang mở ở tab khác/).waitFor();
    assert.equal(logoutRequests, 0);
    assert.equal((await answers(attempt.id)).length, 0);
    assert.equal(
      (
        await db.query('SELECT status FROM "ExamAttempt" WHERE id=$1', [
          attempt.id,
        ])
      ).rows[0].status,
      'IN_PROGRESS',
    );
    release.resolve();
    await exam.getByText('Đã lưu trên máy chủ', { exact: true }).waitFor();
    assert.equal((await answers(attempt.id)).length, 1);
    await exam.close();
    await confirmLogout(page, true);
    await page.waitForURL('**/login');
  } finally {
    release.resolve();
    await context.close();
  }
});

test('UI10: backend RBAC/IDOR remains authoritative and wrong role URL redirects', async () => {
  await call(f.studentA, 'GET', '/users', undefined, 403);
  const asg = await assignment(f),
    attempt = await start(f, asg);
  await call(f.studentB, 'GET', '/exam-attempts/' + attempt.id, undefined, 403);
  const context = await browser.newContext(),
    page = await context.newPage();
  try {
    await login(page, f.studentB);
    await page.goto(web + '/dashboard/admin');
    await page.waitForURL('**/dashboard/student');
  } finally {
    await context.close();
  }
});

test('UI11: actual Edge browser zoom is 200 percent for homepage and login, with reflow and screenshots', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'examspace-ui-zoom-'));
  const extension = path.join(dir, 'extension');
  fs.mkdirSync(extension);
  fs.writeFileSync(
    path.join(extension, 'manifest.json'),
    JSON.stringify({
      manifest_version: 3,
      name: 'ExamSpace local zoom test',
      version: '1.0',
      permissions: ['tabs'],
      host_permissions: [web + '/*'],
      background: { service_worker: 'background.js' },
    }),
  );
  fs.writeFileSync(
    path.join(extension, 'background.js'),
    `chrome.tabs.onUpdated.addListener((id,change,tab)=>{if(tab.url?.startsWith(${JSON.stringify(web)}))chrome.tabs.setZoom(id,2)});`,
  );
  const context = await chromium.launchPersistentContext(
    path.join(dir, 'profile'),
    {
      channel: process.env.P0_BROWSER_CHANNEL || 'msedge',
      headless: true,
      viewport: null,
      args: [
        '--disable-extensions-except=' + extension,
        '--load-extension=' + extension,
        '--window-size=1440,1000',
      ],
    },
  );
  try {
    const worker =
      context.serviceWorkers()[0] ||
      (await context.waitForEvent('serviceworker'));
    const page = await context.newPage();
    for (const route of ['/', '/login']) {
      await page.goto(web + route);
      const tabs = await worker.evaluate(async (origin) => {
        const tabs = await chrome.tabs.query({});
        return Promise.all(
          tabs
            .filter((t) => t.url?.startsWith(origin))
            .map(async (t) => {
              await chrome.tabs.setZoom(t.id, 2);
              return { zoom: await chrome.tabs.getZoom(t.id) };
            }),
        );
      }, web);
      assert(tabs.length && tabs.every((t) => t.zoom === 2));
      await noOverflow(page);
      const file =
        'native-zoom200-' + (route === '/' ? 'home' : 'login') + '.png';
      // Browser zoom uses physical layout coordinates for CDP screenshot clips.
      // Playwright's CSS-sized fullPage clip crops the right half at zoom 2.
      const session = await context.newCDPSession(page);
      const layout = await session.send('Page.getLayoutMetrics');
      const screenshot = await session.send('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
        captureBeyondViewport: true,
        clip: {
          x: 0,
          y: 0,
          width: layout.contentSize.width,
          height: layout.contentSize.height,
          scale: 1,
        },
      });
      const png = Buffer.from(screenshot.data, 'base64');
      assert.equal(png.readUInt32BE(16), Math.round(layout.contentSize.width));
      fs.writeFileSync(path.join(evidence, file), png);
      await session.detach();
      visual.push({
        check: 'native-browser-zoom',
        route,
        zoom: 2,
        file,
        metrics: await page.evaluate(() => ({
          width: innerWidth,
          ratio: devicePixelRatio,
        })),
      });
    }
  } finally {
    await context.close();
  }
});

test('UI12: other tabs discard private account A data after logout and show the current account B', async () => {
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage();
  try {
    await login(page, f.teacherA);
    const other = await context.newPage();
    await other.goto(web + '/dashboard/teacher');
    await other
      .getByRole('heading', { name: 'Xin chào, ' + f.teacherA.fullName })
      .waitFor();
    await logoutDialog(page);
    await confirmLogout(page);
    await page.waitForURL('**/login');
    await other.waitForURL('**/login');
    assert(!(await other.textContent('body')).includes(f.teacherA.email));
    await login(page, f.studentB);
    await other
      .locator('header')
      .getByText(f.studentB.fullName, { exact: true })
      .waitFor();
    const body = await other.textContent('body');
    assert(
      !body.includes(f.teacherA.email) && !body.includes(f.teacherA.fullName),
    );
  } finally {
    await context.close();
  }
});

test('UI13: an inactive account and real CSRF rejection stay on login with accurate errors', async () => {
  const context = await browser.newContext(),
    page = await context.newPage();
  try {
    await call(
      f.admin,
      'PATCH',
      '/users/' + f.studentB.id + '/status',
      { isActive: false },
      200,
    );
    await page.goto(web + '/login');
    await page.getByLabel('Email', { exact: true }).fill(f.studentB.email);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
    const denied = page.waitForResponse(
      (r) => r.url() === api + '/auth/login' && r.status() === 401,
    );
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await denied;
    await page
      .getByRole('alert')
      .filter({ hasText: 'tài khoản không còn hoạt động' })
      .waitFor();
    assert.equal(new URL(page.url()).pathname, '/login');
    assert(!(await context.cookies()).some((c) => c.name.endsWith('_token')));
    await page.getByLabel('Email', { exact: true }).fill(f.teacherA.email);
    await page.route('**/auth/login', async (route) => {
      const response = await route.fetch({
        headers: {
          ...route.request().headers(),
          origin: 'http://localhost:3104',
        },
      });
      assert.equal(response.status(), 403);
      await route.fulfill({ response });
    });
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: '(403)' }).waitFor();
    assert.equal(new URL(page.url()).pathname, '/login');
    assert(!(await context.cookies()).some((c) => c.name.endsWith('_token')));
  } finally {
    await context.close();
    await call(
      f.admin,
      'PATCH',
      '/users/' + f.studentB.id + '/status',
      { isActive: true },
      200,
    );
  }
});

test('UI14: invalid email is local validation and a real double click sends only one pending login', async () => {
  const context = await browser.newContext(),
    page = await context.newPage(),
    release = gate();
  let count = 0;
  try {
    await page.goto(web + '/login');
    await page.getByLabel('Email', { exact: true }).fill('invalid-email');
    await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    assert.equal(
      await page
        .getByLabel('Email', { exact: true })
        .getAttribute('aria-invalid'),
      'true',
    );
    await page.getByLabel('Email', { exact: true }).fill(f.studentA.email);
    await page.route('**/auth/login', async (route) => {
      count++;
      await release.promise;
      await route.continue();
    });
    await page
      .getByRole('button', { name: 'Đăng nhập', exact: true })
      .dblclick();
    await waitUntil(() => count === 1);
    assert(await page.getByLabel('Email', { exact: true }).isDisabled());
    assert.equal(count, 1);
    release.resolve();
    await page.waitForURL('**/dashboard/student');
    assert.equal(count, 1);
  } finally {
    release.resolve();
    await context.close();
  }
});

test('UI15: actual 15 second login and logout timeouts report uncertainty and allow retry', async () => {
  const context = await browser.newContext(),
    page = await context.newPage();
  const loginRelease = gate(),
    logoutRelease = gate();
  try {
    await page.goto(web + '/login');
    await page.getByLabel('Email', { exact: true }).fill(f.teacherA.email);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
    await page.route('**/auth/login', async (route) => {
      await loginRelease.promise;
      await route.abort().catch(() => {});
    });
    const started = Date.now();
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page
      .getByRole('alert')
      .filter({ hasText: 'Chưa xác nhận đăng nhập' })
      .waitFor({ timeout: 22000 });
    assert(Date.now() - started >= 14000);
    assert.equal(new URL(page.url()).pathname, '/login');
    assert(!(await context.cookies()).some((c) => c.name.endsWith('_token')));
    loginRelease.resolve();
    await page.unroute('**/auth/login');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL('**/dashboard/teacher');
    const before = (
      await db.query('SELECT "tokenVersion" FROM "User" WHERE id=$1', [
        f.teacherA.id,
      ])
    ).rows[0].tokenVersion;
    await page.route('**/auth/logout', async (route) => {
      await logoutRelease.promise;
      await route.abort().catch(() => {});
    });
    await logoutDialog(page);
    await confirmLogout(page);
    await page
      .getByRole('dialog')
      .getByRole('alert')
      .filter({ hasText: 'Máy chủ phản hồi quá lâu' })
      .waitFor({ timeout: 22000 });
    assert.equal(new URL(page.url()).pathname, '/dashboard/teacher');
    assert.equal(
      (
        await db.query('SELECT "tokenVersion" FROM "User" WHERE id=$1', [
          f.teacherA.id,
        ])
      ).rows[0].tokenVersion,
      before,
    );
    await page.screenshot({
      path: path.join(evidence, 'logout-timeout.png'),
      fullPage: true,
    });
    logoutRelease.resolve();
    await page.unroute('**/auth/logout');
    await confirmLogout(page, true);
    await page.waitForURL('**/login');
  } finally {
    loginRelease.resolve();
    logoutRelease.resolve();
    await context.close();
  }
});

test('UI16: authenticated revisit uses the server role, reflows, and hides cached identity when me fails', async () => {
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage();
  try {
    await login(page, f.teacherA);
    await page.goto(web + '/login?role=admin');
    const notice = page.locator('.auth-session-notice');
    await notice.getByText(f.teacherA.fullName, { exact: true }).waitFor();
    assert.equal(
      await notice.getByRole('link').getAttribute('href'),
      '/dashboard/teacher',
    );
    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await noOverflow(page);
    }
    await page.addScriptTag({
      path: requireWeb.resolve('axe-core/axe.min.js'),
    });
    const violations = await page.evaluate(
      async () =>
        (
          await axe.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
          })
        ).violations,
    );
    assert.deepEqual(
      violations.map((v) => v.id),
      [],
    );
    await page.screenshot({
      path: path.join(evidence, 'login-authenticated.png'),
      fullPage: true,
    });
    await page.route('**/auth/me', (route) => route.abort());
    await page.evaluate(() =>
      window.dispatchEvent(new Event('visibilitychange')),
    );
    await page
      .getByText('Chưa kiểm tra được tài khoản.', { exact: false })
      .waitFor();
    assert(!(await page.textContent('body')).includes(f.teacherA.fullName));
    assert(!(await notice.count()));
    assert.equal(
      await page
        .locator('header')
        .getByRole('link', { name: 'Đăng nhập', exact: true })
        .count(),
      0,
      'unknown header state must not claim verified guest',
    );
    await page.screenshot({
      path: path.join(evidence, 'login-account-unknown.png'),
      fullPage: true,
    });
    await page.unroute('**/auth/me');
    await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await notice.getByText(f.teacherA.fullName, { exact: true }).waitFor();
  } finally {
    await context.close();
  }
});

test('UI17: unsupported cross tab protection reports its actual reason and sends no login', async () => {
  const context = await browser.newContext(),
    page = await context.newPage();
  let requests = 0;
  try {
    await context.addInitScript(() =>
      Object.defineProperty(window, 'BroadcastChannel', {
        value: undefined,
        configurable: true,
      }),
    );
    page.on('request', (request) => {
      if (request.url() === api + '/auth/login') requests++;
    });
    await page.goto(web + '/login');
    await page.getByLabel('Email', { exact: true }).fill(f.studentA.email);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page
      .getByRole('alert')
      .filter({
        hasText: 'Trình duyệt không hỗ trợ kiểm tra bài thi ở tab khác',
      })
      .waitFor();
    assert.equal(requests, 0);
    assert(
      !(await page.locator('.auth-error').textContent()).includes(
        'Một phòng thi đang mở',
      ),
    );
  } finally {
    await context.close();
  }
});

test('UI18: a stalled real refresh aborts within its bound before a new login is sent', async () => {
  const context = await browser.newContext(),
    page = await context.newPage(),
    release = gate();
  let refreshes = 0,
    logins = 0;
  try {
    // Install cookies issued by the real HTTP login in beforeEach, before any app document.
    // This isolates the refresh under test from requests belonging to a document being unloaded.
    await context.addCookies(
      Object.entries(f.teacherA.cookies).map(([name, value]) => ({
        name,
        value,
        url: api,
        httpOnly: true,
        sameSite: 'Lax',
      })),
    );
    await context.addCookies([
      {
        name: 'access_token',
        value: 'invalid-test-access',
        url: api,
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);
    await page.route('**/auth/refresh', async (route) => {
      refreshes++;
      await release.promise;
      await route.abort().catch(() => {});
    });
    await page.goto(web + '/login');
    await waitUntil(() => refreshes === 1);
    await page.getByLabel('Email', { exact: true }).fill(f.studentB.email);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
    page.on('request', (request) => {
      if (request.url() === api + '/auth/login') logins++;
    });
    const started = Date.now();
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.getByRole('button', { name: 'Đang đăng nhập...' }).waitFor();
    assert.equal(logins, 0);
    await page.waitForURL('**/dashboard/student', { timeout: 23000 });
    assert(Date.now() - started >= 10000);
    assert.equal(logins, 1);
    assert.equal(refreshes, 1);
    await page
      .getByRole('heading', { name: 'Xin chào, ' + f.studentB.fullName })
      .waitFor();
  } finally {
    release.resolve();
    await context.close();
  }
});

test('UI19 theme follows system, survives reload/navigation and synchronizes tabs', async () => {
  const context = await browser.newContext({ colorScheme: 'dark' });
  try {
    const page = await context.newPage();
    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(web);
    await waitUntil(() =>
      page.evaluate(() => document.documentElement.classList.contains('dark')),
    );
    await page.getByRole('button', { name: 'Đổi giao diện sáng tối' }).click();
    await waitUntil(() =>
      page.evaluate(() => document.documentElement.classList.contains('light')),
    );
    assert.equal(
      await page.evaluate(() => localStorage.getItem('theme')),
      'light',
    );
    await page.reload();
    await waitUntil(() =>
      page.evaluate(() => document.documentElement.classList.contains('light')),
    );
    const other = await context.newPage();
    await other.goto(web + '/login');
    await waitUntil(() =>
      other.evaluate(() =>
        document.documentElement.classList.contains('light'),
      ),
    );
    await page.getByRole('button', { name: 'Đổi giao diện sáng tối' }).click();
    await waitUntil(() =>
      other.evaluate(() => document.documentElement.classList.contains('dark')),
    );
    await other.getByRole('button', { name: 'Đổi giao diện sáng tối' }).click();
    await waitUntil(() =>
      page.evaluate(() => document.documentElement.classList.contains('light')),
    );
    await page
      .getByRole('link', { name: 'Đăng nhập', exact: true })
      .first()
      .click();
    await page.waitForURL('**/login');
    assert.equal(await page.locator('html').getAttribute('class'), 'light');
    assert.deepEqual(
      errors.filter((error) =>
        /Encountered a script|hydration|didn't match|Minified React error/i.test(
          error,
        ),
      ),
      [],
    );
  } finally {
    await context.close();
  }
});
