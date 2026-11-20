import 'reflect-metadata';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { ExamAssignmentsService } from './exam-assignments/exam-assignments.service';
import { ExamAssignmentsController } from './exam-assignments/exam-assignments.controller';
import { ExamsService } from './exams/exams.service';
import { UsersService } from './users/users.service';
import { ClassesService } from './classes/classes.service';
import { resultAssignmentScope } from './results/result-scope';
import type { PrismaService } from './prisma/prisma.service';
const id = '10000000-0000-4000-8000-000000000001',
  version = '10000000-0000-4000-8000-000000000002',
  target = '10000000-0000-4000-8000-000000000003',
  other = '10000000-0000-4000-8000-000000000004';
const actor = {
    id,
    role: 'TEACHER' as const,
    email: 'teacher@example.test',
    fullName: 'Teacher',
  },
  asDb = (v: unknown) => v as PrismaService;
const body = {
  examId: id,
  examVersionId: version,
  classId: target,
  maxAttempts: 2,
  showScore: false,
  showAnswers: true,
  opensAt: '2026-11-20T08:00:00+07:00',
  closesAt: '2026-11-21T08:00:00+07:00',
};
function creation() {
  const snapshot = {
    title: 'Pinned V1',
    durationMin: 30,
    questions: [{ points: 0.1, answer: 'PRIVATE' }, { points: 0.2 }],
  };
  const db = {
    exam: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ id, authorId: id, status: 'DRAFT', version: 2 }),
    },
    examVersion: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: version, number: 1, snapshot }),
      findMany: jest.fn().mockResolvedValue([{ id: version, snapshot }]),
    },
    class: {
      findUnique: jest.fn().mockResolvedValue({
        id: target,
        name: 'Lớp A',
        code: 'A',
        teacherId: id,
        isArchived: false,
      }),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: target,
        fullName: 'An',
        email: 'an@example.test',
        role: 'STUDENT',
        isActive: true,
      }),
    },
    classMember: { findFirst: jest.fn().mockResolvedValue({ id: target }) },
    examAssignment: {
      create: jest.fn().mockResolvedValue({
        id: other,
        exam: { id, title: 'V2', durationMin: 90 },
        examVersion: { id: version, number: 1 },
      }),
    },
    examAttempt: { create: jest.fn(), update: jest.fn() },
  };
  return { db, service: new ExamAssignmentsService(asDb(db)) };
}
describe('UI14 authoritative read-only assignment review', () => {
  it('checks exact version and recipient, projects pinned structure only and performs no writes', async () => {
    const f = creation(),
      r = await f.service.review(actor, body);
    expect(r.exam).toEqual({
      id,
      title: 'Pinned V1',
      versionId: version,
      version: 1,
      questionCount: 2,
      totalPoints: '0.30',
      durationMin: 30,
    });
    expect(r.recipient).toEqual({
      id: target,
      label: 'Lớp A · A',
      kind: 'class',
    });
    expect(r.body.examVersionId).toBe(version);
    expect(r.body.showScore).toBe(false);
    expect(r.body.showAnswers).toBe(true);
    expect(f.db.examVersion.findFirst.mock.calls[0][0].where).toMatchObject({
      id: version,
      examId: id,
      publishedAt: { lte: expect.any(Date) },
    });
    expect(JSON.stringify(r)).not.toContain('PRIVATE');
    expect(f.db.examAssignment.create).not.toHaveBeenCalled();
    expect(f.db.examAttempt.create).not.toHaveBeenCalled();
    expect(f.db.examAttempt.update).not.toHaveBeenCalled();
  });
  it('does not allow latest/default fallback during review', async () => {
    const f = creation();
    await expect(
      f.service.review(actor, { ...body, examVersionId: undefined }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(f.db.examVersion.findFirst).not.toHaveBeenCalled();
  });
  it('rejects Student before reads', async () => {
    const f = creation();
    await expect(
      f.service.review({ ...actor, role: 'STUDENT' }, body),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(f.db.exam.findUnique).not.toHaveBeenCalled();
  });
  it('rejects a foreign exam author before version lookup', async () => {
    const f = creation();
    f.db.exam.findUnique.mockResolvedValue({
      id,
      authorId: other,
      status: 'PUBLISHED',
      version: 1,
    });
    await expect(f.service.review(actor, body)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(f.db.examVersion.findFirst).not.toHaveBeenCalled();
  });
  it('rejects archived and missing exam, never substitutes a live/current exam', async () => {
    const f = creation();
    f.db.exam.findUnique
      .mockResolvedValueOnce({
        id,
        authorId: id,
        status: 'ARCHIVED',
        version: 1,
      })
      .mockResolvedValueOnce(null);
    await expect(f.service.review(actor, body)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(f.service.review(actor, body)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
  it('rejects absent or foreign exact published version', async () => {
    const f = creation();
    f.db.examVersion.findFirst.mockResolvedValue(null);
    await expect(f.service.review(actor, body)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(f.db.examAssignment.create).not.toHaveBeenCalled();
  });
  it('rejects archived or foreign class and never creates during failure', async () => {
    const f = creation();
    f.db.class.findUnique
      .mockResolvedValueOnce({
        id: target,
        name: 'A',
        code: 'A',
        teacherId: id,
        isArchived: true,
      })
      .mockResolvedValueOnce({
        id: target,
        name: 'A',
        code: 'A',
        teacherId: other,
        isArchived: false,
      });
    await expect(f.service.review(actor, body)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(f.service.review(actor, body)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(f.db.examAssignment.create).not.toHaveBeenCalled();
  });
  it('resolves a Student label from database and checks enrollment without trusting client labels', async () => {
    const f = creation();
    const r = await f.service.review(actor, {
      ...body,
      classId: undefined,
      studentId: target,
      label: 'Forged',
    });
    expect(r.recipient).toEqual({
      id: target,
      label: 'An · an@example.test',
      kind: 'student',
    });
    expect(f.db.classMember.findFirst.mock.calls[0][0].where).toEqual({
      studentId: target,
      class: { teacherId: id },
    });
    expect(r.body).not.toHaveProperty('label');
  });
  it.each([
    { role: 'STUDENT', isActive: false },
    { role: 'TEACHER', isActive: true },
  ])('rejects ineligible Student %p', async (x) => {
    const f = creation();
    f.db.user.findUnique.mockResolvedValue({
      id: target,
      fullName: 'An',
      email: 'a@example.test',
      ...x,
    });
    await expect(
      f.service.review(actor, {
        ...body,
        classId: undefined,
        studentId: target,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(f.db.examAssignment.create).not.toHaveBeenCalled();
  });
  it('rejects a Student outside Teacher current enrollment scope', async () => {
    const f = creation();
    f.db.classMember.findFirst.mockResolvedValue(null);
    await expect(
      f.service.review(actor, {
        ...body,
        classId: undefined,
        studentId: target,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('Admin review uses management policy without pretending to be the exam author', async () => {
    const f = creation();
    f.db.exam.findUnique.mockResolvedValue({
      id,
      authorId: other,
      status: 'PUBLISHED',
      version: 1,
    });
    f.db.class.findUnique.mockResolvedValue({
      id: target,
      name: 'A',
      code: 'A',
      teacherId: other,
      isArchived: false,
    });
    await expect(
      f.service.review({ ...actor, role: 'ADMIN' }, body),
    ).resolves.toMatchObject({ body: { examVersionId: version } });
  });
  it.each([
    { maxAttempts: 0 },
    { maxAttempts: 21 },
    { showScore: 'true' },
    { studentId: target },
    { closesAt: '2026-11-19T00:00:00Z' },
    { examVersionId: 'bad' },
  ])(
    'validates schedule/policy/recipient before review reads: %p',
    async (x) => {
      const f = creation();
      await expect(
        f.service.review(actor, { ...body, ...x }),
      ).rejects.toBeInstanceOf(ZodError);
      expect(f.db.exam.findUnique).not.toHaveBeenCalled();
    },
  );
  it('rejects malformed published structure rather than inventing configured points', async () => {
    const f = creation();
    f.db.examVersion.findFirst.mockResolvedValue({
      id: version,
      number: 1,
      snapshot: { title: 'Bad', durationMin: 30, questions: [{ points: -1 }] },
    });
    await expect(f.service.review(actor, body)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
  it('creation revalidates a previously reviewed recipient and refuses changed ownership', async () => {
    const f = creation();
    const r = await f.service.review(actor, body);
    f.db.class.findUnique.mockResolvedValue({
      id: target,
      name: 'A',
      code: 'A',
      teacherId: other,
      isArchived: false,
    });
    await expect(f.service.create(actor, r.body)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(f.db.examAssignment.create).not.toHaveBeenCalled();
  });
  it('confirmation persistence uses reviewed exact version, dates and visibility, ACK metadata remains pinned', async () => {
    const f = creation(),
      r = await f.service.review(actor, body),
      created = await f.service.create(actor, r.body);
    expect(f.db.examAssignment.create).toHaveBeenCalledTimes(1);
    expect(f.db.examAssignment.create.mock.calls[0][0].data).toMatchObject({
      examId: id,
      examVersionId: version,
      classId: target,
      createdById: id,
      opensAt: new Date(body.opensAt),
      closesAt: new Date(body.closesAt),
      maxAttempts: 2,
      showScore: false,
      showAnswers: true,
    });
    expect(created.exam.title).toBe('Pinned V1');
  });
  it('review endpoint has explicit management roles and delegates to the business service', () => {
    const review = jest.fn(),
      c = new ExamAssignmentsController({
        review,
      } as unknown as ExamAssignmentsService);
    c.review({ user: actor } as never, body);
    expect(review).toHaveBeenCalledWith(actor, body);
    expect(
      Reflect.getMetadata('roles', ExamAssignmentsController.prototype.review),
    ).toEqual(['ADMIN', 'TEACHER']);
  });
});
describe('UI14 remote choices reuse scoped bounded management reads', () => {
  it('Student options search/count share Teacher membership and active filter with stable ordering, no private fields', async () => {
    const db = {
      user: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(41),
      },
      $transaction: jest.fn().mockImplementation(async (x) => Promise.all(x)),
    };
    const r = await new UsersService(asDb(db)).list(
        { role: 'STUDENT', active: 'true', search: 'An', page: 2, limit: 20 },
        actor,
      ),
      args = db.user.findMany.mock.calls[0][0];
    expect(args).toMatchObject({
      skip: 20,
      take: 20,
      where: {
        role: 'STUDENT',
        isActive: true,
        memberships: { some: { class: { teacherId: id } } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    expect(db.user.count.mock.calls[0][0].where).toEqual(args.where);
    expect(args.select.passwordHash).toBeUndefined();
    expect(args.select.refreshTokens).toBeUndefined();
    expect(r.total).toBe(41);
  });
  it('Class options are current scoped classes with server page/limit and code search', async () => {
    const db = {
      class: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(22),
      },
      $transaction: jest.fn().mockImplementation(async (x) => Promise.all(x)),
    };
    await new ClassesService(asDb(db)).list(actor, {
      search: 'A',
      page: '2',
      limit: '20',
      archived: 'false',
    });
    const args = db.class.findMany.mock.calls[0][0];
    expect(args).toMatchObject({
      skip: 20,
      take: 20,
      where: {
        teacherId: id,
        isArchived: false,
        OR: [
          { name: { contains: 'A', mode: 'insensitive' } },
          { code: { contains: 'A', mode: 'insensitive' } },
        ],
      },
    });
    expect(db.class.count.mock.calls[0][0].where).toEqual(args.where);
  });
  it('assignable exam lookup applies ownership, nonarchive and published version BEFORE count/page', async () => {
    const db = {
      exam: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(1),
      },
      $transaction: jest.fn().mockImplementation(async (x) => Promise.all(x)),
    };
    await new ExamsService(asDb(db)).list(actor, {
      assignable: 'true',
      id,
      search: 'Exam',
    });
    const args = db.exam.findMany.mock.calls[0][0];
    expect(args.where).toMatchObject({
      id,
      authorId: id,
      AND: [
        { status: { not: 'ARCHIVED' } },
        { versions: { some: { publishedAt: { lte: expect.any(Date) } } } },
      ],
    });
    expect(args.take).toBe(20);
    expect(db.exam.count.mock.calls[0][0].where).toEqual(args.where);
  });
});
describe('UI14 examination operations and Student schedule reads', () => {
  it('counts whole filtered assignments in same repeatable snapshot, no per-row calls or lifecycle mutation', async () => {
    const tx = {
      examAssignment: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest
          .fn()
          .mockResolvedValueOnce(75)
          .mockResolvedValueOnce(10)
          .mockResolvedValueOnce(45)
          .mockResolvedValueOnce(20),
      },
    };
    const db = {
      $transaction: jest.fn().mockImplementation(async (fn) => fn(tx)),
    };
    const r = await new ExamAssignmentsService(asDb(db)).list(actor, {
      operations: 'true',
      examId: id,
    });
    expect(r.total).toBe(75);
    expect(r.operations).toEqual({
      upcoming: 10,
      open: 45,
      closed: 20,
      population: 'FILTERED_ASSIGNMENTS',
    });
    expect(tx.examAssignment.findMany).toHaveBeenCalledTimes(1);
    const where = tx.examAssignment.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({
      examId: id,
      ...resultAssignmentScope(actor),
    });
    for (const args of tx.examAssignment.count.mock.calls.slice(1))
      expect(args[0].where.AND[0]).toEqual(where);
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'RepeatableRead',
    });
    expect(Number.isFinite(Date.parse(r.serverNow))).toBe(true);
  });
  it('denies Student operations aggregates before any assignment reads', async () => {
    const db = { $transaction: jest.fn() };
    await expect(
      new ExamAssignmentsService(asDb(db)).list(
        { ...actor, role: 'STUDENT' },
        { operations: 'true' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it.each(['opening', 'closing'])(
    'Student %s ordering remains own-scoped and includes only own attempt deadlines',
    async (scheduleOrder) => {
      const db = {
        examAssignment: {
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0),
        },
        $transaction: jest.fn().mockImplementation(async (x) => Promise.all(x)),
      };
      await new ExamAssignmentsService(asDb(db)).list(
        { ...actor, role: 'STUDENT' },
        { view: 'in_progress', scheduleOrder, page: 2 },
      );
      const args = db.examAssignment.findMany.mock.calls[0][0];
      expect(args.include.attempts).toMatchObject({
        where: { studentId: id },
        select: { deadlineAt: true },
      });
      expect(args.where.OR).toEqual([
        { studentId: id },
        { class: { is: { members: { some: { studentId: id } } } } },
      ]);
      expect(args.skip).toBe(20);
      expect(args.orderBy[0]).toEqual({
        [scheduleOrder === 'opening' ? 'opensAt' : 'closesAt']: {
          sort: 'asc',
          nulls: 'last',
        },
      });
      expect(db.examAssignment.count.mock.calls[0][0].where).toEqual(
        args.where,
      );
    },
  );
  it('rejects unsupported schedule order, does not sort a client page', async () => {
    await expect(
      new ExamAssignmentsService(asDb({})).list(actor, {
        scheduleOrder: 'score',
      }),
    ).rejects.toBeInstanceOf(ZodError);
  });
});
