'use strict';
const assert = require('node:assert/strict');
assert.equal(
  process.env.UI15_RUNTIME_APPROVED,
  '1',
  'UI15_NEW_CANDIDATE_APPROVAL_REQUIRED',
);
const { test } = require('node:test'),
  fs = require('node:fs'),
  os = require('node:os'),
  path = require('node:path'),
  { createRequire } = require('node:module');
const req = createRequire(path.resolve(__dirname, '../apps/web/package.json')),
  { chromium } = req('playwright');
const { web, db, password, suffix, waitUntil } = require('./p0-support.cjs'),
  { completionFixture } = require('./ui15-support.cjs'),
  { chooseAssignmentOption } = require('./assignment-selection.cjs');
test(
  'UI15 web: removable choices, remote bank selection across pages, old-version paging and read-only review',
  { timeout: 300000 },
  async () => {
    const folder = fs.mkdtempSync(
        path.join(os.tmpdir(), 'examspace-ui15-web-'),
      ),
      steps = [],
      axe = [];
    let browser,
      page,
      outcome = 'FAIL';
    const step = async (name, run) => {
      const row = { name, status: 'RUNNING' };
      steps.push(row);
      try {
        await run();
        row.status = 'PASS';
      } catch (e) {
        row.status = 'FAIL';
        row.errorName = e.name;
        row.frames = String(e.stack)
          .split('\n')
          .filter((x) => /^\s+at /.test(x))
          .slice(0, 5);
        throw e;
      }
    };
    try {
      const f = await completionFixture();
      browser = await chromium.launch({
        channel: process.env.P0_BROWSER_CHANNEL || 'chromium',
        headless: true,
      });
      page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
      page.setDefaultTimeout(15000);
      await page.goto(web + '/login');
      await page.locator('#email').fill(f.teacherA.email);
      await page.locator('#password').fill(password);
      await page
        .getByRole('button', { name: 'Đăng nhập', exact: true })
        .click();
      await page.waitForURL('**/dashboard/teacher');
      await step(
        'Removing the correct choice blocks save until a new key is selected; only one real POST',
        async () => {
          await page.goto(web + '/teacher/questions');
          const form = page.locator('#teacher-create-question form');
          let writes = 0;
          page.on('request', (r) => {
            if (
              r.method() === 'POST' &&
              new URL(r.url()).pathname === '/questions'
            )
              writes++;
          });
          await form
            .getByLabel('Nội dung câu hỏi', { exact: true })
            .fill('UI15 removed ' + suffix);
          await form.getByLabel('Lựa chọn 1', { exact: true }).fill('A');
          await form.getByLabel('Lựa chọn 2', { exact: true }).fill('B');
          await form
            .getByRole('button', { name: 'Thêm dòng', exact: true })
            .click();
          await form.getByLabel('Lựa chọn 3', { exact: true }).fill('C');
          await form
            .getByRole('button', { name: 'Xóa lựa chọn 1', exact: true })
            .click();
          assert.equal(
            await form
              .getByRole('button', { name: 'Xóa lựa chọn 1', exact: true })
              .isDisabled(),
            true,
          );
          await form
            .getByRole('button', { name: 'Lưu câu hỏi', exact: true })
            .click();
          await form.getByRole('alert').waitFor();
          assert.equal(writes, 0);
          await form.getByRole('radio').nth(1).check();
          const response = page.waitForResponse(
            (r) =>
              r.request().method() === 'POST' &&
              new URL(r.url()).pathname === '/questions',
          );
          await form
            .getByRole('button', { name: 'Lưu câu hỏi', exact: true })
            .click();
          const saved = await response;
          assert.equal(saved.status(), 201);
          const body = await saved.json();
          assert.deepEqual(
            body.options.map((x) => [x.content, x.isCorrect]),
            [
              ['B', false],
              ['C', true],
            ],
          );
          assert.equal(writes, 1);
        },
      );
      await step(
        'Bank page 1 and page 2 selections retain all 21 questions, titles, order and points after reload',
        async () => {
          await page.goto(web + '/teacher/exams/new');
          await page
            .getByLabel('Tên đề thi', { exact: true })
            .fill(' UI15 remote exam ' + suffix + ' ');
          await page
            .getByLabel('Tìm câu hỏi để chọn', { exact: true })
            .fill('UI15 bank ' + suffix);
          await waitUntil(
            async () => (await page.getByRole('checkbox').count()) === 20,
          );
          await page
            .getByRole('button', { name: 'Chọn trang này', exact: true })
            .click();
          await page.getByText(/Đã chọn 20\/200/).waitFor();
          await page
            .getByRole('button', { name: 'Trang sau', exact: true })
            .click();
          await waitUntil(
            async () => (await page.getByRole('checkbox').count()) === 1,
          );
          await page.getByRole('checkbox').check();
          await page.getByText(/Đã chọn 21\/200/).waitFor();
          const response = page.waitForResponse(
            (r) =>
              r.request().method() === 'POST' &&
              new URL(r.url()).pathname === '/exams',
          );
          await page
            .getByRole('button', { name: 'Lưu bản nháp', exact: true })
            .click();
          const saved = await response;
          assert.equal(saved.status(), 201);
          const draft = await saved.json();
          await page.waitForURL('**/teacher/exams/' + draft.id);
          await page.goto(web + '/teacher/exams/' + draft.id + '/edit');
          await page.reload();
          const summary = page.getByRole('complementary', {
            name: 'Cấu trúc đề',
            exact: true,
          });
          await summary
            .locator('.teacher-selection-row')
            .nth(20)
            .waitFor({ state: 'visible' });
          assert.equal(
            await summary.locator('.teacher-selection-row').count(),
            21,
          );
          for (const q of f.pagedQuestions)
            assert.equal(
              await summary
                .locator('.teacher-selection-row')
                .filter({ hasText: q.content })
                .count(),
              1,
            );
          const sql = (
            await db.query(
              'SELECT "questionId",points,position FROM "ExamQuestion" WHERE "examId"=$1 ORDER BY position',
              [draft.id],
            )
          ).rows;
          assert.equal(sql.length, 21);
          assert(sql.every((x) => Number(x.points) === 1));
          assert.equal(new Set(sql.map((x) => x.questionId)).size, 21);
          for (const width of [390, 1440])
            for (const theme of ['light', 'dark']) {
              await page.setViewportSize({ width, height: 1000 });
              const isDark = await page.evaluate(() =>
                document.documentElement.classList.contains('dark'),
              );
              if (isDark !== (theme === 'dark'))
                await page
                  .getByRole('button', {
                    name: 'Đổi giao diện sáng tối',
                    exact: true,
                  })
                  .click();
              await waitUntil(() =>
                page.evaluate(
                  (expected) =>
                    document.documentElement.classList.contains('dark') ===
                      (expected === 'dark') &&
                    document.documentElement.style.colorScheme === expected,
                  theme,
                ),
              );
              await page.evaluate(async () => {
                await document.fonts.ready;
                const finite = document
                  .getAnimations()
                  .filter((a) =>
                    Number.isFinite(a.effect?.getComputedTiming().endTime ?? 0),
                  );
                let timer;
                try {
                  await Promise.race([
                    Promise.all(finite.map((a) => a.finished.catch(() => {}))),
                    new Promise((_, reject) => {
                      timer = setTimeout(
                        () => reject(new Error('THEME_TRANSITION_DEADLINE')),
                        2000,
                      );
                    }),
                  ]);
                } finally {
                  clearTimeout(timer);
                }
                await new Promise((resolve) =>
                  requestAnimationFrame(() => requestAnimationFrame(resolve)),
                );
              });
              await page.addScriptTag({
                path: req.resolve('axe-core/axe.min.js'),
              });
              const result = await page.evaluate(async () => {
                const checked = await axe.run(document, {
                  runOnly: {
                    type: 'tag',
                    values: ['wcag2a', 'wcag2aa', 'wcag21aa'],
                  },
                });
                return {
                  violations: checked.violations.map((x) => x.id),
                  details: checked.violations.map((x) => ({
                    id: x.id,
                    impact: x.impact,
                    targets: x.nodes.map((n) => n.target),
                  })),
                  overflow: document.documentElement.scrollWidth > innerWidth,
                  resolvedDark:
                    document.documentElement.classList.contains('dark'),
                  colorScheme: document.documentElement.style.colorScheme,
                };
              });
              axe.push({ width, theme, ...result });
              assert.equal(result.resolvedDark, theme === 'dark');
              assert.equal(result.colorScheme, theme);
              assert.deepEqual(result.violations, []);
              assert.equal(result.overflow, false);
              await page.screenshot({
                path: path.join(folder, `editor-${width}-${theme}.png`),
                fullPage: true,
              });
            }
        },
      );
      await step(
        'History page 2 opens V1 and handoff keeps V1 while searching another version; Cancel creates no assignment',
        async () => {
          await page.setViewportSize({ width: 1440, height: 1000 });
          await page.goto(web + '/teacher/exams/' + f.pagedExam.id);
          const history = page.getByRole('group', {
            name: 'Phiên bản đã xuất bản',
            exact: true,
          });
          await history
            .getByRole('button', { name: 'Trang sau', exact: true })
            .click();
          await history
            .getByRole('button', { name: 'Xem phiên bản 1', exact: true })
            .click();
          await waitUntil(
            async () =>
              new URL(page.url()).searchParams.get('versionId') ===
              f.pagedVersions[0].id,
          );
          await page
            .getByRole('group', { name: 'Thao tác đề thi', exact: true })
            .getByRole('link', { name: 'Giao bài', exact: true })
            .click();
          await page.waitForURL('**/teacher/assignments?*');
          const picker = page.getByRole('group', {
            name: 'Phiên bản đã xuất bản',
            exact: true,
          });
          await waitUntil(
            async () =>
              (await picker
                .getByLabel('Phiên bản đề thi', { exact: true })
                .inputValue()) === f.pagedVersions[0].id,
          );
          await picker
            .getByLabel('Tìm số phiên bản', { exact: true })
            .fill('v21');
          await picker
            .getByText('1 bản ghi · Trang 1 / 1', { exact: true })
            .waitFor();
          assert.equal(
            await picker
              .getByLabel('Phiên bản đề thi', { exact: true })
              .inputValue(),
            f.pagedVersions[0].id,
          );
          await chooseAssignmentOption(
            page,
            'Lớp học',
            f.classes.A.id,
            f.classes.A.name,
          );
          let posts = 0;
          page.on('request', (r) => {
            if (
              r.method() === 'POST' &&
              new URL(r.url()).pathname === '/exam-assignments'
            )
              posts++;
          });
          await page
            .getByLabel('Số lượt làm tối đa', { exact: true })
            .fill('20');
          const opener = page.getByRole('button', {
            name: 'Kiểm tra trước khi giao',
            exact: true,
          });
          await opener.click();
          const dialog = page.getByRole('dialog', {
            name: 'Xác nhận giao bài?',
            exact: true,
          });
          await dialog.waitFor();
          await dialog.getByText(/v1/).first().waitFor();
          await page.keyboard.press('Escape');
          await dialog.waitFor({ state: 'hidden' });
          assert.equal(posts, 0);
          assert.equal(
            await opener.evaluate((el) => document.activeElement === el),
            true,
          );
        },
      );
      outcome = 'PASS';
    } finally {
      if (page && outcome !== 'PASS')
        await page
          .screenshot({
            path: path.join(folder, 'failure.png'),
            fullPage: true,
          })
          .catch(() => {});
      await browser?.close();
      await db.end();
      fs.writeFileSync(
        path.join(folder, 'workflow.json'),
        JSON.stringify(
          {
            outcome,
            steps,
            axe,
            fingerprint: process.env.UI113_SOURCE_FINGERPRINT,
          },
          null,
          2,
        ),
      );
    }
  },
);
