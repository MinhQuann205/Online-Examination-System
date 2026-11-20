import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { z } from 'zod';
import { questionInputSchema } from '@exam/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthRequest } from '../auth/auth.types';
import { listPaginationSchema } from '../common/list-pagination';
const schema = questionInputSchema;
const filterSchema = listPaginationSchema.extend({
  search: z.string().trim().max(150).optional(),
  type: z.enum(['', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'MATCHING']).optional(),
  difficulty: z.enum(['', 'EASY', 'MEDIUM', 'HARD']).optional(),
  topic: z.string().trim().max(120).optional(),
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
    if (user.role !== 'TEACHER' && user.role !== 'ADMIN')
      throw new ForbiddenException();
    const { page, limit, search, type, difficulty, topic } =
      filterSchema.parse(q);
    const where: Prisma.QuestionWhereInput = { archivedAt: null };
    if (user.role === 'TEACHER') where.authorId = user.id;
    if (search) where.content = { contains: search, mode: 'insensitive' };
    if (type) where.type = type;
    if (difficulty) where.difficulty = difficulty;
    if (topic) where.topic = { contains: topic, mode: 'insensitive' };
    const [items, total] = await this.db.$transaction([
      this.db.question.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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
