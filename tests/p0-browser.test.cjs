const { test, before, after } = require('node:test');
const { createRequire } = require('node:module');
const path = require('node:path');
const http = require('node:http');
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
function expected(question, which, includeFirst = false) {
  if (question.type === 'SINGLE_CHOICE')
    return { optionId: question.options[which].id };
  if (question.type === 'MULTIPLE_CHOICE')
    return {
      optionIds: includeFirst
        ? [question.options[0].id, question.options[which].id]
        : [question.options[which].id],
    };
  return {
    pairs: [
      {
        leftId: question.matchingPairs[0].id,
        rightId: question.matchingOptions[which].id,
      },
    ],
  };
}

for (const type of ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'MATCHING']) {
  test(`F02/F03 ${type}: abort A three times, retain B, confirm PostgreSQL and reload`, async () => {
    const x = await workspace(type === 'MATCHING'),
      q = x.attempt.snapshot.questions.find((q) => q.type === type);
    const first = gate(),
      entered = gate();
    let count = 0;
    try {
      await x.page.route(`**/answers/${q.questionId}`, async (route) => {
        count++;
        if (count === 1) {
          entered.resolve();
          await first.promise;
        }
        if (count <= 3) await route.abort('connectionfailed');
        else await route.continue();
      });
      await select(x.page, q, 0);
      await entered.promise;
      await select(x.page, q, 1);
      first.resolve();
      await waitUntil(
        async () => count >= 4 && (await answers(x.attempt.id)).length === 1,
      );
      await saved(x.page);
      const stored = (await answers(x.attempt.id))[0];
      assert.deepEqual(
        stored.answer,
        expected(q, 1, type === 'MULTIPLE_CHOICE'),
      );
      await x.page.reload();
      await saved(x.page);
      if (type === 'MATCHING')
        assert.equal(
          await x.page
            .getByLabel(`Ghép ${q.matchingPairs[0].leftText}`, { exact: true })
            .inputValue(),
          q.matchingOptions[1].id,
        );
      else
        assert(
          await x.page
            .locator('#question-' + q.questionId)
            .getByLabel(q.options[1].content, { exact: true })
            .isChecked(),
        );
    } finally {
      first.resolve();
      await x.context.close();
    }
  });
  test(`F02 ${type}: delayed A must be followed by newest B`, async () => {
    const x = await workspace(type === 'MATCHING'),
      q = x.attempt.snapshot.questions.find((q) => q.type === type);
    const hold = gate(),
      entered = gate();
    let count = 0;
    try {
      await x.page.route(`**/answers/${q.questionId}`, async (route) => {
        if (++count === 1) {
          entered.resolve();
          await hold.promise;
        }
        await route.continue();
      });
      await select(x.page, q, 0);
      await entered.promise;
      await select(x.page, q, 1);
      hold.resolve();
      await waitUntil(
        async () => (await answers(x.attempt.id))[0]?.revision === 2,
      );
      await saved(x.page);
      assert.deepEqual(
        (await answers(x.attempt.id))[0].answer,
        expected(q, 1, type === 'MULTIPLE_CHOICE'),
      );
    } finally {
      hold.resolve();
      await x.context.close();
    }
  });
}

