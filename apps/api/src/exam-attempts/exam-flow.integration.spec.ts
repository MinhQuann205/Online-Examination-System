import {
  testDatabaseConfig,
  verifyTestDatabase,
} from '../../../../tests/test-database.cjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { ExamsService } from '../exams/exams.service';
import { ExamAssignmentsService } from '../exam-assignments/exam-assignments.service';
import { GradingService } from '../grading/grading.service';
import { ExamAttemptsService } from './exam-attempts.service';
import { ResultsService } from '../results/results.service';

jest.setTimeout(30000);
const config = testDatabaseConfig();
const run = describe;

run('ExamSpace full exam flow on isolated PostgreSQL', () => {
  const db = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: config.connectionString,
    }),
  });
  const prisma = db as unknown as PrismaService;
  const exams = new ExamsService(prisma);
  const assignments = new ExamAssignmentsService(prisma);
  const grading = new GradingService();
  const attempts = new ExamAttemptsService(prisma, grading);
  const results = new ResultsService(prisma);
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  let teacherId: string | undefined;
  let outsiderId: string | undefined;
  let studentId: string | undefined;
  let classId: string | undefined;
  let questionId: string | undefined;
  let examId: string | undefined;
  let assignmentId: string | undefined;
  let teacher: { id: string; email: string; fullName: string; role: 'TEACHER' };
  let outsider: {
    id: string;
    email: string;
    fullName: string;
    role: 'TEACHER';
  };
  let student: { id: string; email: string; fullName: string; role: 'STUDENT' };

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
    const [owner, other, learner] = await Promise.all([
      db.user.create({
        data: {
          email: `exam-flow-owner-${suffix}@example.test`,
          fullName: 'Exam Flow Teacher',
          passwordHash: 'integration-only',
          role: 'TEACHER',
        },
      }),
      db.user.create({
        data: {
          email: `exam-flow-other-${suffix}@example.test`,
          fullName: 'Other Teacher',
          passwordHash: 'integration-only',
          role: 'TEACHER',
        },
      }),
      db.user.create({
        data: {
          email: `exam-flow-student-${suffix}@example.test`,
          fullName: 'Exam Flow Student',
          passwordHash: 'integration-only',
          role: 'STUDENT',
        },
      }),
    ]);
    teacherId = owner.id;
    outsiderId = other.id;
    studentId = learner.id;
    teacher = {
      id: owner.id,
      email: owner.email,
      fullName: owner.fullName,
      role: 'TEACHER',
    };
    outsider = {
      id: other.id,
      email: other.email,
      fullName: other.fullName,
      role: 'TEACHER',
    };
    student = {
      id: learner.id,
      email: learner.email,
      fullName: learner.fullName,
      role: 'STUDENT',
    };
    const classroom = await db.class.create({
      data: {
        name: 'Exam Flow Class',
        code: `FLOW-${suffix}`.slice(0, 40),
        teacherId: owner.id,
      },
    });
    classId = classroom.id;
    await db.classMember.create({
      data: { classId: classroom.id, studentId: learner.id },
    });
    const question = await db.question.create({
      data: {
        authorId: owner.id,
        type: 'SINGLE_CHOICE',
        content: 'Select the correct answer',
        options: {
          create: [
            { content: 'Correct choice', isCorrect: true, position: 0 },
            { content: 'Wrong choice', isCorrect: false, position: 1 },
          ],
        },
      },
      include: { options: true },
    });
    questionId = question.id;

    const draft = await exams.create(teacher, {
      title: 'Full phase 3 flow',
      durationMin: 20,
      questions: [{ questionId: question.id, points: 2.5 }],
    });
    examId = draft.id;
    await expect(
      assignments.create(teacher, {
        examId: draft.id,
        classId: classroom.id,
      }),
    ).rejects.toMatchObject({ status: 400 });
    const published = await exams.publish(draft.id, teacher);
    expect(published.number).toBe(1);
    const assignment = await assignments.create(teacher, {
      examId: draft.id,
      classId: classroom.id,
      maxAttempts: 2,
      showScore: false,
      showAnswers: false,
    });
    assignmentId = assignment.id;
    expect(assignment.examVersion?.number).toBe(1);
  });

  afterAll(async () => {
    if (assignmentId)
      await db.examAttempt.deleteMany({ where: { assignmentId } });
    if (assignmentId)
      await db.examAssignment.deleteMany({ where: { id: assignmentId } });
    if (examId) {
      await db.examVersion.deleteMany({ where: { examId } });
      await db.exam.deleteMany({ where: { id: examId } });
    }
    if (classId) {
      await db.classMember.deleteMany({ where: { classId } });
      await db.class.deleteMany({ where: { id: classId } });
    }
    if (questionId) await db.question.deleteMany({ where: { id: questionId } });
    const userIds = [teacherId, outsiderId, studentId].filter(
      (id): id is string => Boolean(id),
    );
    if (userIds.length)
      await db.user.deleteMany({ where: { id: { in: userIds } } });
    await db.$disconnect();
  });

  it('creates, assigns, resumes, autosaves, submits, grades and applies result policy', async () => {
    await expect(
      assignments.create(outsider, {
        examId,
        classId,
        maxAttempts: 1,
      }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      attempts.start(assignmentId!, { ...student, id: outsiderId! }),
    ).rejects.toMatchObject({ status: 403 });

    const [first, duplicateStart] = await Promise.all([
      attempts.start(assignmentId!, student),
      attempts.start(assignmentId!, student),
    ]);
    expect(duplicateStart.id).toBe(first.id);
    expect(first.status).toBe('IN_PROGRESS');
    expect(JSON.stringify(first)).not.toContain('isCorrect');

    const question = first.snapshot.questions[0];
    const correctOption = await db.questionOption.findFirstOrThrow({
      where: { questionId: questionId!, isCorrect: true },
    });
    await expect(
      attempts.get(first.id, { ...student, id: outsiderId! }),
    ).rejects.toMatchObject({ status: 403 });

    await expect(
      attempts.saveAnswer(first.id, question.questionId, student, {
        revision: 2,
        answer: { optionId: correctOption.id },
      }),
    ).rejects.toMatchObject({ status: 409 });
    const saved = await attempts.saveAnswer(
      first.id,
      question.questionId,
      student,
      {
        revision: 1,
        answer: { optionId: correctOption.id },
      },
    );
    expect(saved).toMatchObject({ saved: true, revision: 1 });
    await expect(
      attempts.saveAnswer(first.id, question.questionId, student, {
        revision: 1,
        answer: { optionId: question.options[1].id },
      }),
    ).rejects.toMatchObject({ status: 409 });

    const restored = await attempts.get(first.id, student);
    expect(restored.answers).toEqual([
      {
        questionId: question.questionId,
        answer: { optionId: correctOption.id },
        revision: 1,
      },
    ]);
    expect(JSON.stringify(restored)).not.toContain('isCorrect');

    const submitted = await attempts.submit(first.id, student);
    expect(submitted.status).toBe('SUBMITTED');
    expect((submitted as { score?: unknown }).score).toBeUndefined();
    const repeatedSubmit = await attempts.submit(first.id, student);
    expect(repeatedSubmit.status).toBe('SUBMITTED');
    expect(await db.examAttempt.count({ where: { assignmentId } })).toBe(1);
    expect(
      await db.examAttempt
        .findUniqueOrThrow({ where: { id: first.id } })
        .then((row) => row.score?.toFixed(2)),
    ).toBe('2.50');

    const hiddenResult = await results.attempt(first.id, student);
    expect(hiddenResult.score).toBeNull();
    const hiddenQuestion = hiddenResult.questions[0] as unknown as {
      options: Array<{ isCorrect?: boolean }>;
    };
    expect(hiddenQuestion.options[0].isCorrect).toBeUndefined();
    const teacherResult = await results.attempt(first.id, teacher);
    expect(teacherResult.score?.toFixed(2)).toBe('2.50');
    const teacherReport = await results.exam(examId!, teacher);
    expect(
      teacherReport.assignments[0].students[0].attempts.some(
        (item) => item.status === 'SUBMITTED',
      ),
    ).toBe(true);

    const secondAttempt = await attempts.start(assignmentId!, student);
    await db.examAttempt.update({
      where: { id: secondAttempt.id },
      data: { deadlineAt: new Date(Date.now() - 1000) },
    });
    // Retained acceptance fixtures may exceed the scheduler's 100-row batch.
    // Drain the bounded backlog; retain the final status/score assertions below.
    const batches =
      Math.ceil(
        (await db.examAttempt.count({ where: { status: 'IN_PROGRESS' } })) /
          100,
      ) + 1;
    let scanned = 0;
    for (let batch = 0; batch < batches; batch++) {
      scanned += await attempts.expireDueAttempts();
      if (
        (
          await db.examAttempt.findUniqueOrThrow({
            where: { id: secondAttempt.id },
          })
        ).status === 'EXPIRED'
      )
        break;
    }
    expect(scanned).toBeGreaterThanOrEqual(1);
    const expired = await db.examAttempt.findUniqueOrThrow({
      where: { id: secondAttempt.id },
    });
    expect(expired.status).toBe('EXPIRED');
    expect(expired.score?.toFixed(2)).toBe('0.00');
    await expect(attempts.start(assignmentId!, student)).rejects.toMatchObject({
      status: 409,
    });
  });
});
