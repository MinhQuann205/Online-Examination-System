const { test, before, after } = require('node:test');
const { createRequire } = require('node:module');
const path = require('node:path');
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
  call,
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
async function context(actor, mobile = false) {
  const c = await browser.newContext({
    viewport: mobile
      ? { width: 390, height: 844 }
      : { width: 1440, height: 1000 },
    ...(mobile ? { isMobile: true, hasTouch: true } : {}),
  });
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
const saved = (page) =>
  page.getByText('Đã lưu trên máy chủ', { exact: true }).waitFor();
async function workspace(mobile = false) {
  const attempt = await start(f, await assignment(f));
  const x = await context(f.studentA, mobile);
  await x.page.goto(`${web}/student/attempts/${attempt.id}`);
  await saved(x.page);
  return {
    ...x,
    attempt,
    match: attempt.snapshot.questions.find((q) => q.type === 'MATCHING'),
  };
}
async function persist(page, questionId, action) {
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith(`/answers/${questionId}`) &&
      r.request().method() === 'PUT' &&
      r.status() === 200,
  );
  await action();
  await response;
  await saved(page);
}
async function drag(page, right, left) {
  const source = page.getByRole('button', { name: right, exact: true }),
    target = page.getByText(left, { exact: true }).locator('..');
  await source.scrollIntoViewIfNeeded();
  const a = await source.boundingBox(),
    b = await target.boundingBox();
  assert(a && b);
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2, {
    steps: 3,
  });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 16 });
  await page.mouse.up();
}

