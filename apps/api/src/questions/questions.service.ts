import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, QuestionType, Difficulty } from '../generated/prisma/client';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthRequest } from '../auth/auth.types';
const option = z.object({
  content: z.string().trim().min(1).max(1000),
  isCorrect: z.boolean(),
});
const pair = z.object({
  leftText: z.string().trim().min(1).max(500),
  rightText: z.string().trim().min(1).max(500),
});
const schema = z
  .object({
    type: z.enum(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'MATCHING']),
    content: z.string().trim().min(1).max(10000),
    explanation: z.string().trim().max(5000).optional(),
    difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
    topic: z.string().trim().max(120).optional(),
    options: z.array(option).optional(),
    matchingPairs: z.array(pair).optional(),
  })
  .superRefine((v, c) => {
    if (v.type === 'MATCHING') {
      if (!v.matchingPairs || v.matchingPairs.length < 2)
        c.addIssue({
          code: 'custom',
          message: 'Cần ít nhất hai cặp ghép',
          path: ['matchingPairs'],
        });
      if (v.options?.length)
        c.addIssue({
          code: 'custom',
          message: 'Câu ghép không dùng options',
          path: ['options'],
        });
    } else {
      if (!v.options || v.options.length < 2)
        c.addIssue({
          code: 'custom',
          message: 'Cần ít nhất hai lựa chọn',
          path: ['options'],
        });
      const correct = v.options?.filter((o) => o.isCorrect).length ?? 0;
      if (correct === 0 || (v.type === 'SINGLE_CHOICE' && correct !== 1))
        c.addIssue({
          code: 'custom',
          message: 'Số đáp án đúng không phù hợp loại câu hỏi',
          path: ['options'],
        });
      if (v.matchingPairs?.length)
        c.addIssue({
          code: 'custom',
          message: 'Câu trắc nghiệm không dùng matchingPairs',
          path: ['matchingPairs'],
        });
    }
  });
@Injectable()
export class QuestionsService {
  constructor(private db: PrismaService) {}
  private async assertOwner(id: string, user: AuthRequest['user']) {
    const q = await this.db.question.findUnique({
      where: { id },
      select: { id: true, authorId: true, archivedAt: true },
    });
    if (!q) throw new NotFoundException();
    if (user.role === 'TEACHER' && q.authorId !== user.id)
      throw new ForbiddenException();
    return q;
  }
  async list(user: AuthRequest['user'], q: Record<string, string | undefined>) {
    const page = Math.max(1, Number(q.page) || 1),
      limit = Math.min(100, Math.max(1, Number(q.limit) || 20));
    const where: Prisma.QuestionWhereInput = { archivedAt: null };
    if (user.role === 'TEACHER') where.authorId = user.id;
    if (q.search) where.content = { contains: q.search, mode: 'insensitive' };
    if (
      q.type &&
      ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'MATCHING'].includes(q.type)
    )
      where.type = q.type as QuestionType;
    if (q.difficulty && ['EASY', 'MEDIUM', 'HARD'].includes(q.difficulty))
      where.difficulty = q.difficulty as Difficulty;
    if (q.topic) where.topic = { contains: q.topic, mode: 'insensitive' };
    const [items, total] = await this.db.$transaction([
      this.db.question.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, fullName: true } },
          options: { orderBy: { position: 'asc' } },
          matchingPairs: { orderBy: { position: 'asc' } },
        },
      }),
      this.db.question.count({ where }),
    ]);
    return { items, total, page, limit, pageCount: Math.ceil(total / limit) };
  }
  async create(user: AuthRequest['user'], raw: unknown) {
    if (user.role !== 'TEACHER') throw new ForbiddenException();
    const d = schema.parse(raw);
    return this.db.$transaction(async (tx) =>
      tx.question.create({
        data: {
          authorId: user.id,
          type: d.type,
          content: d.content,
          explanation: d.explanation,
          difficulty: d.difficulty,
          topic: d.topic,
          options: {
            create: (d.options ?? []).map((x, position) => ({
              ...x,
              position,
            })),
          },
          matchingPairs: {
            create: (d.matchingPairs ?? []).map((x, position) => ({
              ...x,
              position,
            })),
          },
        },
        include: {
          options: { orderBy: { position: 'asc' } },
          matchingPairs: { orderBy: { position: 'asc' } },
        },
      }),
    );
  }
  async get(id: string, user: AuthRequest['user']) {
    await this.assertOwner(id, user);
    return this.db.question.findUnique({
      where: { id },
      include: {
        options: { orderBy: { position: 'asc' } },
        matchingPairs: { orderBy: { position: 'asc' } },
      },
    });
  }
  async update(id: string, user: AuthRequest['user'], raw: unknown) {
    const old = await this.assertOwner(id, user);
    if (old.archivedAt) throw new BadRequestException('Câu hỏi đã lưu trữ');
    const d = schema.parse(raw);
    return this.db.$transaction(async (tx) => {
      await tx.question.update({
        where: { id },
        data: {
          type: d.type,
          content: d.content,
          explanation: d.explanation,
          difficulty: d.difficulty,
          topic: d.topic,
        },
      });
      await tx.questionOption.deleteMany({ where: { questionId: id } });
      await tx.matchingPair.deleteMany({ where: { questionId: id } });
      return tx.question.update({
        where: { id },
        data: {
          options: {
            create: (d.options ?? []).map((x, position) => ({
              ...x,
              position,
            })),
          },
          matchingPairs: {
            create: (d.matchingPairs ?? []).map((x, position) => ({
              ...x,
              position,
            })),
          },
          updatedAt: new Date(),
        },
        include: {
          options: { orderBy: { position: 'asc' } },
          matchingPairs: { orderBy: { position: 'asc' } },
        },
      });
    });
  }
  async archive(id: string, user: AuthRequest['user']) {
    await this.assertOwner(id, user);
    return this.db.question.update({
      where: { id },
      data: { archivedAt: new Date() },
      select: { id: true, archivedAt: true },
    });
  }
  async duplicate(id: string, user: AuthRequest['user']) {
    const q = await this.get(id, user);
    return this.db.$transaction((tx) =>
      tx.question.create({
        data: {
          authorId: user.id,
          type: q!.type,
          content: q!.content + ' (bản sao)',
          explanation: q!.explanation,
          difficulty: q!.difficulty,
          topic: q!.topic,
          options: {
            create: q!.options.map(({ content, isCorrect }, position) => ({
              content,
              isCorrect,
              position,
            })),
          },
          matchingPairs: {
            create: q!.matchingPairs.map(
              ({ leftText, rightText }, position) => ({
                leftText,
                rightText,
                position,
              }),
            ),
          },
        },
        include: { options: true, matchingPairs: true },
      }),
    );
  }
  async statistics(user: AuthRequest['user']) {
    const where = { authorId: user.id, archivedAt: null };
    const [total, byType, byDifficulty] = await this.db.$transaction([
      this.db.question.count({ where }),
      this.db.question.groupBy({
        by: ['type'],
        where,
        orderBy: { type: 'asc' },
        _count: { _all: true },
      }),
      this.db.question.groupBy({
        by: ['difficulty'],
        where,
        orderBy: { difficulty: 'asc' },
        _count: { _all: true },
      }),
    ]);
    return { total, byType, byDifficulty };
  }
}
