const { test, before, after } = require('node:test');
const {
  assert,
  db,
  password,
  call,
  login,
  fixtures,
  assignment,
  start,
  answers,
  lockOrder,
  waitUntil,
  web,
} = require('./p0-support.cjs');
const { createRequire } = require('node:module');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const argon2 = createRequire(
  path.resolve(__dirname, '../apps/api/package.json'),
)('argon2');
let f;
before(async () => {
  f = await fixtures();
});
after(async () => {
  await db.end();
});
const question = () => f.questions[0];
const payload = (revision = 1) => ({
  revision,
  answer: { optionId: question().options.find((o) => o.isCorrect).id },
});
const save = (a, revision = 1) =>
  call(
    f.studentA,
    'PUT',
    `/exam-attempts/${a.id}/answers/${question().id}`,
    payload(revision),
  );
const submit = (a) => call(f.studentA, 'POST', `/exam-attempts/${a.id}/submit`);
const row = async (a) =>
  (await db.query('SELECT * FROM "ExamAttempt" WHERE id=$1', [a.id])).rows[0];
async function legacy(expired) {
  const asg = await assignment(f),
    attempt = await start(f, asg);
  await db.query(
    'UPDATE "ExamAttempt" SET "deadlineAt"=NULL,"startedAt"=now()-$2::interval WHERE id=$1',
    [attempt.id, expired ? '2 hours' : '1 minute'],
  );
  return attempt;
}

test('F01: Admin creates both roles; hashes, login, duplicate, validation and denial', async () => {
  for (const actor of [f.teacherA, f.studentA]) {
    const stored = (
      await db.query('SELECT * FROM "User" WHERE id=$1', [actor.id])
    ).rows[0];
    assert.notEqual(stored.passwordHash, password);
    assert(await argon2.verify(stored.passwordHash, password));
    const result = await login(actor);
    assert(!JSON.stringify(result.data).match(/password|token/i));
    assert(
      result.headers
        .getSetCookie()
        .every((cookie) => cookie.includes('HttpOnly')),
    );
  }
  await call(
    f.admin,
    'POST',
    '/users',
    {
      email: f.studentA.email,
      fullName: 'Duplicate',
      password,
      role: 'STUDENT',
    },
    409,
  );
  await call(
    f.admin,
    'POST',
    '/users',
    { email: 'invalid', fullName: '', password: 'short', role: 'ADMIN' },
    400,
  );
  await call(
    f.studentA,
    'POST',
    '/users',
    {
      email: 'denied@example.test',
      fullName: 'Denied',
      password,
      role: 'STUDENT',
    },
    403,
  );
});

test('F07: null deadline still in time is persisted before save and submit', async () => {
  const a = await legacy(false);
  assert.equal((await save(a)).data.saved, true);
  assert((await row(a)).deadlineAt);
  assert.equal((await submit(a)).data.status, 'SUBMITTED');
});
test('F07: expired null deadline blocks direct save and finalizes EXPIRED', async () => {
  const a = await legacy(true);
  assert.equal((await save(a)).data.saved, false);
  assert.equal((await row(a)).status, 'EXPIRED');
  assert.equal((await answers(a.id)).length, 0);
});
test('F07: direct submit of expired legacy attempt uses EXPIRED, never SUBMITTED', async () => {
  const a = await legacy(true);
  assert.equal((await submit(a)).data.status, 'EXPIRED');
  assert.equal((await row(a)).score, '0.00');
});
test('F07: scheduler expires null deadline without browser or API read', async () => {
  const a = await legacy(true);
  await waitUntil(async () => (await row(a)).status === 'EXPIRED', 22000);
});
test('F07: save first then submit preserves acknowledged answer; late save is denied', async () => {
  const a = await start(f, await assignment(f));
  const [saved, submitted] = await lockOrder(a.id, [
    () => save(a),
    () => submit(a),
  ]);
  assert.equal(saved.data.saved, true);
  assert.equal(submitted.data.status, 'SUBMITTED');
  assert.equal((await row(a)).score, '2.50');
  assert.equal((await save(a, 2)).status, 409);
  const stamp = (await row(a)).submittedAt.toISOString();
  await submit(a);
  assert.equal((await row(a)).submittedAt.toISOString(), stamp);
});
test('F07: submit first prevents an answer arriving later from entering the grade', async () => {
  const a = await start(f, await assignment(f));
  const [submitted, saved] = await lockOrder(a.id, [
    () => submit(a),
    () => save(a),
  ]);
  assert.equal(submitted.data.status, 'SUBMITTED');
  assert.equal(saved.status, 409);
  assert.equal((await answers(a.id)).length, 0);
});
test('F07: expiration wins a queued save at deadline boundary', async () => {
  const a = await start(f, await assignment(f));
  await db.query(
    'UPDATE "ExamAttempt" SET "deadlineAt"=now()+interval \'0.4 seconds\' WHERE id=$1',
    [a.id],
  );
  const client = await db.connect();
  await client.query('BEGIN');
  await client.query('SELECT id FROM "ExamAttempt" WHERE id=$1 FOR UPDATE', [
    a.id,
  ]);
  const pending = save(a);
  try {
    await new Promise((resolve) => setTimeout(resolve, 600));
  } finally {
    await client.query('COMMIT');
    client.release();
  }
  assert.equal((await pending).data.saved, false);
  assert.equal((await row(a)).status, 'EXPIRED');
});