test('F03: response order reversed across two questions keeps global state pending', async () => {
  const x = await workspace(),
    hold = gate(),
    entered = gate();
  const [one, two] = x.attempt.snapshot.questions;
  try {
    await x.page.route(`**/answers/${one.questionId}`, async (route) => {
      entered.resolve();
      await hold.promise;
      await route.continue();
    });
    await select(x.page, one, 0);
    await entered.promise;
    await select(x.page, two, 0);
    await waitUntil(async () =>
      (await answers(x.attempt.id)).some(
        (row) => row.questionId === two.questionId,
      ),
    );
    assert.equal(
      await x.page.getByText('Đã lưu trên máy chủ', { exact: true }).count(),
      0,
    );
    assert(
      await x.page
        .getByText('Đang lưu câu trả lời…', { exact: true })
        .isVisible(),
    );
    hold.resolve();
    await saved(x.page);
    assert.equal((await answers(x.attempt.id)).length, 2);
  } finally {
    hold.resolve();
    await x.context.close();
  }
});
test('F03: another question success cannot hide failure; retry preserves answers', async () => {
  const x = await workspace(),
    [one, two] = x.attempt.snapshot.questions;
  try {
    await x.page.route(`**/answers/${one.questionId}`, (route) =>
      route.abort('connectionfailed'),
    );
    await select(x.page, one, 0);
    await x.page
      .getByRole('button', { name: 'Thử lưu lại', exact: true })
      .waitFor();
    await select(x.page, two, 0);
    await waitUntil(async () =>
      (await answers(x.attempt.id)).some(
        (row) => row.questionId === two.questionId,
      ),
    );
    assert.equal(
      await x.page.getByText('Đã lưu trên máy chủ', { exact: true }).count(),
      0,
    );
    await x.page.unroute(`**/answers/${one.questionId}`);
    await x.page
      .getByRole('button', { name: 'Thử lưu lại', exact: true })
      .click();
    await saved(x.page);
    assert.equal((await answers(x.attempt.id)).length, 2);
  } finally {
    await x.context.close();
  }
});
test('F02/F03: submit waits for pending autosave and grades the acknowledged answer', async () => {
  const x = await workspace(),
    hold = gate(),
    entered = gate(),
    q = x.attempt.snapshot.questions[0];
  let submitted = false;
  try {
    await x.page.route(`**/answers/${q.questionId}`, async (route) => {
      entered.resolve();
      await hold.promise;
      await route.continue();
    });
    x.page.on('request', (r) => {
      if (r.url().endsWith('/submit')) submitted = true;
    });
    await select(x.page, q, 0);
    await entered.promise;
    x.page.once('dialog', (dialog) => dialog.accept());
    await x.page.getByRole('button', { name: 'Nộp bài', exact: true }).click();
    await x.page
      .getByRole('button', { name: 'Xác nhận nộp bài', exact: true })
      .click();
    await x.page
      .getByRole('dialog', { name: 'Xác nhận nộp bài?', exact: true })
      .getByRole('button', { name: 'Đang nộp...', exact: true })
      .waitFor();
    await sleep(250);
    assert.equal(submitted, false);
    assert.equal(await x.page.locator('fieldset').getAttribute('disabled'), '');
    hold.resolve();
    await x.page.waitForURL(`**/student/results/${x.attempt.id}`);
    assert.equal(
      (
        await db.query('SELECT status,score FROM "ExamAttempt" WHERE id=$1', [
          x.attempt.id,
        ])
      ).rows[0].score,
      '2.50',
    );
  } finally {
    hold.resolve();
    await x.context.close();
  }
});
test('F02: two tabs conflict is explicit; confirmation reconciles the latest local choice', async () => {
  const x = await workspace(),
    q = x.attempt.snapshot.questions[0],
    other = await x.context.newPage();
  try {
    await other.goto(`${web}/student/attempts/${x.attempt.id}`);
    await saved(other);
    await select(x.page, q, 0);
    await saved(x.page);
    await select(other, q, 1);
    await other.getByText(/Đáp án đã thay đổi ở phiên khác/).waitFor();
    assert.deepEqual((await answers(x.attempt.id))[0].answer, expected(q, 0));
    other.once('dialog', (dialog) => dialog.accept());
    await other
      .getByRole('button', { name: 'Thử lưu lại', exact: true })
      .click();
    await saved(other);
    assert.deepEqual((await answers(x.attempt.id))[0].answer, expected(q, 1));
  } finally {
    await x.context.close();
  }
});