test('F11: desktop correct/wrong matching, swap selected items by mouse, remove and reload', async () => {
  const x = await workspace(),
    q = x.match,
    full = f.version.snapshot.questions.find(
      (item) => item.questionId === q.questionId,
    );
  try {
    for (const pair of full.matchingPairs)
      await persist(x.page, q.questionId, () =>
        x.page
          .getByLabel(`Ghép ${pair.leftText}`, { exact: true })
          .selectOption(pair.rightId),
      );
    const left = full.matchingPairs[0],
      right = full.matchingPairs[1];
    await persist(x.page, q.questionId, () =>
      x.page
        .getByLabel(`Ghép ${left.leftText}`, { exact: true })
        .selectOption(right.rightId),
    );
    let row = (await answers(x.attempt.id)).find(
      (a) => a.questionId === q.questionId,
    );
    assert.equal(
      row.answer.pairs.find((p) => p.leftId === left.id).rightId,
      right.rightId,
    );
    assert.equal(
      row.answer.pairs.find((p) => p.leftId === right.id).rightId,
      left.rightId,
    );
    await persist(x.page, q.questionId, () =>
      drag(x.page, right.rightText, right.leftText),
    );
    row = (await answers(x.attempt.id)).find(
      (a) => a.questionId === q.questionId,
    );
    assert.equal(
      row.answer.pairs.find((p) => p.leftId === left.id).rightId,
      left.rightId,
    );
    assert.equal(
      row.answer.pairs.find((p) => p.leftId === right.id).rightId,
      right.rightId,
    );
    await persist(x.page, q.questionId, () =>
      x.page
        .getByLabel(`Ghép ${left.leftText}`, { exact: true })
        .selectOption(''),
    );
    const revision = (await answers(x.attempt.id))[0].revision;
    await x.page.reload();
    await saved(x.page);
    assert.equal(
      await x.page
        .getByLabel(`Ghép ${left.leftText}`, { exact: true })
        .inputValue(),
      '',
    );
    assert.equal((await answers(x.attempt.id))[0].revision, revision);
    assert.equal((await answers(x.attempt.id))[0].answer.pairs.length, 1);
  } finally {
    await x.c.close();
  }
});
test('F11: keyboard drag still creates a persisted matching answer', async () => {
  const x = await workspace(),
    q = x.match;
  try {
    const source = x.page.getByRole('button', {
        name: q.matchingOptions[0].rightText,
        exact: true,
      }),
      target = x.page
        .getByText(q.matchingPairs[0].leftText, { exact: true })
        .locator('..');
    await source.scrollIntoViewIfNeeded();
    const a = await source.boundingBox(),
      b = await target.boundingBox();
    assert(a && b);
    await persist(x.page, q.questionId, async () => {
      await source.focus();
      await x.page.keyboard.press('Space');
      const dx = b.x + b.width / 2 - a.x - a.width / 2,
        dy = b.y + b.height / 2 - a.y - a.height / 2;
      for (let i = 0; i < Math.round(Math.abs(dx) / 25); i++)
        await x.page.keyboard.press(dx < 0 ? 'ArrowLeft' : 'ArrowRight');
      for (let i = 0; i < Math.round(Math.abs(dy) / 25); i++)
        await x.page.keyboard.press(dy < 0 ? 'ArrowUp' : 'ArrowDown');
      await x.page.keyboard.press('Space');
    });
    assert.equal((await answers(x.attempt.id))[0].answer.pairs.length, 1);
  } finally {
    await x.c.close();
  }
});
test('F11: physical touch drag and mobile select retain autosave', async () => {
  const x = await workspace(true),
    q = x.match;
  try {
    const source = x.page.getByRole('button', {
        name: q.matchingOptions[0].rightText,
        exact: true,
      }),
      target = x.page
        .getByText(q.matchingPairs[0].leftText, { exact: true })
        .locator('..');
    await source.scrollIntoViewIfNeeded();
    const a = await source.boundingBox(),
      b = await target.boundingBox();
    assert(a && b);
    const cdp = await x.c.newCDPSession(x.page);
    await persist(x.page, q.questionId, async () => {
      const sx = a.x + a.width / 2,
        sy = a.y + a.height / 2,
        tx = b.x + b.width / 2,
        ty = b.y + b.height / 2;
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: sx, y: sy, id: 1 }],
      });
      await sleep(220);
      for (let i = 1; i <= 15; i++) {
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [
            {
              x: sx + ((tx - sx) * i) / 15,
              y: sy + ((ty - sy) * i) / 15,
              id: 1,
            },
          ],
        });
        await sleep(10);
      }
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      });
    });
    await persist(x.page, q.questionId, () =>
      x.page
        .getByLabel(`Ghép ${q.matchingPairs[0].leftText}`, { exact: true })
        .selectOption(q.matchingOptions[1].id),
    );
    assert.equal(
      (await answers(x.attempt.id))[0].answer.pairs[0].rightId,
      q.matchingOptions[1].id,
    );
  } finally {
    await x.c.close();
  }
});
test('F15: navigation, progress, review flag persistence, keyboard and mobile width', async () => {
  const x = await workspace(true),
    one = x.attempt.snapshot.questions[0];
  try {
    const deadline = (
      await db.query('SELECT "deadlineAt" FROM "ExamAttempt" WHERE id=$1', [
        x.attempt.id,
      ])
    ).rows[0].deadlineAt;
    await persist(x.page, one.questionId, () =>
      x.page.getByRole('radio').first().check(),
    );
    assert.equal(
      await x.page
        .getByRole('progressbar', { name: 'Tiến độ trả lời' })
        .getAttribute('value'),
      '1',
    );
    const card = x.page.locator(`#question-${one.questionId}`);
    const flagged = x.page.waitForResponse(
      (r) =>
        r.url().endsWith(`/review/${one.questionId}`) && r.status() === 200,
    );
    await card
      .getByRole('button', { name: 'Đánh dấu xem lại', exact: true })
      .click();
    await flagged;
    await card
      .getByRole('button', { name: 'Bỏ đánh dấu xem lại', exact: true })
      .waitFor();
    await x.page
      .getByRole('button', { name: 'Mục lục câu hỏi', exact: true })
      .click();
    const second = x.page
      .getByRole('dialog', { name: 'Mục lục câu hỏi', exact: true })
      .getByRole('button', { name: /^Đến câu 2:/ });
    await second.focus();
    await x.page.keyboard.press('Enter');
    await x.page
      .getByRole('dialog', { name: 'Mục lục câu hỏi', exact: true })
      .waitFor({ state: 'hidden' });
    await waitUntil(() =>
      x.page
        .locator('#question-' + x.attempt.snapshot.questions[1].questionId)
        .getAttribute('data-current')
        .then((value) => value === 'true'),
    );
    await x.page
      .getByRole('button', { name: 'Mục lục câu hỏi', exact: true })
      .click();
    assert.equal(await second.getAttribute('aria-current'), 'step');
    await x.page.keyboard.press('Escape');
    await x.page
      .getByRole('button', { name: 'Câu trước', exact: true })
      .click();
    await x.page.reload();
    await saved(x.page);
    await x.page
      .locator(`#question-${one.questionId}`)
      .getByRole('button', { name: 'Bỏ đánh dấu xem lại', exact: true })
      .waitFor();
    assert(await x.page.getByRole('radio').first().isChecked());
    assert.equal(
      (
        await db.query('SELECT "deadlineAt" FROM "ExamAttempt" WHERE id=$1', [
          x.attempt.id,
        ])
      ).rows[0].deadlineAt.toISOString(),
      deadline.toISOString(),
    );
    assert(
      await x.page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    );
  } finally {
    await x.c.close();
  }
});
test('F14/F10: reorder 3 to first, change total, reload, publish and assign explicit v1 via UI', async () => {
  const x = await context(f.teacherA);
  let exam, version;
  try {
    await x.page.goto(web + '/teacher/exams/new');
    await x.page
      .getByLabel('Tên đề thi', { exact: true })
      .fill(`P1 ordered ${suffix}`);
    for (const [i, q] of f.questions.entries()) {
      const item = x.page.locator('li').filter({ hasText: q.content });
      await item.getByRole('checkbox').check();
      await item
        .getByLabel('Điểm', { exact: true })
        .fill(String([2.5, 1.25, 3][i]));
    }
    await x.page
      .getByRole('button', { name: 'Đưa câu 3 lên', exact: true })
      .click();
    await x.page
      .getByRole('button', { name: 'Đưa câu 2 lên', exact: true })
      .click();
    await x.page.getByText('Tổng điểm: 6.75', { exact: true }).waitFor();
    const created = x.page.waitForResponse(
      (r) => r.url() === api + '/exams' && r.request().method() === 'POST',
    );
    await x.page
      .getByRole('button', { name: 'Lưu bản nháp', exact: true })
      .click();
    exam = await (await created).json();
    await x.page.waitForURL(`**/teacher/exams/${exam.id}`);
    await x.page.goto(`${web}/teacher/exams/${exam.id}/edit`);
    assert.equal(
      await x.page.getByLabel('Điểm câu 1', { exact: true }).inputValue(),
      '3',
    );
    await x.page.getByLabel('Điểm câu 1', { exact: true }).fill('4');
    await x.page.getByText('Tổng điểm: 7.75', { exact: true }).waitFor();
    await x.page
      .getByRole('button', { name: 'Lưu bản nháp', exact: true })
      .click();
    await x.page.waitForURL(`**/teacher/exams/${exam.id}`);
    const published = x.page.waitForResponse(
      (r) => r.url().endsWith('/publish') && r.request().method() === 'POST',
    );
    await x.page.getByRole('button', { name: 'Xuất bản', exact: true }).click();
    version = await (await published).json();
    assert.deepEqual(
      version.snapshot.questions.map((q) => q.questionId),
      [f.questions[2].id, f.questions[0].id, f.questions[1].id],
    );
    assert.equal(version.snapshot.questions[0].points, 4);
    await call(
      f.teacherA,
      'POST',
      `/exams/${exam.id}/new-version`,
      undefined,
      201,
    );
    await call(f.teacherA, 'POST', `/exams/${exam.id}/publish`, undefined, 201);
    await x.page.goto(web + '/teacher/assignments');
    await x.page
      .getByRole('combobox', { name: /^Đề thi/ })
      .selectOption(exam.id);
    await x.page
      .getByLabel('Phiên bản đề thi', { exact: true })
      .selectOption(version.id);
    await x.page.getByLabel('Lớp học').selectOption(f.classes.A.id);
    const assigned = x.page.waitForResponse(
      (r) =>
        r.url() === api + '/exam-assignments' &&
        r.request().method() === 'POST',
    );
    await x.page.getByRole('button', { name: 'Giao bài', exact: true }).click();
    const asg = await (await assigned).json();
    assert.equal(asg.examVersion.id, version.id);
    const a = await start(f, asg);
    assert.equal(a.version, 1);
    const learner = await context(f.studentA);
    try {
      await learner.page.goto(`${web}/student/attempts/${a.id}`);
      await saved(learner.page);
      assert(
        (
          await learner.page.locator('fieldset h2').first().textContent()
        ).includes(f.questions[2].content),
      );
    } finally {
      await learner.c.close();
    }
    assert.deepEqual(
      (
        await db.query('SELECT snapshot FROM "ExamVersion" WHERE id=$1', [
          version.id,
        ])
      ).rows[0].snapshot,
      version.snapshot,
    );
  } finally {
    await x.c.close();
  }
});
test('F13: 24-item lists expose page 2, preserve filter and show full Admin aggregate', async () => {
  const title = `P1 paging ${suffix}`;
  for (let i = 0; i < 24; i++)
    await call(
      f.teacherA,
      'POST',
      '/exams',
      {
        title: `${title} ${i}`,
        durationMin: 5,
        questions: [{ questionId: f.questions[0].id, points: 1 }],
      },
      201,
    );
  const published = (
    await call(
      f.teacherA,
      'POST',
      '/exams',
      {
        title: `P1 assigned ${suffix}`,
        durationMin: 5,
        questions: [{ questionId: f.questions[0].id, points: 1 }],
      },
      201,
    )
  ).data;
  await call(
    f.teacherA,
    'POST',
    `/exams/${published.id}/publish`,
    undefined,
    201,
  );
  for (let i = 0; i < 24; i++) {
    const asg = await assignment(f, { examId: published.id });
    const attempt = await start(f, asg);
    await call(
      f.studentA,
      'POST',
      `/exam-attempts/${attempt.id}/submit`,
      undefined,
      201,
    );
  }
  for (const [actor, route, label, term] of [
    [f.teacherA, '/teacher/exams', 'Tìm đề thi', title],
    [f.teacherA, '/teacher/results', 'Tìm kiếm', title],
    [f.admin, '/admin/exams', 'Tìm kiếm', title],
    [f.teacherA, '/teacher/assignments', 'Tìm kiếm', published.title],
    [f.studentA, '/student/exams', 'Tìm kiếm', published.title],
  ]) {
    const x = await context(actor),
      hold = gate(),
      entered = gate();
    try {
      await x.page.goto(web + route);
      await x.page.getByLabel(label, { exact: true }).fill(term);
      await x.page
        .getByText('24 bản ghi · Trang 1 / 2', { exact: true })
        .waitFor();
      await x.page.route(
        (url) => url.origin === api && url.searchParams.get('page') === '2',
        async (request) => {
          entered.resolve();
          await hold.promise;
          await request.continue();
        },
        { times: 1 },
      );
      await x.page
        .getByRole('button', { name: 'Trang sau', exact: true })
        .click();
      await entered.promise;
      await x.page.getByText(/^Đang tải danh sách/).waitFor();
      hold.resolve();
      await x.page
        .getByText('24 bản ghi · Trang 2 / 2', { exact: true })
        .waitFor();
      assert.equal(
        await x.page.getByLabel(label, { exact: true }).inputValue(),
        term,
      );
      if (route === '/teacher/exams') {
        await x.page.getByLabel(label, { exact: true }).fill(title + ' 0');
        await x.page
          .getByText('1 bản ghi · Trang 1 / 1', { exact: true })
          .waitFor();
      }
    } finally {
      hold.resolve();
      await x.c.close();
    }
  }
  const admin = await context(f.admin);
  try {
    await admin.page.goto(web + '/admin/exams');
    await admin.page
      .getByLabel('Tìm kiếm', { exact: true })
      .fill(published.title);
    await admin.page.getByText(/24 bài giao/).waitFor();
  } finally {
    await admin.c.close();
  }
  const results = await context(f.studentA);
  try {
    await results.page.goto(web + '/student/results');
    await results.page
      .getByText('24 bản ghi · Trang 1 / 2', { exact: true })
      .waitFor();
    assert.equal(
      await results.page
        .getByRole('link', { name: 'Xem bài làm', exact: true })
        .count(),
      20,
    );
    await results.page
      .getByRole('button', { name: 'Trang sau', exact: true })
      .click();
    await results.page
      .getByText('24 bản ghi · Trang 2 / 2', { exact: true })
      .waitFor();
    assert.equal(
      await results.page
        .getByRole('link', { name: 'Xem bài làm', exact: true })
        .count(),
      4,
    );
  } finally {
    await results.c.close();
  }
});
test('F20: Admin edits User, sees backend validation error, and reassigns a class via UI', async () => {
  const x = await context(f.admin);
  try {
    await x.page.goto(web + '/admin/users');
    await x.page
      .getByPlaceholder('Tìm kiếm...', { exact: true })
      .fill(f.studentA.email);
    await x.page
      .getByRole('button', { name: 'Xem chi tiết', exact: true })
      .click();
    const panel = x.page.locator('[aria-label="Chi tiết quản lý"]');
    await panel.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
    await panel.getByLabel('Email', { exact: true }).fill(f.teacherA.email);
    await panel
      .getByRole('button', { name: 'Lưu thay đổi', exact: true })
      .click();
    await panel.getByRole('alert').waitFor();
    await panel.getByLabel('Email', { exact: true }).fill(f.studentA.email);
    await panel.getByLabel('Họ và tên', { exact: true }).fill('P1 UI learner');
    await panel
      .getByRole('button', { name: 'Lưu thay đổi', exact: true })
      .click();
    await waitUntil(
      async () =>
        (
          await db.query('SELECT "fullName" FROM "User" WHERE id=$1', [
            f.studentA.id,
          ])
        ).rows[0].fullName === 'P1 UI learner',
    );
    await x.page.goto(web + '/admin/classes');
    await x.page
      .getByRole('button', { name: new RegExp(f.classes.A.name) })
      .click();
    await panel.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
    await panel
      .getByLabel('Tên lớp', { exact: true })
      .fill('P1 UI edited class');
    await panel
      .getByLabel('Giảng viên phụ trách', { exact: true })
      .selectOption(f.teacherB.id);
    await panel
      .getByRole('button', { name: 'Lưu thay đổi', exact: true })
      .click();
    await x.page
      .getByRole('dialog', { name: 'Đổi giảng viên phụ trách?' })
      .getByRole('button', { name: 'Xác nhận', exact: true })
      .click();
    await waitUntil(
      async () =>
        (
          await db.query('SELECT "teacherId" FROM "Class" WHERE id=$1', [
            f.classes.A.id,
          ])
        ).rows[0].teacherId === f.teacherB.id,
    );
    await call(
      f.admin,
      'PATCH',
      `/classes/${f.classes.A.id}`,
      { teacherId: f.teacherA.id },
      200,
    );
  } finally {
    await x.c.close();
  }
});
test('F20: Teacher edits all three question types and own class without changing published snapshots', async () => {
  const x = await context(f.teacherA),
    frozen = (
      await db.query('SELECT snapshot FROM "ExamVersion" WHERE id=$1', [
        f.version.id,
      ])
    ).rows[0].snapshot;
  try {
    for (const q of f.questions) {
      await x.page.goto(web + '/teacher/questions');
      await x.page
        .getByPlaceholder('Tìm kiếm...', { exact: true })
        .fill(q.content);
      await x.page
        .getByRole('button', { name: 'Xem chi tiết', exact: true })
        .click();
      const panel = x.page.locator('[aria-label="Chi tiết quản lý"]');
      await panel
        .getByRole('button', { name: 'Chỉnh sửa', exact: true })
        .click();
      await panel
        .getByPlaceholder('Nội dung câu hỏi')
        .fill(`P1 edited ${q.content}`);
      const changed = x.page.waitForResponse(
        (r) =>
          r.url().endsWith(`/questions/${q.id}`) &&
          r.request().method() === 'PATCH',
      );
      await panel
        .getByRole('button', { name: 'Lưu câu hỏi', exact: true })
        .click();
      assert.equal((await changed).status(), 200);
    }
    assert.deepEqual(
      (
        await db.query('SELECT snapshot FROM "ExamVersion" WHERE id=$1', [
          f.version.id,
        ])
      ).rows[0].snapshot,
      frozen,
    );
    await x.page.goto(web + '/teacher/classes');
    await x.page.getByRole('button', { name: /P1 UI edited class/ }).click();
    const panel = x.page.locator('[aria-label="Chi tiết quản lý"]');
    await panel.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
    assert.equal(
      await panel.getByLabel('Giảng viên phụ trách', { exact: true }).count(),
      0,
    );
    await panel
      .getByLabel('Mô tả lớp', { exact: true })
      .fill('Teacher owned class edit');
    await panel
      .getByRole('button', { name: 'Lưu thay đổi', exact: true })
      .click();
    await waitUntil(
      async () =>
        (
          await db.query('SELECT description FROM "Class" WHERE id=$1', [
            f.classes.A.id,
          ])
        ).rows[0].description === 'Teacher owned class edit',
    );
  } finally {
    await x.c.close();
  }
});

