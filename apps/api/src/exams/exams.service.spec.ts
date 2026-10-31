import { ZodError } from 'zod';
import type { AuthRequest } from '../auth/auth.types';
import type { PrismaService } from '../prisma/prisma.service';
import { ExamsService } from './exams.service';

describe('ExamsService', () => {
  const teacher: AuthRequest['user'] = {
    id: '10000000-0000-4000-8000-000000000001',
    email: 'teacher@example.test',
    fullName: 'Teacher',
    role: 'TEACHER',
  };

  it('rejects non-teachers before database access', async () => {
    const service = new ExamsService({} as PrismaService);
    await expect(
      service.create({ ...teacher, role: 'STUDENT' }, {}),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('validates duplicate questions and points before database access', async () => {
    const service = new ExamsService({} as PrismaService);
    const questionId = '20000000-0000-4000-8000-000000000001';
    const input = {
      title: 'Valid exam',
      durationMin: 30,
      questions: [
        { questionId, points: 1 },
        { questionId, points: 2 },
      ],
    };
    await expect(service.create(teacher, input)).rejects.toBeInstanceOf(
      ZodError,
    );
    await expect(
      service.create(teacher, {
        ...input,
        questions: [{ questionId, points: 1.005 }],
      }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it('rejects total possible points outside the database decimal range', async () => {
    const service = new ExamsService({} as PrismaService);
    await expect(
      service.create(teacher, {
        title: 'Too many points',
        durationMin: 30,
        questions: [
          {
            questionId: '20000000-0000-4000-8000-000000000001',
            points: 500000,
          },
          {
            questionId: '20000000-0000-4000-8000-000000000002',
            points: 500000,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it('prevents teachers from reading exams owned by another teacher', async () => {
    const db = {
      exam: {
        findUnique: jest.fn().mockResolvedValue({
          id: '30000000-0000-4000-8000-000000000001',
          authorId: '40000000-0000-4000-8000-000000000001',
          status: 'DRAFT',
          version: 1,
          questions: [],
          versions: [],
        }),
      },
    };
    const service = new ExamsService(db as unknown as PrismaService);

    await expect(
      service.get('30000000-0000-4000-8000-000000000001', teacher),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('requires a new version before editing a published exam', async () => {
    const db = {
      exam: {
        findUnique: jest.fn().mockResolvedValue({
          id: '30000000-0000-4000-8000-000000000001',
          authorId: teacher.id,
          status: 'PUBLISHED',
          version: 1,
          questions: [],
          versions: [],
        }),
      },
    };
    const service = new ExamsService(db as unknown as PrismaService);

    await expect(
      service.update('30000000-0000-4000-8000-000000000001', teacher, {}),
    ).rejects.toMatchObject({ status: 400 });
  });
});
