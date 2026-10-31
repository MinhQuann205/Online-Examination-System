import type { AuthRequest } from '../auth/auth.types';
import type { PrismaService } from '../prisma/prisma.service';
import { GradingService } from '../grading/grading.service';
import { ExamAttemptsService } from './exam-attempts.service';

const teacher: AuthRequest['user'] = {
  id: '10000000-0000-4000-8000-000000000001',
  email: 'teacher@example.test',
  fullName: 'Teacher',
  role: 'TEACHER',
};

describe('ExamAttemptsService authorization', () => {
  const service = new ExamAttemptsService(
    {} as PrismaService,
    new GradingService(),
  );

  it('rejects non-students from starting an attempt', async () => {
    await expect(
      service.start('20000000-0000-4000-8000-000000000001', teacher),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('rejects non-students from saving or submitting answers', async () => {
    await expect(
      service.saveAnswer(
        '20000000-0000-4000-8000-000000000001',
        '30000000-0000-4000-8000-000000000001',
        teacher,
        { revision: 1, answer: {} },
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      service.submit('20000000-0000-4000-8000-000000000001', teacher),
    ).rejects.toMatchObject({ status: 403 });
  });
});
