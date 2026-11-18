const assert = require('node:assert/strict');
assert.equal(
  process.env.UI115_WEB_RUNTIME_APPROVED,
  '1',
  'UI115_LIVE_SCOPE_REQUIRED',
);
const { test } = require('node:test');
const { fixtures, call, db } = require('./p0-support.cjs');
test('UI115 API: pinned public description, management detail and recipients stay role/owner scoped', async () => {
  try {
    const f = await fixtures();
    const draft = (
      await call(
        f.teacherA,
        'POST',
        '/exams',
        {
          title: 'UI115 public metadata',
          description: 'V1 public instructions',
          durationMin: 30,
          questions: f.questions.map((q) => ({ questionId: q.id, points: 1 })),
        },
        201,
      )
    ).data;
    const v1 = (
      await call(
        f.teacherA,
        'POST',
        `/exams/${draft.id}/publish`,
        undefined,
        201,
      )
    ).data;
    const asg = (
      await call(
        f.teacherA,
        'POST',
        '/exam-assignments',
        { examId: draft.id, examVersionId: v1.id, studentId: f.studentA.id },
        201,
      )
    ).data;
    await call(
      f.teacherA,
      'POST',
      `/exams/${draft.id}/new-version`,
      undefined,
      201,
    );
    await call(
      f.teacherA,
      'PATCH',
      `/exams/${draft.id}`,
      {
        title: 'V2 mutable',
        description: 'V2 instructions must not replace V1',
        durationMin: 50,
        questions: f.questions.map((q) => ({ questionId: q.id, points: 2 })),
      },
      200,
    );
    const own = (
      await call(
        f.studentA,
        'GET',
        `/exam-assignments/${asg.id}`,
        undefined,
        200,
      )
    ).data;
    assert.equal(own.exam.description, 'V1 public instructions');
    assert.equal(own.examVersion.id, v1.id);
    assert.equal(own.exam.durationMin, 30);
    assert.equal(own._count.attempts, 0);
    for (const field of ['questions', 'snapshot', 'isCorrect', 'matchingPairs'])
      assert.equal(JSON.stringify(own).includes('"' + field + '"'), false);
    const managed = (
      await call(
        f.teacherA,
        'GET',
        `/exam-assignments/${asg.id}`,
        undefined,
        200,
      )
    ).data;
    assert.equal(managed.exam.description, 'V1 public instructions');
    assert.equal(managed.createdById, f.teacherA.id);
    const recipients = (
      await call(
        f.teacherA,
        'GET',
        `/exam-assignments/${asg.id}/students`,
        undefined,
        200,
      )
    ).data;
    assert.deepEqual(
      recipients.map((s) => s.id),
      [f.studentA.id],
    );
    await call(
      f.studentB,
      'GET',
      `/exam-assignments/${asg.id}`,
      undefined,
      403,
    );
    await call(
      f.teacherB,
      'GET',
      `/exam-assignments/${asg.id}`,
      undefined,
      403,
    );
    await call(
      f.studentA,
      'GET',
      `/exam-assignments/${asg.id}/students`,
      undefined,
      403,
    );
    await call(
      f.teacherB,
      'GET',
      `/exam-assignments/${asg.id}/students`,
      undefined,
      403,
    );
    await call(null, 'GET', `/exam-assignments/${asg.id}`, undefined, 401);
    const persisted = (
      await db.query(
        'SELECT "examVersionId" FROM "ExamAssignment" WHERE id=$1',
        [asg.id],
      )
    ).rows[0];
    assert.equal(persisted.examVersionId, v1.id);
    const stored = (
      await db.query('SELECT snapshot FROM "ExamVersion" WHERE id=$1', [v1.id])
    ).rows[0].snapshot;
    assert.deepEqual(stored, v1.snapshot);
  } finally {
    await db.end();
  }
});
