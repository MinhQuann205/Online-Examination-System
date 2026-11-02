const { test, before, after } = require('node:test');
const {
  assert,
  db,
  fixtures,
  assignment,
  start,
  call,
} = require('./p0-support.cjs');
const {
  testDatabaseConfig,
  verifyTestDatabase,
} = require('./test-database.cjs');
let f;
before(async () => {
  f = await fixtures();
});
after(async () => {
  await db.end();
});

async function submit(asg) {
  const a = await start(f, asg);
  const question = f.version.snapshot.questions[0];
  await call(
    f.studentA,
    'PUT',
    '/exam-attempts/' + a.id + '/answers/' + question.questionId,
    {
      revision: 1,
      answer: { optionId: question.options.find((o) => o.isCorrect).id },
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
  assert.equal(
    (await db.query('SELECT score FROM "ExamAttempt" WHERE id=$1', [a.id]))
      .rows[0].score,
    '2.50',
  );
  return a;
}

test('GR01: real class reassignment revokes every assignment read/count/write-return path and Results consistently', async () => {
  const asg = await assignment(f, {
    studentId: undefined,
    classId: f.classes.A.id,
  });
  const a = await submit(asg);
  const roster = await call(
    f.teacherA,
    'GET',
    '/exam-assignments/' + asg.id + '/students',
    undefined,
    200,
  );
  assert.equal(
    roster.data.find((s) => s.id === f.studentA.id).attempts[0].score,
    '2.5',
  );
  await call(
    f.teacherB,
    'GET',
    '/exam-assignments/' + asg.id + '/students',
    undefined,
    403,
  );
  await call(f.studentB, 'GET', '/exam-assignments/' + asg.id, undefined, 403);
  await call(
    f.studentA,
    'GET',
    '/exam-assignments/' + asg.id + '/students',
    undefined,
    403,
  );
  await call(
    f.admin,
    'PATCH',
    '/classes/' + f.classes.A.id,
    { teacherId: f.teacherB.id },
    200,
  );
  try {
    for (const actor of [f.teacherB, f.admin]) {
      const r = await call(
        actor,
        'GET',
        '/exam-assignments/' + asg.id + '/students',
        undefined,
        200,
      );
      assert(r.data.some((s) => s.id === f.studentA.id));
      await call(actor, 'GET', '/exam-assignments/' + asg.id, undefined, 200);
      await call(actor, 'GET', '/results/' + a.id, undefined, 200);
      const report = await call(
        actor,
        'GET',
        '/results/exams/' + f.exam.id,
        undefined,
        200,
      );
      assert(report.data.assignments.some((x) => x.id === asg.id));
    }
    for (const endpoint of [
      '/exam-assignments/' + asg.id,
      '/exam-assignments/' + asg.id + '/students',
      '/results/' + a.id,
    ]) {
      const denied = await call(f.teacherA, 'GET', endpoint, undefined, 403);
      const body = JSON.stringify(denied.data);
      assert(!body.includes(f.studentA.email));
      assert(!body.includes('score'));
    }
    await call(
      f.teacherA,
      'PATCH',
      '/exam-assignments/' + asg.id,
      { showScore: false },
      403,
    );
    const list = await call(
      f.teacherA,
      'GET',
      '/exam-assignments?examId=' + f.exam.id,
      undefined,
      200,
    );
    assert.equal(list.data.total, 0);
    assert.deepEqual(list.data.items, []);
    const report = await call(
      f.teacherA,
      'GET',
      '/results/exams/' + f.exam.id,
      undefined,
      200,
    );
    assert.deepEqual(report.data.assignments, []);
    const manager = await call(
      f.teacherB,
      'GET',
      '/exam-assignments?examId=' + f.exam.id,
      undefined,
      200,
    );
    assert.equal(manager.data.total, 1);
    await call(f.studentA, 'GET', '/results/' + a.id, undefined, 200);
  } finally {
    await call(
      f.admin,
      'PATCH',
      '/classes/' + f.classes.A.id,
      { teacherId: f.teacherA.id },
      200,
    );
  }
});

test('GR01: direct creator loses roster/score/counts after last managed membership ends; Student and Admin retain own rights', async () => {
  const asg = await assignment(f),
    a = await submit(asg);
  await call(
    f.teacherA,
    'GET',
    '/exam-assignments/' + asg.id + '/students',
    undefined,
    200,
  );
  await call(
    f.admin,
    'DELETE',
    '/classes/' + f.classes.A.id + '/students/' + f.studentA.id,
    undefined,
    200,
  );
  try {
    for (const actor of [f.teacherA, f.teacherB]) {
      for (const endpoint of [
        '/exam-assignments/' + asg.id,
        '/exam-assignments/' + asg.id + '/students',
        '/results/' + a.id,
      ])
        await call(actor, 'GET', endpoint, undefined, 403);
    }
    const list = await call(
      f.teacherA,
      'GET',
      '/exam-assignments?examId=' + f.exam.id,
      undefined,
      200,
    );
    assert(!list.data.items.some((x) => x.id === asg.id));
    assert.equal(list.data.total, 1);
    await call(
      f.admin,
      'GET',
      '/exam-assignments/' + asg.id + '/students',
      undefined,
      200,
    );
    await call(f.admin, 'GET', '/results/' + a.id, undefined, 200);
    await call(
      f.studentA,
      'GET',
      '/exam-assignments/' + asg.id,
      undefined,
      200,
    );
    await call(f.studentA, 'GET', '/results/' + a.id, undefined, 200);
    await call(f.studentB, 'GET', '/results/' + a.id, undefined, 403);
    const report = await call(
      f.teacherA,
      'GET',
      '/results/exams/' + f.exam.id,
      undefined,
      200,
    );
    assert(!report.data.assignments.some((x) => x.id === asg.id));
  } finally {
    await call(
      f.admin,
      'POST',
      '/classes/' + f.classes.A.id + '/students',
      { studentId: f.studentA.id },
      201,
    );
  }
});

test('GR03: v1 assignment/result metadata remains pinned after publishing differently named/scored v2', async () => {
  const v1 = await assignment(f, {
      examVersionId: f.version.id,
      showAnswers: false,
    }),
    a = await submit(v1);
  const titleA = f.version.snapshot.title;
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
      title: 'Changed v2 title ' + f.exam.id,
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
  const asg2 = await assignment(f, {
    examVersionId: v2.id,
    showAnswers: false,
  });
  const titleB = v2.snapshot.title;
  assert.equal(asg2.exam.title, titleB);
  assert.equal(asg2.exam.durationMin, 5);
  for (const actor of [f.studentA, f.teacherA, f.admin]) {
    const detail = (
      await call(actor, 'GET', '/exam-assignments/' + v1.id, undefined, 200)
    ).data;
    assert.equal(detail.exam.title, titleA);
    assert.equal(detail.exam.durationMin, 30);
    assert(!JSON.stringify(detail).includes('isCorrect'));
    const list = (
      await call(
        actor,
        'GET',
        '/exam-assignments?examId=' + f.exam.id,
        undefined,
        200,
      )
    ).data;
    assert.equal(list.items.find((x) => x.id === v1.id).exam.title, titleA);
    assert.equal(list.items.find((x) => x.id === asg2.id).exam.title, titleB);
    const result = (
      await call(actor, 'GET', '/results/' + a.id, undefined, 200)
    ).data;
    assert.equal(result.exam.title, titleA);
    assert.equal(result.exam.durationMin, 30);
    assert.equal(result.maxScore, '6.75');
  }
  const studentResult = (
    await call(f.studentA, 'GET', '/results/' + a.id, undefined, 200)
  ).data;
  assert(!JSON.stringify(studentResult).includes('isCorrect'));
  const history = (await call(f.studentA, 'GET', '/results', undefined, 200))
    .data;
  assert.equal(history.items.find((x) => x.id === a.id).exam.title, titleA);
  const report = (
    await call(f.teacherA, 'GET', '/results/exams/' + f.exam.id, undefined, 200)
  ).data;
  const historical = report.assignments.find((x) => x.id === v1.id);
  assert.equal(historical.examVersion.title, titleA);
  assert.equal(historical.examVersion.durationMin, 30);
  assert.equal(historical.students[0].attempts[0].exam.title, titleA);
  assert.equal(
    report.assignments.find((x) => x.id === asg2.id).examVersion.title,
    titleB,
  );
  const search = (
    await call(
      f.studentA,
      'GET',
      '/exam-assignments?examId=' +
        f.exam.id +
        '&search=' +
        encodeURIComponent(titleA.toUpperCase()),
      undefined,
      200,
    )
  ).data;
  assert(search.items.some((x) => x.id === v1.id));
  assert(!search.items.some((x) => x.id === asg2.id));
  const newAttempt = await start(f, asg2);
  assert.equal(newAttempt.snapshot.title, titleB);
  assert.equal(newAttempt.snapshot.durationMin, 5);
  assert(!JSON.stringify(newAttempt).includes('isCorrect'));
  const newQuestion = newAttempt.snapshot.questions[0];
  const publishedQuestion = v2.snapshot.questions[0];
  await call(
    f.studentA,
    'PUT',
    '/exam-attempts/' + newAttempt.id + '/answers/' + newQuestion.questionId,
    {
      revision: 1,
      answer: {
        optionId: publishedQuestion.options.find((o) => o.isCorrect).id,
      },
    },
    200,
  );
  await call(
    f.studentA,
    'POST',
    '/exam-attempts/' + newAttempt.id + '/submit',
    undefined,
    201,
  );
  const newResult = (
    await call(f.studentA, 'GET', '/results/' + newAttempt.id, undefined, 200)
  ).data;
  assert.equal(newResult.exam.title, titleB);
  assert.equal(newResult.maxScore, '9');
  assert.equal(newResult.score, '9');
  await call(f.teacherB, 'GET', '/exam-assignments/' + v1.id, undefined, 403);
  await call(f.teacherB, 'GET', '/results/' + a.id, undefined, 403);
});

test('GR02: real test SQL identity passes and wrong expected instance fails before writes', async () => {
  const config = testDatabaseConfig();
  const identity = await verifyTestDatabase(db, config);
  assert.equal(identity.port, Number(process.env.TEST_DATABASE_PORT));
  await assert.rejects(
    verifyTestDatabase(db, {
      ...config,
      systemIdentifier: config.developmentSystemIdentifier,
    }),
  );
});

test('GR01: Student count and attempts never include a classmate activity', async () => {
  await call(
    f.admin,
    'POST',
    '/classes/' + f.classes.A.id + '/students',
    { studentId: f.studentB.id },
    201,
  );
  try {
    const asg = await assignment(f, {
      studentId: undefined,
      classId: f.classes.A.id,
    });
    const a = await start(f, asg),
      b = await start(f, asg, f.studentB);
    const detail = (
      await call(
        f.studentA,
        'GET',
        '/exam-assignments/' + asg.id,
        undefined,
        200,
      )
    ).data;
    assert.equal(detail._count.attempts, 1);
    assert.deepEqual(
      detail.attempts.map((x) => x.id),
      [a.id],
    );
    assert(!JSON.stringify(detail).includes(b.id));
    assert(!JSON.stringify(detail).includes(f.studentB.email));
    const list = (
      await call(
        f.studentA,
        'GET',
        '/exam-assignments?examId=' + f.exam.id,
        undefined,
        200,
      )
    ).data.items.find((x) => x.id === asg.id);
    assert.equal(list._count.attempts, 1);
    const manager = (
      await call(
        f.teacherA,
        'GET',
        '/exam-assignments/' + asg.id,
        undefined,
        200,
      )
    ).data;
    assert.equal(manager._count.attempts, 2);
    await call(
      f.studentA,
      'POST',
      '/exam-attempts/' + a.id + '/submit',
      undefined,
      201,
    );
    await call(
      f.studentB,
      'POST',
      '/exam-attempts/' + b.id + '/submit',
      undefined,
      201,
    );
  } finally {
    await call(
      f.admin,
      'DELETE',
      '/classes/' + f.classes.A.id + '/students/' + f.studentB.id,
      undefined,
      200,
    );
  }
});
test('GR03: legacy assignment without a pinned version never invents mutable metadata', async () => {
  const asg = await assignment(f);
  await db.query(
    'UPDATE "ExamAssignment" SET "examVersionId"=NULL WHERE id=$1',
    [asg.id],
  );
  const detail = (
    await call(f.studentA, 'GET', '/exam-assignments/' + asg.id, undefined, 200)
  ).data;
  assert.equal(detail.exam.metadataAvailable, false);
  assert.equal(detail.exam.durationMin, null);
  assert.notEqual(detail.exam.title, 'Changed v2 title ' + f.exam.id);
  await call(
    f.studentA,
    'POST',
    '/exam-assignments/' + asg.id + '/start',
    undefined,
    400,
  );
});

test('GR02: actual PostgreSQL identity verifies through an independently configured ephemeral test port', async () => {
  const net = require('node:net'),
    path = require('node:path');
  const { createRequire } = require('node:module');
  const { Pool } = createRequire(
    path.resolve(__dirname, '../apps/api/package.json'),
  )('pg');
  const { createTestPool } = require('./test-database.cjs');
  const config = testDatabaseConfig(),
    sockets = new Set();
  const proxy = net.createServer((client) => {
    const upstream = net.connect(config.port, config.host);
    sockets.add(client);
    sockets.add(upstream);
    client.on('error', () => upstream.destroy());
    upstream.on('error', () => client.destroy());
    client.on('close', () => {
      sockets.delete(client);
      upstream.destroy();
    });
    upstream.on('close', () => {
      sockets.delete(upstream);
      client.destroy();
    });
    client.pipe(upstream).pipe(client);
  });
  await new Promise((resolve, reject) => {
    proxy.once('error', reject);
    proxy.listen(0, '127.0.0.1', resolve);
  });
  const port = proxy.address().port,
    url = new URL(config.connectionString);
  url.port = String(port);
  const configured = testDatabaseConfig({
    ...process.env,
    DATABASE_TEST_URL: url.toString(),
    TEST_DATABASE_PORT: String(port),
  });
  const pool = createTestPool(Pool, configured);
  try {
    const identity = await pool.verifiedIdentity();
    assert.equal(identity.port, port);
    assert.equal(identity.systemIdentifier, config.systemIdentifier);
    assert.equal(
      (await pool.query('SELECT current_database() AS name')).rows[0].name,
      'online_exam_phase3_test',
    );
  } finally {
    await pool.end();
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve) => proxy.close(resolve));
  }
});
