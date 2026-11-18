import { ExamAttemptsService } from './exam-attempts.service';
import { GradingService } from '../grading/grading.service';
import type { PrismaService } from '../prisma/prisma.service';

const student = {
  id: '10000000-0000-4000-8000-000000000001',
  role: 'STUDENT' as const,
  email: 'student@example.test',
  fullName: 'Student',
};
const questionId = '20000000-0000-4000-8000-000000000001';
const correctId = '30000000-0000-4000-8000-000000000001';
const wrongId = '30000000-0000-4000-8000-000000000002';
function fixture(expired = false) {
  const row = {
    id: 'answer',
    questionId,
    answer: { optionId: correctId },
    revision: 1,
    awarded: null as unknown,
  };
  const attempt = {
    id: '40000000-0000-4000-8000-000000000001',
    studentId: student.id,
    examId: '50000000-0000-4000-8000-000000000001',
    examVersion: 1,
    status: 'IN_PROGRESS',
    startedAt: new Date(Date.now() - (expired ? 3_600_000 : 10_000)),
    deadlineAt: null as Date | null,
    submittedAt: null,
    reviewQuestionIds: [],
    answers: [row],
    assignment: { closesAt: null },
    examSnapshot: {
      title: 'Pinned V1',
      description: null,
      durationMin: 30,
      questions: [
        {
          id: questionId,
          questionId,
          type: 'SINGLE_CHOICE',
          position: 0,
          points: 2.5,
          content: 'Pick one',
          explanation: 'Hidden key',
          options: [
            { id: correctId, content: 'Yes', isCorrect: true },
            { id: wrongId, content: 'No', isCorrect: false },
          ],
          matchingPairs: [],
        },
      ],
    },
  };
  const db = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    examAttempt: {
      findUnique: jest.fn().mockImplementation(async () => attempt),
      update: jest.fn().mockImplementation(async ({ data, select }) => {
        Object.assign(attempt, data);
        return select
          ? { reviewQuestionIds: attempt.reviewQuestionIds }
          : attempt;
      }),
      updateMany: jest.fn().mockImplementation(async ({ data }) => {
        Object.assign(attempt, data);
        return { count: 1 };
      }),
    },
    attemptAnswer: {
      update: jest
        .fn()
        .mockImplementation(async ({ data }) => Object.assign(row, data)),
      updateMany: jest.fn().mockImplementation(async ({ data }) => {
        Object.assign(row, data);
        return { count: 1 };
      }),
    },
    $transaction: jest.fn(),
  };
  db.$transaction.mockImplementation(async (callback) => callback(db));
  const grading = new GradingService(),
    grade = jest.spyOn(grading, 'grade');
  const service = new ExamAttemptsService(
    db as unknown as PrismaService,
    grading,
  );
  // Deliberately do not call onModuleInit: no scheduler, sockets or database client.
  return { service, db, attempt, row, grade };
}

describe('Attempt persistence decisions (mock transactions; not SQL certification)', () => {
  it('saves only the next revision and GET restores the acknowledged payload without keys', async () => {
    const { service, db, attempt, row } = fixture();
    await expect(
      service.saveAnswer(attempt.id, questionId, student, {
        revision: 2,
        answer: { optionId: wrongId },
      }),
    ).resolves.toEqual({ saved: true, revision: 2 });
    const loaded = await service.get(attempt.id, student);
    expect(loaded.answers[0]).toEqual({
      questionId,
      answer: { optionId: wrongId },
      revision: 2,
    });
    expect(db.attemptAnswer.update).toHaveBeenCalledTimes(1);
    expect(row.revision).toBe(2);
    expect(loaded.snapshot.questions[0]).not.toHaveProperty('explanation');
    expect(loaded.snapshot.questions[0].options[0]).not.toHaveProperty(
      'isCorrect',
    );
    expect(loaded.version).toBe(1);
    expect(loaded.snapshot.title).toBe('Pinned V1');
  });
  it('accepts an identical revision retry without a duplicate write', async () => {
    const { service, db, attempt } = fixture();
    await expect(
      service.saveAnswer(attempt.id, questionId, student, {
        revision: 1,
        answer: { optionId: correctId },
      }),
    ).resolves.toEqual({ saved: true, revision: 1 });
    expect(db.attemptAnswer.update).not.toHaveBeenCalled();
  });
  it.each([1, 3])(
    'rejects conflicting/gapped revision %s without replacing the confirmed answer',
    async (revision) => {
      const { service, db, attempt, row } = fixture();
      await expect(
        service.saveAnswer(attempt.id, questionId, student, {
          revision,
          answer: { optionId: wrongId },
        }),
      ).rejects.toMatchObject({ status: 409 });
      expect(row.answer).toEqual({ optionId: correctId });
      expect(row.revision).toBe(1);
      expect(db.attemptAnswer.update).not.toHaveBeenCalled();
    },
  );
  it('denies a different Student across read/save/submit without answer or grading writes', async () => {
    const { service, db, attempt, grade } = fixture();
    const other = { ...student, id: '10000000-0000-4000-8000-000000000002' };
    await expect(service.get(attempt.id, other)).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      service.saveAnswer(attempt.id, questionId, other, {
        revision: 2,
        answer: { optionId: wrongId },
      }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(service.submit(attempt.id, other)).rejects.toMatchObject({
      status: 403,
    });
    expect(db.attemptAnswer.update).not.toHaveBeenCalled();
    expect(db.examAttempt.updateMany).not.toHaveBeenCalled();
    expect(grade).not.toHaveBeenCalled();
  });
  it('expired saves finalize the pinned answer and never acknowledge the new payload', async () => {
    const { service, db, attempt, row, grade } = fixture(true);
    await expect(
      service.saveAnswer(attempt.id, questionId, student, {
        revision: 2,
        answer: { optionId: wrongId },
      }),
    ).resolves.toEqual({ saved: false, status: 'EXPIRED' });
    expect(attempt.status).toBe('EXPIRED');
    expect(row.revision).toBe(1);
    expect(row.answer).toEqual({ optionId: correctId });
    expect(db.attemptAnswer.update).not.toHaveBeenCalled();
    expect(grade).toHaveBeenCalledTimes(1);
  });
  it('repeated submit returns the authoritative final state and grades only once', async () => {
    const { service, db, attempt, grade } = fixture();
    const snapshot = structuredClone(attempt.examSnapshot);
    await expect(service.submit(attempt.id, student)).resolves.toMatchObject({
      status: 'SUBMITTED',
      version: 1,
    });
    await expect(service.submit(attempt.id, student)).resolves.toMatchObject({
      status: 'SUBMITTED',
      version: 1,
    });
    expect(grade).toHaveBeenCalledTimes(1);
    expect(grade.mock.results[0].value.score.toFixed(2)).toBe('2.50');
    expect(db.examAttempt.updateMany).toHaveBeenCalledTimes(1);
    expect(attempt.examSnapshot).toEqual(snapshot);
  });
  it('review flags update independently of answer revisions', async () => {
    const { service, db, attempt, row } = fixture();
    await expect(
      service.setReview(attempt.id, questionId, student, { marked: true }),
    ).resolves.toEqual({ saved: true, reviewQuestionIds: [questionId] });
    expect(row.revision).toBe(1);
    expect(db.attemptAnswer.update).not.toHaveBeenCalled();
    await expect(
      service.setReview(attempt.id, questionId, student, { marked: false }),
    ).resolves.toEqual({ saved: true, reviewQuestionIds: [] });
  });
});
