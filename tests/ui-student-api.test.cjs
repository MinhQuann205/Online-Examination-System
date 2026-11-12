const { test, before, after } = require('node:test');
const {
  assert,
  db,
  call,
  assignment,
  start,
  login,
} = require('./p0-support.cjs');
const { studentFixtures, named } = require('./ui-student-support.cjs');
let f;
before(async () => {
  f = await studentFixtures();
});
after(async () => {
  await db.end();
});
test('UI07 API: scoped dashboard/classes, no Student management authority', async () => {
  const d = (
    await call(f.studentA, 'GET', '/dashboard/student', undefined, 200)
  ).data;
  assert.equal(d.user.id, f.studentA.id);
  assert.equal(d.section, 'student');
  for (const actor of [f.admin, f.teacherA])
    await call(actor, 'GET', '/dashboard/student', undefined, 403);
  const c = (await call(f.studentA, 'GET', '/classes', undefined, 200)).data;
  assert.equal(c.total, 1);
  assert.equal(c.items[0].id, f.classes.A.id);
  const detail = (
    await call(f.studentA, 'GET', '/classes/' + f.classes.A.id, undefined, 200)
  ).data;
  assert.equal(detail.teacher.id, f.teacherA.id);
  await call(f.studentA, 'GET', '/classes/' + f.classes.B.id, undefined, 403);
  for (const [method, url, body] of [
    ['POST', '/classes', { name: 'Denied' }],
    ['PATCH', '/classes/' + f.classes.A.id, { name: 'Denied' }],
    [
      'POST',
      '/classes/' + f.classes.A.id + '/students',
      { studentId: f.studentB.id },
    ],
    [
      'DELETE',
      '/classes/' + f.classes.A.id + '/students/' + f.studentA.id,
      undefined,
    ],
  ])
    await call(f.studentA, method, url, body, 403);
  await call(f.studentA, 'GET', '/exams', undefined, 403);
});
test('UI07 API: assignment paging/search and counts contain only own attempts', async () => {
  const term = encodeURIComponent(f.paging.exam.title);
  const first = (
    await call(
      f.studentA,
      'GET',
      '/exam-assignments?search=' + term + '&page=1',
      undefined,
      200,
    )
  ).data;
  const second = (
    await call(
      f.studentA,
      'GET',
      '/exam-assignments?search=' + term + '&page=2',
      undefined,
      200,
    )
  ).data;
  assert.equal(first.total, 24);
  assert.equal(first.items.length, 20);
  assert.equal(second.items.length, 4);
  assert.equal(
    new Set([...first.items, ...second.items].map((a) => a.id)).size,
    24,
  );
  assert(!JSON.stringify(first).includes('isCorrect'));
  assert(!JSON.stringify(first).includes('snapshot'));
  await call(
    f.admin,
    'POST',
    '/classes/' + f.classes.A.id + '/students',
    { studentId: f.studentB.id },
    201,
  );
  const shared = await assignment(f, {
    classId: f.classes.A.id,
    studentId: undefined,
  });
  await start(f, shared, f.studentB);
  const a = (
    await call(
      f.studentA,
      'GET',
      '/exam-assignments/' + shared.id,
      undefined,
      200,
    )
  ).data;
  assert.equal(a._count.attempts, 0);
  assert.deepEqual(a.attempts, []);
  await call(
    f.studentA,
    'GET',
    '/exam-assignments/' + shared.id + '/students',
    undefined,
    403,
  );
});
test('UI07 API: schedule/max/version availability are server enforced', async () => {
  await call(
    f.studentA,
    'POST',
    '/exam-assignments/' + f.future.asg.id + '/start',
    undefined,
    400,
  );
  await call(
    f.studentA,
    'POST',
    '/exam-assignments/' + f.closed.asg.id + '/start',
    undefined,
    400,
  );
  await call(
    f.studentA,
    'POST',
    '/exam-assignments/' + f.max.asg.id + '/start',
    undefined,
    409,
  );
  const archived = await named(f, 'Archived');
  await call(
    f.teacherA,
    'POST',
    '/exams/' + archived.exam.id + '/archive',
    undefined,
    201,
  );
  await call(
    f.studentA,
    'POST',
    '/exam-assignments/' + archived.asg.id + '/start',
    undefined,
    400,
  );
  const legacy = await named(f, 'Legacy');
  await db.query(
    'UPDATE "ExamAssignment" SET "examVersionId"=NULL WHERE id=$1',
    [legacy.asg.id],
  );
  const summary = (
    await call(
      f.studentA,
      'GET',
      '/exam-assignments/' + legacy.asg.id,
      undefined,
      200,
    )
  ).data;
  assert.equal(summary.exam.metadataAvailable, false);
  assert.equal(summary.exam.durationMin, null);
  await call(
    f.studentA,
    'POST',
    '/exam-assignments/' + legacy.asg.id + '/start',
    undefined,
    400,
  );
});
test('UI07 API: pinned v1, resume/deadline/revision and grading retain original snapshot', async () => {
  const p = await named(f, 'Pinned v1');
  const old = (
    await db.query('SELECT snapshot FROM "ExamVersion" WHERE id=$1', [
      p.version.id,
    ])
  ).rows[0].snapshot;
  await call(
    f.teacherA,
    'POST',
    '/exams/' + p.exam.id + '/new-version',
    undefined,
    201,
  );
  await call(
    f.teacherA,
    'PATCH',
    '/exams/' + p.exam.id,
    {
      title: 'UI07 Renamed v2',
      durationMin: 5,
      questions: [{ questionId: f.questions[0].id, points: 9 }],
    },
    200,
  );
  await call(
    f.teacherA,
    'POST',
    '/exams/' + p.exam.id + '/publish',
    undefined,
    201,
  );
  const item = (
    await call(
      f.studentA,
      'GET',
      '/exam-assignments/' + p.asg.id,
      undefined,
      200,
    )
  ).data;
  assert.equal(item.exam.title, p.exam.title);
  assert.equal(item.exam.durationMin, 30);
  assert.equal(item.examVersion.id, p.version.id);
  const a = await start(f, p.asg),
    b = await start(f, p.asg);
  assert.equal(a.id, b.id);
  assert.equal(a.snapshot.title, p.exam.title);
  assert.equal(a.snapshot.durationMin, 30);
  assert.equal(a.version, 1);
  const q = a.snapshot.questions.find((q) => q.type === 'SINGLE_CHOICE');
  const correct = f.questions
    .find((source) => source.id === q.questionId)
    .options.find((o) => o.isCorrect);
  const url = '/exam-attempts/' + a.id + '/answers/' + q.questionId;
  await call(
    f.studentA,
    'PUT',
    url,
    { revision: 1, answer: { optionId: correct.id } },
    200,
  );
  await call(
    f.studentA,
    'PUT',
    url,
    { revision: 3, answer: { optionId: correct.id } },
    409,
  );
  const resumed = (
    await call(f.studentA, 'GET', '/exam-attempts/' + a.id, undefined, 200)
  ).data;
  assert.equal(resumed.deadlineAt, a.deadlineAt);
  assert.equal(resumed.answers[0].revision, 1);
  await call(
    f.studentA,
    'POST',
    '/exam-attempts/' + a.id + '/submit',
    undefined,
    201,
  );
  const result = (
    await call(f.studentA, 'GET', '/results/' + a.id, undefined, 200)
  ).data;
  assert.equal(Number(result.score), 2.5);
  assert.equal(Number(result.maxScore), 6.75);
  assert.equal(result.exam.title, p.exam.title);
  assert.deepEqual(
    (
      await db.query('SELECT snapshot FROM "ExamVersion" WHERE id=$1', [
        p.version.id,
      ])
    ).rows[0].snapshot,
    old,
  );
});
test('UI07 API: score/key policies independent; history paginated, own only and snapshot metadata', async () => {
  const list = (await call(f.studentA, 'GET', '/results', undefined, 200)).data;
  const hidden = list.items.find((x) => x.id === f.hidden.attempt.id),
    visible = list.items.find((x) => x.id === f.visible.attempt.id);
  assert.equal(hidden.score, null);
  assert.equal(hidden.maxScore, null);
  assert.equal(hidden.exam.title, f.hidden.exam.title);
  assert.equal(Number(visible.score), 0);
  assert.equal(Number(visible.maxScore), 6.75);
  assert(
    list.items.every((x) => !('questions' in x) && !('examSnapshot' in x)),
  );
  const detail = (
    await call(f.studentA, 'GET', '/results/' + hidden.id, undefined, 200)
  ).data;
  assert.equal(detail.score, null);
  assert(detail.questions[0].options.some((o) => 'isCorrect' in o));
  const shown = (
    await call(f.studentA, 'GET', '/results/' + visible.id, undefined, 200)
  ).data;
  assert(shown.questions[0].options.every((o) => !('isCorrect' in o)));
  assert.equal(
    (await call(f.studentB, 'GET', '/results', undefined, 200)).data.total,
    0,
  );
  for (const actor of [f.admin, f.teacherA])
    await call(actor, 'GET', '/results', undefined, 403);
  await call(f.studentB, 'GET', '/results/' + visible.id, undefined, 403);
  await call(f.studentB, 'GET', '/exam-attempts/' + visible.id, undefined, 403);
});
test('UI07 API: membership removal and inactive/revoked sessions cannot retain data access', async () => {
  const asg = await assignment(f, {
    classId: f.classes.A.id,
    studentId: undefined,
  });
  await call(
    f.admin,
    'DELETE',
    '/classes/' + f.classes.A.id + '/students/' + f.studentA.id,
    undefined,
    200,
  );
  try {
    assert.equal(
      (await call(f.studentA, 'GET', '/classes', undefined, 200)).data.total,
      0,
    );
    await call(f.studentA, 'GET', '/classes/' + f.classes.A.id, undefined, 403);
    await call(
      f.studentA,
      'GET',
      '/exam-assignments/' + asg.id,
      undefined,
      403,
    );
    await call(
      f.studentA,
      'POST',
      '/exam-assignments/' + asg.id + '/start',
      undefined,
      403,
    );
    assert(
      !(
        await call(f.studentA, 'GET', '/exam-assignments', undefined, 200)
      ).data.items.some((x) => x.id === asg.id),
    );
  } finally {
    await call(
      f.admin,
      'POST',
      '/classes/' + f.classes.A.id + '/students',
      { studentId: f.studentA.id },
      201,
    );
  }
  await call(
    f.admin,
    'PATCH',
    '/users/' + f.studentA.id + '/status',
    { isActive: false },
    200,
  );
  try {
    await call(f.studentA, 'GET', '/classes', undefined, 401);
    await call(f.studentA, 'GET', '/auth/me', undefined, 401);
  } finally {
    await call(
      f.admin,
      'PATCH',
      '/users/' + f.studentA.id + '/status',
      { isActive: true },
      200,
    );
    await login(f.studentA);
  }
});
