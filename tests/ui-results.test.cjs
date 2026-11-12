const { test, before, beforeEach, after } = require('node:test'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  { createRequire } = require('module');
const {
  assert,
  api,
  web,
  db,
  call,
  login: loginActor,
  password,
  suffix,
  assignment,
  start,
  answers,
  waitUntil,
} = require('./p0-support.cjs');
const {
  resultsFixtures,
  pairDefinitions,
  payloads,
  row,
  upgrade,
  originalExplanation,
} = require('./ui-results-support.cjs');
const req = createRequire(path.resolve(__dirname, '../apps/web/package.json')),
  { chromium } = req('playwright'),
  evidence = fs.mkdtempSync(path.join(os.tmpdir(), 'examspace-ui09-browser-')),
  checks = [];
let f, browser;
before(async () => {
  f = await resultsFixtures();
  browser = await chromium.launch({ channel: 'msedge', headless: true });
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
async function context(actor = f.teacherA, width = 1440) {
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
  const p = await c.newPage();
  p.setDefaultTimeout(12000);
  return { c, p };
}
const screenshot = (p, name) =>
  p.screenshot({ path: path.join(evidence, name + '.png'), fullPage: true });
const resultRoot = (p) => p.locator('[data-result-id]');
const report = (p) =>
  p.locator('[data-report-assignment="' + f.cases.both.asg.id + '"]');
async function readyResult(p, id) {
  await p.goto(web + '/student/results/' + id);
  await resultRoot(p).waitFor();
}
async function sidebar(p, label = 'Kết quả') {
  assert.equal(await p.locator('.admin-sidebar').count(), 1);
  assert.equal(await p.locator('.admin-topbar').count(), 1);
  await p
    .getByRole('navigation', { name: 'Điều hướng chính', exact: true })
    .getByRole('link', { name: label, exact: true })
    .waitFor();
  assert.equal(
    await p
      .getByRole('navigation', { name: 'Điều hướng chính', exact: true })
      .getByRole('link', { name: label, exact: true })
      .getAttribute('aria-current'),
    'page',
  );
}
async function bottomBack(p, label) {
  const b = p.getByRole('button', { name: label, exact: true });
  await b.waitFor();
  assert.equal(
    await p.evaluate(() => {
      const content = document.querySelector('#admin-navigation-content'),
        action = document.querySelector('.contextual-back');
      return Boolean(
        content &&
        action &&
        content.compareDocumentPosition(action) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      );
    }),
    true,
  );
  assert(
    await b.evaluate(
      (el) =>
        el.getBoundingClientRect().width <
        el.closest('main').getBoundingClientRect().width * 0.95,
    ),
  );
  return b;
}
function record(cases, extra = {}) {
  checks.push({ cases, result: 'PASS', ...extra });
}

test('UI09 RESULT-LAYOUT-01/02/03/04/05/09 BACK-01/02/03/04/05/14: Teacher shell survives list/detail/direct/refresh, Back bottom only', async () => {
  const { c, p } = await context();
  try {
    await p.goto(web + '/dashboard/teacher');
    await p
      .getByRole('heading', { name: 'Xin chào, ' + f.teacherA.fullName })
      .waitFor();
    assert.equal(await p.locator('.page-back-button').count(), 0);
    await screenshot(p, 'teacher-dashboard-no-back');
    await p
      .getByRole('navigation', { name: 'Điều hướng chính', exact: true })
      .getByRole('link', { name: 'Kết quả', exact: true })
      .click();
    await p
      .locator('a[href="/teacher/exams/' + f.c.exam.id + '/results"]')
      .waitFor();
    await sidebar(p);
    assert.equal(await p.locator('.page-back-button').count(), 0);
    await screenshot(p, 'teacher-results-index');
    await p
      .locator('a[href="/teacher/exams/' + f.c.exam.id + '/results"]')
      .click();
    await report(p).waitFor();
    await sidebar(p);
    const b = await bottomBack(p, 'Quay lại Kết quả thi');
    await b.scrollIntoViewIfNeeded();
    await screenshot(p, 'teacher-results-report-bottom-back');
    await b.click();
    await p.waitForURL('**/teacher/results');
    assert.equal(await p.locator('.page-back-button').count(), 0);
    await p.goto(web + '/teacher/exams/' + f.c.exam.id + '/results');
    await report(p).waitFor();
    await p.reload();
    await report(p).waitFor();
    await sidebar(p);
    await screenshot(p, 'teacher-results-report-sidebar');
    await p.goto(web + '/teacher/exams/' + f.c.exam.id);
    await p
      .getByRole('heading', { name: f.c.exam.title, exact: true })
      .waitFor();
    await bottomBack(p, 'Quay lại danh sách đề thi');
    record([
      'RESULT-LAYOUT-01',
      'RESULT-LAYOUT-02',
      'RESULT-LAYOUT-03',
      'RESULT-LAYOUT-04',
      'RESULT-LAYOUT-05',
      'RESULT-LAYOUT-09',
      'BACK-01',
      'BACK-02',
      'BACK-03',
      'BACK-04',
      'BACK-05',
      'BACK-14',
    ]);
  } finally {
    await c.close();
  }
});
test('UI09 BACK-06/07 RESULT-05: Admin/Student root pages never render Back despite history; Student detail uses bottom parent', async () => {
  for (const [actor, routes] of [
    [
      f.admin,
      ['/dashboard/admin', '/admin/users', '/admin/classes', '/admin/exams'],
    ],
    [
      f.studentA,
      [
        '/dashboard/student',
        '/student/classes',
        '/student/exams',
        '/student/results',
      ],
    ],
    [
      f.teacherA,
      [
        '/teacher/classes',
        '/teacher/questions',
        '/teacher/exams',
        '/teacher/assignments',
      ],
    ],
  ]) {
    const { c, p } = await context(actor);
    try {
      for (const route of routes) {
        await p.goto(web + route);
        await p.locator('#admin-content').waitFor();
        assert.equal(await p.locator('.page-back-button').count(), 0, route);
      }
      if (actor === f.studentA) {
        await screenshot(p, 'student-results-index');
        await readyResult(p, f.cases.both.attempt.id);
        await sidebar(p, 'Kết quả của tôi');
        await screenshot(p, 'student-result-detail');
        const b = await bottomBack(p, 'Quay lại lịch sử kết quả');
        await b.click();
        await p.waitForURL('**/student/results');
      }
    } finally {
      await c.close();
    }
  }
  record(['BACK-06', 'BACK-07', 'BACK-08', 'BACK-09', 'RESULT-05']);
});
test('UI09 RESULT-06 BACK-09: Admin reports/detail stay in Admin shell and expose only real rows', async () => {
  const { c, p } = await context(f.admin);
  try {
    await p.goto(web + '/admin/exams');
    await p.getByLabel('Tìm kiếm', { exact: true }).fill(f.c.exam.title);
    const link = p.locator(`a[href="/admin/exams/${f.c.exam.id}/results"]`);
    await link.waitFor();
    await link.click();
    await report(p).waitFor();
    await sidebar(p, 'Theo dõi bài thi');
    await bottomBack(p, 'Quay lại Theo dõi bài thi');
    await screenshot(p, 'admin-report');
    await report(p)
      .locator(`a[href="/admin/results/${f.cases.both.attempt.id}"]`)
      .click();
    await resultRoot(p).waitFor();
    await sidebar(p, 'Theo dõi bài thi');
    await p.getByText('6.75 / 6.75', { exact: true }).waitFor();
    await bottomBack(p, 'Quay lại Theo dõi bài thi');
    record(['RESULT-06', 'BACK-09']);
  } finally {
    await c.close();
  }
});
test('UI09 MATCH-01/02/03/04/05/06/07/08/09/10/13/14/15: author clear pairs and preview without mutations; save/publish v1, start after v2 and SQL6.75', async () => {
  const teacher = await context(),
    student = await context(f.studentA);
  let questionPosts = 0,
    attemptMutations = 0;
  try {
    const p = teacher.p;
    await p.goto(web + '/teacher/questions');
    const form = p.locator('#teacher-create-question form');
    await form
      .getByLabel('Loại câu hỏi', { exact: true })
      .selectOption('MATCHING');
    await form.getByText(/Mỗi hàng là một cặp đáp án đúng\./).waitFor();
    assert(
      await form
        .getByRole('button', { name: 'Xóa cặp 1', exact: true })
        .isDisabled(),
    );
    for (let i = 0; i < 2; i++) {
      await form
        .getByLabel('Nội dung cần ghép ' + (i + 1), { exact: true })
        .fill(pairDefinitions[i].leftText);
      await form
        .getByLabel('Đáp án đúng tương ứng ' + (i + 1), { exact: true })
        .fill(pairDefinitions[i].rightText);
    }
    await form.getByRole('button', { name: 'Thêm cặp', exact: true }).click();
    await form.getByLabel('Nội dung cần ghép 3', { exact: true }).fill('SSD');
    await form
      .getByLabel('Đáp án đúng tương ứng 3', { exact: true })
      .fill(pairDefinitions[2].rightText);
    await form.getByRole('button', { name: 'Xóa cặp 2', exact: true }).click();
    assert.equal(
      await form
        .getByLabel('Nội dung cần ghép 2', { exact: true })
        .inputValue(),
      'SSD',
    );
    await form.getByRole('button', { name: 'Thêm cặp', exact: true }).click();
    await form.getByLabel('Nội dung cần ghép 3', { exact: true }).fill('RAM');
    await form
      .getByLabel('Đáp án đúng tương ứng 3', { exact: true })
      .fill(pairDefinitions[1].rightText);
    await form
      .getByLabel('Nội dung câu hỏi', { exact: true })
      .fill('UI09 CPU form ' + suffix);
    await form
      .getByLabel('Giải thích đáp án', { exact: true })
      .fill(originalExplanation);
    p.on('request', (r) => {
      if (r.method() === 'POST' && r.url() === api + '/questions')
        questionPosts++;
      if (/exam-attempts|\/start$/.test(r.url()) && r.method() !== 'GET')
        attemptMutations++;
    });
    const key = form.getByRole('region', {
      name: 'Những cặp đáp án được chấm là ĐÚNG',
      exact: true,
    });
    await key.getByRole('heading').waitFor();
    assert.equal(await key.locator('li').count(), 3);
    await screenshot(p, 'matching-author-correct-pair-preview');
    await form
      .getByRole('button', { name: 'Xem trước cho học viên', exact: true })
      .click();
    const preview = form.getByRole('region', {
      name: 'Minh họa ghép nối cho học viên',
      exact: true,
    });
    await preview.waitFor();
    const opts = await preview
      .getByLabel('Ghép thử cho CPU', { exact: true })
      .locator('option')
      .allTextContents();
    assert.deepEqual(opts.slice(1), [
      pairDefinitions[1].rightText,
      pairDefinitions[2].rightText,
      pairDefinitions[0].rightText,
    ]);
    await preview
      .getByLabel('Ghép thử cho CPU', { exact: true })
      .selectOption({ label: pairDefinitions[0].rightText });
    const order = await preview
      .getByLabel('Ghép thử cho CPU', { exact: true })
      .locator('option')
      .allTextContents();
    await form.getByLabel('Độ khó', { exact: true }).selectOption('HARD');
    assert.deepEqual(
      await preview
        .getByLabel('Ghép thử cho CPU', { exact: true })
        .locator('option')
        .allTextContents(),
      order,
    );
    assert.equal(questionPosts, 0);
    assert.equal(attemptMutations, 0);
    await screenshot(p, 'matching-student-preview');
    await form.getByLabel('Nội dung cần ghép 3', { exact: true }).fill('CPU');
    await form
      .getByRole('button', { name: 'Lưu câu hỏi', exact: true })
      .click();
    await form.getByRole('alert').waitFor();
    assert.equal(questionPosts, 0);
    await form.getByLabel('Nội dung cần ghép 3', { exact: true }).fill('RAM');
    await form
      .getByLabel('Đáp án đúng tương ứng 3', { exact: true })
      .fill(pairDefinitions[0].rightText);
    await form
      .getByRole('button', { name: 'Lưu câu hỏi', exact: true })
      .click();
    await form.getByRole('alert').waitFor();
    assert.equal(questionPosts, 0);
    await form
      .getByLabel('Đáp án đúng tương ứng 3', { exact: true })
      .fill(pairDefinitions[1].rightText);
    const response = p.waitForResponse(
      (r) => r.url() === api + '/questions' && r.request().method() === 'POST',
    );
    await form
      .getByRole('button', { name: 'Lưu câu hỏi', exact: true })
      .click();
    const r = await response;
    assert.equal(r.status(), 201);
    const q = await r.json();
    assert.equal(questionPosts, 1);
    assert.equal(attemptMutations, 0);
    assert.deepEqual(
      q.matchingPairs.map((x) => [x.leftText, x.rightText]),
      [
        ['CPU', pairDefinitions[0].rightText],
        ['SSD', pairDefinitions[2].rightText],
        ['RAM', pairDefinitions[1].rightText],
      ],
    );
    await screenshot(p, 'matching-author-after');
    const composition = [f.questions[0], f.questions[1], q],
      exam = (
        await call(
          f.teacherA,
          'POST',
          '/exams',
          {
            title: 'UI09 Form published v1 ' + suffix,
            durationMin: 30,
            questions: composition.map((x, i) => ({
              questionId: x.id,
              points: [2.5, 1.25, 3][i],
            })),
          },
          201,
        )
      ).data,
      v1 = (
        await call(
          f.teacherA,
          'POST',
          '/exams/' + exam.id + '/publish',
          undefined,
          201,
        )
      ).data,
      asg = await assignment(f, { examId: exam.id, examVersionId: v1.id });
    await call(
      f.teacherA,
      'PATCH',
      '/questions/' + q.id,
      {
        type: 'MATCHING',
        content: 'Future UI09',
        matchingPairs: pairDefinitions,
        explanation: 'Future explanation',
      },
      200,
    );
    await call(
      f.teacherA,
      'POST',
      '/exams/' + exam.id + '/new-version',
      undefined,
      201,
    );
    await call(
      f.teacherA,
      'PATCH',
      '/exams/' + exam.id,
      {
        title: 'UI09 Form V2 ' + suffix,
        durationMin: 45,
        questions: composition.map((x) => ({ questionId: x.id, points: 5 })),
      },
      200,
    );
    await call(
      f.teacherA,
      'POST',
      '/exams/' + exam.id + '/publish',
      undefined,
      201,
    );
    const attempt = await start(f, asg);
    assert.equal(attempt.version, 1);
    assert.equal(attempt.snapshot.title, exam.title);
    assert.equal(attempt.snapshot.durationMin, 30);
    const sp = student.p;
    await sp.goto(web + '/student/attempts/' + attempt.id);
    await sp.getByText('Đã lưu trên máy chủ', { exact: true }).waitFor();
    for (const item of payloads(attempt, composition)) {
      const card = sp.locator('#question-' + item.questionId);
      if (item.answer.optionId)
        await card
          .getByRole('radio', {
            name: attempt.snapshot.questions
              .find((q) => q.questionId === item.questionId)
              .options.find((o) => o.id === item.answer.optionId).content,
            exact: true,
          })
          .check();
      else if (item.answer.optionIds)
        for (const id of item.answer.optionIds)
          await card
            .getByRole('checkbox', {
              name: attempt.snapshot.questions
                .find((q) => q.questionId === item.questionId)
                .options.find((o) => o.id === id).content,
              exact: true,
            })
            .check();
      else
        for (const pair of item.answer.pairs)
          await sp
            .locator('#match-' + item.questionId + '-' + pair.leftId)
            .selectOption(pair.rightId);
    }
    await sp.getByText('Đã lưu trên máy chủ', { exact: true }).waitFor();
    await waitUntil(async () => (await answers(attempt.id)).length === 3);
    const saved = await answers(attempt.id);
    assert.equal(saved.length, 3);
    assert(saved.every((x) => x.revision >= 1));
    await sp.reload();
    await sp.getByText('Đã lưu trên máy chủ', { exact: true }).waitFor();
    assert.deepEqual(await answers(attempt.id), saved);
    await sp.getByRole('button', { name: 'Nộp bài', exact: true }).click();
    await sp
      .getByRole('dialog', { name: 'Xác nhận nộp bài?', exact: true })
      .getByRole('button', { name: 'Xác nhận nộp bài', exact: true })
      .click();
    await sp.waitForURL('**/student/results/' + attempt.id);
    await sp.getByText('6.75 / 6.75', { exact: true }).waitFor();
    assert.equal(Number((await row(attempt.id)).score), 6.75);
    assert.equal((await row(attempt.id)).examVersionId, v1.id);
    await sidebar(sp, 'Kết quả của tôi');
    await screenshot(sp, 'matching-full-result-v1');
    await p.goto(web + '/teacher/exams/' + exam.id + '/results');
    await p.locator('[data-report-assignment="' + asg.id + '"]').waitFor();
    await sidebar(p);
    await call(f.studentB, 'GET', '/results/' + attempt.id, undefined, 403);
    record(
      [
        'MATCH-01',
        'MATCH-02',
        'MATCH-03',
        'MATCH-04',
        'MATCH-05',
        'MATCH-06',
        'MATCH-07',
        'MATCH-08',
        'MATCH-09',
        'MATCH-10',
        'MATCH-13',
        'MATCH-14',
        'MATCH-15',
      ],
      { score: '6.75/6.75', version: 1 },
    );
  } finally {
    await teacher.c.close();
    await student.c.close();
  }
});
test('UI09 MATCH-11/12/17/18 RESULT-09/10/18: pair review separates selection/key, score visibility, no fake partial credit', async () => {
  const { c, p } = await context(f.studentA);
  try {
    await readyResult(p, f.cases.wrong.attempt.id);
    const pair = p
      .locator('.matching-result-pair')
      .filter({ has: p.getByRole('heading', { name: 'CPU', exact: true }) });
    await pair.getByText('Bạn đã chọn', { exact: true }).waitFor();
    await pair
      .locator('dd')
      .filter({ hasText: pairDefinitions[2].rightText })
      .waitFor();
    await pair.getByText('Đáp án đúng', { exact: true }).waitFor();
    await pair
      .getByText(pairDefinitions[0].rightText, { exact: true })
      .waitFor();
    await pair.getByText('Sai', { exact: true }).waitFor();
    await p.getByText('3.75 / 6.75', { exact: true }).waitFor();
    await p.getByText('0 / 3 điểm', { exact: true }).waitFor();
    await screenshot(p, 'matching-result-review-wrong');
    await readyResult(p, f.cases.empty.attempt.id);
    assert.equal(
      await p
        .locator('.matching-result-pair')
        .getByText('Chưa ghép', { exact: true })
        .count(),
      6,
    );
    assert.equal(Number((await row(f.cases.wrong.attempt.id)).score), 3.75);
    for (const [name, showScore, keys] of [
      ['scoreOnly', true, false],
      ['answersOnly', false, true],
      ['hidden', false, false],
    ]) {
      await readyResult(p, f.cases[name].attempt.id);
      assert.equal(
        await p.locator('.result-correct-key').count(),
        keys ? 3 : 0,
      );
      assert.equal(
        await p.getByRole('region', { name: /Giải thích câu/ }).count(),
        keys ? 1 : 0,
      );
      assert.equal(
        await p.getByText('Điểm chưa được công bố', { exact: true }).count(),
        showScore ? 0 : 1,
      );
      if (!showScore) {
        assert.equal(await p.locator('.result-award').count(), 0);
        assert.equal(await p.getByText(/3 đúng/).count(), 0);
      }
      if (!keys) {
        assert.equal(
          await p
            .locator('.matching-result-pair')
            .getByText('Đúng', { exact: true })
            .count(),
          0,
        );
        assert.equal(
          await p
            .locator('.matching-result-pair')
            .getByText('Sai', { exact: true })
            .count(),
          0,
        );
      }
    }
    record([
      'MATCH-11',
      'MATCH-12',
      'MATCH-17',
      'MATCH-18',
      'RESULT-09',
      'RESULT-10',
      'RESULT-18',
    ]);
  } finally {
    await c.close();
  }
});
test('UI09 RESULT-11/18: v1 result content/explanation remain after new version', async () => {
  await upgrade(f);
  const { c, p } = await context(f.studentA);
  try {
    await readyResult(p, f.cases.both.attempt.id);
    await p
      .getByRole('heading', { name: f.c.exam.title, exact: true })
      .waitFor();
    await p.getByText(originalExplanation, { exact: true }).waitFor();
    assert.equal(
      await p
        .getByText('Giải thích bản mới không được thay lời giải lịch sử', {
          exact: true,
        })
        .count(),
      0,
    );
    assert.equal(Number((await row(f.cases.both.attempt.id)).score), 6.75);
    record(['RESULT-11', 'RESULT-18']);
  } finally {
    await c.close();
  }
});
test('UI09 RESULT-LAYOUT-07/08 RESULT-07/08 BACK-10/11: wrong-role/IDOR and A→logout→B hide old results', async () => {
  for (const actor of [f.studentA, f.admin]) {
    const { c, p } = await context(actor);
    try {
      await p.goto(web + '/teacher/results');
      await p.waitForURL('**/dashboard/' + actor.role.toLowerCase());
      assert.equal(
        await p
          .getByRole('heading', { name: 'Kết quả thi', exact: true })
          .count(),
        0,
      );
    } finally {
      await c.close();
    }
  }
  const { c, p } = await context(f.studentB);
  try {
    await p.goto(web + '/student/results/' + f.cases.both.attempt.id);
    await p.locator('.results-error-box[role="alert"]').waitFor();
    assert.equal(await p.locator('.result-score-card').count(), 0);
    assert.equal(await p.locator('.matching-result').count(), 0);
  } finally {
    await c.close();
  }
  const x = await context(f.studentA);
  try {
    await readyResult(x.p, f.cases.both.attempt.id);
    await x.p.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
    await x.p
      .getByRole('button', { name: 'Đồng ý đăng xuất', exact: true })
      .click();
    await x.p.waitForURL('**/login');
    await x.p.getByLabel('Email', { exact: true }).fill(f.studentB.email);
    await x.p.getByLabel('Mật khẩu', { exact: true }).fill(password);
    await x.p.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await x.p.waitForURL('**/dashboard/student');
    await x.p.goBack();
    await x.p.goForward();
    assert.equal(
      await x.p
        .locator('[data-result-id="' + f.cases.both.attempt.id + '"]')
        .count(),
      0,
    );
    record([
      'RESULT-LAYOUT-07',
      'RESULT-LAYOUT-08',
      'RESULT-07',
      'RESULT-08',
      'BACK-10',
      'BACK-11',
    ]);
  } finally {
    await x.c.close();
  }
});
test('UI09 RESULT-12/14: class reassignment makes cached Teacher report refetch empty, old attempt detail403', async () => {
  const { c, p } = await context();
  try {
    await p.goto(web + '/teacher/exams/' + f.c.exam.id + '/results');
    await report(p).waitFor();
    await call(
      f.admin,
      'PATCH',
      '/classes/' + f.classes.A.id,
      { teacherId: f.teacherB.id },
      200,
    );
    await p
      .getByRole('button', { name: 'Làm mới báo cáo', exact: true })
      .click();
    await p
      .getByText('Đề thi chưa có bài giao trong phạm vi của bạn.', {
        exact: true,
      })
      .waitFor();
    assert.equal(await p.locator('tbody').count(), 0);
    await p.goto(web + '/teacher/results/' + f.cases.both.attempt.id);
    await p.locator('.results-error-box[role="alert"]').waitFor();
    assert.equal(await p.locator('.result-score-card').count(), 0);
    await call(
      f.teacherB,
      'GET',
      '/results/' + f.cases.both.attempt.id,
      undefined,
      200,
    );
    record(['RESULT-12', 'RESULT-14']);
  } finally {
    await call(
      f.admin,
      'PATCH',
      '/classes/' + f.classes.A.id,
      { teacherId: f.teacherA.id },
      200,
    );
    await c.close();
  }
});
test('UI09 RESULT-13/14/17: real Results search/paging/empty/loading/network retry and no stale report on errors', async () => {
  for (let i = 0; i < 24; i++)
    await call(
      f.teacherA,
      'POST',
      '/exams',
      {
        title: 'UI09 Results paging ' + suffix + ' ' + i,
        durationMin: 15,
        questions: [{ questionId: f.questions[0].id, points: 1 }],
      },
      201,
    );
  const { c, p } = await context();
  try {
    await p.goto(web + '/teacher/results');
    await p
      .getByLabel('Tìm kiếm', { exact: true })
      .fill('UI09 Results paging ' + suffix);
    await p.getByText('24 đề phù hợp.', { exact: false }).waitFor();
    assert.equal(
      await p.getByRole('link', { name: /Xem kết quả/ }).count(),
      20,
    );
    await p.getByRole('button', { name: 'Trang sau', exact: true }).click();
    await waitUntil(
      async () =>
        (await p.getByRole('link', { name: /Xem kết quả/ }).count()) === 4,
    );
    await p
      .getByRole('link', { name: /Xem kết quả/ })
      .first()
      .click();
    await p
      .getByText('Đề thi chưa có bài giao trong phạm vi của bạn.', {
        exact: true,
      })
      .waitFor();
    assert.equal(await p.locator('tbody tr').count(), 0);
    await p.goto(web + '/teacher/exams/' + f.c.exam.id + '/results');
    await report(p).waitFor();
    await p.route('**/results/exams/*', (r) => r.abort('connectionreset'));
    await p
      .getByRole('button', { name: 'Làm mới báo cáo', exact: true })
      .click();
    await p.locator('.results-error-box[role="alert"]').waitFor();
    assert.equal(await p.locator('[data-report-assignment]').count(), 0);
    await p.unroute('**/results/exams/*');
    await p.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await report(p).waitFor();
    await p.goto(web + '/teacher/results');
    await p.getByLabel('Tìm kiếm', { exact: true }).fill('NO-UI09-' + suffix);
    await p.getByText('Chưa có đề thi.', { exact: true }).waitFor();
    record(['RESULT-13', 'RESULT-14', 'RESULT-17']);
  } finally {
    await c.close();
  }
});
for (const width of [390, 768, 1024, 1440])
  test(
    'UI09 visual RESULT-LAYOUT-06/10 RESULT-15/16 MATCH-16 BACK-13: ' +
      width +
      ' LIGHT/DARK axe/sidebar/drawer/reflow',
    async () => {
      const pages = [
        {
          actor: f.teacherA,
          route: '/teacher/results',
          label: 'teacher-index',
          ready: async (p) => {
            const current = (
              await call(
                f.teacherA,
                'GET',
                '/exams/' + f.c.exam.id,
                undefined,
                200,
              )
            ).data;
            await p.getByLabel('Tìm kiếm', { exact: true }).fill(current.title);
            await p
              .locator('a[href="/teacher/exams/' + f.c.exam.id + '/results"]')
              .waitFor();
          },
        },
        {
          actor: f.teacherA,
          route: '/teacher/exams/' + f.c.exam.id + '/results',
          label: 'teacher-report',
          ready: (p) => report(p).waitFor(),
        },
        {
          actor: f.studentA,
          route: '/student/results/' + f.cases.wrong.attempt.id,
          label: 'student-detail',
          ready: (p) => resultRoot(p).waitFor(),
        },
        {
          actor: f.admin,
          route: '/admin/exams/' + f.c.exam.id + '/results',
          label: 'admin-report',
          ready: (p) => report(p).waitFor(),
        },
        {
          actor: f.teacherA,
          route: '/teacher/questions',
          label: 'matching-form',
          ready: async (p) => {
            await p
              .getByLabel('Loại câu hỏi', { exact: true })
              .selectOption('MATCHING');
            const form = p.locator('#teacher-create-question form');
            for (let i = 0; i < 2; i++) {
              await form
                .getByLabel('Nội dung cần ghép ' + (i + 1), { exact: true })
                .fill(pairDefinitions[i].leftText);
              await form
                .getByLabel('Đáp án đúng tương ứng ' + (i + 1), { exact: true })
                .fill(pairDefinitions[i].rightText);
            }
            await form
              .getByRole('button', {
                name: 'Xem trước cho học viên',
                exact: true,
              })
              .click();
          },
        },
      ];
      for (const data of pages) {
        const { c, p } = await context(data.actor, width);
        try {
          await p.emulateMedia({ reducedMotion: 'reduce' });
          await p.goto(web + data.route);
          await data.ready(p);
          for (const theme of ['light', 'dark']) {
            if (
              (await p.evaluate(() =>
                document.documentElement.classList.contains('dark'),
              )) !==
              (theme === 'dark')
            )
              await p
                .getByRole('button', {
                  name: 'Đổi giao diện sáng tối',
                  exact: true,
                })
                .click();
            await p.waitForFunction(
              (t) => document.documentElement.classList.contains(t),
              theme,
            );
            await p.evaluate(
              () =>
                new Promise((r) =>
                  requestAnimationFrame(() => requestAnimationFrame(r)),
                ),
            );
            await p.addScriptTag({ path: req.resolve('axe-core/axe.min.js') });
            const violations = await p.evaluate(async () =>
              (
                await axe.run(document, {
                  runOnly: {
                    type: 'tag',
                    values: ['wcag2a', 'wcag2aa', 'wcag21aa'],
                  },
                })
              ).violations.map((x) => ({
                id: x.id,
                targets: x.nodes.map((n) => n.target),
              })),
            );
            assert.deepEqual(violations, []);
            assert(
              await p.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
              ),
            );
            await screenshot(p, data.label + '-' + width + '-' + theme);
            checks.push({
              route: data.route,
              label: data.label,
              width,
              theme,
              violations,
            });
          }
          if (width < 1024) {
            const trigger = p.getByRole('button', {
              name: 'Mở menu',
              exact: true,
            });
            await trigger.focus();
            await p.keyboard.press('Enter');
            const drawer = p.getByRole('dialog', { name: /Điều hướng/ });
            await drawer.waitFor();
            await waitUntil(() =>
              drawer.evaluate((el) => el.contains(document.activeElement)),
            );
            await p.keyboard.press('Tab');
            assert(
              await drawer.evaluate((el) =>
                el.contains(document.activeElement),
              ),
            );
            await p.keyboard.press('Shift+Tab');
            assert(
              await drawer.evaluate((el) =>
                el.contains(document.activeElement),
              ),
            );
            await p.keyboard.press('Escape');
            await waitUntil(() =>
              trigger.evaluate((el) => el === document.activeElement),
            );
            assert(
              await trigger.evaluate((el) => el === document.activeElement),
            );
          }
          assert.equal(await p.locator('.admin-sidebar').count(), 1);
        } finally {
          await c.close();
        }
      }
      record(
        [
          'RESULT-LAYOUT-06',
          'RESULT-LAYOUT-10',
          'RESULT-15',
          'RESULT-16',
          'MATCH-16',
          'BACK-13',
        ],
        { width },
      );
    },
  );
test('UI09 MATCH-15 RESULT-14: one-sided whitespace validation, disabled pending real save, network failure preserves inputs and retry persists exact pairs', async () => {
  const { c, p } = await context();
  let arrived;
  const entered = new Promise((r) => (arrived = r));
  let release;
  const gate = new Promise((r) => (release = r));
  try {
    await p.goto(web + '/teacher/questions');
    const card = p.locator('#teacher-create-question'),
      form = card.locator('form');
    await form
      .getByLabel('Loại câu hỏi', { exact: true })
      .selectOption('MATCHING');
    await form
      .getByLabel('Nội dung câu hỏi', { exact: true })
      .fill('UI09 retry ' + suffix);
    for (let i = 1; i <= 2; i++) {
      await form
        .getByLabel('Nội dung cần ghép ' + i, { exact: true })
        .fill('  ' + pairDefinitions[i - 1].leftText + '  ');
      await form
        .getByLabel('Đáp án đúng tương ứng ' + i, { exact: true })
        .fill(pairDefinitions[i - 1].rightText);
    }
    await form.getByLabel('Đáp án đúng tương ứng 2', { exact: true }).fill(' ');
    await form
      .getByRole('button', { name: 'Lưu câu hỏi', exact: true })
      .click();
    await form.getByRole('alert').waitFor();
    await form
      .getByLabel('Đáp án đúng tương ứng 2', { exact: true })
      .fill(pairDefinitions[1].rightText);
    await p.route('**/questions', async (r) => {
      if (r.request().method() === 'POST') {
        arrived();
        await gate;
        await r.abort('connectionreset');
      } else await r.continue();
    });
    await form
      .getByRole('button', { name: 'Lưu câu hỏi', exact: true })
      .click();
    await entered;
    assert(
      await form
        .getByRole('button', { name: 'Lưu câu hỏi', exact: true })
        .isDisabled(),
    );
    release();
    await card.getByRole('alert').waitFor();
    assert.equal(
      await form
        .getByLabel('Nội dung cần ghép 1', { exact: true })
        .inputValue(),
      '  CPU  ',
    );
    await p.unroute('**/questions');
    const response = p.waitForResponse(
      (r) => r.url() === api + '/questions' && r.request().method() === 'POST',
    );
    await form
      .getByRole('button', { name: 'Lưu câu hỏi', exact: true })
      .click();
    const result = await response;
    assert.equal(result.status(), 201);
    const q = await result.json();
    const pairs = (
      await db.query(
        'SELECT "leftText","rightText" FROM "MatchingPair" WHERE "questionId"=$1 ORDER BY position',
        [q.id],
      )
    ).rows;
    assert.deepEqual(pairs, pairDefinitions.slice(0, 2));
    record(['MATCH-15', 'RESULT-14'], { sqlMatchingPairs: 2 });
  } finally {
    release();
    await c.close();
  }
});
test('UI09 native zoom200: loaded long Matching result and Teacher report/form preview reflow, contextual Back and focus', async () => {
  const longPairs = pairDefinitions.map((p, i) => ({
    ...p,
    rightText: p.rightText + ' ' + String.fromCharCode(65 + i).repeat(400),
  }));
  const q = (
    await call(
      f.teacherA,
      'POST',
      '/questions',
      {
        type: 'MATCHING',
        content: 'UI09 long question ' + 'X'.repeat(320),
        matchingPairs: longPairs,
      },
      201,
    )
  ).data;
  const e = (
      await call(
        f.teacherA,
        'POST',
        '/exams',
        {
          title: 'UI09 native zoom ' + suffix,
          durationMin: 10,
          questions: [{ questionId: q.id, points: 3 }],
        },
        201,
      )
    ).data,
    v = (
      await call(
        f.teacherA,
        'POST',
        '/exams/' + e.id + '/publish',
        undefined,
        201,
      )
    ).data,
    a = await start(
      f,
      await assignment(f, { examId: e.id, examVersionId: v.id }),
    );
  const question = a.snapshot.questions[0];
  await call(
    f.studentA,
    'PUT',
    `/exam-attempts/${a.id}/answers/${q.id}`,
    {
      revision: 1,
      answer: {
        pairs: question.matchingPairs.map((p) => ({
          leftId: p.id,
          rightId: question.matchingOptions.find(
            (o) =>
              o.rightText ===
              longPairs.find((x) => x.leftText === p.leftText).rightText,
          ).id,
        })),
      },
    },
    200,
  );
  await call(
    f.studentA,
    'POST',
    '/exam-attempts/' + a.id + '/submit',
    undefined,
    201,
  );
  assert.equal(Number((await row(a.id)).score), 3);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'examspace-ui09-zoom-')),
    extension = path.join(dir, 'extension');
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
  const c = await chromium.launchPersistentContext(path.join(dir, 'profile'), {
    channel: 'msedge',
    headless: true,
    viewport: null,
    args: [
      '--disable-extensions-except=' + extension,
      '--load-extension=' + extension,
      '--window-size=1440,1000',
    ],
  });
  try {
    const worker =
      c.serviceWorkers()[0] || (await c.waitForEvent('serviceworker'));
    for (const [actor, route, name] of [
      [f.studentA, '/student/results/' + a.id, 'result'],
      [f.teacherA, '/teacher/exams/' + e.id + '/results', 'report'],
      [f.teacherA, '/teacher/questions', 'matching-preview'],
    ]) {
      await c.clearCookies();
      await c.addCookies(
        Object.entries(actor.cookies).map(([name, value]) => ({
          name,
          value,
          url: api,
          httpOnly: true,
          sameSite: 'Lax',
        })),
      );
      const p = await c.newPage();
      await p.emulateMedia({ reducedMotion: 'reduce' });
      await p.goto(web + route);
      if (name === 'result') await resultRoot(p).waitFor();
      else if (name === 'report')
        await p.locator('[data-report-assignment]').waitFor();
      else {
        await p
          .getByLabel('Loại câu hỏi', { exact: true })
          .selectOption('MATCHING');
        const form = p.locator('#teacher-create-question form');
        for (let i = 0; i < 2; i++) {
          await form
            .getByLabel('Nội dung cần ghép ' + (i + 1), { exact: true })
            .fill(longPairs[i].leftText);
          await form
            .getByLabel('Đáp án đúng tương ứng ' + (i + 1), { exact: true })
            .fill(longPairs[i].rightText);
        }
        await form
          .getByRole('button', { name: 'Xem trước cho học viên', exact: true })
          .click();
        await form
          .getByRole('region', { name: 'Minh họa ghép nối cho học viên' })
          .waitFor();
      }
      const zooms = await worker.evaluate(
        async (origin) =>
          Promise.all(
            (await chrome.tabs.query({}))
              .filter((t) => t.url?.startsWith(origin))
              .map(async (t) => {
                await chrome.tabs.setZoom(t.id, 2);
                return chrome.tabs.getZoom(t.id);
              }),
          ),
        web,
      );
      assert(zooms.length && zooms.every((x) => x === 2));
      await p.evaluate(async () => {
        await document.fonts.ready;
        await new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        );
      });
      assert(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      if (name === 'result') {
        const back = await bottomBack(p, 'Quay lại lịch sử kết quả');
        await back.focus();
        await p.keyboard.press('Enter');
        await p.waitForURL('**/student/results');
        await p.goBack();
        await resultRoot(p).waitFor();
      }
      await p.addScriptTag({ path: req.resolve('axe-core/axe.min.js') });
      const violations = await p.evaluate(async () =>
        (
          await axe.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
          })
        ).violations.map((x) => x.id),
      );
      assert.deepEqual(violations, []);
      const session = await c.newCDPSession(p),
        layout = await session.send('Page.getLayoutMetrics'),
        png = Buffer.from(
          (
            await session.send('Page.captureScreenshot', {
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
            })
          ).data,
          'base64',
        );
      assert.equal(png.readUInt32BE(16), Math.round(layout.contentSize.width));
      fs.writeFileSync(
        path.join(evidence, 'native-zoom200-' + name + '.png'),
        png,
      );
      checks.push({
        nativeZoom: 2,
        route,
        name,
        violations,
        metrics: await p.evaluate(() => ({
          width: innerWidth,
          scrollHeight: document.documentElement.scrollHeight,
        })),
      });
      await p.close();
    }
    record(['BACK-13', 'MATCH-16'], { nativeZoom: 2 });
  } finally {
    await c.close();
  }
});
