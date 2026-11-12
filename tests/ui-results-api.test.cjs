const { test, before, after } = require('node:test');
const {
  assert,
  db,
  call,
  assignment,
  start,
  suffix,
} = require('./p0-support.cjs');
const {
  resultsFixtures,
  row,
  upgrade,
  originalExplanation,
} = require('./ui-results-support.cjs');
let f;
before(async () => {
  f = await resultsFixtures();
});
after(() => db.end());
test('UI09 API RESULT-09/10 MATCH-12: four independent score/key policies, own scope and safe projection', async () => {
  for (const [name, score, keys] of [
    ['both', true, true],
    ['scoreOnly', true, false],
    ['answersOnly', false, true],
    ['hidden', false, false],
  ]) {
    const r = (
      await call(
        f.studentA,
        'GET',
        '/results/' + f.cases[name].attempt.id,
        undefined,
        200,
      )
    ).data;
    assert.equal(r.score !== null, score);
    assert.equal(r.maxScore !== null, score);
    assert.equal(r.correctCount !== null, score);
    for (const q of r.questions) {
      assert.equal(q.awarded !== null, score);
      assert.equal('explanation' in q, keys);
      for (const p of q.matchingPairs) assert.equal('rightId' in p, keys);
      for (const o of q.options) assert.equal('isCorrect' in o, keys);
    }
    for (const actor of [f.teacherA, f.admin]) {
      const manager = (
        await call(actor, 'GET', '/results/' + r.id, undefined, 200)
      ).data;
      assert.equal(manager.score, '6.75');
      assert(
        manager.questions
          .find((q) => q.type === 'MATCHING')
          .matchingPairs.every((p) => p.rightId),
      );
    }
  }
  await call(
    f.studentB,
    'GET',
    '/results/' + f.cases.both.attempt.id,
    undefined,
    403,
  );
  await call(
    f.teacherB,
    'GET',
    '/results/' + f.cases.both.attempt.id,
    undefined,
    403,
  );
  await call(
    f.studentA,
    'GET',
    '/results/exams/' + f.c.exam.id,
    undefined,
    403,
  );
});
test('UI09 API MATCH-07/08/09/10/11/17/18: UUID payload SQL revision and all-or-nothing score ignore explanation', async () => {
  for (const [name, score] of [
    ['both', '6.75'],
    ['wrong', '3.75'],
    ['empty', '0.00'],
    ['partial', '3.75'],
  ]) {
    const a = await row(f.cases[name].attempt.id);
    assert.equal(a.status, 'SUBMITTED');
    assert.equal(Number(a.score), Number(score));
    assert.equal(Number(a.maxScore), 6.75);
    assert(a.submittedAt);
    const result = (
      await call(f.studentA, 'GET', '/results/' + a.id, undefined, 200)
    ).data;
    const q = result.questions.find((q) => q.type === 'MATCHING');
    assert.equal(Number(q.awarded), name === 'both' ? 3 : 0);
    assert.equal(q.explanation, originalExplanation);
    const rows = (
      await db.query(
        'SELECT "questionId",revision,answer FROM "AttemptAnswer" WHERE "attemptId"=$1',
        [a.id],
      )
    ).rows;
    assert(rows.every((x) => x.revision === 1));
    if (name !== 'empty') {
      const saved = rows.find((x) => x.questionId === q.questionId);
      assert(saved);
      assert(
        saved.answer.pairs.every(
          (p) =>
            q.matchingPairs.some((x) => x.id === p.leftId) &&
            q.matchingOptions.some((x) => x.id === p.rightId),
        ),
      );
    }
  }
  const asg = await assignment(f, {
    examId: f.c.exam.id,
    examVersionId: f.c.version.id,
  });
  const a = await start(f, asg);
  let changed = false;
  for (let i = 0; i < 12 && !changed; i++) {
    const q = (
      await call(f.studentA, 'GET', '/exam-attempts/' + a.id, undefined, 200)
    ).data.snapshot.questions.find((q) => q.type === 'MATCHING');
    changed = q.matchingOptions.some(
      (o, j) => o.rightText !== f.c.matching.matchingPairs[j].rightText,
    );
    assert(q.matchingPairs.every((p) => !('rightId' in p)));
  }
  assert(
    changed,
    'Observe a real shuffled projection; never use display index as key',
  );
});
test('UI09 API MATCH-15: actual DTO rejects one-sided/short and overlong pairs without creating question', async () => {
  for (const pairs of [
    [
      { leftText: 'CPU', rightText: '' },
      { leftText: 'RAM', rightText: 'Memory' },
    ],
    [{ leftText: 'CPU', rightText: 'Process' }],
    [
      { leftText: 'X'.repeat(501), rightText: 'Process' },
      { leftText: 'RAM', rightText: 'Memory' },
    ],
  ])
    await call(
      f.teacherA,
      'POST',
      '/questions',
      {
        type: 'MATCHING',
        content: 'UI09 invalid ' + suffix,
        matchingPairs: pairs,
      },
      400,
    );
});
test('UI09 API MATCH-13/14 RESULT-11/18: draft bank edits and v2 preserve v1 title/duration/points/keys/explanation/grade', async () => {
  const before = await row(f.cases.both.attempt.id);
  await upgrade(f);
  const after = await row(before.id);
  assert.deepEqual(after.examSnapshot, before.examSnapshot);
  assert.equal(after.examVersionId, f.c.version.id);
  assert.equal(Number(after.score), 6.75);
  const detail = (
    await call(f.studentA, 'GET', '/results/' + before.id, undefined, 200)
  ).data;
  assert.equal(detail.exam.title, f.c.exam.title);
  assert.equal(detail.exam.durationMin, 30);
  assert.deepEqual(
    detail.questions.map((q) => q.points),
    [2.5, 1.25, 3],
  );
  assert.equal(
    detail.questions.find((q) => q.type === 'MATCHING').explanation,
    originalExplanation,
  );
  const v1 = (
    await db.query('SELECT snapshot FROM "ExamVersion" WHERE id=$1', [
      f.c.version.id,
    ])
  ).rows[0].snapshot;
  assert.deepEqual(v1, before.examSnapshot);
});
test('UI09 API RESULT-12: reassignment removes A class/direct result scope, B gets only class scope, author report empties', async () => {
  const direct = await assignment(f, {
    examId: f.c.exam.id,
    examVersionId: f.c.version.id,
  });
  const attempt = await start(f, direct);
  await call(
    f.studentA,
    'POST',
    '/exam-attempts/' + attempt.id + '/submit',
    undefined,
    201,
  );
  try {
    await call(
      f.admin,
      'PATCH',
      '/classes/' + f.classes.A.id,
      { teacherId: f.teacherB.id },
      200,
    );
    await call(
      f.teacherA,
      'GET',
      '/results/' + f.cases.both.attempt.id,
      undefined,
      403,
    );
    await call(f.teacherA, 'GET', '/results/' + attempt.id, undefined, 403);
    await call(
      f.teacherA,
      'GET',
      '/exam-assignments/' + f.cases.both.asg.id + '/students',
      undefined,
      403,
    );
    const a = (
      await call(
        f.teacherA,
        'GET',
        '/results/exams/' + f.c.exam.id,
        undefined,
        200,
      )
    ).data;
    assert.equal(a.assignments.length, 0);
    const b = (
      await call(
        f.teacherB,
        'GET',
        '/results/exams/' + f.c.exam.id,
        undefined,
        200,
      )
    ).data;
    assert(b.assignments.some((x) => x.id === f.cases.both.asg.id));
    assert(!b.assignments.some((x) => x.id === direct.id));
    await call(
      f.teacherB,
      'GET',
      '/results/' + f.cases.both.attempt.id,
      undefined,
      200,
    );
    await call(f.teacherB, 'GET', '/results/' + attempt.id, undefined, 403);
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
test('UI09 API RESULT-13/17: server search/page and DRAFT reports preserve actual empty/history behavior', async () => {
  for (let i = 0; i < 24; i++)
    await call(
      f.teacherA,
      'POST',
      '/exams',
      {
        title: 'UI09 paged ' + suffix + ' ' + String(i).padStart(2, '0'),
        durationMin: 10,
        questions: [{ questionId: f.questions[0].id, points: 1 }],
      },
      201,
    );
  const first = (
      await call(
        f.teacherA,
        'GET',
        '/exams?results=true&status=DRAFT&search=' +
          encodeURIComponent('UI09 paged ' + suffix) +
          '&page=1',
        undefined,
        200,
      )
    ).data,
    second = (
      await call(
        f.teacherA,
        'GET',
        '/exams?results=true&status=DRAFT&search=' +
          encodeURIComponent('UI09 paged ' + suffix) +
          '&page=2',
        undefined,
        200,
      )
    ).data;
  assert.equal(first.total, 24);
  assert.equal(first.items.length, 20);
  assert.equal(second.items.length, 4);
  const empty = (
    await call(
      f.teacherA,
      'GET',
      '/results/exams/' + first.items[0].id,
      undefined,
      200,
    )
  ).data;
  assert.equal(empty.assignments.length, 0);
  await call(
    f.teacherA,
    'POST',
    '/exams/' + f.c.exam.id + '/new-version',
    undefined,
    201,
  );
  const history = (
    await call(
      f.teacherA,
      'GET',
      '/results/exams/' + f.c.exam.id,
      undefined,
      200,
    )
  ).data;
  assert(history.assignments.length >= 4);
  assert(
    history.assignments.every((x) => x.examVersion.title === f.c.exam.title),
  );
  const old = await row(f.cases.both.attempt.id);
  assert.equal(Number(old.score), 6.75);
});