test('F08: schedule can change before start; active schedule edits reject atomically', async () => {
  const asg = await assignment(f);
  const closesAt = new Date(Date.now() + 3600000).toISOString();
  await call(
    f.teacherA,
    'PATCH',
    `/exam-assignments/${asg.id}`,
    { closesAt },
    200,
  );
  const a = await start(f, asg);
  for (const change of [
    { closesAt: new Date(Date.now() - 1000).toISOString() },
    { closesAt: null },
    { opensAt: new Date(Date.now() - 2000).toISOString() },
  ])
    await call(f.teacherA, 'PATCH', `/exam-assignments/${asg.id}`, change, 409);
  await call(
    f.teacherA,
    'PATCH',
    `/exam-assignments/${asg.id}`,
    { closesAt, showScore: false },
    200,
  );
  assert.equal((await save(a)).data.saved, true);
  assert.equal((await submit(a)).data.status, 'SUBMITTED');
  const before = await row(a);
  await call(
    f.teacherA,
    'PATCH',
    `/exam-assignments/${asg.id}`,
    { closesAt: new Date(Date.now() - 1000).toISOString() },
    200,
  );
  assert.deepEqual(await row(a), before);
});
test('F08: concurrent PATCH/save and PATCH/submit preserve accepted schedule policy', async () => {
  const asg = await assignment(f),
    a = await start(f, asg);
  const past = new Date(Date.now() - 1000).toISOString();
  const [patch, saved] = await Promise.all([
    call(f.teacherA, 'PATCH', `/exam-assignments/${asg.id}`, {
      closesAt: past,
    }),
    save(a),
  ]);
  assert.equal(patch.status, 409);
  assert.equal(saved.data.saved, true);
  const [changed, submitted] = await Promise.all([
    call(f.teacherA, 'PATCH', `/exam-assignments/${asg.id}`, {
      closesAt: past,
    }),
    submit(a),
  ]);
  assert([200, 409].includes(changed.status));
  assert.equal(submitted.data.status, 'SUBMITTED');
  assert.equal((await row(a)).score, '2.50');
});
test('F08: start and PATCH serialize using the assignment row lock', async () => {
  const asg = await assignment(f);
  const [started, patch] = await lockOrder(
    asg.id,
    [
      () => call(f.studentA, 'POST', `/exam-assignments/${asg.id}/start`),
      () =>
        call(f.teacherA, 'PATCH', `/exam-assignments/${asg.id}`, {
          closesAt: new Date(Date.now() - 1000).toISOString(),
        }),
    ],
    'ExamAssignment',
  );
  assert.equal(started.status, 201);
  assert.equal(patch.status, 409);
  await submit(started.data);
});