test('F04: hydrated login, wrong password and connection failure never leak credentials', async () => {
  const context = await browser.newContext(),
    page = await context.newPage(),
    urls = [];
  page.on('request', (r) => urls.push(r.url()));
  try {
    await page.goto(web + '/login');
    await page.getByLabel('Email', { exact: true }).fill(f.studentA.email);
    await page
      .getByLabel('Mật khẩu', { exact: true })
      .fill('Invalid-password-only');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page
      .locator('[role="alert"]:not(#__next-route-announcer__)')
      .waitFor();
    assert.equal(new URL(page.url()).pathname, '/login');
    await page.route('**/auth/login', (r) => r.abort('connectionrefused'));
    await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page
      .getByText(/Failed to fetch|fetch|network|Không kết nối được máy chủ/i)
      .waitFor();
    assert.equal(new URL(page.url()).pathname, '/login');
    await page.unroute('**/auth/login');
    await login(page, f.studentA);
    assert(urls.every((url) => !new URL(url).searchParams.has('password')));
  } finally {
    await context.close();
  }
});
for (const mode of ['no JavaScript', 'before hydration']) {
  test(`F04: ${mode} disables credentials and native fallback is POST without query`, async () => {
    const context = await browser.newContext({
        javaScriptEnabled: mode !== 'no JavaScript',
      }),
      page = await context.newPage(),
      urls = [];
    try {
      if (mode === 'before hydration')
        await page.route('**/_next/**/*.js', (r) => r.abort());
      page.on('request', (r) =>
        urls.push({ url: r.url(), method: r.method() }),
      );
      await page.goto(web + '/login');
      assert.equal(await page.locator('form').getAttribute('method'), 'post');
      assert(await page.getByLabel('Mật khẩu', { exact: true }).isDisabled());
      // Force a native submission to test the fallback even if controls are bypassed.
      const post = page.waitForRequest((r) =>
        r.url().endsWith('/login/unavailable'),
      );
      await page.evaluate(() =>
        HTMLFormElement.prototype.submit.call(document.querySelector('form')),
      );
      assert.equal((await post).method(), 'POST');
      await page.waitForURL('**/login/unavailable');
      assert(urls.every((r) => !new URL(r.url).searchParams.has('password')));
      await page.goBack();
      assert(!new URL(page.url()).searchParams.has('password'));
    } finally {
      await context.close();
    }
  });
}

