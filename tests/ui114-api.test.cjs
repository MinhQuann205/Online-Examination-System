const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
assert.equal(
  process.env.UI114_FEATURE_RUNTIME_APPROVED,
  '1',
  'UI114_LIVE_FEATURE_SCOPE_REQUIRED',
);
const {
  fixtures,
  call,
  assignment,
  start,
  db,
  suffix,
} = require('./p0-support.cjs');
let f;
before(async () => {
  f = await fixtures();
});
after(async () => {
  await db.end();
});

test('UI114-API01: archive/filter/restore preserves class roster, assignment and historical attempt', async () => {
  const a = (
    await call(
      f.teacherA,
      'POST',
      '/exam-assignments',
      {
        examId: f.exam.id,
        examVersionId: f.version.id,
        classId: f.classes.A.id,
        showScore: true,
      },
      201,
    )
  ).data;
  const attempt = await start(f, a);
  await call(
    f.studentA,
    'POST',
    `/exam-attempts/${attempt.id}/submit`,
    undefined,
    201,
  );
  const roster = async () =>
    (
      await db.query(
        'SELECT id,"studentId" FROM "ClassMember" WHERE "classId"=$1 ORDER BY id',
        [f.classes.A.id],
      )
    ).rows;
  const history = async () =>
    (
      await db.query(
        'SELECT status,score,"examVersionId","examSnapshot" FROM "ExamAttempt" WHERE id=$1',
        [attempt.id],
      )
    ).rows[0];
  const beforeRoster = await roster(),
    beforeHistory = await history();
  for (const c of [f.classes.A, f.classes.B])
    await call(f.admin, 'PATCH', '/classes/' + c.id, { isArchived: true }, 200);
  const active = (
    await call(f.admin, 'GET', '/classes?search=' + suffix, undefined, 200)
  ).data;
  assert(!active.items.some((c) => c.id === f.classes.A.id));
  const archived = (
    await call(
      f.admin,
      'GET',
      '/classes?archived=true&search=' + suffix,
      undefined,
      200,
    )
  ).data;
  assert(archived.items.some((c) => c.id === f.classes.A.id && c.isArchived));
  const teacherView = (
    await call(
      f.teacherA,
      'GET',
      '/classes?archived=all&search=' + suffix,
      undefined,
      200,
    )
  ).data;
  assert(teacherView.items.some((c) => c.id === f.classes.A.id));
  assert(!teacherView.items.some((c) => c.id === f.classes.B.id));
  await call(f.studentA, 'GET', '/classes?archived=true', undefined, 403);
  await call(f.studentA, 'GET', '/classes?archived=all', undefined, 403);
  await call(
    f.teacherB,
    'PATCH',
    '/classes/' + f.classes.A.id,
    { isArchived: false },
    403,
  );
  await call(f.admin, 'GET', '/classes?archived=invalid', undefined, 400);
  await call(null, 'GET', '/classes?archived=true', undefined, 401);
  await call(
    f.teacherA,
    'PATCH',
    '/classes/' + f.classes.A.id,
    { isArchived: false },
    200,
  );
  await call(
    f.admin,
    'PATCH',
    '/classes/' + f.classes.B.id,
    { isArchived: false },
    200,
  );
  assert.equal(
    (
      await db.query('SELECT "isArchived" FROM "Class" WHERE id=$1', [
        f.classes.A.id,
      ])
    ).rows[0].isArchived,
    false,
  );
  assert.deepEqual(await roster(), beforeRoster);
  assert.deepEqual(await history(), beforeHistory);
  assert.equal(
    (
      await db.query(
        'SELECT "classId","examVersionId" FROM "ExamAssignment" WHERE id=$1',
        [a.id],
      )
    ).rows[0].classId,
    f.classes.A.id,
  );
});

