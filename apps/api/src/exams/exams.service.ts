import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { z } from 'zod';
import type { AuthRequest } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { resultAssignmentScope } from '../results/result-scope';
import { examSnapshotSchema, snapshotQuestion } from './exam-snapshot';

const examInput = z
  .object({
    title: z.string().trim().min(2).max(200),
    description: z.string().trim().max(5000).nullable().optional(),
    durationMin: z.number().int().min(1).max(1440),
    questions: z
      .array(
        z.object({
          questionId: z.uuid(),
          points: z
            .number()
            .positive()
            .max(999999.99)
            .refine(
              (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-7,
              'Điểm chỉ được có tối đa hai chữ số thập phân',
            ),
        }),
      )
      .min(1)
      .max(200),
  })
  .refine(
    (value) =>
      new Set(value.questions.map((question) => question.questionId)).size ===
      value.questions.length,
    'Không được chọn câu hỏi trùng lặp',
  )
  .refine(
    (value) =>
      value.questions.reduce(
        (total, question) => total + Math.round(question.points * 100),
        0,
      ) <= 99_999_999,
    'Tổng điểm vượt giới hạn lưu trữ',
  );

const listQuery = z.object({
  results: z.enum(['true']).optional(),
  search: z.string().trim().max(200).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  page: z.coerce.number().int().positive().default(1),
});

@Injectable()
export class ExamsService {
  constructor(private readonly db: PrismaService) {}

  async list(actor: AuthRequest['user'], rawQuery: unknown) {
    const query = listQuery.parse(rawQuery);
    const where: Prisma.ExamWhereInput = {
      ...(actor.role === 'TEACHER'
        ? query.results
          ? {
              OR: [
                { authorId: actor.id },
                { assignments: { some: resultAssignmentScope(actor) } },
              ],
            }
          : { authorId: actor.id }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { title: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };
    const [items, total] = await this.db.$transaction([
      this.db.exam.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * 20,
        take: 20,
        include: {
          _count: {
            select: {
              assignments:
                actor.role === 'TEACHER'
                  ? { where: resultAssignmentScope(actor) }
                  : true,
              attempts:
                actor.role === 'TEACHER'
                  ? { where: { assignment: resultAssignmentScope(actor) } }
                  : true,
            },
          },
          versions: {
            select: { id: true, number: true, publishedAt: true },
            orderBy: { number: 'desc' },
          },
        },
      }),
      this.db.exam.count({ where }),
    ]);
    return { items, total, page: query.page, pageCount: Math.ceil(total / 20) };
  }

  private async owned(id: string, actor: AuthRequest['user']) {
    const exam = await this.db.exam.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { position: 'asc' },
        },
        versions: {
          select: { id: true, number: true, publishedAt: true },
          orderBy: { number: 'desc' },
        },
      },
    });
    if (!exam) throw new NotFoundException('Không tìm thấy đề thi');
    if (actor.role === 'TEACHER' && exam.authorId !== actor.id)
      throw new ForbiddenException('Bạn không có quyền truy cập đề thi này');
    return exam;
  }

  private async currentDraft(id: string, version: number) {
    return this.db.exam.findUniqueOrThrow({
      where: { id },
      include: {
        questions: {
          where: { version },
          orderBy: { position: 'asc' },
        },
        versions: {
          select: { id: true, number: true, publishedAt: true },
          orderBy: { number: 'desc' },
        },
      },
    });
  }

  private async prepare(
    input: z.infer<typeof examInput>,
    actor: AuthRequest['user'],
    version: number,
  ) {
    const ids = input.questions.map((question) => question.questionId);
    const sourceQuestions = await this.db.question.findMany({
      where: {
        id: { in: ids },
        archivedAt: null,
        ...(actor.role === 'TEACHER' ? { authorId: actor.id } : {}),
      },
      include: {
        options: { orderBy: { position: 'asc' } },
        matchingPairs: { orderBy: { position: 'asc' } },
      },
    });
    if (sourceQuestions.length !== ids.length)
      throw new BadRequestException(
        'Một hoặc nhiều câu hỏi không tồn tại, đã lưu trữ hoặc không thuộc quyền của bạn',
      );
    const byId = new Map(
      sourceQuestions.map((question) => [question.id, question]),
    );
    return input.questions.map((selected, position) => ({
      questionId: selected.questionId,
      version,
      position,
      points: new Prisma.Decimal(selected.points.toFixed(2)),
      questionSnapshot: snapshotQuestion(
        byId.get(selected.questionId)!,
      ) as Prisma.InputJsonValue,
    }));
  }

  private snapshot(exam: {
    title: string;
    description: string | null;
    durationMin: number;
    questions: Array<{
      questionId: string;
      position: number;
      points: Prisma.Decimal;
      questionSnapshot: Prisma.JsonValue;
    }>;
  }) {
    return examSnapshotSchema.parse({
      title: exam.title,
      description: exam.description,
      durationMin: exam.durationMin,
      questions: exam.questions.map((row) => ({
        ...(row.questionSnapshot as Record<string, unknown>),
        questionId: row.questionId,
        position: row.position,
        points: Number(row.points),
      })),
    });
  }

  async create(actor: AuthRequest['user'], raw: unknown) {
    if (actor.role !== 'TEACHER') throw new ForbiddenException();
    const input = examInput.parse(raw);
    const questions = await this.prepare(input, actor, 1);
    return this.db.exam.create({
      data: {
        authorId: actor.id,
        title: input.title,
        description: input.description,
        durationMin: input.durationMin,
        questions: { create: questions },
      },
      include: {
        questions: { where: { version: 1 }, orderBy: { position: 'asc' } },
      },
    });
  }

  async get(id: string, actor: AuthRequest['user']) {
    const exam = await this.owned(id, actor);
    const current = await this.currentDraft(id, exam.version);
    return { ...current, versions: exam.versions };
  }

  async update(id: string, actor: AuthRequest['user'], raw: unknown) {
    const exam = await this.owned(id, actor);
    if (exam.status !== 'DRAFT')
      throw new BadRequestException('Tạo phiên bản mới trước khi chỉnh sửa');
    const input = examInput.parse(raw);
    const questions = await this.prepare(input, actor, exam.version);
    return this.db.$transaction(async (tx) => {
      const changed = await tx.exam.updateMany({
        where: { id, status: 'DRAFT', version: exam.version },
        data: {
          title: input.title,
          description: input.description,
          durationMin: input.durationMin,
        },
      });
      if (changed.count !== 1)
        throw new BadRequestException('Đề thi đã được cập nhật đồng thời');
      await tx.examQuestion.deleteMany({
        where: { examId: id, version: exam.version },
      });
      return tx.exam.update({
        where: { id },
        data: { questions: { create: questions } },
        include: {
          questions: {
            where: { version: exam.version },
            orderBy: { position: 'asc' },
          },
        },
      });
    });
  }

  async preview(id: string, actor: AuthRequest['user']) {
    const exam = await this.owned(id, actor);
    if (exam.status === 'DRAFT') {
      const draft = await this.currentDraft(id, exam.version);
      return { draft: true, snapshot: this.snapshot(draft) };
    }
    const version = await this.db.examVersion.findFirst({
      where: { examId: id },
      orderBy: { number: 'desc' },
    });
    if (!version)
      throw new NotFoundException('Không tìm thấy phiên bản đề thi');
    return {
      draft: false,
      version: version.number,
      snapshot: examSnapshotSchema.parse(version.snapshot),
    };
  }

  async versions(id: string, actor: AuthRequest['user']) {
    await this.owned(id, actor);
    return this.db.examVersion.findMany({
      where: { examId: id, publishedAt: { lte: new Date() } },
      select: { id: true, number: true, publishedAt: true },
      orderBy: [{ number: 'desc' }, { id: 'desc' }],
    });
  }

  async publish(id: string, actor: AuthRequest['user']) {
    const exam = await this.owned(id, actor);
    if (exam.status !== 'DRAFT')
      throw new BadRequestException('Chỉ có thể xuất bản đề ở trạng thái nháp');
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Exam" WHERE "id" = ${id}::uuid FOR UPDATE`;
      const draft = await tx.exam.findUniqueOrThrow({
        where: { id },
        include: {
          questions: {
            where: { version: exam.version },
            orderBy: { position: 'asc' },
          },
        },
      });
      if (draft.status !== 'DRAFT' || draft.version !== exam.version)
        throw new BadRequestException('Đề thi đã được cập nhật đồng thời');
      const snapshot = this.snapshot(draft);
      const changed = await tx.exam.updateMany({
        where: { id, status: 'DRAFT', version: exam.version },
        data: { status: 'PUBLISHED' },
      });
      if (changed.count !== 1)
        throw new BadRequestException('Đề thi đã được cập nhật đồng thời');
      return tx.examVersion.create({
        data: {
          examId: id,
          number: exam.version,
          snapshot: snapshot as Prisma.InputJsonValue,
        },
      });
    });
  }

  async newVersion(id: string, actor: AuthRequest['user']) {
    const exam = await this.owned(id, actor);
    if (exam.status !== 'PUBLISHED')
      throw new BadRequestException(
        'Chỉ đề đã xuất bản mới tạo được phiên bản mới',
      );
    const updatedVersion = exam.version + 1;
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Exam" WHERE "id" = ${id}::uuid FOR UPDATE`;
      const published = await tx.exam.findUniqueOrThrow({
        where: { id },
        include: {
          questions: {
            where: { version: exam.version },
            orderBy: { position: 'asc' },
          },
        },
      });
      if (
        published.status !== 'PUBLISHED' ||
        published.version !== exam.version
      )
        throw new BadRequestException('Đề thi đã được cập nhật đồng thời');
      const changed = await tx.exam.updateMany({
        where: { id, status: 'PUBLISHED', version: exam.version },
        data: { status: 'DRAFT', version: updatedVersion },
      });
      if (changed.count !== 1)
        throw new BadRequestException('Đề thi đã được cập nhật đồng thời');
      await tx.examQuestion.createMany({
        data: published.questions.map((question) => ({
          examId: id,
          questionId: question.questionId,
          version: updatedVersion,
          position: question.position,
          points: question.points,
          questionSnapshot: question.questionSnapshot as Prisma.InputJsonValue,
        })),
      });
      return tx.exam.findUniqueOrThrow({
        where: { id },
        include: {
          questions: {
            where: { version: updatedVersion },
            orderBy: { position: 'asc' },
          },
        },
      });
    });
  }

  async archive(id: string, actor: AuthRequest['user']) {
    await this.owned(id, actor);
    return this.db.exam.update({
      where: { id },
      data: { status: 'ARCHIVED' },
      select: { id: true, status: true },
    });
  }
}
