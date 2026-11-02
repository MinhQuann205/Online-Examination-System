import { ZodError } from 'zod';
import type { AuthRequest } from '../auth/auth.types';
import type { PrismaService } from '../prisma/prisma.service';
import { ExamAssignmentsService } from './exam-assignments.service';

describe('ExamAssignmentsService', () => {
  const teacher: AuthRequest['user'] = {
    id: '10000000-0000-4000-8000-000000000001',
    email: 'teacher@example.test',
    fullName: 'Teacher',
    role: 'TEACHER',
  };

  it('rejects students before database access when creating assignments', async () => {
    const service = new ExamAssignmentsService({} as PrismaService);
    await expect(
      service.create({ ...teacher, role: 'STUDENT' }, {}),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('requires exactly one assignment target and a valid time window', async () => {
    const service = new ExamAssignmentsService({} as PrismaService);
    const common = {
      examId: '20000000-0000-4000-8000-000000000001',
    };
    await expect(service.create(teacher, common)).rejects.toBeInstanceOf(
      ZodError,
    );
    await expect(
      service.create(teacher, {
        ...common,
        classId: '30000000-0000-4000-8000-000000000001',
        studentId: '40000000-0000-4000-8000-000000000001',
      }),
    ).rejects.toBeInstanceOf(ZodError);
    await expect(
      service.create(teacher, {
        ...common,
        classId: '30000000-0000-4000-8000-000000000001',
        opensAt: '2026-10-24T10:00:00Z',
        closesAt: '2026-10-24T09:00:00Z',
      }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it('denies teachers access to assignments created by another teacher', async () => {
    const db = {
      examAssignment: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue({
          id: '50000000-0000-4000-8000-000000000001',
          createdById: '60000000-0000-4000-8000-000000000001',
          classId: null,
          studentId: null,
        }),
      },
    };
    const service = new ExamAssignmentsService(db as unknown as PrismaService);
    await expect(
      service.students('50000000-0000-4000-8000-000000000001', teacher),
    ).rejects.toMatchObject({ status: 403 });
  });
});
