const { test, before, after } = require('node:test');
const { randomUUID } = require('node:crypto');
const {
  assert,
  db,
  call,
  fixtures,
  assignment,
  start,
  suffix,
} = require('./p0-support.cjs');
let f;
before(async () => {
  f = await fixtures();
});
after(async () => {
  await db.end();
});

test('F16: additive migrations create the missing index and default review flags', async () => {
  const indexes = await db.query(
    "SELECT indexdef FROM pg_indexes WHERE indexname='ExamVersion_examId_publishedAt_idx'",
  );
  assert.equal(indexes.rowCount, 1);
  assert(indexes.rows[0].indexdef.includes('"publishedAt"'));
  const count = await db.query(
    'SELECT count(*)::int AS n FROM "ExamAttempt" WHERE "reviewQuestionIds" IS NULL',
  );
  assert.equal(count.rows[0].n, 0);
});
test('F17: malformed route IDs return 400 across all data domains, absent IDs 404', async () => {
  for (const actor of [f.admin, f.teacherA]) {
    for (const domain of [
      'exams',
      'exam-assignments',
      'results',
      'users',
      'classes',
      'questions',
    ]) {
      for (const invalid of ['not-a-uuid', '10000000-0000'])
        await call(actor, 'GET', `/${domain}/${invalid}`, undefined, 400);
    }
  }
  await call(f.studentA, 'GET', '/exam-attempts/not-a-uuid', undefined, 400);
  await call(f.teacherA, 'GET', `/exams/${randomUUID()}`, undefined, 404);
  await call(f.teacherB, 'GET', `/exams/${f.exam.id}/versions`, undefined, 403);
});
test('F10/F09: explicit v1/v2 pinning, grading and default version while current draft changes', async () => {
  const first = f.version;
  await call(
    f.teacherA,
    'POST',
    `/exams/${f.exam.id}/new-version`,
    undefined,
    201,
  );
  const second = (
    await call(
      f.teacherA,
      'POST',
      `/exams/${f.exam.id}/publish`,
      undefined,
      201,
    )
  ).data;
  const versions = (
    await call(
      f.teacherA,
      'GET',
      `/exams/${f.exam.id}/versions`,
      undefined,
      200,
    )
  ).data;
  assert.deepEqual(
    versions.map((v) => v.number),
    [2, 1],
  );
  for (const version of [first, second]) {
    const asg = await assignment(f, { examVersionId: version.id });
    assert.equal(asg.examVersion.id, version.id);
    const a = await start(f, asg);
    assert.equal(a.version, version.number);
    const q = first.snapshot.questions[0],
      answer = { optionId: q.options.find((o) => o.isCorrect).id };
    await call(
      f.studentA,
      'PUT',
      `/exam-attempts/${a.id}/answers/${q.questionId}`,
      { revision: 1, answer },
      200,
    );
    await call(
      f.studentA,
      'POST',
      `/exam-attempts/${a.id}/submit`,
      undefined,
      201,
    );
    assert.equal(
      (await db.query('SELECT score FROM "ExamAttempt" WHERE id=$1', [a.id]))
        .rows[0].score,
      '2.50',
    );
  }
  const foreignExam = (
    await call(
      f.teacherA,
      'POST',
      '/exams',
      {
        title: 'Foreign version',
        durationMin: 10,
        questions: [{ questionId: f.questions[0].id, points: 1 }],
      },
      201,
    )
  ).data;
  const foreignVersion = (
    await call(
      f.teacherA,
      'POST',
      `/exams/${foreignExam.id}/publish`,
      undefined,
      201,
    )
  ).data;
  await call(
    f.teacherA,
    'POST',
    '/exam-assignments',
    {
      examId: f.exam.id,
      examVersionId: foreignVersion.id,
      studentId: f.studentA.id,
    },
    400,
  );
  const originalDate = second.publishedAt;
  await db.query(
    'UPDATE "ExamVersion" SET "publishedAt"=now()+interval \'1 day\' WHERE id=$1',
    [second.id],
  );
  try {
    await call(
      f.teacherA,
      'POST',
      '/exam-assignments',
      { examId: f.exam.id, examVersionId: second.id, studentId: f.studentA.id },
      400,
    );
  } finally {
    await db.query('UPDATE "ExamVersion" SET "publishedAt"=$2 WHERE id=$1', [
      second.id,
      originalDate,
    ]);
  }
  await call(
    f.teacherA,
    'POST',
    `/exams/${f.exam.id}/new-version`,
    undefined,
    201,
  );
  const implicit = await assignment(f);
  assert.equal(implicit.examVersion.id, second.id);
  const old = await assignment(f, { examVersionId: first.id });
  assert.equal((await start(f, old)).version, 1);
});
test('F12/F05: former and locked students retain history under current class manager only', async () => {
  const asg = await assignment(f, {
    studentId: undefined,
    classId: f.classes.A.id,
  });
  const a = await start(f, asg);
  await call(
    f.studentA,
    'POST',
    `/exam-attempts/${a.id}/submit`,
    undefined,
    201,
  );
  const before = (
    await db.query(
      'SELECT score,"submittedAt" FROM "ExamAttempt" WHERE id=$1',
      [a.id],
    )
  ).rows[0];
  await call(
    f.admin,
    'PATCH',
    `/users/${f.studentA.id}/status`,
    { isActive: false },
    200,
  );
  const lockedReport = (
    await call(f.teacherA, 'GET', `/results/exams/${f.exam.id}`, undefined, 200)
  ).data;
  const locked = lockedReport.assignments
    .find((value) => value.id === asg.id)
    .students.find((student) => student.id === f.studentA.id);
  assert.equal(locked.isCurrentRecipient, true);
  assert.equal(locked.isActive, false);
  await call(
    f.admin,
    'DELETE',
    `/classes/${f.classes.A.id}/students/${f.studentA.id}`,
    undefined,
    200,
  );
  for (const actor of [f.admin, f.teacherA]) {
    const report = (
      await call(actor, 'GET', `/results/exams/${f.exam.id}`, undefined, 200)
    ).data;
    const history = report.assignments
      .find((value) => value.id === asg.id)
      .students.find((student) => student.id === f.studentA.id);
    assert.equal(history.isCurrentRecipient, false);
    assert.equal(history.isActive, false);
    assert.equal(history.attempts[0].id, a.id);
  }
  await call(f.teacherB, 'GET', `/results/${a.id}`, undefined, 403);
  await call(
    f.admin,
    'PATCH',
    `/classes/${f.classes.A.id}`,
    { teacherId: f.teacherB.id },
    200,
  );
  await call(f.teacherA, 'GET', `/results/${a.id}`, undefined, 403);
  await call(f.teacherB, 'GET', `/results/${a.id}`, undefined, 200);
  assert.deepEqual(
    (
      await db.query(
        'SELECT score,"submittedAt" FROM "ExamAttempt" WHERE id=$1',
        [a.id],
      )
    ).rows[0],
    before,
  );
  await call(
    f.admin,
    'PATCH',
    `/classes/${f.classes.A.id}`,
    { teacherId: f.teacherA.id },
    200,
  );
  await call(
    f.admin,
    'PATCH',
    `/users/${f.studentA.id}/status`,
    { isActive: true },
    200,
  );
  await call(
    f.admin,
    'POST',
    `/classes/${f.classes.A.id}/students`,
    { studentId: f.studentA.id },
    201,
  );
  const { login } = require('./p0-support.cjs');
  await login(f.studentA);
});
test('F13: 24 assignments paginate 20/4 with stable order, correct totals and recipient isolation', async () => {
  const exam = (
    await call(
      f.teacherA,
      'POST',
      '/exams',
      {
        title: `Pagination ${suffix}`,
        durationMin: 10,
        questions: [{ questionId: f.questions[0].id, points: 1 }],
      },
      201,
    )
  ).data;
  await call(f.teacherA, 'POST', `/exams/${exam.id}/publish`, undefined, 201);
  for (let i = 0; i < 24; i++) await assignment(f, { examId: exam.id });
  const all = [];
  for (const [page, expected] of [
    [1, 20],
    [2, 4],
  ]) {
    const result = (
      await call(
        f.studentA,
        'GET',
        `/exam-assignments?page=${page}&search=${encodeURIComponent(exam.title)}`,
        undefined,
        200,
      )
    ).data;
    assert.equal(result.total, 24);
    assert.equal(result.items.length, expected);
    all.push(...result.items.map((item) => item.id));
  }
  assert.equal(new Set(all).size, 24);
  const denied = (
    await call(
      f.studentB,
      'GET',
      `/exam-assignments?examId=${exam.id}&page=2`,
      undefined,
      200,
    )
  ).data;
  assert.equal(denied.total, 0);
  assert.equal(denied.items.length, 0);
  const admin = (
    await call(
      f.admin,
      'GET',
      `/exams?search=${encodeURIComponent(exam.title)}`,
      undefined,
      200,
    )
  ).data;
  assert.equal(admin.items[0]._count.assignments, 24);
});
test('F15: review flags persist without touching answer revision, validate owner and question', async () => {
  const a = await start(f, await assignment(f)),
    q = a.snapshot.questions[0];
  await call(
    f.studentA,
    'PUT',
    `/exam-attempts/${a.id}/review/${q.questionId}`,
    { marked: true },
    200,
  );
  const restored = (
    await call(f.studentA, 'GET', `/exam-attempts/${a.id}`, undefined, 200)
  ).data;
  assert.deepEqual(restored.reviewQuestionIds, [q.questionId]);
  assert.equal(restored.answers.length, 0);
  await call(
    f.studentB,
    'PUT',
    `/exam-attempts/${a.id}/review/${q.questionId}`,
    { marked: true },
    403,
  );
  await call(
    f.studentA,
    'PUT',
    `/exam-attempts/${a.id}/review/${randomUUID()}`,
    { marked: true },
    400,
  );
  await call(
    f.studentA,
    'PUT',
    `/exam-attempts/${a.id}/review/${q.questionId}`,
    { marked: false },
    200,
  );
  assert.deepEqual(
    (await call(f.studentA, 'GET', `/exam-attempts/${a.id}`, undefined, 200))
      .data.reviewQuestionIds,
    [],
  );
});
test('F20: edits enforce scope; bank edits keep published snapshots immutable', async () => {
  await call(
    f.teacherA,
    'PATCH',
    `/users/${f.studentA.id}`,
    { fullName: 'Denied' },
    403,
  );
  await call(
    f.admin,
    'PATCH',
    `/users/${f.studentA.id}`,
    { fullName: 'P1 edited learner' },
    200,
  );
  await call(
    f.teacherB,
    'PATCH',
    `/classes/${f.classes.A.id}`,
    { name: 'Denied' },
    403,
  );
  await call(
    f.teacherA,
    'PATCH',
    `/classes/${f.classes.A.id}`,
    { teacherId: f.teacherB.id },
    403,
  );
  await call(
    f.teacherA,
    'PATCH',
    `/classes/${f.classes.A.id}`,
    { description: 'P1 owned edit' },
    200,
  );
  const frozen = (
    await db.query('SELECT snapshot FROM "ExamVersion" WHERE id=$1', [
      f.version.id,
    ])
  ).rows[0].snapshot;
  for (const q of f.questions) {
    const body = {
      type: q.type,
      content: `Edited ${q.content}`,
      ...(q.type === 'MATCHING'
        ? {
            matchingPairs: q.matchingPairs.map((p) => ({
              leftText: p.leftText,
              rightText: p.rightText,
            })),
          }
        : {
            options: q.options.map((o) => ({
              content: o.content,
              isCorrect: o.isCorrect,
            })),
          }),
    };
    await call(f.teacherB, 'PATCH', `/questions/${q.id}`, body, 403);
    await call(f.teacherA, 'PATCH', `/questions/${q.id}`, body, 200);
  }
  assert.deepEqual(
    (
      await db.query('SELECT snapshot FROM "ExamVersion" WHERE id=$1', [
        f.version.id,
      ])
    ).rows[0].snapshot,
    frozen,
  );
});
