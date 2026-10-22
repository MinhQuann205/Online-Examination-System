import { QuestionsService } from './questions.service';
import type { PrismaService } from '../prisma/prisma.service';
import { ZodError } from 'zod';

describe('QuestionsService validation', () => {
  const service = new QuestionsService({} as PrismaService);
  const teacher = {
    id: 'teacher-id',
    email: 'teacher@example.test',
    fullName: 'Teacher',
    role: 'TEACHER' as const,
  };

  it('rejects single choice questions with multiple correct options', async () => {
    await expect(
      service.create(teacher, {
        type: 'SINGLE_CHOICE',
        content: 'Question',
        options: [
          { content: 'A', isCorrect: true },
          { content: 'B', isCorrect: true },
        ],
      }),
    ).rejects.toBeInstanceOf(ZodError);
  });
  it('rejects multiple choice questions without a correct option', async () => {
    await expect(
      service.create(teacher, {
        type: 'MULTIPLE_CHOICE',
        content: 'Question',
        options: [
          { content: 'A', isCorrect: false },
          { content: 'B', isCorrect: false },
        ],
      }),
    ).rejects.toBeInstanceOf(ZodError);
  });
  it('requires at least two complete matching pairs', async () => {
    await expect(
      service.create(teacher, {
        type: 'MATCHING',
        content: 'Question',
        matchingPairs: [{ leftText: 'HTML', rightText: '' }],
      }),
    ).rejects.toBeInstanceOf(ZodError);
  });
  it('rejects student authors before database access', async () => {
    await expect(
      service.create(
        { ...teacher, role: 'STUDENT' as const },
        { type: 'SINGLE_CHOICE' },
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
});
