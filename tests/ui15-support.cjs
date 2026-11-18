'use strict';
const { fixtures, call, suffix } = require('./p0-support.cjs');
async function completionFixture() {
  const f = await fixtures(),
    questions = [];
  for (let i = 1; i <= 21; i++)
    questions.push(
      (
        await call(
          f.teacherA,
          'POST',
          '/questions',
          {
            type: 'SINGLE_CHOICE',
            content: `UI15 bank ${suffix} ${String(i).padStart(2, '0')}`,
            topic: 'UI15 ' + suffix,
            difficulty: 'MEDIUM',
            options: [
              { content: 'A', isCorrect: true },
              { content: 'B', isCorrect: false },
            ],
          },
          201,
        )
      ).data,
    );
  const exam = (
      await call(
        f.teacherA,
        'POST',
        '/exams',
        {
          title: 'UI15 history ' + suffix,
          durationMin: 30,
          questions: [{ questionId: questions[0].id, points: 1.25 }],
        },
        201,
      )
    ).data,
    versions = [];
  for (let i = 1; i <= 21; i++) {
    if (i > 1)
      await call(
        f.teacherA,
        'POST',
        `/exams/${exam.id}/new-version`,
        undefined,
        201,
      );
    versions.push(
      (
        await call(
          f.teacherA,
          'POST',
          `/exams/${exam.id}/publish`,
          undefined,
          201,
        )
      ).data,
    );
  }
  return {
    ...f,
    pagedQuestions: questions,
    pagedExam: exam,
    pagedVersions: versions,
  };
}
module.exports = { completionFixture };
