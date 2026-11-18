'use strict';
const assert = require('node:assert/strict');
assert.equal(
  process.env.UI15_RUNTIME_APPROVED,
  '1',
  'UI15_NEW_CANDIDATE_APPROVAL_REQUIRED',
);
const { test } = require('node:test');
const { completionFixture } = require('./ui15-support.cjs');
const { call, db, password, suffix, waitUntil } = require('./p0-support.cjs');
test(
  'UI15 API: bounded history/question pages, exact old version, validation/RBAC and real Admin row-lock wait',
  { timeout: 180000 },
  async () => {
    let client, pending;
    try {
      const f = await completionFixture(),
        id = f.pagedExam.id,
        v1 = f.pagedVersions[0];
      const p1 = (
        await call(
          f.teacherA,
          'GET',
          `/exams/${id}/versions?paged=true`,
          undefined,
          200,
        )
      ).data;
      assert.equal(p1.total, 21);
      assert.equal(p1.items.length, 20);
      assert.equal(p1.pageCount, 2);
      assert.deepEqual(
        p1.items.map((x) => x.number),
        Array.from({ length: 20 }, (_, i) => 21 - i),
      );
      for (const row of p1.items)
        assert.deepEqual(Object.keys(row).sort(), [
          'id',
          'number',
          'publishedAt',
        ]);
      const p2 = (
        await call(
          f.teacherA,
          'GET',
          `/exams/${id}/versions?paged=true&page=2`,
          undefined,
          200,
        )
      ).data;
      assert.deepEqual(
        p2.items.map((x) => x.id),
        [v1.id],
      );
      const exact = (
        await call(
          f.teacherA,
          'GET',
          `/exams/${id}/versions?paged=true&id=${v1.id}`,
          undefined,
          200,
        )
      ).data;
      assert.equal(exact.items[0].number, 1);
      const empty = (
        await call(
          f.teacherA,
          'GET',
          `/exams/${id}/versions?paged=true&search=v99`,
          undefined,
          200,
        )
      ).data;
      assert.equal(empty.total, 0);
      assert.deepEqual(empty.items, []);
      const legacy = (
        await call(f.teacherA, 'GET', `/exams/${id}/versions`, undefined, 200)
      ).data;
      assert(Array.isArray(legacy));
      assert.equal(legacy.length, 21);
      const lean = (
        await call(
          f.teacherA,
          'GET',
          `/exams/${id}?versions=none`,
          undefined,
          200,
        )
      ).data;
      assert.deepEqual(lean.versions, []);
      for (const actor of [f.teacherB, f.studentA])
        await call(
          actor,
          'GET',
          `/exams/${id}/versions?paged=true`,
          undefined,
          403,
        );
      await call(
        null,
        'GET',
        `/exams/${id}/versions?paged=true`,
        undefined,
        401,
      );
      await call(
        f.admin,
        'GET',
        `/exams/${id}/versions?paged=true`,
        undefined,
        200,
      );
      for (const query of [
        'limit=101',
        'page=0',
        'search=v0',
        'search=2147483648',
        'id=invalid',
      ])
        await call(
          f.teacherA,
          'GET',
          `/exams/${id}/versions?paged=true&${query}`,
          undefined,
          400,
        );
      const bank = (
        await call(
          f.teacherA,
          'GET',
          '/questions?' +
            new URLSearchParams({
              search: 'UI15 bank ' + suffix,
              page: '2',
              limit: '20',
            }),
          undefined,
          200,
        )
      ).data;
      assert.equal(bank.total, 21);
      assert.equal(bank.items.length, 1);
      assert.equal(bank.page, 2);
      for (const query of ['type=ESSAY', 'difficulty=INVALID', 'limit=101'])
        await call(f.teacherA, 'GET', '/questions?' + query, undefined, 400);
      await call(f.studentA, 'GET', '/questions?page=1', undefined, 403);
      await call(
        f.teacherA,
        'POST',
        '/questions',
        {
          type: 'SINGLE_CHOICE',
          content: ' ',
          options: [
            { content: 'A', isCorrect: true },
            { content: 'B', isCorrect: false },
          ],
        },
        400,
      );
      const created = (
        await call(
          f.admin,
          'POST',
          '/users',
          {
            email: ` UI15-NORMALIZED-${suffix}@EXAMPLE.TEST `,
            fullName: ' Valid User ',
            role: 'STUDENT',
            password,
          },
          201,
        )
      ).data;
      assert.equal(created.email, `ui15-normalized-${suffix}@example.test`);
      assert.equal(created.fullName, 'Valid User');
      assert(!('passwordHash' in created));
      assert.deepEqual(
        (
          await db.query('SELECT snapshot FROM "ExamVersion" WHERE id=$1', [
            v1.id,
          ])
        ).rows[0].snapshot,
        v1.snapshot,
      );
      await call(
        f.teacherA,
        'PATCH',
        `/users/${f.admin.id}/status`,
        { isActive: true },
        403,
      );
      const before = (
        await db.query('SELECT "tokenVersion" FROM "User" WHERE id=$1', [
          f.admin.id,
        ])
      ).rows[0].tokenVersion;
      client = await db.connect();
      await client.query('BEGIN');
      await client.query('SELECT id FROM "User" WHERE id=$1 FOR UPDATE', [
        f.admin.id,
      ]);
      pending = call(
        f.admin,
        'PATCH',
        `/users/${f.admin.id}/status`,
        { isActive: true },
        200,
      );
      pending.catch(() => {});
      await waitUntil(
        async () =>
          (
            await db.query(
              "SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE $1",
              ['%User%FOR UPDATE%'],
            )
          ).rows[0].n >= 1,
        2500,
      );
      await client.query('COMMIT');
      client.release();
      client = null;
      await pending;
      pending = null;
      assert.equal(
        (
          await db.query('SELECT "tokenVersion" FROM "User" WHERE id=$1', [
            f.admin.id,
          ])
        ).rows[0].tokenVersion,
        before + 1,
      );
      await call(f.admin, 'GET', '/auth/me', undefined, 401);
    } finally {
      if (client) {
        await client.query('ROLLBACK');
        client.release();
      }
      if (pending) await Promise.allSettled([pending]);
      await db.end();
    }
  },
);
