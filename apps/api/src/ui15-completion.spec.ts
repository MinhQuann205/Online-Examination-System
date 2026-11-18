import { ZodError } from 'zod';
import { ExamsService } from './exams/exams.service';
import { ExamsController } from './exams/exams.controller';
import { QuestionsService } from './questions/questions.service';
import { UsersService } from './users/users.service';
import { ROLES } from './auth/decorators';
import type { PrismaService } from './prisma/prisma.service';
import type { AuthRequest } from './auth/auth.types';

const teacher: AuthRequest['user'] = {
  id: '10000000-0000-4000-8000-000000000001',
  role: 'TEACHER',
  email: 'teacher@example.test',
  fullName: 'Teacher',
};
const examId = '20000000-0000-4000-8000-000000000001',
  versionId = '30000000-0000-4000-8000-000000000001';
const asDb = (value: unknown) => value as PrismaService;
function setup() {
  const tx = {
    examVersion: {
      count: jest.fn().mockResolvedValue(41),
      findMany: jest
        .fn()
        .mockResolvedValue([
          { id: versionId, number: 1, publishedAt: new Date() },
        ]),
    },
  };
  const db = {
    exam: {
      findUnique: jest.fn().mockResolvedValue({
        id: examId,
        authorId: teacher.id,
        version: 2,
        status: 'DRAFT',
      }),
      findUniqueOrThrow: jest
        .fn()
        .mockResolvedValue({ id: examId, questions: [] }),
    },
    examVersion: tx.examVersion,
    $transaction: jest.fn((run: (client: typeof tx) => unknown) => run(tx)),
  };
  return { db, tx, service: new ExamsService(asDb(db)) };
}
describe('UI15 bounded published version selection', () => {
  it('returns metadata only, stable descending pages and consistent count within a repeatable-read transaction', async () => {
    const { service, db, tx } = setup();
    const result = await service.versionsPage(examId, teacher, {
      paged: 'true',
      page: '2',
      limit: '20',
    });
    expect(result).toMatchObject({
      page: 2,
      limit: 20,
      total: 41,
      pageCount: 3,
    });
    const args = tx.examVersion.findMany.mock.calls[0] as unknown as [
      Record<string, unknown>,
    ];
    expect(args[0]).toMatchObject({
      skip: 20,
      take: 20,
      select: { id: true, number: true, publishedAt: true },
      orderBy: [{ number: 'desc' }, { id: 'desc' }],
    });
    expect(Object.keys(args[0].select as object).sort()).toEqual([
      'id',
      'number',
      'publishedAt',
    ]);
    expect(tx.examVersion.count).toHaveBeenCalledWith({ where: args[0].where });
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'RepeatableRead',
    });
  });
  it('clamps an obsolete page after records disappear instead of skipping available rows', async () => {
    const { service, tx } = setup();
    tx.examVersion.count.mockResolvedValue(1);
    const result = await service.versionsPage(examId, teacher, {
      paged: 'true',
      page: '99',
    });
    expect(result).toMatchObject({ page: 1, pageCount: 1 });
    expect(tx.examVersion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 }),
    );
  });
  it('empty history is page 1 with zero pages, not a fabricated published version', async () => {
    const { service, tx } = setup();
    tx.examVersion.count.mockResolvedValue(0);
    tx.examVersion.findMany.mockResolvedValue([]);
    await expect(
      service.versionsPage(examId, teacher, { paged: 'true' }),
    ).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      pageCount: 0,
      limit: 20,
    });
  });
  it('exact UUID lookup is exam scoped and independent of browsing page/search', async () => {
    const { service, tx } = setup();
    await service.versionsPage(examId, teacher, {
      paged: 'true',
      id: versionId,
    });
    expect(tx.examVersion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ examId, id: versionId }),
      }),
    );
  });
  it('version number search normalizes v-prefix and preserves publication cutoff', async () => {
    const { service, tx } = setup();
    await service.versionsPage(examId, teacher, {
      paged: 'true',
      search: ' V21 ',
    });
    expect(tx.examVersion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          examId,
          number: 21,
          publishedAt: { lte: expect.any(Date) },
        }),
      }),
    );
  });
  it.each([
    { paged: 'true', limit: '101' },
    { paged: 'true', page: '0' },
    { paged: 'true', page: ['1', '2'] },
    { paged: 'true', id: 'bad' },
    { paged: 'true', search: 'v0' },
    { paged: 'true', search: '2147483648' },
    { paged: 'false' },
    {},
  ])('rejects malformed version query %j before database access', async (q) => {
    const { service, db } = setup();
    await expect(
      service.versionsPage(examId, teacher, q),
    ).rejects.toBeInstanceOf(ZodError);
    expect(db.exam.findUnique).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it.each(['STUDENT', 'TEACHER'] as const)(
    'denies %s foreign history before the private metadata query',
    async (role) => {
      const { service, db } = setup();
      await expect(
        service.versionsPage(
          examId,
          { ...teacher, role, id: versionId },
          { paged: 'true' },
        ),
      ).rejects.toMatchObject({ status: 403 });
      expect(db.$transaction).not.toHaveBeenCalled();
    },
  );
  it('allows Admin metadata with identical bounded projection', async () => {
    const { service, tx } = setup();
    await service.versionsPage(
      examId,
      { ...teacher, role: 'ADMIN' },
      { paged: 'true' },
    );
    expect(tx.examVersion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20 }),
    );
  });
  it('lean editor skips version relation while legacy get/versions remain opt-in compatible', async () => {
    const { service, db } = setup();
    const lean = await service.get(examId, teacher, { versions: 'none' });
    expect(lean.versions).toEqual([]);
    expect(db.exam.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({ versions: false }),
      }),
    );
    const legacy = await new ExamsController(service).versions(examId, {
      user: teacher,
    } as AuthRequest);
    expect(Array.isArray(legacy)).toBe(true);
    expect(Reflect.getMetadata(ROLES, ExamsController)).toEqual([
      'ADMIN',
      'TEACHER',
    ]);
  });
});
describe('UI15 question bank boundaries', () => {
  it('searches one remote page using identical author/filter scope for count and rows', async () => {
    const question = {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(45),
    };
    const db = {
      question,
      $transaction: jest.fn((queries: Promise<unknown>[]) =>
        Promise.all(queries),
      ),
    };
    const result = await new QuestionsService(asDb(db)).list(teacher, {
      page: '2',
      limit: '20',
      search: ' algebra ',
      topic: ' Linear ',
      type: 'SINGLE_CHOICE',
      difficulty: 'HARD',
    });
    expect(result).toMatchObject({ page: 2, total: 45, pageCount: 3 });
    expect(question.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 20,
        where: {
          authorId: teacher.id,
          archivedAt: null,
          content: { contains: 'algebra', mode: 'insensitive' },
          topic: { contains: 'Linear', mode: 'insensitive' },
          type: 'SINGLE_CHOICE',
          difficulty: 'HARD',
        },
      }),
    );
    expect(question.count.mock.calls[0]).toEqual([
      {
        where: (
          question.findMany.mock.calls[0] as unknown as [{ where: unknown }]
        )[0].where,
      },
    ]);
  });
  it.each([
    { type: 'ESSAY' },
    { difficulty: 'IMPOSSIBLE' },
    { search: 'x'.repeat(151) },
    { topic: 'x'.repeat(121) },
    { page: '0' },
    { limit: '101' },
  ])(
    'rejects invalid bank filters %j instead of silently broadening results',
    async (q) => {
      const db = { $transaction: jest.fn() };
      await expect(
        new QuestionsService(asDb(db)).list(teacher, q),
      ).rejects.toBeInstanceOf(ZodError);
      expect(db.$transaction).not.toHaveBeenCalled();
    },
  );
  it('denies a Student even on a direct list service call', async () => {
    const db = { $transaction: jest.fn() };
    await expect(
      new QuestionsService(asDb(db)).list({ ...teacher, role: 'STUDENT' }, {}),
    ).rejects.toMatchObject({ status: 403 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
describe('UI15 last active administrator safety', () => {
  function account(role = 'ADMIN', active = true, count = 1) {
    const events: string[] = [];
    const tx = {
      user: {
        findUnique: jest.fn().mockImplementation(async () => {
          events.push('read');
          return { id: teacher.id, role, isActive: active };
        }),
        count: jest.fn().mockImplementation(async () => {
          events.push('count');
          return count;
        }),
        update: jest.fn().mockImplementation(async () => {
          events.push('update');
          return { id: teacher.id };
        }),
      },
      $queryRaw: jest.fn().mockImplementation(async () => {
        events.push('lock');
        return [];
      }),
    };
    const db = {
      $transaction: jest.fn(async (run: (value: typeof tx) => unknown) => {
        events.push('begin');
        const r = await run(tx);
        events.push('commit');
        return r;
      }),
    };
    return { tx, db, events, service: new UsersService(asDb(db)) };
  }
  it('locks the ordered admin set and rereads before counting/rejecting last active admin', async () => {
    const { service, tx, events } = account();
    await expect(
      service.status(teacher.id, { isActive: false }),
    ).rejects.toMatchObject({ status: 400 });
    expect(events).toEqual(['begin', 'read', 'lock', 'read', 'count']);
    expect(tx.user.update).not.toHaveBeenCalled();
    const parts = tx.$queryRaw.mock.calls[0] as unknown as [
      TemplateStringsArray,
    ];
    expect(parts[0].join('')).toContain('ORDER BY "id" FOR UPDATE');
  });
  it('revokes sessions atomically when another active admin exists', async () => {
    const { service, tx, events } = account('ADMIN', true, 2);
    await service.status(teacher.id, { isActive: false });
    expect(events).toEqual([
      'begin',
      'read',
      'lock',
      'read',
      'count',
      'update',
      'commit',
    ]);
    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          isActive: false,
          refreshTokenHash: null,
          tokenVersion: { increment: 1 },
        },
      }),
    );
  });
  it('does not change a deleted target observed after waiting for the lock', async () => {
    const { service, tx } = account();
    tx.user.findUnique
      .mockResolvedValueOnce({ id: teacher.id, role: 'ADMIN', isActive: true })
      .mockResolvedValueOnce(null);
    await expect(
      service.status(teacher.id, { isActive: false }),
    ).rejects.toMatchObject({ status: 404 });
    expect(tx.user.update).not.toHaveBeenCalled();
  });
  it('normal account changes use one transaction without acquiring admin locks', async () => {
    const { service, tx, events } = account('STUDENT');
    await service.status(teacher.id, { isActive: false });
    expect(events).toEqual(['begin', 'read', 'update', 'commit']);
    expect(tx.$queryRaw).not.toHaveBeenCalled();
    expect(tx.user.count).not.toHaveBeenCalled();
  });
  it('allows reactivation of an inactive admin without requiring another active admin', async () => {
    const { service, tx } = account('ADMIN', false, 0);
    await service.status(teacher.id, { isActive: true });
    expect(tx.user.count).not.toHaveBeenCalled();
    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isActive: true,
          tokenVersion: { increment: 1 },
        }),
      }),
    );
  });
});
