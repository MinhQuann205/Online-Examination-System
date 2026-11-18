import { ZodError } from 'zod';
import { ClassesService } from './classes/classes.service';
import { ExamsService } from './exams/exams.service';
import { ExamsController } from './exams/exams.controller';
import { ROLES } from './auth/decorators';
import type { AuthRequest } from './auth/auth.types';
import type { PrismaService } from './prisma/prisma.service';

const teacher: AuthRequest['user'] = {
  id: '10000000-0000-4000-8000-000000000001',
  role: 'TEACHER',
  email: 'teacher@example.test',
  fullName: 'Teacher',
};
const admin: AuthRequest['user'] = {
  ...teacher,
  id: '10000000-0000-4000-8000-000000000002',
  role: 'ADMIN',
};
const student: AuthRequest['user'] = {
  ...teacher,
  id: '10000000-0000-4000-8000-000000000003',
  role: 'STUDENT',
};
const examId = '20000000-0000-4000-8000-000000000001',
  versionId = '20000000-0000-4000-8000-000000000002';
const snapshot = {
  title: 'Published V1',
  description: 'Frozen description',
  durationMin: 30,
  questions: [
    {
      id: '30000000-0000-4000-8000-000000000001',
      questionId: '30000000-0000-4000-8000-000000000001',
      position: 0,
      type: 'SINGLE_CHOICE',
      content: 'Original question',
      explanation: null,
      points: 2.5,
      matchingPairs: [],
      options: [
        {
          id: '30000000-0000-4000-8000-000000000002',
          content: 'A',
          isCorrect: true,
        },
        {
          id: '30000000-0000-4000-8000-000000000003',
          content: 'B',
          isCorrect: false,
        },
      ],
    },
  ],
};

describe('UI114 class lifecycle queries', () => {
  function setup() {
    const db = {
      class: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue({ teacherId: teacher.id }),
        update: jest
          .fn()
          .mockImplementation(({ data }: { data: unknown }) =>
            Promise.resolve(data),
          ),
      },
      $transaction: jest.fn((queries: Promise<unknown>[]) =>
        Promise.all(queries),
      ),
    };
    return { db, service: new ClassesService(db as unknown as PrismaService) };
  }
  it.each([
    ['false', false],
    ['true', true],
    ['all', undefined],
  ] as const)(
    'Admin selects archived=%s with consistent count/pagination',
    async (archived, expected) => {
      const { db, service } = setup();
      await service.list(admin, {
        archived,
        page: '2',
        limit: '5',
        search: ' CS ',
      });
      const query = db.class.findMany.mock.calls[0][0];
      expect(query.where.isArchived).toBe(expected);
      expect(query.skip).toBe(5);
      expect(query.take).toBe(5);
      expect(query.where.OR[0].name.contains).toBe('CS');
      expect(db.class.count).toHaveBeenCalledWith({ where: query.where });
    },
  );
  it('Teacher archive view preserves the assigned-teacher scope', async () => {
    const { db, service } = setup();
    await service.list(teacher, { archived: 'all' });
    expect(db.class.findMany.mock.calls[0][0].where).toEqual({
      teacherId: teacher.id,
    });
  });
  it.each(['true', 'all'])(
    'Student archive=%s denied before database access',
    async (archived) => {
      const { db, service } = setup();
      await expect(service.list(student, { archived })).rejects.toMatchObject({
        status: 403,
      });
      expect(db.$transaction).not.toHaveBeenCalled();
      expect(db.class.findMany).not.toHaveBeenCalled();
    },
  );
  it('Student default list retains active-only membership scope', async () => {
    const { db, service } = setup();
    await service.list(student, {});
    expect(db.class.findMany.mock.calls[0][0].where).toEqual({
      isArchived: false,
      members: { some: { studentId: student.id } },
    });
  });
  it('Rejects unsupported filter values before queries', async () => {
    const { db, service } = setup();
    await expect(
      service.list(admin, { archived: 'anything' }),
    ).rejects.toBeInstanceOf(ZodError);
    expect(db.class.findMany).not.toHaveBeenCalled();
  });
  it('Restore changes only the archive flag, retaining class/membership/history identities', async () => {
    const { db, service } = setup();
    await service.update(examId, teacher, { isArchived: false });
    expect(db.class.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: examId },
        data: { isArchived: false },
      }),
    );
  });
  it('Another Teacher cannot restore a foreign class', async () => {
    const { db, service } = setup();
    await expect(
      service.update(
        examId,
        { ...teacher, id: admin.id },
        { isArchived: false },
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(db.class.update).not.toHaveBeenCalled();
  });
});