test('F06: real same-site attacker no-cors POST cannot submit using cookies', async () => {
  const x = await workspace();
  const server = http.createServer((request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end(
      `<script>fetch('${api}/exam-attempts/${x.attempt.id}/submit',{method:'POST',credentials:'include',mode:'no-cors'}).then(()=>document.title='sent')</script>`,
    );
  });
  try {
    await new Promise((resolve, reject) =>
      server.listen(3104, resolve).on('error', reject),
    );
    const response = x.context.waitForEvent('response', (r) =>
      r.url().endsWith(`/exam-attempts/${x.attempt.id}/submit`),
    );
    const attacker = await x.context.newPage();
    await attacker.goto('http://localhost:3104');
    assert.equal((await response).status(), 403);
    assert.equal(
      (
        await db.query('SELECT status FROM "ExamAttempt" WHERE id=$1', [
          x.attempt.id,
        ])
      ).rows[0].status,
      'IN_PROGRESS',
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await x.context.close();
  }
});

test('F01: Admin creates Student and Teacher via actual management UI; both can login', async () => {
  const context = await browser.newContext(),
    page = await context.newPage();
  try {
    await login(page, f.admin);
    for (const role of ['STUDENT', 'TEACHER']) {
      await page.goto(web + '/admin/users');
      const email = `p0-ui-${role.toLowerCase()}-${suffix}@example.test`;
      await page.getByPlaceholder('Email', { exact: true }).fill(email);
      await page
        .getByPlaceholder('Họ và tên', { exact: true })
        .fill(`P0 UI ${role}`);
      await page.locator('form select').selectOption(role);
      await page
        .getByPlaceholder('Mật khẩu tạm (ít nhất 12 ký tự)', { exact: true })
        .fill(password);
      const posted = page.waitForResponse(
        (r) => r.url() === api + '/users' && r.request().method() === 'POST',
      );
      await page
        .getByRole('button', { name: 'Tạo tài khoản', exact: true })
        .click();
      const response = await posted;
      assert.equal(response.status(), 201);
      assert(
        !JSON.stringify(await response.json()).match(/passwordHash|password/),
      );
      const stored = (
        await db.query('SELECT "passwordHash" FROM "User" WHERE email=$1', [
          email,
        ])
      ).rows[0];
      assert(stored.passwordHash.startsWith('$argon2'));
      const c = await browser.newContext(),
        p = await c.newPage();
      try {
        await login(p, { email, role });
      } finally {
        await c.close();
      }
    }
  } finally {
    await context.close();
  }
});

test('main E2E: Teacher creates 3 types, publishes/assigns; Student reloads/submits; Teacher/Admin results', async () => {
  const tc = await browser.newContext(),
    sc = await browser.newContext(),
    ac = await browser.newContext();
  const teacher = await tc.newPage(),
    student = await sc.newPage(),
    admin = await ac.newPage(),
    questions = [];
  try {
    await login(teacher, f.teacherA);
    await teacher.goto(web + '/teacher/questions');
    for (const type of ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'MATCHING']) {
      const form = teacher.locator('form').first();
      await form.locator('select').first().selectOption(type);
      await form
        .getByPlaceholder('Nội dung câu hỏi')
        .fill(`P0 UI ${type} ${suffix}`);
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
      .fill(`P0 UI Exam ${suffix}`);
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
    assert.equal((await published).status(), 201);
    await teacher
      .getByRole('button', { name: 'Giao bài', exact: true })
      .click();
    await teacher
      .getByRole('combobox', { name: /^Đề thi/ })
      .selectOption(exam.id);
    await teacher.getByLabel('Lớp học').selectOption(f.classes.A.id);
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
    await login(student, f.studentA);
    await student.goto(web + '/student/exams');
    const heading = student.getByRole('heading', {
      name: exam.title,
      exact: true,
    });
    const started = student.waitForResponse(
      (r) => r.url().endsWith('/start') && r.request().method() === 'POST',
    );
    await heading
      .locator('..')
      .locator('..')
      .locator('..')
      .getByRole('button', { name: /Bắt đầu/ })
      .click();
    const attempt = await (await started).json();
    await student.waitForURL(`**/student/attempts/${attempt.id}`);
    await saved(student);
    await student.getByLabel('UI SINGLE_CHOICE A', { exact: true }).check();
    await saved(student);
    await student.getByLabel('UI MULTIPLE_CHOICE A', { exact: true }).check();
    await student.getByLabel('UI MULTIPLE_CHOICE B', { exact: true }).check();
    await saved(student);
    // Use the supported mobile matching control, without changing desktop P1 behavior.
    await student.setViewportSize({ width: 390, height: 844 });
    const matching = questions.find((q) => q.type === 'MATCHING');
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
    await student.reload();
    await saved(student);
    assert(
      await student
        .getByLabel('UI SINGLE_CHOICE A', { exact: true })
        .isChecked(),
    );
    assert.equal((await answers(attempt.id)).length, 3);
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
      .filter({ hasText: f.studentA.fullName });
    await resultRow.getByText('6.75 / 6.75', { exact: true }).waitFor();
    await resultRow
      .getByRole('link', { name: 'Chi tiết', exact: true })
      .click();
    await teacher.waitForURL(`**/teacher/results/${attempt.id}`);
    await login(admin, f.admin);
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
      .filter({ hasText: f.studentA.fullName })
      .getByText('6.75 / 6.75', { exact: true })
      .waitFor();
  } finally {
    await tc.close();
    await sc.close();
    await ac.close();
  }
});
