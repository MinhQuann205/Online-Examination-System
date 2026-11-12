const { test, before, after } = require('node:test');
const {
  assert,
  db,
  fixtures,
  call,
  assignment,
  start,
  password,
  suffix,
} = require('./p0-support.cjs');
let f;
before(async () => {
  f = await fixtures();
});
after(async () => {
  await db.end();
});
test('UI05 API: Admin dashboard identity and counts are real, safe and role restricted', async () => {
  const dashboard = (
    await call(f.admin, 'GET', '/dashboard/admin', undefined, 200)
  ).data;
  assert.equal(dashboard.user.id, f.admin.id);
  assert.equal(dashboard.section, 'admin');
  assert(!JSON.stringify(dashboard).match(/password|token|418|94\.2/));
  for (const actor of [f.teacherA, f.studentA])
    await call(actor, 'GET', '/dashboard/admin', undefined, 403);
  const users = (await call(f.admin, 'GET', '/users?limit=1', undefined, 200))
    .data;
  const classes = (
    await call(f.admin, 'GET', '/classes?limit=1', undefined, 200)
  ).data;
  const exams = (await call(f.admin, 'GET', '/exams', undefined, 200)).data;
  assert.equal(
    users.total,
    Number((await db.query('SELECT count(*) FROM "User"')).rows[0].count),
  );
  assert.equal(
    classes.total,
    Number(
      (await db.query('SELECT count(*) FROM "Class" WHERE NOT "isArchived"'))
        .rows[0].count,
    ),
  );
  assert.equal(
    exams.total,
    Number((await db.query('SELECT count(*) FROM "Exam"')).rows[0].count),
  );
});
test('UI05 API: Users filters and real pagination expose all 24 records without sensitive fields', async () => {
  const term = 'ui05-api-many-' + suffix;
  for (let i = 0; i < 24; i++)
    await call(
      f.admin,
      'POST',
      '/users',
      {
        fullName: `${term} ${i}`,
        email: `${term}-${i}@example.test`,
        role: 'STUDENT',
        password,
      },
      201,
    );
  const first = (
    await call(
      f.admin,
      'GET',
      `/users?search=${term}&role=STUDENT&page=1`,
      undefined,
      200,
    )
  ).data;
  const second = (
    await call(
      f.admin,
      'GET',
      `/users?search=${term}&role=STUDENT&page=2`,
      undefined,
      200,
    )
  ).data;
  assert.equal(first.total, 24);
  assert.equal(first.items.length, 20);
  assert.equal(second.items.length, 4);
  assert.equal(
    new Set([...first.items, ...second.items].map((u) => u.id)).size,
    24,
  );
  assert(
    !JSON.stringify(first).match(/passwordHash|refreshTokenHash|tokenVersion/),
  );
  await call(
    f.admin,
    'PATCH',
    `/users/${second.items[0].id}/status`,
    { isActive: false },
    200,
  );
  assert.equal(
    (
      await call(
        f.admin,
        'GET',
        `/users?search=${term}&active=false`,
        undefined,
        200,
      )
    ).data.total,
    1,
  );
  for (const actor of [f.teacherA, f.studentA])
    for (const [method, url, body] of [
      [
        'POST',
        '/users',
        {
          fullName: 'Denied',
          email: `denied-${suffix}@example.test`,
          role: 'STUDENT',
          password,
        },
      ],
      ['PATCH', `/users/${f.studentB.id}`, { fullName: 'Denied' }],
      ['PATCH', `/users/${f.studentB.id}/status`, { isActive: false }],
      ['POST', `/users/${f.studentB.id}/reset-password`, undefined],
    ])
      await call(actor, method, url, body, 403);
});
test('UI05 API: create, update, roster and reassignment transfer class scope after server confirmation', async () => {
  const item = (
    await call(
      f.admin,
      'POST',
      '/classes',
      {
        name: 'UI05 API class ' + suffix,
        code: 'UI05-API-' + suffix,
        teacherId: f.teacherA.id,
      },
      201,
    )
  ).data;
  await call(
    f.admin,
    'POST',
    `/classes/${item.id}/students`,
    { studentId: f.studentA.id },
    201,
  );
  await call(
    f.admin,
    'POST',
    `/classes/${item.id}/students`,
    { studentId: f.studentA.id },
    409,
  );
  await call(f.teacherB, 'GET', `/classes/${item.id}`, undefined, 403);
  await call(
    f.teacherA,
    'PATCH',
    `/classes/${item.id}`,
    { teacherId: f.teacherB.id },
    403,
  );
  await call(
    f.admin,
    'PATCH',
    `/classes/${item.id}`,
    { name: 'UI05 API edited ' + suffix, teacherId: f.teacherB.id },
    200,
  );
  await call(f.teacherA, 'GET', `/classes/${item.id}`, undefined, 403);
  assert.equal(
    (await call(f.teacherB, 'GET', `/classes/${item.id}`, undefined, 200)).data
      .members.length,
    1,
  );
  await call(f.studentB, 'GET', `/classes/${item.id}`, undefined, 403);
  await call(
    f.admin,
    'DELETE',
    `/classes/${item.id}/students/${f.studentA.id}`,
    undefined,
    200,
  );
  assert.equal(
    (
      await db.query('SELECT count(*) FROM "ClassMember" WHERE "classId"=$1', [
        item.id,
      ])
    ).rows[0].count,
    '0',
  );
  await call(
    f.admin,
    'POST',
    '/classes',
    {
      name: 'Wrong teacher',
      code: 'UI05-WRONG-' + suffix,
      teacherId: f.studentA.id,
    },
    400,
  );
  for (const actor of [f.teacherA, f.studentA])
    await call(
      actor,
      'POST',
      '/classes',
      {
        name: 'Denied class',
        code: 'DENIED-' + suffix,
        teacherId: f.teacherA.id,
      },
      403,
    );
});
test('UI05 API: monitoring uses published versions and scoped reports, never current draft metadata for assignments', async () => {
  const asg = await assignment(
      f,
      { classId: f.classes.B.id, studentId: undefined },
      f.admin,
    ),
    attempt = await start(f, asg, f.studentB);
  await call(
    f.studentB,
    'POST',
    `/exam-attempts/${attempt.id}/submit`,
    undefined,
    201,
  );
  await call(
    f.teacherA,
    'POST',
    `/exams/${f.exam.id}/new-version`,
    undefined,
    201,
  );
  await call(
    f.teacherA,
    'PATCH',
    `/exams/${f.exam.id}`,
    {
      title: 'UI05 current draft ' + suffix,
      durationMin: 5,
      questions: f.questions.map((q) => ({ questionId: q.id, points: 1 })),
    },
    200,
  );
  const listed = (
    await call(
      f.admin,
      'GET',
      `/exams?search=${encodeURIComponent('UI05 current draft ' + suffix)}&status=DRAFT`,
      undefined,
      200,
    )
  ).data;
  assert.equal(listed.total, 1);
  assert.equal(listed.items[0]._count.assignments, 1);
  assert.equal(listed.items[0]._count.attempts, 1);
  const summary = (
    await call(
      f.admin,
      'GET',
      `/exam-assignments?examId=${f.exam.id}`,
      undefined,
      200,
    )
  ).data.items[0];
  assert.equal(summary.exam.title, f.exam.title);
  assert.equal(summary.examVersion.id, f.version.id);
  assert(!JSON.stringify(summary).includes('isCorrect'));
  await call(f.admin, 'GET', `/results/${attempt.id}`, undefined, 200);
  await call(f.teacherA, 'GET', `/results/${attempt.id}`, undefined, 403);
  await call(f.studentA, 'GET', `/results/${attempt.id}`, undefined, 403);
  await call(f.studentA, 'GET', '/exams', undefined, 403);
});
test('UI05 API: reset is Admin only, returns the temporary secret once and revokes old sessions', async () => {
  const user = (
    await call(
      f.admin,
      'POST',
      '/users',
      {
        email: `ui05-reset-api-${suffix}@example.test`,
        fullName: 'UI05 reset target',
        role: 'STUDENT',
        password,
      },
      201,
    )
  ).data;
  const actor = { ...user, cookies: {} };
  await call(
    actor,
    'POST',
    '/auth/login',
    { email: user.email, password },
    200,
  );
  const reset = (
    await call(
      f.admin,
      'POST',
      `/users/${user.id}/reset-password`,
      undefined,
      201,
    )
  ).data;
  assert.equal(typeof reset.temporaryPassword, 'string');
  assert(reset.temporaryPassword.length >= 12);
  await call(actor, 'GET', '/auth/me', undefined, 401);
  await call(null, 'POST', '/auth/login', { email: user.email, password }, 401);
  const logged = (
    await call(
      null,
      'POST',
      '/auth/login',
      { email: user.email, password: reset.temporaryPassword },
      200,
    )
  ).data;
  assert.equal(logged.id, user.id);
  assert(!JSON.stringify(logged).match(/password|token/i));
  assert(
    !JSON.stringify(
      (await call(f.admin, 'GET', `/users/${user.id}`, undefined, 200)).data,
    ).includes(reset.temporaryPassword),
  );
});
