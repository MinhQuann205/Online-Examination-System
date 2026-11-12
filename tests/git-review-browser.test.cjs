const { test, before, after } = require('node:test');
const { createRequire } = require('node:module');
const path = require('node:path');
const {
  assert,
  db,
  fixtures,
  assignment,
  start,
  call,
  web,
  password,
} = require('./p0-support.cjs');
const { chromium } = createRequire(
  path.resolve(__dirname, '../apps/web/package.json'),
)('playwright');
let f, browser;
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
async function login(actor) {
  const context = await browser.newContext(),
    page = await context.newPage();
  await page.goto(web + '/login');
  await page.getByLabel('Email', { exact: true }).fill(actor.email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL('**/dashboard/' + actor.role.toLowerCase());
  return { context, page };
}
test('GR03 browser: Student history/detail and Teacher report show published v1 metadata after a renamed v2', async () => {
  const v1 = await assignment(f),
    attempt = await start(f, v1),
    titleA = f.version.snapshot.title;
  await call(
    f.studentA,
    'POST',
    '/exam-attempts/' + attempt.id + '/submit',
    undefined,
    201,
  );
  await call(
    f.teacherA,
    'POST',
    '/exams/' + f.exam.id + '/new-version',
    undefined,
    201,
  );
  const titleB = 'Browser v2 ' + f.exam.id;
  await call(
    f.teacherA,
    'PATCH',
    '/exams/' + f.exam.id,
    {
      title: titleB,
      durationMin: 5,
      questions: [{ questionId: f.questions[0].id, points: 9 }],
    },
    200,
  );
  const v2 = (
    await call(
      f.teacherA,
      'POST',
      '/exams/' + f.exam.id + '/publish',
      undefined,
      201,
    )
  ).data;
  await assignment(f, { examVersionId: v2.id });
  const student = await login(f.studentA);
  try {
    await student.page.goto(web + '/student/exams');
    await student.page
      .getByRole('heading', { name: titleA, exact: true })
      .waitFor();
    await student.page
      .getByRole('heading', { name: titleB, exact: true })
      .waitFor();
    await student.page.goto(web + '/student/results');
    await student.page
      .getByRole('heading', { name: titleA, exact: true })
      .waitFor();
    await student.page.goto(web + '/student/results/' + attempt.id);
    await student.page
      .getByRole('heading', { name: titleA, exact: true })
      .waitFor();
    assert.equal(
      await student.page
        .getByRole('heading', { name: titleB, exact: true })
        .count(),
      0,
    );
  } finally {
    await student.context.close();
  }
  const teacher = await login(f.teacherA);
  try {
    await teacher.page.goto(web + '/teacher/exams/' + f.exam.id + '/results');
    await teacher.page
      .locator('[data-report-assignment]')
      .filter({ hasText: titleA })
      .getByText('Phiên bản 1', { exact: true })
      .waitFor();
    await teacher.page
      .locator('[data-report-assignment]')
      .filter({ hasText: titleB })
      .getByText('Phiên bản 2', { exact: true })
      .waitFor();
  } finally {
    await teacher.context.close();
  }
});