describe('UI114 historical exam preview', () => {
  function setup() {
    const version = {
      id: versionId,
      number: 1,
      publishedAt: new Date('2026-11-01T00:00:00Z'),
      snapshot: structuredClone(snapshot),
    };
    const db = {
      exam: {
        findUnique: jest.fn().mockResolvedValue({
          id: examId,
          authorId: teacher.id,
          status: 'DRAFT',
          version: 2,
        }),
        findUniqueOrThrow: jest.fn(),
      },
      examVersion: { findFirst: jest.fn().mockResolvedValue(version) },
    };
    return {
      db,
      version,
      service: new ExamsService(db as unknown as PrismaService),
    };
  }
  it('Loads exact V1 while V2 is a draft, without reading mutable draft questions', async () => {
    const { db, version, service } = setup();
    const result = await service.preview(examId, teacher, { versionId });
    expect(result).toEqual({
      draft: false,
      version: 1,
      examVersionId: versionId,
      publishedAt: version.publishedAt,
      snapshot,
    });
    expect(db.examVersion.findFirst).toHaveBeenCalledWith({
      where: { examId, id: versionId },
      orderBy: { number: 'desc' },
    });
    expect(db.exam.findUniqueOrThrow).not.toHaveBeenCalled();
    result.snapshot.title = 'Client change';
    expect(version.snapshot.title).toBe('Published V1');
  });
  it('Admin can read a historical preview through the same scoped contract', async () => {
    const { service } = setup();
    await expect(
      service.preview(examId, admin, { versionId }),
    ).resolves.toMatchObject({ examVersionId: versionId, version: 1 });
  });
  it('Wrong Teacher is denied before the version/key query', async () => {
    const { db, service } = setup();
    await expect(
      service.preview(examId, { ...teacher, id: admin.id }, { versionId }),
    ).rejects.toMatchObject({ status: 403 });
    expect(db.examVersion.findFirst).not.toHaveBeenCalled();
  });
  it('Student cannot use a private preview, even through a direct service call', async () => {
    const { db, service } = setup();
    await expect(
      service.preview(examId, student, { versionId }),
    ).rejects.toMatchObject({ status: 403 });
    expect(db.exam.findUnique).not.toHaveBeenCalled();
    expect(Reflect.getMetadata(ROLES, ExamsController)).toEqual([
      'ADMIN',
      'TEACHER',
    ]);
  });
  it('Foreign/missing version is not substituted with the latest one', async () => {
    const { db, service } = setup();
    db.examVersion.findFirst.mockResolvedValue(null);
    await expect(
      service.preview(examId, teacher, { versionId }),
    ).rejects.toMatchObject({ status: 404 });
    expect(db.examVersion.findFirst).toHaveBeenCalledTimes(1);
  });
  it('Invalid or duplicate version input is rejected before data access', async () => {
    const { db, service } = setup();
    for (const value of ['https://outside.test', [versionId, versionId]])
      await expect(
        service.preview(examId, teacher, { versionId: value }),
      ).rejects.toBeInstanceOf(ZodError);
    expect(db.exam.findUnique).not.toHaveBeenCalled();
  });
  it('Default published preview keeps the latest-version behavior', async () => {
    const { db, service } = setup();
    db.exam.findUnique.mockResolvedValue({
      id: examId,
      authorId: teacher.id,
      status: 'PUBLISHED',
      version: 1,
    });
    await service.preview(examId, teacher);
    expect(db.examVersion.findFirst).toHaveBeenCalledWith({
      where: { examId },
      orderBy: { number: 'desc' },
    });
  });
});
