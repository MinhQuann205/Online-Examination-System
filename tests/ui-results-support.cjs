const {
  fixtures,
  call,
  assignment,
  start,
  db,
  assert,
  suffix,
} = require('./p0-support.cjs');
const pairDefinitions = [
  { leftText: 'CPU', rightText: 'Xử lý các lệnh và tính toán' },
  { leftText: 'RAM', rightText: 'Lưu dữ liệu tạm thời' },
  { leftText: 'SSD', rightText: 'Lưu trữ dữ liệu lâu dài' },
];
const originalExplanation =
  'Giải thích độc lập của bản v1. CPU → Lưu trữ dữ liệu lâu dài là nội dung fixture cố ý không nhất quán; khóa chấm vẫn là matchingPairs.';
async function compose(f, label = 'UI09') {
  const matching = (
    await call(
      f.teacherA,
      'POST',
      '/questions',
      {
        type: 'MATCHING',
        content: label + ' Ghép thành phần máy tính ' + suffix,
        matchingPairs: pairDefinitions,
        explanation: originalExplanation,
      },
      201,
    )
  ).data;
  const questions = [f.questions[0], f.questions[1], matching];
  const exam = (
    await call(
      f.teacherA,
      'POST',
      '/exams',
      {
        title: label + ' Kết quả phiên bản 1 ' + suffix,
        durationMin: 30,
        questions: questions.map((q, i) => ({
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
  return { matching, questions, exam, version };
}
function payloads(attempt, questions, wrong = false, blank = false) {
  return attempt.snapshot.questions.map((q) => {
    const source = questions.find((s) => s.id === q.questionId);
    let answer;
    if (q.type === 'SINGLE_CHOICE')
      answer = { optionId: source.options.find((o) => o.isCorrect).id };
    else if (q.type === 'MULTIPLE_CHOICE')
      answer = {
        optionIds: source.options.filter((o) => o.isCorrect).map((o) => o.id),
      };
    else
      answer = {
        pairs: q.matchingPairs
          .filter((p) => !blank || p.leftText === 'RAM')
          .map((p) => {
            const rightText = wrong
              ? p.leftText === 'CPU'
                ? pairDefinitions[2].rightText
                : p.leftText === 'SSD'
                  ? pairDefinitions[0].rightText
                  : pairDefinitions[1].rightText
              : pairDefinitions.find((x) => x.leftText === p.leftText)
                  .rightText;
            return {
              leftId: p.id,
              rightId: q.matchingOptions.find((o) => o.rightText === rightText)
                .id,
            };
          }),
      };
    return { questionId: q.questionId, answer };
  });
}
async function completed(
  f,
  composition,
  flags = { showScore: true, showAnswers: true },
  mode = 'correct',
) {
  const asg = await assignment(f, {
    examId: composition.exam.id,
    examVersionId: composition.version.id,
    studentId: undefined,
    classId: f.classes.A.id,
    maxAttempts: 20,
    ...flags,
  });
  const attempt = await start(f, asg);
  if (mode !== 'empty')
    for (const row of payloads(
      attempt,
      composition.questions,
      mode === 'wrong',
      mode === 'partial',
    ))
      await call(
        f.studentA,
        'PUT',
        `/exam-attempts/${attempt.id}/answers/${row.questionId}`,
        { revision: 1, answer: row.answer },
        200,
      );
  await call(
    f.studentA,
    'POST',
    '/exam-attempts/' + attempt.id + '/submit',
    undefined,
    201,
  );
  return { asg, attempt };
}
async function resultsFixtures() {
  const f = await fixtures(),
    c = await compose(f);
  const cases = {};
  for (const [name, showScore, showAnswers] of [
    ['both', true, true],
    ['scoreOnly', true, false],
    ['answersOnly', false, true],
    ['hidden', false, false],
  ])
    cases[name] = await completed(f, c, { showScore, showAnswers });
  cases.wrong = await completed(f, c, undefined, 'wrong');
  cases.empty = await completed(f, c, undefined, 'empty');
  cases.partial = await completed(f, c, undefined, 'partial');
  return { ...f, c, cases };
}
async function row(id) {
  return (
    await db.query(
      'SELECT id,status,score::text,"maxScore"::text,"examVersionId","examSnapshot","submittedAt","deadlineAt" FROM "ExamAttempt" WHERE id=$1',
      [id],
    )
  ).rows[0];
}
async function upgrade(f) {
  const old = await row(f.cases.both.attempt.id);
  await call(
    f.teacherA,
    'PATCH',
    '/questions/' + f.c.matching.id,
    {
      type: 'MATCHING',
      content: 'UI09 Future matching ' + suffix,
      matchingPairs: pairDefinitions.map((p) => ({
        ...p,
        rightText: p.rightText + ' (bản mới)',
      })),
      explanation: 'Giải thích bản mới không được thay lời giải lịch sử',
    },
    200,
  );
  await call(
    f.teacherA,
    'POST',
    '/exams/' + f.c.exam.id + '/new-version',
    undefined,
    201,
  );
  await call(
    f.teacherA,
    'PATCH',
    '/exams/' + f.c.exam.id,
    {
      title: 'UI09 Current V2 ' + suffix,
      durationMin: 45,
      questions: f.c.questions.map((q) => ({ questionId: q.id, points: 5 })),
    },
    200,
  );
  const version = (
    await call(
      f.teacherA,
      'POST',
      '/exams/' + f.c.exam.id + '/publish',
      undefined,
      201,
    )
  ).data;
  assert.equal(version.number, 2);
  assert.deepEqual(
    (await row(f.cases.both.attempt.id)).examSnapshot,
    old.examSnapshot,
  );
  return version;
}
module.exports = {
  resultsFixtures,
  compose,
  completed,
  payloads,
  row,
  upgrade,
  pairDefinitions,
  originalExplanation,
};