test('UI114-API02: exact historical preview preserves UUIDs/keys and rejects wrong role, owner and exam-version pairing', async () => {
  const original = (
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
      title: 'UI114 Draft V2 ' + suffix,
      durationMin: 40,
      questions: f.questions.map((q) => ({ questionId: q.id, points: 1 })),
    },
    200,
  );
  const historical = (
    await call(
      f.teacherA,
      'GET',
      `/exams/${f.exam.id}/preview?versionId=${f.version.id}`,
      undefined,
      200,
    )
  ).data;
  assert.equal(historical.draft, false);
  assert.equal(historical.examVersionId, f.version.id);
  assert.deepEqual(historical.snapshot, original);
  assert.equal(
    (
      await call(
        f.teacherA,
        'GET',
        '/exams/' + f.exam.id + '/preview',
        undefined,
        200,
      )
    ).data.draft,
    true,
  );
  const secondExam = (
    await call(
      f.teacherA,
      'POST',
      '/exams',
      {
        title: 'UI114 Other ' + suffix,
        durationMin: 20,
        questions: [{ questionId: f.questions[0].id, points: 1 }],
      },
      201,
    )
  ).data;
  const secondVersion = (
    await call(
      f.teacherA,
      'POST',
      '/exams/' + secondExam.id + '/publish',
      undefined,
      201,
    )
  ).data;
  await call(
    f.teacherA,
    'GET',
    `/exams/${f.exam.id}/preview?versionId=${secondVersion.id}`,
    undefined,
    404,
  );
  await call(
    f.teacherB,
    'GET',
    `/exams/${f.exam.id}/preview?versionId=${f.version.id}`,
    undefined,
    403,
  );
  await call(
    f.studentA,
    'GET',
    `/exams/${f.exam.id}/preview?versionId=${f.version.id}`,
    undefined,
    403,
  );
  await call(
    null,
    'GET',
    `/exams/${f.exam.id}/preview?versionId=${f.version.id}`,
    undefined,
    401,
  );
  await call(
    f.admin,
    'GET',
    `/exams/${f.exam.id}/preview?versionId=${f.version.id}`,
    undefined,
    200,
  );
  await call(
    f.teacherA,
    'GET',
    `/exams/${f.exam.id}/preview?versionId=invalid`,
    undefined,
    400,
  );
  assert.deepEqual(
    (
      await db.query('SELECT snapshot FROM "ExamVersion" WHERE id=$1', [
        f.version.id,
      ])
    ).rows[0].snapshot,
    original,
  );
});

test('UI114-API03: Student assignment detail projects only own history and pinned V1 while current exam changes', async () => {
  const a = await assignment(f, {
    examVersionId: f.version.id,
    maxAttempts: 2,
  });
  const first = await start(f, a);
  await call(
    f.studentA,
    'POST',
    '/exam-attempts/' + first.id + '/submit',
    undefined,
    201,
  );
  const second = await start(f, a),
    detail = (
      await call(f.studentA, 'GET', '/exam-assignments/' + a.id, undefined, 200)
    ).data;
  assert.equal(detail.examVersion.id, f.version.id);
  assert.equal(detail.exam.title, f.version.snapshot.title);
  assert.equal(detail.exam.durationMin, f.version.snapshot.durationMin);
  assert.equal(detail._count.attempts, 2);
  assert.deepEqual(
    detail.attempts.map((t) => t.id).sort(),
    [first.id, second.id].sort(),
  );
  assert(
    detail.attempts.some(
      (t) => t.id === second.id && t.status === 'IN_PROGRESS',
    ),
  );
  assert(!JSON.stringify(detail).includes('isCorrect'));
  assert(!JSON.stringify(detail).includes('passwordHash'));
  await call(f.studentB, 'GET', '/exam-assignments/' + a.id, undefined, 403);
  await call(null, 'GET', '/exam-assignments/' + a.id, undefined, 401);
  assert.equal(
    (
      await db.query(
        'SELECT count(*)::int n FROM "ExamAttempt" WHERE "assignmentId"=$1 AND "studentId"=$2',
        [a.id, f.studentA.id],
      )
    ).rows[0].n,
    2,
  );
});
