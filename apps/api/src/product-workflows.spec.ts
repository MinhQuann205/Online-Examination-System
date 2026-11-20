import { ForbiddenException } from '@nestjs/common';
import { ZodError } from 'zod';
import type { PrismaService } from './prisma/prisma.service';
import { UsersService } from './users/users.service';
import { UsersController } from './users/users.controller';
import { QuestionsService } from './questions/questions.service';
import { ClassesService } from './classes/classes.service';

const teacher = {
  id: '10000000-0000-4000-8000-000000000001',
  role: 'TEACHER' as const,
};
const studentId = '10000000-0000-4000-8000-000000000002';
const actor = {
  ...teacher,
  email: 'teacher@example.test',
  fullName: 'Teacher',
};
const asDb = (value: unknown) => value as PrismaService;

describe('UI112 product workflows without database connections', () => {
  it.each([
    {},
    { isActive: 'false' },
    { isActive: 0 },
    { isActive: null },
    null,
  ])(
    'rejects malformed account status %j without disabling or revoking sessions',
    async (body) => {
      const db = {
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: studentId,
            role: 'STUDENT',
            isActive: true,
          }),
          update: jest.fn().mockResolvedValue({ id: studentId }),
        },
      };
      const controller = new UsersController(new UsersService(asDb(db)));
      await expect(
        Promise.resolve().then(() =>
          controller.status(studentId, body as never),
        ),
      ).rejects.toBeInstanceOf(ZodError);
      expect(db.user.findUnique).not.toHaveBeenCalled();
      expect(db.user.update).not.toHaveBeenCalled();
    },
  );
  it.each([true, false])(
    'accepts explicit account status %s and keeps session revocation',
    async (isActive) => {
      const db = {
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: studentId,
            role: 'STUDENT',
            isActive: !isActive,
          }),
          update: jest.fn().mockResolvedValue({ id: studentId, isActive }),
        },
      };
      Object.assign(db, {
        $transaction: (run: (tx: unknown) => unknown) => run(db),
      });
      await new UsersController(new UsersService(asDb(db))).status(studentId, {
        isActive,
      });
      expect(db.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            isActive,
            refreshTokenHash: isActive ? undefined : null,
            tokenVersion: { increment: 1 },
          },
        }),
      );
    },
  );
  it('still protects the last active administrator', async () => {
    const db = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: studentId, role: 'ADMIN', isActive: true }),
        count: jest.fn().mockResolvedValue(1),
        update: jest.fn(),
      },
    };
    Object.assign(db, {
      $transaction: (run: (tx: unknown) => unknown) => run(db),
      $queryRaw: jest.fn().mockResolvedValue([]),
    });
    await expect(
      new UsersController(new UsersService(asDb(db))).status(studentId, {
        isActive: false,
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(db.user.update).not.toHaveBeenCalled();
  });
  it.each(['ADMIN', 'TEACHER'])(
    'denies Teacher access to another %s account detail',
    async (role) => {
      const db = {
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ id: studentId, role, memberships: [] }),
        },
        classMember: { findFirst: jest.fn().mockResolvedValue(null) },
      };
      await expect(
        new UsersService(asDb(db)).get(studentId, teacher),
      ).rejects.toBeInstanceOf(ForbiddenException);
    },
  );
  it('scopes Teacher student membership projection to their current classes', async () => {
    const db = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: studentId,
          role: 'STUDENT',
          memberships: [],
        }),
      },
      classMember: { findFirst: jest.fn().mockResolvedValue({ id: 'roster' }) },
    };
    await new UsersService(asDb(db)).get(studentId, teacher);
    const query = db.user.findUnique.mock.calls[0][0];
    expect(query.select.memberships.where).toEqual({
      class: { teacherId: teacher.id },
    });
    expect(db.classMember.findFirst).toHaveBeenCalledWith({
      where: { studentId, class: { teacherId: teacher.id } },
    });
    expect(query.select.passwordHash).toBeUndefined();
    expect(query.select.refreshTokenHash).toBeUndefined();
  });
  it('denies an unassigned Student and allows Teacher self detail', async () => {
    const db = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: studentId,
          role: 'STUDENT',
          memberships: [],
        }),
      },
      classMember: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new UsersService(asDb(db));
    await expect(service.get(studentId, teacher)).rejects.toMatchObject({
      status: 403,
    });
    db.user.findUnique.mockResolvedValue({
      id: teacher.id,
      role: 'TEACHER',
      memberships: [],
    });
    await expect(service.get(teacher.id, teacher)).resolves.toMatchObject({
      id: teacher.id,
    });
  });
  it.each(['ADMIN', 'STUDENT'] as const)(
    'preserves %s permitted self/admin detail projections',
    async (role) => {
      const db = {
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: studentId,
            role: 'STUDENT',
            memberships: [],
          }),
        },
      };
      await new UsersService(asDb(db)).get(studentId, { id: studentId, role });
      expect(
        db.user.findUnique.mock.calls[0][0].select.memberships.where,
      ).toBeUndefined();
    },
  );
  it.each(['SINGLE_CHOICE', 'MULTIPLE_CHOICE'])(
    'rejects ambiguous duplicate %s choices before writing',
    async (type) => {
      const db = { $transaction: jest.fn().mockResolvedValue({}) };
      await expect(
        new QuestionsService(asDb(db)).create(actor, {
          type,
          content: 'Question',
          options: [
            { content: ' Same ', isCorrect: true },
            { content: 'Same', isCorrect: false },
          ],
        }),
      ).rejects.toBeInstanceOf(ZodError);
      expect(db.$transaction).not.toHaveBeenCalled();
    },
  );
  it.each(['leftText', 'rightText'])(
    'rejects duplicate matching %s after trim before writing',
    async (side) => {
      const db = { $transaction: jest.fn().mockResolvedValue({}) };
      const pairs = [
        { leftText: 'Alpha', rightText: 'One' },
        { leftText: 'Beta', rightText: 'Two' },
      ];
      pairs[1][side as 'leftText' | 'rightText'] =
        ' ' + pairs[0][side as 'leftText' | 'rightText'] + ' ';
      await expect(
        new QuestionsService(asDb(db)).create(actor, {
          type: 'MATCHING',
          content: 'Question',
          matchingPairs: pairs,
        }),
      ).rejects.toBeInstanceOf(ZodError);
      expect(db.$transaction).not.toHaveBeenCalled();
    },
  );
  it('rejects ambiguous matching edits before deleting existing question data', async () => {
    const db = {
      question: {
        findUnique: jest.fn().mockResolvedValue({
          id: studentId,
          authorId: teacher.id,
          archivedAt: null,
        }),
      },
      $transaction: jest.fn().mockResolvedValue({}),
    };
    await expect(
      new QuestionsService(asDb(db)).update(studentId, actor, {
        type: 'MATCHING',
        content: 'Question',
        matchingPairs: [
          { leftText: 'A', rightText: 'Same' },
          { leftText: 'B', rightText: 'Same' },
        ],
      }),
    ).rejects.toBeInstanceOf(ZodError);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it.each(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'MATCHING'])(
    'still saves valid %s authoring using normalized text',
    async (type) => {
      const tx = {
        question: { create: jest.fn().mockResolvedValue({ id: studentId }) },
      };
      const db = {
        $transaction: jest
          .fn()
          .mockImplementation(async (callback) => callback(tx)),
      };
      const input = {
        type,
        content: ' Question ',
        ...(type === 'MATCHING'
          ? {
              matchingPairs: [
                { leftText: ' Alpha ', rightText: ' One ' },
                { leftText: 'Beta', rightText: 'Two' },
              ],
            }
          : {
              options: [
                { content: ' Yes ', isCorrect: true },
                { content: 'No', isCorrect: false },
              ],
            }),
      };
      await expect(
        new QuestionsService(asDb(db)).create(actor, input),
      ).resolves.toEqual({ id: studentId });
      const data = tx.question.create.mock.calls[0][0].data;
      expect(data.content).toBe('Question');
      expect(
        type === 'MATCHING'
          ? data.matchingPairs.create[0].leftText
          : data.options.create[0].content,
      ).toBe(type === 'MATCHING' ? 'Alpha' : 'Yes');
    },
  );
  for (const kind of ['classes', 'questions'] as const) {
    it.each([
      { page: '1.5' },
      { limit: '2.5' },
      { page: 'Infinity' },
      { page: 'oops' },
      { limit: '101' },
    ])(
      'rejects invalid ' + kind + ' pagination %j before querying',
      async (q) => {
        const db = {
          class: { findMany: jest.fn(), count: jest.fn() },
          question: { findMany: jest.fn(), count: jest.fn() },
          $transaction: jest.fn(),
        };
        const service =
          kind === 'classes'
            ? new ClassesService(asDb(db))
            : new QuestionsService(asDb(db));
        await expect(service.list(actor, q)).rejects.toBeInstanceOf(ZodError);
        expect(
          db[kind === 'classes' ? 'class' : 'question'].findMany,
        ).not.toHaveBeenCalled();
        expect(db.$transaction).not.toHaveBeenCalled();
      },
    );
    it(
      'preserves defaults, integer paging and Teacher scope for ' + kind,
      async () => {
        const db = {
          class: { findMany: jest.fn(), count: jest.fn() },
          question: { findMany: jest.fn(), count: jest.fn() },
          $transaction: jest.fn().mockResolvedValue([[], 0]),
        };
        const service =
          kind === 'classes'
            ? new ClassesService(asDb(db))
            : new QuestionsService(asDb(db));
        await service.list(actor, {});
        await service.list(actor, { page: '2', limit: '10' });
        const calls =
          db[kind === 'classes' ? 'class' : 'question'].findMany.mock.calls;
        expect(calls[0][0]).toMatchObject({ skip: 0, take: 20 });
        expect(calls[1][0]).toMatchObject({
          skip: 10,
          take: 10,
          where:
            kind === 'classes'
              ? { teacherId: teacher.id }
              : { authorId: teacher.id },
        });
      },
    );
  }
});
