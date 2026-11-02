import {
  testDatabaseConfig,
  verifyTestDatabase,
} from '../../../../tests/test-database.cjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { ExamsService } from './exams.service';

jest.setTimeout(30000);
const config = testDatabaseConfig();
const run = describe;

run('Exams PostgreSQL integration', () => {
  const db = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: config.connectionString,
    }),
  });
  const exams = new ExamsService(db as unknown as PrismaService);
  let teacherId: string | undefined;
  let outsiderId: string | undefined;
  let questionId: string | undefined;
  let examId: string | undefined;
  const teacher = {
    id: '',
    email: '',
    fullName: 'Phase 3 Teacher',
    role: 'TEACHER' as const,
  };
  const outsider = {
    id: '',
    email: '',
    fullName: 'Other Teacher',
    role: 'TEACHER' as const,
  };

  beforeAll(async () => {
    await db.$connect();
    await verifyTestDatabase(
      {
        query: async (sql: string) => ({
          rows: await db.$queryRawUnsafe<Record<string, unknown>[]>(sql),
        }),
      },
      config,
    );
    const suffix = Date.now().toString(36);
    const [owner, other] = await Promise.all([
      db.user.create({
        data: {
          email: `exam-owner-${suffix}@example.test`,
          fullName: teacher.fullName,
          role: 'TEACHER',
          passwordHash: 'integration-test',
        },
      }),
      db.user.create({
        data: {
          email: `exam-outsider-${suffix}@example.test`,
          fullName: outsider.fullName,
          role: 'TEACHER',
          passwordHash: 'integration-test',
        },
      }),
    ]);
    teacherId = owner.id;
    outsiderId = other.id;
    teacher.id = owner.id;
    teacher.email = owner.email;
    outsider.id = other.id;
    outsider.email = other.email;
    const question = await db.question.create({
      data: {
        authorId: owner.id,
        type: 'SINGLE_CHOICE',
        content: 'Versioned integration question',
        options: {
          create: [
            { content: 'Correct', isCorrect: true, position: 0 },
            { content: 'Incorrect', isCorrect: false, position: 1 },
          ],
        },
      },
    });
    questionId = question.id;
  });

  afterAll(async () => {
    if (examId) {
      await db.examVersion.deleteMany({ where: { examId } });
      await db.examQuestion.deleteMany({ where: { examId } });
      await db.exam.deleteMany({ where: { id: examId } });
    }
    if (questionId) await db.question.deleteMany({ where: { id: questionId } });
    const users = [teacherId, outsiderId].filter((id): id is string => !!id);
    if (users.length)
      await db.user.deleteMany({ where: { id: { in: users } } });
    await db.$disconnect();
  });

  it('creates, publishes and versions exams without changing published snapshots', async () => {
    const created = await exams.create(teacher, {
      title: 'Phase 3 exam version test',
      description: 'First version',
      durationMin: 25,
      questions: [{ questionId: questionId!, points: 2.5 }],
    });
    examId = created.id;

    await expect(exams.get(created.id, outsider)).rejects.toMatchObject({
      status: 403,
    });
    const firstVersion = await exams.publish(created.id, teacher);
    expect(firstVersion.number).toBe(1);
    expect(firstVersion.snapshot).toMatchObject({
      title: 'Phase 3 exam version test',
      durationMin: 25,
    });
    await expect(
      exams.update(created.id, teacher, {
        title: 'Illegal direct edit',
        durationMin: 25,
        questions: [{ questionId: questionId!, points: 3 }],
      }),
    ).rejects.toMatchObject({ status: 400 });

    await exams.newVersion(created.id, teacher);
    await exams.update(created.id, teacher, {
      title: 'Second exam version',
      description: 'Second version',
      durationMin: 40,
      questions: [{ questionId: questionId!, points: 3 }],
    });
    const secondVersion = await exams.publish(created.id, teacher);
    expect(secondVersion.number).toBe(2);
    const savedFirst = await db.examVersion.findUniqueOrThrow({
      where: {
        examId_number: { examId: created.id, number: 1 },
      },
    });
    expect(savedFirst.snapshot).toMatchObject({
      title: 'Phase 3 exam version test',
      durationMin: 25,
    });
  });
});
