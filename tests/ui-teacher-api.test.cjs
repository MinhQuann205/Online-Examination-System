const { test, before, after } = require('node:test');
const {
  assert,
  db,
  fixtures,
  call,
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
test('UI06 API: Teacher identity, scoped totals and forbidden dashboard roles', async () => {
  const d = (
    await call(f.teacherA, 'GET', '/dashboard/teacher', undefined, 200)
  ).data;
  assert.equal(d.user.id, f.teacherA.id);
  assert.equal(d.section, 'teacher');
  assert(!JSON.stringify(d).match(/password|token/i));
  for (const a of [f.admin, f.studentA])
    await call(a, 'GET', '/dashboard/teacher', undefined, 403);
  const classes = (await call(f.teacherA, 'GET', '/classes', undefined, 200))
    .data;
  assert(classes.items.every((c) => c.teacherId === f.teacherA.id));
  assert.equal(classes.total, 1);
  const q = (await call(f.teacherA, 'GET', '/questions', undefined, 200)).data;
  assert.equal(q.total, 3);
  await call(
    f.teacherA,
    'POST',
    '/classes',
    { name: 'Unauthorized', code: 'UI06-' + suffix, teacherId: f.teacherA.id },
    403,
  );
  await call(
    f.teacherA,
    'PATCH',
    '/classes/' + f.classes.A.id,
    { teacherId: f.teacherB.id },
    403,
  );
});
test('UI06 API: all three question types retain explanations, ownership and published snapshots', async () => {
  const old = (
    await db.query('SELECT snapshot FROM "ExamVersion" WHERE id=$1', [
      f.version.id,
    ])
  ).rows[0].snapshot;
  for (const q of f.questions) {
    const body = {
      type: q.type,
      content: 'UI06 ' + q.type + ' ' + suffix,
      explanation: 'Giải thích đáp án UI06',
      topic: 'UI06',
      difficulty: 'HARD',
      ...(q.type === 'MATCHING'
        ? {
            matchingPairs: [
              { leftText: 'Left 1', rightText: 'Right 1' },
              { leftText: 'Left 2', rightText: 'Right 2' },
            ],
          }
        : {
            options: [
              { content: 'Yes', isCorrect: true },
              { content: 'No', isCorrect: q.type === 'MULTIPLE_CHOICE' },
            ],
          }),
    };
    const created = (await call(f.teacherA, 'POST', '/questions', body, 201))
      .data;
    const edited = (
      await call(
        f.teacherA,
        'PATCH',
        '/questions/' + created.id,
        { ...body, content: body.content + ' edited' },
        200,
      )
    ).data;
    assert.equal(edited.explanation, body.explanation);
    await call(f.teacherB, 'PATCH', '/questions/' + created.id, body, 403);
    const copied = (
      await call(
        f.teacherA,
        'POST',
        '/questions/' + created.id + '/duplicate',
        undefined,
        201,
      )
    ).data;
    assert.notEqual(copied.id, created.id);
    await call(f.teacherA, 'DELETE', '/questions/' + copied.id, undefined, 200);
    assert(
      (
        await db.query('SELECT "archivedAt" FROM "Question" WHERE id=$1', [
          copied.id,
        ])
      ).rows[0].archivedAt,
    );
  }
  assert.deepEqual(
    (
      await db.query('SELECT snapshot FROM "ExamVersion" WHERE id=$1', [
        f.version.id,
      ])
    ).rows[0].snapshot,
    old,
  );
});
test('UI06 API: editor limits and single target/version contracts reject invalid payloads', async () => {
  const base = {
    title: 'UI06 valid ' + suffix,
    durationMin: 30,
    questions: [{ questionId: f.questions[0].id, points: 1 }],
  };
  for (const body of [
    { ...base, questions: [] },
    { ...base, durationMin: 1441 },
    { ...base, questions: [{ questionId: f.questions[0].id, points: 1.001 }] },
    {
      ...base,
      questions: Array.from({ length: 201 }, () => base.questions[0]),
    },
  ])
    await call(f.teacherA, 'POST', '/exams', body, 400);
  await call(f.teacherB, 'GET', '/exams/' + f.exam.id, undefined, 403);
  await call(f.teacherB, 'PATCH', '/exams/' + f.exam.id, base, 403);
  await call(
    f.teacherB,
    'GET',
    '/questions/' + f.questions[0].id,
    undefined,
    403,
  );
  await call(
    f.teacherA,
    'POST',
    '/exam-assignments',
    { examId: f.exam.id, classId: f.classes.A.id, studentId: f.studentA.id },
    400,
  );
  await call(
    f.teacherA,
    'POST',
    '/exam-assignments',
    { examId: f.exam.id, classId: f.classes.B.id },
    403,
  );
});
test('UI06 API: schedule 409 and manager reassignment revoke all roster/report surfaces', async () => {
  const asg = await assignment(f, {
    classId: f.classes.A.id,
    studentId: undefined,
  });
  const attempt = await start(f, asg);
  await call(
    f.teacherA,
    'PATCH',
    '/exam-assignments/' + asg.id,
    { closesAt: new Date(Date.now() + 3600000).toISOString() },
    409,
  );
  assert.equal(
    (
      await db.query('SELECT "closesAt" FROM "ExamAssignment" WHERE id=$1', [
        asg.id,
      ])
    ).rows[0].closesAt,
    null,
  );
  await call(
    f.studentA,
    'POST',
    '/exam-attempts/' + attempt.id + '/submit',
    undefined,
    201,
  );
  await call(
    f.admin,
    'PATCH',
    '/classes/' + f.classes.A.id,
    { teacherId: f.teacherB.id },
    200,
  );
  try {
    for (const p of [
      '/classes/' + f.classes.A.id,
      '/exam-assignments/' + asg.id,
      '/exam-assignments/' + asg.id + '/students',
      '/results/' + attempt.id,
    ])
      await call(f.teacherA, 'GET', p, undefined, 403);
    await call(
      f.teacherA,
      'PATCH',
      '/exam-assignments/' + asg.id,
      { showScore: false },
      403,
    );
    const students = (
      await call(
        f.teacherB,
        'GET',
        '/exam-assignments/' + asg.id + '/students',
        undefined,
        200,
      )
    ).data;
    assert(students.some((s) => s.id === f.studentA.id));
    await call(f.teacherB, 'GET', '/results/' + attempt.id, undefined, 200);
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
