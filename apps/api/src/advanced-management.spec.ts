import { ForbiddenException } from '@nestjs/common';
import { ZodError } from 'zod';
import { ClassesService } from './classes/classes.service';
import { ClassesController } from './classes/classes.controller';
import { ExamAssignmentsService } from './exam-assignments/exam-assignments.service';
import { ExamAssignmentsController } from './exam-assignments/exam-assignments.controller';
import { ResultsService } from './results/results.service';
import type { PrismaService } from './prisma/prisma.service';
const id = '10000000-0000-4000-8000-000000000001',
  other = '10000000-0000-4000-8000-000000000002',
  actor = {
    id,
    role: 'TEACHER' as const,
    email: 'teacher@example.test',
    fullName: 'Teacher',
  },
  asDb = (v: unknown) => v as PrismaService;
function roster() {
  const tx = {
    class: { findFirst: jest.fn().mockResolvedValue({ id }) },
    classMember: {
      count: jest.fn().mockResolvedValue(21),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'member',
          studentId: other,
          student: {
            id: other,
            fullName: 'Lan',
            email: 'lan@example.test',
            isActive: false,
          },
        },
      ]),
    },
  };
  const db = {
    class: {
      findFirst: jest.fn().mockResolvedValue({ id }),
      findUnique: jest
        .fn()
        .mockResolvedValue({ id, teacherId: id, _count: { members: 21 } }),
    },
    classMember: { findFirst: jest.fn().mockResolvedValue({ id }) },
    $transaction: jest
      .fn()
      .mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx)),
  };
  return { db, tx, service: new ClassesService(asDb(db)) };
}
describe('UI12 large roster', () => {
  it('filters before count/query, clamps depleted pages and keeps stable bounded query in one snapshot', async () => {
    const { service, tx, db } = roster(),
      x = await service.memberPage(id, actor, {
        paged: 'true',
        page: 99,
        limit: 20,
        search: 'Lan',
        active: 'false',
      });
    expect(x.page).toBe(2);
    expect(x.total).toBe(21);
    expect(tx.classMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 20,
        orderBy: [{ student: { fullName: 'asc' } }, { studentId: 'asc' }],
      }),
    );
    const where = tx.classMember.count.mock.calls[0][0].where;
    expect(where).toMatchObject({
      classId: id,
      class: { is: { id, teacherId: id } },
      student: {
        is: {
          isActive: false,
          OR: [
            { fullName: { contains: 'Lan', mode: 'insensitive' } },
            { email: { contains: 'Lan', mode: 'insensitive' } },
          ],
        },
      },
    });
    expect(tx.classMember.findMany.mock.calls[0][0].where).toEqual(where);
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'RepeatableRead',
    });
  });
  it('rejects Student paged roster before reads', async () => {
    const { service, db } = roster();
    await expect(
      service.memberPage(id, { ...actor, role: 'STUDENT' }, {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.class.findFirst).not.toHaveBeenCalled();
  });
  it('rejects a foreign Teacher and lost transaction scope before roster reads', async () => {
    const f = roster();
    f.db.class.findFirst.mockResolvedValue(null);
    await expect(f.service.memberPage(id, actor, {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(f.db.$transaction).not.toHaveBeenCalled();
    const g = roster();
    g.tx.class.findFirst.mockResolvedValue(null);
    await expect(g.service.memberPage(id, actor, {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(g.tx.classMember.findMany).not.toHaveBeenCalled();
  });
  it.each([
    { limit: 101 },
    { page: 0 },
    { active: 'unknown' },
    { search: ['Lan'] },
    { paged: 'false' },
  ])('rejects invalid roster query %j before resource reads', async (q) => {
    const { service, db } = roster();
    await expect(service.memberPage(id, actor, q)).rejects.toBeInstanceOf(
      ZodError,
    );
    expect(db.class.findFirst).not.toHaveBeenCalled();
  });
  it('overview omits all member rows while keeping class count and enforces ownership', async () => {
    const { service, db } = roster();
    const x = await service.getWithOptions(id, actor, { members: 'none' });
    expect(x).toMatchObject({ _count: { members: 21 } });
    expect(db.class.findUnique.mock.calls[0][0].include).not.toHaveProperty(
      'members',
    );
    db.class.findUnique.mockResolvedValue({
      id,
      teacherId: other,
      _count: { members: 21 },
    });
    await expect(service.overview(id, actor)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
  it('keeps legacy no-query array contract and dispatches paged consumer explicitly', async () => {
    const service = {
        get: jest.fn().mockResolvedValue({ members: [{ id: 'legacy' }] }),
        memberPage: jest
          .fn()
          .mockResolvedValue({ items: [], total: 0, page: 1 }),
      },
      controller = new ClassesController(service as unknown as ClassesService);
    await expect(
      controller.students(id, { user: actor } as never),
    ).resolves.toEqual([{ id: 'legacy' }]);
    expect(service.memberPage).not.toHaveBeenCalled();
    await controller.students(id, { user: actor } as never, { paged: 'true' });
    expect(service.memberPage).toHaveBeenCalledWith(id, actor, {
      paged: 'true',
    });
  });
});
function recipients() {
  const tx = {
    examAssignment: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ classId: other, studentId: null }),
    },
    user: {
      count: jest.fn().mockResolvedValue(35),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  const db = {
    examAssignment: {
      findFirst: jest.fn().mockResolvedValue({
        id,
        classId: other,
        studentId: null,
        createdById: id,
      }),
    },
    $transaction: jest
      .fn()
      .mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx)),
  };
  return { db, tx, service: new ExamAssignmentsService(asDb(db)) };
}
describe('UI12 assignment follow-up', () => {
  it('counts/filter recipients at database layer and clamps pages without loading whole roster', async () => {
    const { service, tx } = recipients(),
      value = await service.studentsPage(id, actor, {
        paged: 'true',
        status: 'completed',
        search: 'Lan',
        page: 99,
      });
    expect(value.page).toBe(2);
    const where = tx.user.count.mock.calls[0][0].where;
    expect(where).toMatchObject({
      role: 'STUDENT',
      isActive: true,
      memberships: { some: { classId: other } },
      AND: [
        {
          AND: [
            {
              attempts: {
                some: {
                  assignmentId: id,
                  status: { in: ['SUBMITTED', 'EXPIRED'] },
                },
              },
            },
            { attempts: { none: { assignmentId: id, status: 'IN_PROGRESS' } } },
          ],
        },
        {
          OR: [
            { fullName: { contains: 'Lan', mode: 'insensitive' } },
            { email: { contains: 'Lan', mode: 'insensitive' } },
          ],
        },
      ],
    });
    expect(tx.user.findMany.mock.calls[0][0]).toMatchObject({
      where,
      skip: 20,
      take: 20,
      select: { attempts: { where: { assignmentId: id } } },
    });
  });
  it.each(['not_started', 'in_progress'])(
    'uses exact activity predicate for %s',
    async (status) => {
      const { service, tx } = recipients();
      await service.studentsPage(id, actor, { paged: 'true', status });
      expect(tx.user.count.mock.calls[0][0].where.AND[0]).toEqual(
        status === 'not_started'
          ? { attempts: { none: { assignmentId: id } } }
          : { attempts: { some: { assignmentId: id, status: 'IN_PROGRESS' } } },
      );
    },
  );
  it('denies Student and lost scoped assignment without recipient queries', async () => {
    const f = recipients();
    await expect(
      f.service.studentsPage(
        id,
        { ...actor, role: 'STUDENT' },
        { paged: 'true' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(f.db.examAssignment.findFirst).not.toHaveBeenCalled();
    const g = recipients();
    g.tx.examAssignment.findFirst.mockResolvedValue(null);
    await expect(
      g.service.studentsPage(id, actor, { paged: 'true' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(g.tx.user.count).not.toHaveBeenCalled();
  });
  it('validates status/page/explicit paging before sensitive queries', async () => {
    for (const q of [
      { paged: 'true', status: 'other' },
      { paged: 'true', limit: 101 },
      { paged: 'false' },
      {},
    ]) {
      const { service, db } = recipients();
      await expect(service.studentsPage(id, actor, q)).rejects.toBeInstanceOf(
        ZodError,
      );
      expect(db.examAssignment.findFirst).not.toHaveBeenCalled();
    }
  });
  it('keeps legacy assignment recipient array consumers unchanged', async () => {
    const service = {
        students: jest.fn().mockResolvedValue([{ id: 'legacy' }]),
        studentsPage: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      },
      controller = new ExamAssignmentsController(
        service as unknown as ExamAssignmentsService,
      );
    await expect(
      controller.students(id, { user: actor } as never),
    ).resolves.toEqual([{ id: 'legacy' }]);
    await controller.students(id, { user: actor } as never, { paged: 'true' });
    expect(service.studentsPage).toHaveBeenCalledWith(id, actor, {
      paged: 'true',
    });
  });
});
describe('UI12 own result history', () => {
  it('uses the same own-scope snapshot title/status/assignment filters for list and total, and keeps score hidden', async () => {
    const db = {
        examAttempt: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: other,
              studentId: id,
              assignmentId: other,
              examVersionId: id,
              examVersion: 1,
              exam: { id: other, title: 'V2 mutable title' },
              examSnapshot: { title: 'Pinned V1', durationMin: 30 },
              assignment: { showScore: false, showAnswers: false },
              status: 'EXPIRED',
              startedAt: new Date(),
              submittedAt: new Date(),
              score: '0',
              maxScore: '10',
            },
          ]),
          count: jest.fn().mockResolvedValue(1),
        },
      },
      service = new ResultsService(asDb(db)),
      value = await service.listStudentPage(
        { ...actor, role: 'STUDENT' },
        {
          page: 2,
          search: 'Pinned',
          status: 'EXPIRED',
          assignmentId: other,
          studentId: other,
        },
      );
    const where = db.examAttempt.findMany.mock.calls[0][0].where;
    expect(where).toEqual({
      studentId: id,
      status: { in: ['SUBMITTED', 'EXPIRED'] },
      AND: [
        {
          examSnapshot: {
            path: ['title'],
            string_contains: 'Pinned',
            mode: 'insensitive',
          },
          status: 'EXPIRED',
          assignmentId: other,
        },
      ],
    });
    expect(db.examAttempt.count).toHaveBeenCalledWith({ where });
    expect(value.items[0]).toMatchObject({
      assignmentId: other,
      version: 1,
      score: null,
      maxScore: null,
      exam: { title: 'Pinned V1' },
    });
    expect(value.items[0]).not.toHaveProperty('answers');
    expect(value.items[0]).not.toHaveProperty('examSnapshot');
  });
  it('rejects another role or non-finalized filter without reads', async () => {
    const db = { examAttempt: { findMany: jest.fn(), count: jest.fn() } },
      service = new ResultsService(asDb(db));
    await expect(service.listStudentPage(actor, {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      service.listStudentPage(
        { ...actor, role: 'STUDENT' },
        { status: 'IN_PROGRESS' },
      ),
    ).rejects.toBeInstanceOf(ZodError);
    expect(db.examAttempt.findMany).not.toHaveBeenCalled();
  });
  it('keeps published zero score distinct from a hidden score in the list projection', async () => {
    const row = {
        id,
        assignmentId: id,
        examVersionId: id,
        examVersion: 1,
        exam: { id, title: 'Exam' },
        examSnapshot: { title: 'Exam', durationMin: 30 },
        assignment: { showScore: true },
        status: 'SUBMITTED',
        score: '0',
        maxScore: '10',
      },
      db = { examAttempt: { findMany: jest.fn().mockResolvedValue([row]) } },
      service = new ResultsService(asDb(db));
    expect(
      (await service.listStudent({ ...actor, role: 'STUDENT' }))[0].score,
    ).toBe('0');
  });
});
