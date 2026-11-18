import { ForbiddenException } from '@nestjs/common';
import { ZodError } from 'zod';
import { ExamAssignmentsService } from './exam-assignments/exam-assignments.service';
import { ExamAssignmentsController } from './exam-assignments/exam-assignments.controller';
import { studentAssignmentView } from './exam-assignments/student-assignment-view';
import { resultAssignmentScope } from './results/result-scope';
import { ROLES } from './auth/decorators';
import type { PrismaService } from './prisma/prisma.service';
const id = '10000000-0000-4000-8000-000000000001',
  classId = '10000000-0000-4000-8000-000000000002',
  actor = {
    id,
    role: 'TEACHER' as const,
    email: 'teacher@example.test',
    fullName: 'Teacher',
  };
const cast = (v: unknown) => v as PrismaService;
function fixture() {
  const tx = {
    examAssignment: {
      findFirst: jest.fn().mockResolvedValue({ classId, studentId: null }),
    },
    user: {
      count: jest
        .fn()
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(1),
    },
    examAttempt: {
      groupBy: jest.fn().mockResolvedValue([
        { status: 'IN_PROGRESS', _count: { _all: 2 } },
        { status: 'SUBMITTED', _count: { _all: 4 } },
        { status: 'EXPIRED', _count: { _all: 1 } },
      ]),
    },
  };
  const db = {
    examAssignment: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id, classId, studentId: null, createdById: id }),
      findUnique: jest.fn().mockResolvedValue({ id }),
    },
    $transaction: jest
      .fn()
      .mockImplementation(async (fn: (x: typeof tx) => unknown) => fn(tx)),
  };
  return { tx, db, service: new ExamAssignmentsService(cast(db)) };
}
describe('business feature expansion', () => {
  it('aggregates current active recipients separately from all historical attempts in a repeatable read transaction', async () => {
    const { service, tx, db } = fixture(),
      value = await service.progress(id, actor);
    expect(value.recipients).toEqual({
      total: 5,
      notStarted: 2,
      inProgress: 1,
      completed: 2,
    });
    expect(value.attempts).toEqual({
      total: 7,
      inProgress: 2,
      submitted: 4,
      expired: 1,
      finalized: 5,
    });
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'RepeatableRead',
    });
    expect(tx.user.count.mock.calls[0][0].where).toEqual({
      role: 'STUDENT',
      isActive: true,
      memberships: { some: { classId } },
    });
    expect(tx.examAssignment.findFirst).toHaveBeenCalledWith({
      where: { id, ...resultAssignmentScope(actor) },
      select: { classId: true, studentId: true },
    });
    expect(tx.examAttempt.groupBy).toHaveBeenCalledWith({
      by: ['status'],
      where: {
        assignmentId: id,
        assignment: { is: resultAssignmentScope(actor) },
      },
      _count: { _all: true },
    });
    expect(JSON.stringify(value)).not.toMatch(/score|answer|email|password/i);
  });
  it('denies Student progress before any database read', async () => {
    const { service, db } = fixture();
    await expect(
      service.progress(id, { ...actor, role: 'STUDENT' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.examAssignment.findFirst).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('denies a foreign assignment before aggregate queries', async () => {
    const { service, db } = fixture();
    db.examAssignment.findFirst.mockResolvedValue(null);
    await expect(service.progress(id, actor)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('rechecks sensitive scope inside the transaction and denies lost management scope', async () => {
    const { service, tx } = fixture();
    tx.examAssignment.findFirst.mockResolvedValue(null);
    await expect(service.progress(id, actor)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(tx.user.count).not.toHaveBeenCalled();
    expect(tx.examAttempt.groupBy).not.toHaveBeenCalled();
  });
  it('scopes direct recipients by student identity and active Student role', async () => {
    const { service, tx } = fixture();
    tx.examAssignment.findFirst.mockResolvedValue({
      classId: null,
      studentId: id,
    });
    await service.progress(id, actor);
    expect(tx.user.count.mock.calls[0][0].where).toEqual({
      role: 'STUDENT',
      isActive: true,
      id,
    });
  });
  it('declares management-only roles on the new HTTP progress endpoint', () => {
    expect(
      Reflect.getMetadata(ROLES, ExamAssignmentsController.prototype.progress),
    ).toEqual(['ADMIN', 'TEACHER']);
  });
  it('Student view predicates keep active/completed attempts scoped to that Student', () => {
    const now = new Date('2026-11-15T00:00:00Z');
    expect(studentAssignmentView('in_progress', id, now)).toEqual({
      attempts: { some: { studentId: id, status: 'IN_PROGRESS' } },
    });
    expect(studentAssignmentView('completed', id, now)).toEqual({
      AND: [
        { attempts: { none: { studentId: id, status: 'IN_PROGRESS' } } },
        {
          attempts: {
            some: { studentId: id, status: { in: ['SUBMITTED', 'EXPIRED'] } },
          },
        },
      ],
    });
    expect(studentAssignmentView('upcoming', id, now)).toMatchObject({
      AND: [
        { attempts: { none: { studentId: id } }, examVersionId: { not: null } },
        { opensAt: { gt: now } },
      ],
    });
    expect(studentAssignmentView('open', id, now)).toMatchObject({
      AND: [
        { attempts: { none: { studentId: id } } },
        { OR: [{ opensAt: null }, { opensAt: { lte: now } }] },
        { OR: [{ closesAt: null }, { closesAt: { gt: now } }] },
      ],
    });
  });
  it('rejects an unknown view before listing data', async () => {
    const db = { $transaction: jest.fn() },
      service = new ExamAssignmentsService(cast(db));
    await expect(
      service.list({ ...actor, role: 'STUDENT' }, { view: 'all OR true' }),
    ).rejects.toBeInstanceOf(ZodError);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('rejects Student-only lifecycle view on management listing without executing queries', async () => {
    const db = { $transaction: jest.fn() },
      service = new ExamAssignmentsService(cast(db));
    await expect(
      service.list(actor, { view: 'completed' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('filters Student list and total before pagination without replacing membership scope', async () => {
    const db = {
        examAssignment: {
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0),
        },
        $transaction: jest
          .fn()
          .mockImplementation(async (values: unknown[]) => Promise.all(values)),
      },
      service = new ExamAssignmentsService(cast(db));
    await service.list(
      { ...actor, role: 'STUDENT' },
      { view: 'in_progress', page: 2 },
    );
    expect(db.examAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 20,
        where: {
          OR: [
            { studentId: id },
            { class: { is: { members: { some: { studentId: id } } } } },
          ],
          AND: [
            { attempts: { some: { studentId: id, status: 'IN_PROGRESS' } } },
          ],
        },
      }),
    );
    expect(db.examAssignment.count.mock.calls[0][0].where).toEqual(
      db.examAssignment.findMany.mock.calls[0][0].where,
    );
  });
});