test('F05: author cannot read foreign class results; manager and Admin can; report is scoped', async () => {
  const asg = await assignment(
    f,
    { studentId: undefined, classId: f.classes.B.id },
    f.admin,
  );
  const a = await start(f, asg, f.studentB);
  await call(
    f.studentB,
    'POST',
    `/exam-attempts/${a.id}/submit`,
    undefined,
    201,
  );
  await call(f.teacherA, 'GET', `/results/${a.id}`, undefined, 403);
  await call(f.teacherB, 'GET', `/results/${a.id}`, undefined, 200);
  await call(f.admin, 'GET', `/results/${a.id}`, undefined, 200);
  await call(f.studentA, 'GET', `/results/${a.id}`, undefined, 403);
  const report = (
    await call(f.teacherA, 'GET', `/results/exams/${f.exam.id}`, undefined, 200)
  ).data;
  assert(!JSON.stringify(report).includes(f.studentB.id));
  assert(!report.assignments.some((value) => value.id === asg.id));
  const managed = (
    await call(f.teacherB, 'GET', `/results/exams/${f.exam.id}`, undefined, 200)
  ).data;
  assert(managed.assignments.some((value) => value.id === asg.id));
  await call(
    f.admin,
    'PATCH',
    `/classes/${f.classes.B.id}`,
    { teacherId: f.teacherA.id },
    200,
  );
  await call(f.teacherB, 'GET', `/results/${a.id}`, undefined, 403);
  await call(f.teacherA, 'GET', `/results/${a.id}`, undefined, 200);
  await call(
    f.admin,
    'DELETE',
    `/classes/${f.classes.B.id}/students/${f.studentB.id}`,
    undefined,
    200,
  );
  await call(f.teacherA, 'GET', `/results/${a.id}`, undefined, 200);
});
test('F05: direct results require creator and current managed recipient', async () => {
  const asg = await assignment(f),
    a = await start(f, asg);
  await submit(a);
  await call(f.teacherA, 'GET', `/results/${a.id}`, undefined, 200);
  await call(f.teacherB, 'GET', `/results/${a.id}`, undefined, 403);
  await call(
    f.admin,
    'DELETE',
    `/classes/${f.classes.A.id}/students/${f.studentA.id}`,
    undefined,
    200,
  );
  await call(f.teacherA, 'GET', `/results/${a.id}`, undefined, 403);
  await call(
    f.admin,
    'POST',
    `/classes/${f.classes.A.id}/students`,
    { studentId: f.studentA.id },
    201,
  );
});

test('F06: unsafe methods reject sibling/no proof; trusted mutations, refresh, logout and CORS work', async () => {
  const a = await start(f, await assignment(f));
  for (const headers of [
    { Origin: 'http://localhost:3104' },
    { Origin: '' },
    { Origin: 'null' },
  ]) {
    await call(
      f.studentA,
      'POST',
      `/exam-attempts/${a.id}/submit`,
      undefined,
      403,
      headers,
    );
    await call(
      f.studentA,
      'PUT',
      `/exam-attempts/${a.id}/answers/${question().id}`,
      payload(),
      403,
      headers,
    );
    await call(
      f.teacherA,
      'PATCH',
      `/exam-assignments/${a.assignmentId || (await row(a)).assignmentId}`,
      { showScore: true },
      403,
      headers,
    );
    await call(
      f.admin,
      'DELETE',
      `/classes/${f.classes.A.id}/students/${f.studentA.id}`,
      undefined,
      403,
      headers,
    );
  }
  assert.equal((await row(a)).status, 'IN_PROGRESS');
  const allowed = await save(a);
  assert.equal(allowed.data.saved, true);
  assert.equal(allowed.headers.get('access-control-allow-origin'), web);
  assert.equal(allowed.headers.get('access-control-allow-credentials'), 'true');
  await call(f.studentA, 'POST', '/auth/refresh', undefined, 200);
  await call(f.studentA, 'GET', '/auth/me', undefined, 200);
  await submit(a);
  await call(f.studentA, 'POST', '/auth/logout', undefined, 204);
  await call(f.studentA, 'GET', '/auth/me', undefined, 401);
  await login(f.studentA);
});

