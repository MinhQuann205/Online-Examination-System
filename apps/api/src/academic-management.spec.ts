import 'reflect-metadata';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { Prisma } from './generated/prisma/client';
import { ResultsService } from './results/results.service';
import { ResultsController } from './results/results.controller';
import { ExamsService } from './exams/exams.service';
import { ExamAssignmentsService } from './exam-assignments/exam-assignments.service';
import { snapshotStructure } from './exams/exam-structure';
import { resultAssignmentScope } from './results/result-scope';
import type { PrismaService } from './prisma/prisma.service';
const id = '10000000-0000-4000-8000-000000000001',
  other = '10000000-0000-4000-8000-000000000002',
  version = '10000000-0000-4000-8000-000000000003';
const actor = {
    id,
    role: 'TEACHER' as const,
    email: 'teacher@example.test',
    fullName: 'Teacher',
  },
  asDb = (v: unknown) => v as PrismaService;
const d = (v: string) => new Prisma.Decimal(v);
function report() {
  const tx = {
    exam: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ id, title: 'Current title', authorId: id }),
    },
    examAssignment: { findFirst: jest.fn().mockResolvedValue({ id: other }) },
    examVersion: { findFirst: jest.fn().mockResolvedValue({ id: version }) },
    examAttempt: {
      count: jest.fn().mockResolvedValue(21),
      groupBy: jest.fn().mockResolvedValue([
        { status: 'SUBMITTED', _count: { _all: 20 } },
        { status: 'EXPIRED', _count: { _all: 1 } },
      ]),
      aggregate: jest.fn().mockResolvedValue({
        _count: { score: 2 },
        _avg: { score: d('3.375') },
        _min: { score: d('0'), maxScore: d('6.75') },
        _max: { score: d('6.75'), maxScore: d('6.75') },
      }),
      findMany: jest.fn().mockResolvedValue([
        {
          id: other,
          assignmentId: other,
          examVersionId: version,
          examVersion: 1,
          status: 'SUBMITTED',
          examSnapshot: {
            title: 'Pinned V1',
            durationMin: 30,
            questions: [{ secret: 'KEY' }],
          },
          score: d('0'),
          maxScore: d('6.75'),
          student: {
            id: other,
            fullName: 'An',
            email: 'an@example.test',
            isActive: false,
          },
          assignment: { class: null },
        },
      ]),
    },
  };
  const db = {
    $transaction: jest
      .fn()
      .mockImplementation(async (fn: (v: unknown) => unknown) => fn(tx)),
  };
  return { tx, db, service: new ResultsService(asDb(db)) };
}
describe('UI13 scoped historical academic report', () => {
  it('counts, clamps and fetches bounded stable rows in the same repeatable snapshot, all predicates scoped', async () => {
    const { service, tx, db } = report(),
      r = await service.examPage(id, actor, {
        paged: 'true',
        page: 999,
        limit: 20,
        search: ' An ',
        assignmentId: other,
        versionId: version,
        status: 'EXPIRED',
      });
    expect(r.page).toBe(2);
    expect(r.total).toBe(21);
    expect(r.items[0].exam.title).toBe('Pinned V1');
    expect(tx.examAttempt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 20,
        orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      }),
    );
    const where = tx.examAttempt.count.mock.calls[0][0].where;
    expect(where).toMatchObject({
      status: 'EXPIRED',
      examVersionId: version,
      assignment: {
        is: { examId: id, id: other, ...resultAssignmentScope(actor) },
      },
      student: {
        is: {
          OR: [
            { fullName: { contains: 'An', mode: 'insensitive' } },
            { email: { contains: 'An', mode: 'insensitive' } },
          ],
        },
      },
    });
    expect(tx.examAttempt.findMany.mock.calls[0][0].where).toEqual(where);
    expect(tx.examAttempt.groupBy.mock.calls[0][0].where).toEqual(where);
    expect(tx.examAttempt.aggregate.mock.calls[0][0].where.AND[0]).toEqual(
      where,
    );
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'RepeatableRead',
    });
  });
  it('projects pinned public metadata, zero score and inactive student without snapshot/key/answers', async () => {
    const { service } = report(),
      r = await service.examPage(id, actor, { paged: 'true' });
    expect(r.items[0].score?.toString()).toBe('0');
    expect(r.items[0].student.isActive).toBe(false);
    expect(JSON.stringify(r)).not.toContain('KEY');
    expect(r.items[0]).not.toHaveProperty('examSnapshot');
    expect(r.items[0]).not.toHaveProperty('answers');
    expect(r.population).toBe('FINALIZED_HISTORICAL_ATTEMPTS');
  });
  it('aggregates persisted scores once per attempt with decimal rounding and no client grading', async () => {
    const { service } = report(),
      r = await service.examPage(id, actor, { paged: 'true' });
    expect(r.summary).toEqual({
      finalized: 21,
      submitted: 20,
      expired: 1,
      scores: {
        availability: 'AVAILABLE',
        gradedAttempts: 2,
        average: '3.38',
        minimum: '0.00',
        maximum: '6.75',
        scale: '6.75',
      },
    });
  });
  it('never combines mixed score scales', async () => {
    const f = report();
    f.tx.examAttempt.aggregate.mockResolvedValue({
      _count: { score: 2 },
      _avg: { score: d('5') },
      _min: { score: d('0'), maxScore: d('6.75') },
      _max: { score: d('10'), maxScore: d('10') },
    });
    const r = await f.service.examPage(id, actor, { paged: 'true' });
    expect(r.summary.scores).toEqual({
      availability: 'MIXED_SCALES',
      gradedAttempts: 2,
      average: null,
      minimum: null,
      maximum: null,
      scale: null,
    });
  });
  it('returns no score rather than zero for empty/ungraded population, and skips row retrieval for summary-only', async () => {
    const f = report();
    f.tx.examAttempt.count.mockResolvedValue(0);
    f.tx.examAttempt.groupBy.mockResolvedValue([]);
    f.tx.examAttempt.aggregate.mockResolvedValue({
      _count: { score: 0 },
      _avg: { score: null },
      _min: { score: null, maxScore: null },
      _max: { score: null, maxScore: null },
    });
    const r = await f.service.examPage(id, actor, {
      paged: 'true',
      summaryOnly: 'true',
      page: 99,
    });
    expect(r.page).toBe(1);
    expect(r.items).toEqual([]);
    expect(r.summary.scores.average).toBeNull();
    expect(r.summary.scores.availability).toBe('NO_SCORES');
    expect(f.tx.examAttempt.findMany).not.toHaveBeenCalled();
  });
  it('excludes active attempts and invalid/zero scales in the actual aggregate predicate', async () => {
    const f = report();
    await f.service.examPage(id, actor, { paged: 'true' });
    expect(f.tx.examAttempt.count.mock.calls[0][0].where.status).toEqual({
      in: ['SUBMITTED', 'EXPIRED'],
    });
    expect(f.tx.examAttempt.aggregate.mock.calls[0][0].where.AND[1]).toEqual({
      score: { not: null, gte: 0 },
      maxScore: { not: null, gt: 0 },
    });
  });
  it('rejects Student before transaction or metadata access', async () => {
    const f = report();
    await expect(
      f.service.examPage(id, { ...actor, role: 'STUDENT' }, { paged: 'true' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(f.db.$transaction).not.toHaveBeenCalled();
  });
  it('rejects foreign Teacher with no accessible assignment before attempts', async () => {
    const f = report();
    f.tx.exam.findUnique.mockResolvedValue({
      id,
      title: 'Other',
      authorId: other,
    });
    f.tx.examAssignment.findFirst.mockResolvedValue(null);
    await expect(
      f.service.examPage(id, actor, { paged: 'true' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(f.tx.examAttempt.count).not.toHaveBeenCalled();
  });
  it('does not grant an exam author access to a foreign explicit assignment', async () => {
    const f = report();
    f.tx.examAssignment.findFirst.mockResolvedValue(null);
    await expect(
      f.service.examPage(id, actor, { paged: 'true', assignmentId: other }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(f.tx.examAttempt.findMany).not.toHaveBeenCalled();
  });
  it('permits author empty reports but retains assignment scope on the sensitive reads', async () => {
    const f = report();
    f.tx.examAssignment.findFirst.mockResolvedValue(null);
    await f.service.examPage(id, actor, { paged: 'true' });
    expect(f.tx.examAttempt.count.mock.calls[0][0].where.assignment.is).toEqual(
      { examId: id, ...resultAssignmentScope(actor) },
    );
  });
  it('rejects a foreign version even for author, never falls back to latest', async () => {
    const f = report();
    f.tx.examVersion.findFirst.mockResolvedValue(null);
    await expect(
      f.service.examPage(id, actor, { paged: 'true', versionId: version }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(f.tx.examAttempt.count).not.toHaveBeenCalled();
  });
  it('requires nonauthor Teacher version scope before version lookup', async () => {
    const f = report();
    f.tx.exam.findUnique.mockResolvedValue({
      id,
      title: 'Other',
      authorId: other,
    });
    f.tx.examAssignment.findFirst
      .mockResolvedValueOnce({ id: other })
      .mockResolvedValueOnce(null);
    await expect(
      f.service.examPage(id, actor, { paged: 'true', versionId: version }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(f.tx.examVersion.findFirst).not.toHaveBeenCalled();
  });
  it('404 for missing exam without reading rows', async () => {
    const f = report();
    f.tx.exam.findUnique.mockResolvedValue(null);
    await expect(
      f.service.examPage(id, actor, { paged: 'true' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(f.tx.examAttempt.count).not.toHaveBeenCalled();
  });
  it.each([
    { paged: 'true', limit: 101 },
    { paged: 'true', page: -1 },
    { paged: 'true', assignmentId: 'x' },
    { paged: 'true', versionId: 'x' },
    { paged: 'true', status: 'IN_PROGRESS' },
    { paged: 'true', search: 'x'.repeat(201) },
  ])('validates query before DB: %p', async (raw) => {
    const f = report();
    await expect(f.service.examPage(id, actor, raw)).rejects.toBeInstanceOf(
      ZodError,
    );
    expect(f.db.$transaction).not.toHaveBeenCalled();
  });
  it('Admin scope remains broad only for Admin', async () => {
    const f = report();
    await f.service.examPage(
      id,
      { ...actor, role: 'ADMIN' },
      { paged: 'true' },
    );
    expect(f.tx.examAttempt.count.mock.calls[0][0].where.assignment.is).toEqual(
      { examId: id },
    );
  });
  it('keeps legacy no-query endpoint and management-only role metadata', () => {
    const legacy = jest.fn(),
      paged = jest.fn(),
      c = new ResultsController({
        exam: legacy,
        examPage: paged,
      } as unknown as ResultsService),
      req = { user: actor } as never;
    c.exam(id, req, {});
    expect(legacy).toHaveBeenCalledWith(id, actor);
    c.exam(id, req, { paged: 'true' });
    expect(paged).toHaveBeenCalledWith(id, actor, { paged: 'true' });
    expect(
      Reflect.getMetadata('roles', ResultsController.prototype.exam),
    ).toEqual(['ADMIN', 'TEACHER']);
  });
});
function structure() {
  const tx = {
    exam: {
      count: jest.fn().mockResolvedValue(3),
      findMany: jest.fn().mockResolvedValue([
        { id, authorId: id, status: 'DRAFT', version: 2, durationMin: 45 },
        {
          id: other,
          authorId: id,
          status: 'PUBLISHED',
          version: 1,
          durationMin: 90,
        },
        {
          id: version,
          authorId: other,
          status: 'PUBLISHED',
          version: 2,
          durationMin: 60,
        },
      ]),
    },
    examQuestion: {
      groupBy: jest.fn().mockResolvedValue([
        {
          examId: id,
          version: 2,
          _count: { _all: 2 },
          _sum: { points: d('0.30') },
        },
      ]),
    },
    examVersion: {
      findMany: jest.fn().mockResolvedValue([
        {
          examId: other,
          number: 1,
          snapshot: {
            title: 'Old',
            durationMin: 30,
            questions: [{ points: 0.1, key: 'secret' }, { points: 0.2 }],
          },
        },
      ]),
    },
  };
  const db = {
    $transaction: jest
      .fn()
      .mockImplementation(async (fn: (v: unknown) => unknown) => fn(tx)),
  };
  return { tx, db, service: new ExamsService(asDb(db)) };
}
describe('UI13 version-aware configured exam structure', () => {
  it('batch aggregates draft version and exact published snapshot, never probes managed nonauthor content', async () => {
    const f = structure(),
      r = await f.service.list(actor, { overview: 'true', results: 'true' });
    expect(r.items[0]).toMatchObject({
      structure: {
        kind: 'DRAFT',
        questionCount: 2,
        totalPoints: '0.30',
        durationMin: 45,
        version: 2,
      },
    });
    expect(r.items[1]).toMatchObject({
      structure: {
        kind: 'PUBLISHED_SNAPSHOT',
        questionCount: 2,
        totalPoints: '0.30',
        durationMin: 30,
        version: 1,
      },
    });
    expect(r.items[2]).toMatchObject({
      structure: { kind: 'UNAVAILABLE', questionCount: null },
    });
    expect(f.tx.examQuestion.groupBy.mock.calls[0][0].where.OR).toEqual([
      { examId: id, version: 2 },
    ]);
    expect(f.tx.examVersion.findMany.mock.calls[0][0].where.OR).toEqual([
      { examId: other, number: 1 },
    ]);
    expect(f.tx.examVersion.findMany).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(r)).not.toContain('secret');
  });
  it('does not silently use an older snapshot when current published/archived version is missing', async () => {
    const f = structure();
    f.tx.examVersion.findMany.mockResolvedValue([]);
    const r = await f.service.list(actor, { overview: 'true' });
    expect(r.items[1]).toMatchObject({
      structure: { kind: 'UNAVAILABLE', version: 1, totalPoints: null },
    });
  });
  it('empty draft is real zero and exhausted list pages clamp before query', async () => {
    const f = structure();
    f.tx.examQuestion.groupBy.mockResolvedValue([]);
    const r = await f.service.list(actor, { overview: 'true', page: 100 });
    expect(r.page).toBe(1);
    expect(r.items[0]).toMatchObject({
      structure: { kind: 'DRAFT', questionCount: 0, totalPoints: '0.00' },
    });
    expect(f.tx.exam.findMany.mock.calls[0][0].skip).toBe(0);
  });
  it.each([
    null,
    {},
    { durationMin: 30, questions: [{ points: -1 }] },
    { durationMin: 0, questions: [] },
    { durationMin: 30, questions: [{ points: 0.123 }] },
    { durationMin: 30, questions: [{ points: 999999.99 }, { points: 1 }] },
  ])('rejects corrupt summary without fabricating values: %p', (value) => {
    expect(snapshotStructure(value)).toBeNull();
  });
  it('sums configured decimal points exactly and exposes only three public fields', () => {
    expect(
      snapshotStructure({
        durationMin: 30,
        questions: [{ points: 0.1, correct: 'hidden' }, { points: 0.2 }],
      }),
    ).toEqual({ questionCount: 2, totalPoints: '0.30', durationMin: 30 });
  });
});
describe('UI13 assignment inventory predicates', () => {
  function fixture() {
    const db = {
      examAssignment: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      examVersion: { findMany: jest.fn() },
      $transaction: jest
        .fn()
        .mockImplementation(async (v: unknown[]) => Promise.all(v)),
    };
    return { db, service: new ExamAssignmentsService(asDb(db)) };
  }
  it('ANDs exact exam/version/class filters with Teacher scope for both count and rows', async () => {
    const f = fixture();
    await f.service.list(actor, {
      examId: id,
      examVersionId: version,
      classId: other,
      recipientKind: 'class',
      window: 'open',
    });
    const where = f.db.examAssignment.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({
      examId: id,
      ...resultAssignmentScope(actor),
      AND: expect.arrayContaining([
        { examVersionId: version },
        { classId: other },
        { classId: { not: null } },
      ]),
    });
    expect(f.db.examAssignment.count.mock.calls[0][0].where).toEqual(where);
    const window = where.AND.at(-1).AND;
    expect(window[0].OR[1].opensAt.lte).toEqual(window[1].OR[1].closesAt.gt);
  });
  it.each(['upcoming', 'closed'])(
    'filters schedule %s on server, without claiming student eligibility',
    async (window) => {
      const f = fixture();
      await f.service.list(actor, { window });
      expect(
        f.db.examAssignment.findMany.mock.calls[0][0].where.AND[0],
      ).toHaveProperty(window === 'upcoming' ? 'opensAt.gt' : 'closesAt.lte');
    },
  );
  it.each([
    { examVersionId: version },
    { classId: other },
    { recipientKind: 'class' },
    { window: 'closed' },
  ])('rejects Student management filter %p before reads', async (raw) => {
    const f = fixture();
    await expect(
      f.service.list({ ...actor, role: 'STUDENT' }, raw),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(f.db.examAssignment.findMany).not.toHaveBeenCalled();
  });
  it('rejects contradictory class/person criteria and malformed version, no latest fallback', async () => {
    const f = fixture();
    await expect(
      f.service.list(actor, { classId: other, recipientKind: 'student' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      f.service.list(actor, { examVersionId: 'bad' }),
    ).rejects.toBeInstanceOf(ZodError);
    expect(f.db.examAssignment.findMany).not.toHaveBeenCalled();
  });
});

describe('UI13 final read authorization', () => {
  it('denies Student exam structure before any Prisma operation', async () => {
    const f = structure();
    await expect(
      f.service.list({ ...actor, role: 'STUDENT' }, { overview: 'true' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(f.db.$transaction).not.toHaveBeenCalled();
  });
  it('scopes actual report count to both the requested exam and authorized assignment relation', async () => {
    const f = report();
    await f.service.examPage(id, actor, { paged: 'true' });
    expect(f.tx.examAttempt.count.mock.calls[0][0].where).toMatchObject({
      examId: id,
      assignment: { is: { examId: id, ...resultAssignmentScope(actor) } },
    });
  });
});
