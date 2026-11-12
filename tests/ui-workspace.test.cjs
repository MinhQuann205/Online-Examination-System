const { test, before, beforeEach, after } = require('node:test');
const { createRequire } = require('node:module');
const fs = require('node:fs'),
  path = require('node:path'),
  os = require('node:os'),
  crypto = require('node:crypto');
const {
  assert,
  api,
  web,
  db,
  fixtures,
  assignment,
  start,
  answers,
  call,
  login,
  password,
  sleep,
  waitUntil,
} = require('./p0-support.cjs');
const req = createRequire(path.resolve(__dirname, '../apps/web/package.json')),
  { chromium } = req('playwright');
const evidence = fs.mkdtempSync(
    path.join(os.tmpdir(), 'examspace-ui08-browser-'),
  ),
  checks = [];
let browser, f;
before(async () => {
  f = await fixtures();
  browser = await chromium.launch({
    channel: process.env.P0_BROWSER_CHANNEL || 'msedge',
    headless: true,
  });
});
beforeEach(async () => {
  for (const actor of [f.admin, f.teacherA, f.studentA, f.studentB])
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
const gate = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
async function context(actor = f.studentA, width = 1440) {
  const c = await browser.newContext({
    viewport: { width, height: 1000 },
    hasTouch: width === 390,
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
  page.setDefaultTimeout(12000);
  return { c, page };
}
async function workspace(width = 1440, pinnedAssignment) {
  const attempt = await start(f, pinnedAssignment ?? (await assignment(f)));
  const x = await context(f.studentA, width);
  await x.page.goto(web + '/student/attempts/' + attempt.id);
  await saved(x.page);
  return { ...x, attempt };
}
const saved = (page) =>
  page.getByText('Đã lưu trên máy chủ', { exact: true }).waitFor();
const question = (page, id) => page.locator('#question-' + id);
const choose = (page, q, index = 0) =>
  question(page, q.id).locator('input[type=radio]').nth(index).check();
const back = (page) =>
  page
    .getByRole('button', { name: 'Quay lại danh sách bài thi', exact: true })
    .click();
const leave = (page) =>
  page.getByRole('dialog', { name: 'Rời phòng thi?', exact: true });
async function state(id) {
  return (
    await db.query(
      'SELECT status,score::text,"maxScore"::text,extract(epoch from "deadlineAt")*1000 as deadline_ms,"reviewQuestionIds" FROM "ExamAttempt" WHERE id=$1',
      [id],
    )
  ).rows[0];
}
async function snap(page, name) {
  await page.screenshot({
    path: path.join(evidence, name + '.png'),
    fullPage: true,
  });
}
async function submit(page) {
  await page.getByRole('button', { name: 'Nộp bài', exact: true }).click();
  await page
    .getByRole('button', { name: 'Xác nhận nộp bài', exact: true })
    .click();
}

test('NAV-01: Student Dashboard → Assigned Exams → verified root sidebar return (UI09)', async () => {
  const x = await context();
  try {
    await x.page.goto(web + '/dashboard/student');
    await x.page
      .getByRole('navigation', { name: 'Điều hướng chính', exact: true })
      .getByRole('link', { name: 'Bài thi được giao', exact: true })
      .click();
    await x.page.waitForURL('**/student/exams');
    assert.equal(await x.page.locator('.page-back-button').count(), 0);
    await x.page
      .getByRole('navigation', { name: 'Điều hướng chính', exact: true })
      .getByRole('link', { name: 'Tổng quan', exact: true })
      .click();
    await x.page.waitForURL('**/dashboard/student');
    checks.push({ case: 'NAV-01', result: 'PASS' });
  } finally {
    await x.c.close();
  }
});

test('NAV-02: saved workspace leave never submits; reopening preserves deadline/revision', async () => {
  const x = await workspace();
  try {
    await choose(x.page, f.questions[0]);
    await saved(x.page);
    await back(x.page);
    await leave(x.page)
      .getByText('Các câu trả lời hiện tại đã được máy chủ xác nhận lưu.')
      .waitFor();
    await snap(x.page, 'leave-saved');
    await leave(x.page)
      .getByRole('button', { name: 'Tôi hiểu, rời phòng thi' })
      .click();
    await x.page.waitForURL('**/student/exams');
    assert.equal((await state(x.attempt.id)).status, 'IN_PROGRESS');
    await x.page.goto(web + '/student/attempts/' + x.attempt.id);
    await saved(x.page);
    assert(
      await question(x.page, f.questions[0].id)
        .locator('input')
        .first()
        .isChecked(),
    );
    assert.equal((await answers(x.attempt.id))[0].revision, 1);
    assert.equal(
      Number((await state(x.attempt.id)).deadline_ms),
      Date.parse(x.attempt.deadlineAt),
    );
    checks.push({ case: 'NAV-02', result: 'PASS' });
  } finally {
    await x.c.close();
  }
});

test('NAV-03: pending PUT + Browser Back retains draft/queue; cancel and recover', async () => {
  const x = await workspace();
  const entered = gate(),
    release = gate();
  let puts = 0;
  try {
    await x.page.route('**/exam-attempts/*/answers/*', async (r) => {
      puts++;
      entered.resolve();
      await release.promise;
      await r.continue();
    });
    await choose(x.page, f.questions[0]);
    await entered.promise;
    await snap(x.page, 'pending-save');
    await x.page.goBack();
    await leave(x.page)
      .getByText(/Có câu trả lời đang chờ lưu/)
      .waitFor();
    assert.equal((await answers(x.attempt.id)).length, 0);
    assert(
      await question(x.page, f.questions[0].id)
        .locator('input')
        .first()
        .isChecked(),
    );
    await snap(x.page, 'leave-pending');
    await leave(x.page)
      .getByRole('button', { name: 'Ở lại phòng thi' })
      .click();
    release.resolve();
    await saved(x.page);
    assert.equal(puts, 1);
    assert.equal((await answers(x.attempt.id))[0].revision, 1);
    await x.page.goBack();
    await leave(x.page).waitFor();
    await leave(x.page)
      .getByRole('button', { name: 'Ở lại phòng thi' })
      .click();
    assert.match(x.page.url(), /student\/attempts/);
    checks.push({ case: 'NAV-03', result: 'PASS' });
  } finally {
    release.resolve();
    await x.c.close();
  }
});

test('NAV-04: save failure leave warning and retry preserve latest local draft', async () => {
  const x = await workspace();
  try {
    await x.page.route('**/exam-attempts/*/answers/*', (r) =>
      r.abort('connectionreset'),
    );
    await choose(x.page, f.questions[0], 1);
    await x.page.getByText(/Lỗi lưu\./).waitFor();
    await back(x.page);
    await leave(x.page)
      .getByText(/lưu thất bại/)
      .waitFor();
    assert.equal((await answers(x.attempt.id)).length, 0);
    await leave(x.page)
      .getByRole('button', { name: 'Ở lại phòng thi' })
      .click();
    assert(
      await question(x.page, f.questions[0].id)
        .locator('input')
        .nth(1)
        .isChecked(),
    );
    await x.page.unroute('**/exam-attempts/*/answers/*');
    await x.page
      .getByRole('button', { name: 'Thử lưu lại', exact: true })
      .click();
    await saved(x.page);
    assert.deepEqual((await answers(x.attempt.id))[0].answer, {
      optionId: f.questions[0].options[1].id,
    });
    checks.push({ case: 'NAV-04', result: 'PASS' });
  } finally {
    await x.c.close();
  }
});

test('NAV-05: real revision409 never overwrites other tab without confirmation', async () => {
  const x = await workspace();
  try {
    const q = f.questions[0];
    await call(
      f.studentA,
      'PUT',
      '/exam-attempts/' + x.attempt.id + '/answers/' + q.id,
      { revision: 1, answer: { optionId: q.options[0].id } },
      200,
    );
    await choose(x.page, q, 1);
    await x.page.getByText(/Xung đột phiên bản \(409\)/).waitFor();
    await back(x.page);
    await leave(x.page)
      .getByText(/Đang có xung đột/)
      .waitFor();
    assert.equal((await answers(x.attempt.id))[0].revision, 1);
    await leave(x.page)
      .getByRole('button', { name: 'Ở lại phòng thi' })
      .click();
    x.page.once('dialog', (d) => d.accept());
    await x.page
      .getByRole('button', { name: 'Thử lưu lại', exact: true })
      .click();
    await saved(x.page);
    const row = (await answers(x.attempt.id))[0];
    assert.equal(row.revision, 2);
    assert.deepEqual(row.answer, { optionId: q.options[1].id });
    checks.push({ case: 'NAV-05', result: 'PASS' });
  } finally {
    await x.c.close();
  }
});

test('NAV-06: submit pending blocks leaving and duplicate submit', async () => {
  const x = await workspace(),
    entered = gate(),
    release = gate();
  let posts = 0;
  try {
    await x.page.route('**/exam-attempts/*/submit', async (r) => {
      posts++;
      entered.resolve();
      await release.promise;
      await r.continue();
    });
    await submit(x.page);
    await entered.promise;
    await x.page.goBack();
    await leave(x.page)
      .getByText(/Đang nộp bài/)
      .waitFor();
    assert(
      await leave(x.page)
        .getByRole('button', { name: 'Tôi hiểu, rời phòng thi' })
        .isDisabled(),
    );
    assert.equal((await state(x.attempt.id)).status, 'IN_PROGRESS');
    await leave(x.page)
      .getByRole('button', { name: 'Ở lại phòng thi' })
      .click();
    release.resolve();
    await x.page.waitForURL('**/student/results/' + x.attempt.id);
    assert.equal(posts, 1);
    assert.equal((await state(x.attempt.id)).status, 'SUBMITTED');
    checks.push({ case: 'NAV-06', result: 'PASS' });
  } finally {
    release.resolve();
    await x.c.close();
  }
});

test('NAV-07/NAV-14: question navigation/theme/palette never remount queue or duplicate writes', async () => {
  const x = await workspace(390),
    release = gate(),
    entered = gate();
  let puts = 0;
  try {
    await x.page.route('**/exam-attempts/*/answers/*', async (r) => {
      puts++;
      entered.resolve();
      await release.promise;
      await r.continue();
    });
    await choose(x.page, f.questions[0]);
    await entered.promise;
    await x.page.getByRole('button', { name: 'Câu sau', exact: true }).click();
    await x.page
      .getByRole('button', { name: 'Câu trước', exact: true })
      .click();
    await x.page
      .getByRole('button', { name: 'Mục lục câu hỏi', exact: true })
      .click();
    await x.page.keyboard.press('Escape');
    await x.page
      .getByRole('button', { name: 'Đổi giao diện sáng tối' })
      .click();
    assert(
      await question(x.page, f.questions[0].id)
        .locator('input')
        .first()
        .isChecked(),
    );
    release.resolve();
    await saved(x.page);
    assert.equal(puts, 1);
    assert.equal((await answers(x.attempt.id))[0].revision, 1);
    checks.push({ case: 'NAV-07/NAV-14', result: 'PASS' });
  } finally {
    release.resolve();
    await x.c.close();
  }
});

test('NAV-08: Teacher list/detail Back uses verified list; filters are local page state', async () => {
  const x = await context(f.teacherA);
  try {
    await x.page.goto(web + '/teacher/exams');
    await x.page
      .locator('a[href="/teacher/exams/' + f.exam.id + '"]')
      .first()
      .click();
    await x.page.waitForURL(/teacher\/exams\/[0-9a-f-]+$/);
    await x.page
      .getByRole('button', { name: 'Quay lại danh sách đề thi', exact: true })
      .click();
    await x.page.waitForURL('**/teacher/exams');
    checks.push({
      case: 'NAV-08',
      result: 'PASS',
      limitation:
        'List filters/page live in component state; not promised across unmount.',
    });
  } finally {
    await x.c.close();
  }
});

test('NAV-09: Admin inline detail Back retains list and current identity', async () => {
  const x = await context(f.admin);
  try {
    await x.page.goto(web + '/admin/users');
    await x.page
      .getByRole('button', { name: /Xem chi tiết/ })
      .first()
      .click();
    await x.page.getByRole('heading', { name: 'Chi tiết tài khoản' }).waitFor();
    await x.page
      .getByRole('button', { name: 'Quay lại danh sách người dùng' })
      .click();
    assert.equal(
      await x.page.getByRole('heading', { name: 'Chi tiết tài khoản' }).count(),
      0,
    );
    await x.page
      .getByRole('complementary', { name: 'Điều hướng quản trị' })
      .getByText(f.admin.email, { exact: true })
      .waitFor();
    checks.push({ case: 'NAV-09', result: 'PASS' });
  } finally {
    await x.c.close();
  }
});

test('NAV-10: direct result detail uses role-safe fallback, never external/login history', async () => {
  const attempt = await start(f, await assignment(f));
  await call(
    f.studentA,
    'POST',
    '/exam-attempts/' + attempt.id + '/submit',
    undefined,
    201,
  );
  const x = await context();
  try {
    await x.page.goto(web + '/student/results/' + attempt.id);
    await x.page
      .getByRole('button', { name: 'Quay lại lịch sử kết quả' })
      .click();
    await x.page.waitForURL('**/student/results');
    checks.push({ case: 'NAV-10', result: 'PASS' });
  } finally {
    await x.c.close();
  }
});

test('NAV-11/NAV-13: A logout→B Browser Back/Forward and wrong-role URL cannot expose A', async () => {
  const x = await context(f.teacherA);
  try {
    await x.page.goto(web + '/dashboard/teacher');
    await x.page
      .getByRole('navigation', { name: 'Điều hướng chính', exact: true })
      .getByRole('link', { name: 'Ngân hàng câu hỏi', exact: true })
      .click();
    await x.page
      .getByRole('button', { name: 'Đăng xuất', exact: true })
      .click();
    await x.page.getByRole('button', { name: 'Đồng ý đăng xuất' }).click();
    await x.page.waitForURL('**/login');
    await x.page.getByLabel('Email', { exact: true }).fill(f.studentB.email);
    await x.page.getByLabel('Mật khẩu', { exact: true }).fill(password);
    await x.page
      .getByRole('button', { name: 'Đăng nhập', exact: true })
      .click();
    await x.page.waitForURL('**/dashboard/student');
    await x.page.goBack();
    await x.page.waitForLoadState('networkidle');
    assert.equal(
      await x.page.getByText(f.teacherA.email, { exact: true }).count(),
      0,
    );
    await x.page.goForward();
    await x.page.waitForLoadState('networkidle');
    assert.equal(
      await x.page.getByText(f.teacherA.email, { exact: true }).count(),
      0,
    );
    await x.page.goto(web + '/teacher/questions');
    await x.page.waitForURL('**/dashboard/student');
    assert.equal(
      await x.page.getByText(f.teacherA.email, { exact: true }).count(),
      0,
    );
    checks.push({ case: 'NAV-11/NAV-13', result: 'PASS' });
  } finally {
    await x.c.close();
  }
});

for (const width of [390, 768])
  test(
    'NAV-12: ' +
      width +
      'px mobile palette/Back keyboard focus and Escape preserve answers',
    async () => {
      const x = await workspace(width);
      try {
        await choose(x.page, f.questions[0]);
        await saved(x.page);
        const trigger = x.page.getByRole('button', {
          name: 'Mục lục câu hỏi',
          exact: true,
        });
        await trigger.focus();
        await x.page.keyboard.press('Enter');
        const dialog = x.page.getByRole('dialog', {
          name: 'Mục lục câu hỏi',
          exact: true,
        });
        await dialog.waitFor();
        await snap(x.page, 'mobile-palette-' + width);
        await x.page.keyboard.press('Tab');
        assert(
          await dialog.evaluate((el) => el.contains(document.activeElement)),
        );
        await x.page.keyboard.press('Escape');
        assert(await trigger.evaluate((el) => el === document.activeElement));
        await trigger.click();
        await x.page
          .getByRole('dialog', { name: 'Mục lục câu hỏi', exact: true })
          .getByRole('button', { name: /Đến câu 2:/ })
          .click();
        await waitUntil(() =>
          question(x.page, f.questions[1].id).evaluate(
            (el) => el === document.activeElement,
          ),
        );
        await x.page.keyboard.press('Tab');
        assert(
          await question(x.page, f.questions[1].id)
            .getByRole('button', { name: 'Đánh dấu xem lại', exact: true })
            .evaluate((el) => el === document.activeElement),
        );
        const backButton = x.page.getByRole('button', {
          name: 'Quay lại danh sách bài thi',
          exact: true,
        });
        await backButton.focus();
        await x.page.keyboard.press('Space');
        await leave(x.page).waitFor();
        assert.equal(
          await x.page.locator(':focus').textContent(),
          'Ở lại phòng thi',
        );
        await x.page.keyboard.press('Escape');
        assert(
          await backButton.evaluate((el) => el === document.activeElement),
        );
        assert.equal((await answers(x.attempt.id))[0].revision, 1);
        checks.push({ case: 'NAV-12', width, result: 'PASS' });
      } finally {
        await x.c.close();
      }
    },
  );

test('UI08-01: three types/review/v1 pinned after v2/full SQL grading6.75 and policy', async () => {
  const pinned = await assignment(f, { examVersionId: f.version.id });
  const pinnedSnapshot = (
    await db.query('SELECT snapshot FROM "ExamVersion" WHERE id=$1', [
      f.version.id,
    ])
  ).rows[0].snapshot;
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
      title: 'UI08 changed v2',
      durationMin: 45,
      questions: f.questions.map((q) => ({ questionId: q.id, points: 5 })),
    },
    200,
  );
  await call(
    f.teacherA,
    'POST',
    '/exams/' + f.exam.id + '/publish',
    undefined,
    201,
  );
  const x = await workspace(1440, pinned);
  try {
    const snapshot = x.attempt.snapshot;
    const canonical = (s) => ({
      ...s,
      questions: s.questions.map((q) => ({
        ...q,
        matchingOptions: [...q.matchingOptions].sort((a, b) =>
          a.id.localeCompare(b.id),
        ),
      })),
    });
    const sqlAttempt = (
      await db.query(
        'SELECT "examVersionId","examVersion","examSnapshot" FROM "ExamAttempt" WHERE id=$1',
        [x.attempt.id],
      )
    ).rows[0];
    assert.equal(sqlAttempt.examVersionId, f.version.id);
    assert.equal(sqlAttempt.examVersion, 1);
    assert.deepEqual(sqlAttempt.examSnapshot, pinnedSnapshot);
    assert.deepEqual(
      (
        await db.query('SELECT snapshot FROM "ExamVersion" WHERE id=$1', [
          f.version.id,
        ])
      ).rows[0].snapshot,
      pinnedSnapshot,
    );
    assert.equal(x.attempt.version, 1);
    assert.equal(snapshot.title, f.exam.title);
    assert.equal(snapshot.durationMin, 30);
    assert.deepEqual(
      snapshot.questions.map((q) => q.questionId),
      f.questions.map((q) => q.id),
    );
    assert.deepEqual(
      snapshot.questions.map((q) => q.points),
      [2.5, 1.25, 3],
    );
    await x.page.reload();
    await saved(x.page);
    await x.page
      .getByRole('heading', { name: x.attempt.snapshot.title, exact: true })
      .waitFor();
    const remoteSnapshot = (
      await call(
        f.studentA,
        'GET',
        '/exam-attempts/' + x.attempt.id,
        undefined,
        200,
      )
    ).data.snapshot;
    assert.deepEqual(canonical(remoteSnapshot), canonical(snapshot));
    await choose(x.page, f.questions[0]);
    const multiple = question(x.page, f.questions[1].id);
    await multiple.locator('input').nth(0).check();
    await multiple.locator('input').nth(1).check();
    await multiple.locator('input').nth(0).uncheck();
    await multiple.locator('input').nth(0).check();
    const matching = question(x.page, f.questions[2].id);
    for (const pair of f.questions[2].matchingPairs)
      await matching
        .getByLabel('Ghép ' + pair.leftText, { exact: true })
        .selectOption(
          x.attempt.snapshot.questions
            .find((q) => q.questionId === f.questions[2].id)
            .matchingOptions.find(
              (option) => option.rightText === pair.rightText,
            ).id,
        );
    await saved(x.page);
    const before = await answers(x.attempt.id);
    assert.equal(before.length, 3);
    const matchSnapshot = snapshot.questions.find((q) => q.type === 'MATCHING');
    const expectedPairs = f.questions[2].matchingPairs.map((pair) => ({
      leftId: matchSnapshot.matchingPairs.find(
        (left) => left.leftText === pair.leftText,
      ).id,
      rightId: matchSnapshot.matchingOptions.find(
        (o) => o.rightText === pair.rightText,
      ).id,
    }));
    assert.deepEqual(
      before.find((row) => row.questionId === f.questions[2].id).answer,
      { pairs: expectedPairs },
    );
    assert(before.every((row) => row.revision > 0));
    await matching
      .getByRole('button', { name: 'Đánh dấu xem lại', exact: true })
      .click();
    await matching
      .getByRole('button', { name: 'Bỏ đánh dấu xem lại' })
      .waitFor();
    assert.deepEqual(await answers(x.attempt.id), before);
    assert.deepEqual((await state(x.attempt.id)).reviewQuestionIds, [
      f.questions[2].id,
    ]);
    await x.page.reload();
    await saved(x.page);
    assert.deepEqual(await answers(x.attempt.id), before);
    for (const pair of f.questions[2].matchingPairs)
      assert.equal(
        await question(x.page, f.questions[2].id)
          .getByLabel('Ghép ' + pair.leftText, { exact: true })
          .inputValue(),
        expectedPairs.find(
          (p) =>
            p.leftId ===
            matchSnapshot.matchingPairs.find(
              (left) => left.leftText === pair.leftText,
            ).id,
        ).rightId,
      );
    assert(
      await question(x.page, f.questions[0].id)
        .locator('input')
        .first()
        .isChecked(),
    );
    assert.equal(
      await question(x.page, f.questions[1].id)
        .locator('input:checked')
        .count(),
      2,
    );
    await snap(x.page, 'matching');
    await x.page.getByRole('button', { name: 'Nộp bài', exact: true }).click();
    await snap(x.page, 'submit-dialog');
    await x.page
      .getByRole('button', { name: 'Xác nhận nộp bài', exact: true })
      .click();
    await x.page.waitForURL('**/student/results/' + x.attempt.id);
    const row = await state(x.attempt.id);
    assert.equal(Number(row.score), 6.75);
    assert.equal(Number(row.maxScore), 6.75);
    for (const actor of [f.studentA, f.teacherA, f.admin])
      assert.equal(
        (await call(actor, 'GET', '/results/' + x.attempt.id, undefined, 200))
          .data.id,
        x.attempt.id,
      );
    await call(f.studentB, 'GET', '/results/' + x.attempt.id, undefined, 403);
    checks.push({ case: 'UI08-01', result: 'PASS', sqlScore: '6.75/6.75' });
  } finally {
    await x.c.close();
  }
});

test('UI08-02: submit connection loss AFTER real commit reconciles without duplicate POST', async () => {
  const x = await workspace();
  let posts = 0;
  try {
    await x.page.route('**/exam-attempts/*/submit', async (r) => {
      posts++;
      await r.fetch();
      await r.abort('connectionreset');
    });
    await submit(x.page);
    await x.page.waitForURL('**/student/results/' + x.attempt.id);
    assert.equal(posts, 1);
    assert.equal((await state(x.attempt.id)).status, 'SUBMITTED');
    checks.push({ case: 'UI08-02', result: 'PASS' });
  } finally {
    await x.c.close();
  }
});

test('UI08-03: submit unavailable + status unavailable stays UNKNOWN, no fake success', async () => {
  const x = await workspace();
  let posts = 0;
  try {
    await x.page.route('**/exam-attempts/*/submit', (r) => {
      posts++;
      return r.abort('connectionreset');
    });
    await x.page.route('**/exam-attempts/' + x.attempt.id, (r) =>
      r.abort('connectionreset'),
    );
    await submit(x.page);
    await x.page
      .getByRole('dialog')
      .getByText(/Kết quả nộp chưa xác nhận/)
      .waitFor();
    assert.equal((await state(x.attempt.id)).status, 'IN_PROGRESS');
    assert.equal(posts, 1);
    await x.page.goBack();
    await leave(x.page)
      .getByText(/Kết quả nộp chưa xác nhận/)
      .waitFor();
    assert(
      await leave(x.page)
        .getByRole('button', { name: 'Tôi hiểu, rời phòng thi' })
        .isDisabled(),
    );
    await leave(x.page)
      .getByRole('button', { name: 'Ở lại phòng thi' })
      .click();
    await x.page.unroute('**/exam-attempts/' + x.attempt.id);
    await x.page
      .getByRole('dialog')
      .getByRole('button', { name: 'Kiểm tra trạng thái máy chủ' })
      .click();
    await x.page
      .getByRole('button', { name: 'Xác nhận nộp bài', exact: true })
      .waitFor();
    await x.page.unroute('**/exam-attempts/*/submit');
    await x.page
      .getByRole('button', { name: 'Xác nhận nộp bài', exact: true })
      .click();
    await x.page.waitForURL('**/student/results/' + x.attempt.id);
    assert.equal((await state(x.attempt.id)).status, 'SUBMITTED');
    checks.push({ case: 'UI08-03', result: 'PASS' });
  } finally {
    await x.c.close();
  }
});

test('UI08-04: unavailable near deadline never extends time or claims client submission', async () => {
  const asg = await assignment(f, {
    closesAt: new Date(Date.now() + 6000).toISOString(),
  });
  const attempt = await start(f, asg),
    x = await context();
  try {
    await x.page.goto(web + '/student/attempts/' + attempt.id);
    await saved(x.page);
    await x.page.route('**/exam-attempts/*', (r) => r.abort('connectionreset'));
    await x.page.getByText(/Đã đến hạn theo đồng hồ thiết bị/).waitFor();
    await x.page
      .getByRole('alert')
      .getByText(/Chưa xác nhận trạng thái/)
      .waitFor();
    assert.match(x.page.url(), /student\/attempts/);
    assert.equal(
      Number((await state(attempt.id)).deadline_ms),
      Date.parse(attempt.deadlineAt),
    );
    await x.page.unroute('**/exam-attempts/*');
    await x.page
      .getByRole('button', { name: 'Kiểm tra trạng thái máy chủ' })
      .click();
    await x.page.waitForURL('**/student/results/' + attempt.id);
    assert.equal((await state(attempt.id)).status, 'EXPIRED');
    checks.push({ case: 'UI08-04', result: 'PASS' });
  } finally {
    await x.c.close();
  }
});

for (const width of [390, 768, 1024, 1440])
  test(
    'UI08-visual: ' + width + 'px LIGHT/DARK, axe/reflow/reduced-motion',
    async () => {
      const x = await workspace(width);
      try {
        await x.page.emulateMedia({ reducedMotion: 'reduce' });
        for (const theme of ['light', 'dark']) {
          await x.page.evaluate((theme) => {
            localStorage.setItem('theme', theme);
            document.documentElement.classList.toggle('dark', theme === 'dark');
          }, theme);
          await x.page.addScriptTag({
            path: req.resolve('axe-core/axe.min.js'),
          });
          const violations = await x.page.evaluate(async () =>
            (
              await axe.run(document, {
                runOnly: {
                  type: 'tag',
                  values: ['wcag2a', 'wcag2aa', 'wcag21aa'],
                },
              })
            ).violations.map((v) => ({
              id: v.id,
              nodes: v.nodes.map((n) => n.target),
            })),
          );
          checks.push({ width, theme, violations });
          assert.deepEqual(violations, []);
          assert(
            await x.page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          );
          await snap(x.page, 'workspace-' + width + '-' + theme);
        }
        await back(x.page);
        await x.page.keyboard.press('Escape');
      } finally {
        await x.c.close();
      }
    },
  );

test('UI08-05: owned API TEST intentional stop mid-save then reconnect SQL recovery', async () => {
  assert.equal(
    process.env.UI08_PROCESS_CONTROL,
    '1',
    'Runner must explicitly own API control',
  );
  const controlDir = process.env.UI08_CONTROL_DIRECTORY;
  assert(controlDir && fs.existsSync(controlDir));
  async function control(action) {
    const id = crypto.randomUUID();
    fs.writeFileSync(
      path.join(controlDir, 'request.json'),
      JSON.stringify({ id, action }),
    );
    await waitUntil(
      () => fs.existsSync(path.join(controlDir, id + '.json')),
      20000,
    );
    const reply = JSON.parse(
      fs.readFileSync(path.join(controlDir, id + '.json'), 'utf8'),
    );
    assert.equal(reply.success, true);
  }
  const x = await workspace(),
    entered = gate(),
    release = gate();
  let stopped = false;
  try {
    await x.page.route('**/exam-attempts/*/answers/*', async (r) => {
      entered.resolve();
      await release.promise;
      await r.continue();
    });
    await choose(x.page, f.questions[0], 2);
    await entered.promise;
    await control('stop-test-api');
    stopped = true;
    release.resolve();
    await x.page.getByText(/Lỗi lưu\./).waitFor();
    await back(x.page);
    await leave(x.page)
      .getByText(/lưu thất bại/)
      .waitFor();
    assert.equal((await answers(x.attempt.id)).length, 0);
    await leave(x.page)
      .getByRole('button', { name: 'Ở lại phòng thi' })
      .click();
    assert(
      await question(x.page, f.questions[0].id)
        .locator('input')
        .nth(2)
        .isChecked(),
    );
    await control('restart-test-api');
    stopped = false;
    await x.page.unroute('**/exam-attempts/*/answers/*');
    await x.page
      .getByRole('button', { name: 'Thử lưu lại', exact: true })
      .click();
    await saved(x.page);
    assert.equal((await answers(x.attempt.id))[0].revision, 1);
    assert.deepEqual((await answers(x.attempt.id))[0].answer, {
      optionId: f.questions[0].options[2].id,
    });
    assert.equal((await state(x.attempt.id)).status, 'IN_PROGRESS');
    checks.push({
      case: 'UI08-05',
      result: 'PASS',
      intentionalStop: true,
      nativeCrashReproduced: false,
    });
  } finally {
    release.resolve();
    if (stopped) await control('restart-test-api');
    await x.c.close();
  }
});

async function noOverflow(page) {
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
}
test('UI08-06: actual native browser zoom200 on workspace, mobile Back and reflow', async () => {
  const longQuestion = (
    await call(
      f.teacherA,
      'POST',
      '/questions',
      {
        type: 'SINGLE_CHOICE',
        content: 'Nội dung dài cần xuống dòng ' + 'X'.repeat(240),
        options: [
          { content: 'Đáp án dài '.repeat(30), isCorrect: true },
          { content: 'Lựa chọn khác', isCorrect: false },
        ],
      },
      201,
    )
  ).data;
  const longExam = (
    await call(
      f.teacherA,
      'POST',
      '/exams',
      {
        title: 'UI08 long text zoom',
        durationMin: 30,
        questions: [{ questionId: longQuestion.id, points: 1 }],
      },
      201,
    )
  ).data;
  const longVersion = (
    await call(
      f.teacherA,
      'POST',
      '/exams/' + longExam.id + '/publish',
      undefined,
      201,
    )
  ).data;
  const attempt = await start(
    f,
    await assignment(f, { examId: longExam.id, examVersionId: longVersion.id }),
  );
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
    await context.addCookies(
      Object.entries(f.studentA.cookies).map(([name, value]) => ({
        name,
        value,
        url: api,
        httpOnly: true,
        sameSite: 'Lax',
      })),
    );
    const worker =
      context.serviceWorkers()[0] ||
      (await context.waitForEvent('serviceworker'));
    const page = await context.newPage();
    for (const route of ['/student/attempts/' + attempt.id]) {
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
      checks.push({
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

test('UI08-07: submit response timeout after real commit reconciles status once', async () => {
  const x = await workspace();
  let posts = 0;
  try {
    await x.page.route('**/exam-attempts/*/submit', async (r) => {
      posts++;
      const response = await r.fetch();
      await sleep(16000);
      await r.fulfill({ response }).catch(() => {});
    });
    await submit(x.page);
    await x.page.waitForURL('**/student/results/' + x.attempt.id, {
      timeout: 22000,
    });
    assert.equal(posts, 1);
    assert.equal((await state(x.attempt.id)).status, 'SUBMITTED');
    checks.push({ case: 'UI08-07', result: 'PASS', timeoutMs: 15000 });
  } finally {
    await x.c.close();
  }
});

test('UI08-08: flush failure keeps latest draft and never sends submit until save recovers', async () => {
  const x = await workspace();
  let posts = 0;
  try {
    x.page.on('request', (r) => {
      if (r.method() === 'POST' && r.url().endsWith('/submit')) posts++;
    });
    await x.page.route('**/exam-attempts/*/answers/*', (r) =>
      r.abort('connectionreset'),
    );
    await choose(x.page, f.questions[0], 2);
    await x.page.getByText(/Lỗi lưu\./).waitFor();
    await submit(x.page);
    await x.page
      .getByRole('dialog')
      .getByRole('button', { name: 'Xác nhận nộp bài', exact: true })
      .waitFor({ state: 'visible' });
    await waitUntil(() =>
      x.page
        .getByRole('dialog')
        .getByRole('button', { name: 'Xác nhận nộp bài', exact: true })
        .isEnabled(),
    );
    assert.equal(posts, 0);
    assert.equal((await state(x.attempt.id)).status, 'IN_PROGRESS');
    assert.equal((await answers(x.attempt.id)).length, 0);
    await x.page
      .getByRole('button', { name: 'Tiếp tục làm bài', exact: true })
      .click();
    assert(
      await question(x.page, f.questions[0].id)
        .locator('input')
        .nth(2)
        .isChecked(),
    );
    await x.page.unroute('**/exam-attempts/*/answers/*');
    await x.page
      .getByRole('button', { name: 'Thử lưu lại', exact: true })
      .click();
    await saved(x.page);
    const row = (await answers(x.attempt.id))[0];
    assert.equal(row.revision, 1);
    assert.deepEqual(row.answer, { optionId: f.questions[0].options[2].id });
    await submit(x.page);
    await x.page.waitForURL('**/student/results/' + x.attempt.id);
    assert.equal(posts, 1);
    assert.equal((await state(x.attempt.id)).status, 'SUBMITTED');
    checks.push({ case: 'UI08-08', result: 'PASS' });
  } finally {
    await x.c.close();
  }
});

test('UI08-09: rapid A→B→C while A and C are pending saves only A then latest C', async () => {
  const x = await workspace(),
    first = gate(),
    last = gate(),
    enteredFirst = gate(),
    enteredLast = gate();
  const payloads = [];
  try {
    await x.page.route('**/exam-attempts/*/answers/*', async (r) => {
      payloads.push(r.request().postDataJSON());
      if (payloads.length === 1) {
        enteredFirst.resolve();
        await first.promise;
      } else {
        enteredLast.resolve();
        await last.promise;
      }
      await r.continue();
    });
    await choose(x.page, f.questions[0], 0);
    await enteredFirst.promise;
    await choose(x.page, f.questions[0], 1);
    await choose(x.page, f.questions[0], 2);
    assert(
      await question(x.page, f.questions[0].id)
        .locator('input')
        .nth(2)
        .isChecked(),
    );
    first.resolve();
    await enteredLast.promise;
    assert.equal(
      await x.page.getByText('Đã lưu trên máy chủ', { exact: true }).count(),
      0,
    );
    await back(x.page);
    await leave(x.page)
      .getByText(/Có câu trả lời đang chờ lưu/)
      .waitFor();
    await leave(x.page)
      .getByRole('button', { name: 'Ở lại phòng thi' })
      .click();
    last.resolve();
    await saved(x.page);
    assert.equal(payloads.length, 2);
    assert.deepEqual(
      payloads.map((p) => p.answer.optionId),
      [f.questions[0].options[0].id, f.questions[0].options[2].id],
    );
    const row = (await answers(x.attempt.id))[0];
    assert.equal(row.revision, 2);
    assert.deepEqual(row.answer, { optionId: f.questions[0].options[2].id });
    await x.page.reload();
    await saved(x.page);
    assert(
      await question(x.page, f.questions[0].id)
        .locator('input')
        .nth(2)
        .isChecked(),
    );
    checks.push({ case: 'UI08-09', result: 'PASS' });
  } finally {
    first.resolve();
    last.resolve();
    await x.c.close();
  }
});

test('UI08-10: pending review blocks leave with reason and warns before reload without answer writes', async () => {
  const x = await workspace(),
    entered = gate(),
    release = gate();
  try {
    await x.page.route('**/exam-attempts/*/review/*', async (r) => {
      entered.resolve();
      await release.promise;
      await r.continue();
    });
    await question(x.page, f.questions[0].id)
      .getByRole('button', { name: 'Đánh dấu xem lại', exact: true })
      .click();
    await entered.promise;
    await back(x.page);
    await leave(x.page)
      .getByText(/Đang lưu đánh dấu xem lại/)
      .waitFor();
    assert(
      await leave(x.page)
        .getByRole('button', { name: 'Tôi hiểu, rời phòng thi' })
        .isDisabled(),
    );
    assert.equal((await answers(x.attempt.id)).length, 0);
    await leave(x.page)
      .getByRole('button', { name: 'Ở lại phòng thi' })
      .click();
    let prevented = false;
    x.page.once('dialog', async (d) => {
      assert.equal(d.type(), 'beforeunload');
      prevented = true;
      await d.dismiss();
    });
    await x.page.reload({ timeout: 3000 }).catch(() => {});
    assert(prevented, 'Reload must warn while review mutation is pending');
    release.resolve();
    await question(x.page, f.questions[0].id)
      .getByRole('button', { name: 'Bỏ đánh dấu xem lại' })
      .waitFor();
    assert.equal((await answers(x.attempt.id)).length, 0);
    assert.deepEqual((await state(x.attempt.id)).reviewQuestionIds, [
      f.questions[0].id,
    ]);
    checks.push({ case: 'UI08-10', result: 'PASS' });
  } finally {
    release.resolve();
    await x.c.close();
  }
});