test('transaction rollback prevents partial grading after a database failure', async () => {
  const a = await start(f, await assignment(f));
  await save(a);
  const identifier = `p0_fail_${randomUUID().replaceAll('-', '')}`;
  await db.query(
    `CREATE FUNCTION ${identifier}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id='${a.id}'::uuid AND NEW.status <> 'IN_PROGRESS' THEN RAISE EXCEPTION 'P0 test rollback'; END IF; RETURN NEW; END $$`,
  );
  await db.query(
    `CREATE TRIGGER ${identifier} BEFORE UPDATE ON "ExamAttempt" FOR EACH ROW EXECUTE FUNCTION ${identifier}()`,
  );
  try {
    assert.equal((await submit(a)).status, 500);
    assert.equal((await row(a)).status, 'IN_PROGRESS');
    assert.equal((await row(a)).score, null);
    assert.equal(
      (
        await db.query(
          'SELECT awarded FROM "AttemptAnswer" WHERE "attemptId"=$1',
          [a.id],
        )
      ).rows[0].awarded,
      null,
    );
  } finally {
    await db.query(`DROP TRIGGER ${identifier} ON "ExamAttempt"`);
    await db.query(`DROP FUNCTION ${identifier}()`);
  }
  assert.equal((await submit(a)).data.status, 'SUBMITTED');
});

test('F09: assigned published v1 remains available while v2 is draft and grades v1', async () => {
  const asg = await assignment(f),
    frozen = JSON.stringify(f.version.snapshot);
  await call(
    f.teacherA,
    'POST',
    `/exams/${f.exam.id}/new-version`,
    undefined,
    201,
  );
  const a = await start(f, asg);
  assert.equal(a.version, 1);
  await save(a);
  await submit(a);
  assert.equal((await row(a)).score, '2.50');
  const v2 = (
    await call(
      f.teacherA,
      'POST',
      `/exams/${f.exam.id}/publish`,
      undefined,
      201,
    )
  ).data;
  assert.equal(v2.number, 2);
  const old = (
    await db.query('SELECT snapshot FROM "ExamVersion" WHERE id=$1', [
      f.version.id,
    ])
  ).rows[0];
  assert.deepEqual(old.snapshot, JSON.parse(frozen));
  const bad = await assignment(f);
  await db.query(
    'UPDATE "ExamAssignment" SET "examVersionId"=NULL WHERE id=$1',
    [bad.id],
  );
  await call(
    f.studentA,
    'POST',
    `/exam-assignments/${bad.id}/start`,
    undefined,
    400,
  );
  await db.query('UPDATE "ExamAssignment" SET "examVersionId"=$2 WHERE id=$1', [
    bad.id,
    v2.id,
  ]);
  const publishedAt = (
    await db.query('SELECT "publishedAt" FROM "ExamVersion" WHERE id=$1', [
      v2.id,
    ])
  ).rows[0].publishedAt;
  await db.query(
    'UPDATE "ExamVersion" SET "publishedAt"=now()+interval \'1 day\' WHERE id=$1',
    [v2.id],
  );
  try {
    await call(
      f.studentA,
      'POST',
      `/exam-assignments/${bad.id}/start`,
      undefined,
      400,
    );
  } finally {
    await db.query('UPDATE "ExamVersion" SET "publishedAt"=$2 WHERE id=$1', [
      v2.id,
      publishedAt,
    ]);
  }
  await call(f.teacherA, 'POST', `/exams/${f.exam.id}/archive`, undefined, 201);
  const unused = await assignmentForArchivedFixture();
  await call(
    f.studentA,
    'POST',
    `/exam-assignments/${unused.id}/start`,
    undefined,
    400,
  );
  async function assignmentForArchivedFixture() {
    const id = randomUUID();
    await db.query(
      'INSERT INTO "ExamAssignment" (id,"examId","examVersionId","studentId","createdById","updatedAt") VALUES ($1,$2,$3,$4,$5,now())',
      [id, f.exam.id, v2.id, f.studentA.id, f.teacherA.id],
    );
    return { id };
  }
});
