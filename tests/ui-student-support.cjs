const {
  fixtures,
  call,
  assignment,
  start,
  suffix,
} = require('./p0-support.cjs');
async function published(f, label) {
  const exam = (
    await call(
      f.teacherA,
      'POST',
      '/exams',
      {
        title: label + ' ' + suffix,
        durationMin: 30,
        questions: f.questions.map((q, i) => ({
          questionId: q.id,
          points: [2.5, 1.25, 3][i],
        })),
      },
      201,
    )
  ).data;
  const version = (
    await call(
      f.teacherA,
      'POST',
      '/exams/' + exam.id + '/publish',
      undefined,
      201,
    )
  ).data;
  return { exam, version };
}
async function named(f, label, extra = {}) {
  const p = await published(f, 'UI07 ' + label);
  return {
    ...p,
    asg: await assignment(f, {
      examId: p.exam.id,
      examVersionId: p.version.id,
      ...extra,
    }),
  };
}
async function completed(f, asg) {
  const attempt = await start(f, asg);
  await call(
    f.studentA,
    'POST',
    '/exam-attempts/' + attempt.id + '/submit',
    undefined,
    201,
  );
  return attempt;
}
async function studentFixtures() {
  const f = await fixtures();
  f.open = await named(f, 'Open');
  f.future = await named(f, 'Future', {
    opensAt: new Date(Date.now() + 3600000).toISOString(),
  });
  f.closed = await named(f, 'Closed', {
    opensAt: new Date(Date.now() - 7200000).toISOString(),
    closesAt: new Date(Date.now() - 3600000).toISOString(),
  });
  f.max = await named(f, 'Max');
  f.max.attempt = await completed(f, f.max.asg);
  f.hidden = await named(f, 'Hidden', { showScore: false, showAnswers: true });
  f.hidden.attempt = await completed(f, f.hidden.asg);
  f.visible = await named(f, 'Visible', {
    showScore: true,
    showAnswers: false,
  });
  f.visible.attempt = await completed(f, f.visible.asg);
  f.paging = await published(f, 'UI07 Paging');
  f.paging.assignments = [];
  for (let i = 0; i < 24; i++)
    f.paging.assignments.push(
      await assignment(f, {
        examId: f.paging.exam.id,
        examVersionId: f.paging.version.id,
      }),
    );
  return f;
}
module.exports = { published, named, completed, studentFixtures };
