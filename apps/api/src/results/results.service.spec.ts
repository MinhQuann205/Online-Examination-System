import { Prisma } from '../generated/prisma/client';
import type { AuthRequest } from '../auth/auth.types';
import type { PrismaService } from '../prisma/prisma.service';
import { ResultsService } from './results.service';

const student: AuthRequest['user'] = {
  id: '10000000-0000-4000-8000-000000000001',
  email: 'student@example.test',
  fullName: 'Student',
  role: 'STUDENT',
};

const makeAttempt = (showScore: boolean, showAnswers: boolean) => ({
  id: '20000000-0000-4000-8000-000000000001',
  studentId: student.id,
  status: 'SUBMITTED',
  exam: {
    id: '30000000-0000-4000-8000-000000000001',
    title: 'Exam',
    authorId: '40000000-0000-4000-8000-000000000001',
  },
  assignment: { showScore, showAnswers },
  examSnapshot: {
    title: 'Exam',
    description: null,
    durationMin: 30,
    questions: [
      {
        id: '50000000-0000-4000-8000-000000000001',
        questionId: '50000000-0000-4000-8000-000000000001',
        position: 0,
        points: 1,
        type: 'SINGLE_CHOICE',
        content: 'Question',
        explanation: 'Explanation',
        options: [
          {
            id: '60000000-0000-4000-8000-000000000001',
            content: 'Correct',
            isCorrect: true,
          },
          {
            id: '60000000-0000-4000-8000-000000000002',
            content: 'Wrong',
            isCorrect: false,
          },
        ],
        matchingPairs: [],
      },
      {
        id: '70000000-0000-4000-8000-000000000001',
        questionId: '70000000-0000-4000-8000-000000000001',
        position: 1,
        points: 2,
        type: 'MATCHING',
        content: 'Match the pairs',
        explanation: null,
        options: [],
        matchingPairs: [
          {
            id: '80000000-0000-4000-8000-000000000001',
            rightId: '90000000-0000-4000-8000-000000000001',
            leftText: 'First left',
            rightText: 'First right',
          },
          {
            id: '80000000-0000-4000-8000-000000000002',
            rightId: '90000000-0000-4000-8000-000000000002',
            leftText: 'Second left',
            rightText: 'Second right',
          },
        ],
      },
    ],
  },
  startedAt: new Date(),
  submittedAt: new Date(),
  deadlineAt: new Date(),
  score: new Prisma.Decimal(1),
  maxScore: new Prisma.Decimal(1),
  answers: [
    {
      questionId: '50000000-0000-4000-8000-000000000001',
      answer: { optionId: '60000000-0000-4000-8000-000000000001' },
      awarded: new Prisma.Decimal(1),
    },
  ],
});

describe('ResultsService', () => {
  it('hides scores in the student result list when policy disables them', async () => {
    const db = {
      examAttempt: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: '20000000-0000-4000-8000-000000000001',
            status: 'SUBMITTED',
            startedAt: new Date(),
            submittedAt: new Date(),
            score: new Prisma.Decimal(1),
            maxScore: new Prisma.Decimal(1),
            exam: { id: '30000000-0000-4000-8000-000000000001', title: 'Exam' },
            examSnapshot: { title: 'Published title', durationMin: 30 },
            assignment: { showScore: false, showAnswers: true },
          },
        ]),
      },
    };
    const service = new ResultsService(db as unknown as PrismaService);
    const result = await service.listStudent(student);
    expect(result[0].score).toBeNull();
    expect(result[0].maxScore).toBeNull();
  });

  it('hides score and correct answers until assignment policy allows them', async () => {
    const db = {
      examAttempt: {
        findUnique: jest.fn().mockResolvedValue(makeAttempt(false, false)),
      },
    };
    const service = new ResultsService(db as unknown as PrismaService);
    const result = await service.attempt(
      '20000000-0000-4000-8000-000000000001',
      student,
    );
    expect(result.score).toBeNull();
    expect(result.maxScore).toBeNull();
    expect(result.correctCount).toBeNull();
    const hiddenQuestion = result.questions[0] as {
      options: Array<{ id: string; content: string }>;
      explanation?: string;
    };
    expect(hiddenQuestion.options).toEqual([
      {
        id: '60000000-0000-4000-8000-000000000001',
        content: 'Correct',
      },
      {
        id: '60000000-0000-4000-8000-000000000002',
        content: 'Wrong',
      },
    ]);
    expect(hiddenQuestion.explanation).toBeUndefined();
    const hiddenMatching = result.questions[1] as unknown as {
      matchingPairs: Array<Record<string, unknown>>;
      matchingOptions: Array<Record<string, unknown>>;
    };
    expect(hiddenMatching.matchingPairs[0]).toEqual({
      id: '80000000-0000-4000-8000-000000000001',
      leftText: 'First left',
    });
    expect(hiddenMatching.matchingOptions).toHaveLength(2);
  });

  it('reveals score and answer key only when enabled', async () => {
    const db = {
      examAttempt: {
        findUnique: jest.fn().mockResolvedValue(makeAttempt(true, true)),
      },
    };
    const service = new ResultsService(db as unknown as PrismaService);
    const result = await service.attempt(
      '20000000-0000-4000-8000-000000000001',
      student,
    );
    expect(result.score).toEqual(new Prisma.Decimal(1));
    expect(result.correctCount).toBe(1);
    const visibleQuestion = result.questions[0] as {
      options: Array<{ id: string; content: string; isCorrect: boolean }>;
      explanation: string;
    };
    expect(visibleQuestion.options[0].isCorrect).toBe(true);
    expect(visibleQuestion.explanation).toBe('Explanation');
  });

  it('denies a student from reading another student’s result', async () => {
    const db = {
      examAttempt: {
        findUnique: jest.fn().mockResolvedValue({
          ...makeAttempt(true, true),
          studentId: 'other',
        }),
      },
    };
    const service = new ResultsService(db as unknown as PrismaService);
    await expect(
      service.attempt('20000000-0000-4000-8000-000000000001', student),
    ).rejects.toMatchObject({ status: 403 });
  });
});