test('F13: question, exam, class and student pickers include records after page one', async () => {
  for (let index = 0; index < 21; index++) {
    const learner = (
      await call(
        f.admin,
        'POST',
        '/users',
        {
          email: `p1-picker-${index}-${suffix}@example.test`,
          fullName: `Picker learner ${index}`,
          role: 'STUDENT',
          password,
        },
        201,
      )
    ).data;
    await call(
      f.admin,
      'POST',
      `/classes/${f.classes.A.id}/students`,
      { studentId: learner.id },
      201,
    );
    await call(
      f.admin,
      'POST',
      '/classes',
      {
        name: `Picker class ${index}`,
        code: `P1-${suffix}-${index}`,
        teacherId: f.teacherA.id,
      },
      201,
    );
    await call(
      f.teacherA,
      'POST',
      '/questions',
      {
        type: 'SINGLE_CHOICE',
        content: `Picker new question ${index}`,
        options: [
          { content: 'Yes', isCorrect: true },
          { content: 'No', isCorrect: false },
        ],
      },
      201,
    );
  }
  const x = await context(f.teacherA);
  try {
    await x.page.goto(web + '/teacher/assignments');
    await x.page
      .getByRole('combobox', { name: /^Đề thi/ })
      .selectOption(f.exam.id);
    await x.page.getByLabel('Lớp học').selectOption(f.classes.A.id);
    await x.page.getByLabel('Giao cho').selectOption('student');
    await x.page
      .getByLabel('Học viên trong lớp bạn quản lý')
      .selectOption(f.studentA.id);
    assert.equal(
      await x.page.getByLabel('Học viên trong lớp bạn quản lý').inputValue(),
      f.studentA.id,
    );
    await x.page.goto(web + '/teacher/exams/new');
    await x.page
      .getByLabel('Tìm câu hỏi để chọn', { exact: true })
      .fill(`P1 edited ${f.questions[0].content}`);
    const item = x.page
      .locator('li')
      .filter({ hasText: `P1 edited ${f.questions[0].content}` });
    await item.getByRole('checkbox').check();
    await x.page.getByLabel('Điểm câu 1', { exact: true }).waitFor();
  } finally {
    await x.c.close();
  }
});
