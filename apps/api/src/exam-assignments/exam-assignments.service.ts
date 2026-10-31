import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { z } from 'zod';
import type { AuthRequest } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { resultAssignmentScope } from '../results/result-scope';
import { historicalExamMetadata } from '../exams/exam-metadata';

const dateInput = z.string().datetime({ offset: true }).nullable().optional();
const createSchema = z
  .object({
    examId: z.uuid(),
    examVersionId: z.uuid().optional(),
    classId: z.uuid().optional(),
    studentId: z.uuid().optional(),
    opensAt: dateInput,
    closesAt: dateInput,
    maxAttempts: z.number().int().min(1).max(20).default(1),
    showScore: z.boolean().default(false),
    showAnswers: z.boolean().default(false),
  })
  .refine((value) => Boolean(value.classId) !== Boolean(value.studentId), {
    message: 'Chọn đúng một lớp hoặc một học viên',
  })
  .refine(
    (value) =>
      !value.opensAt ||
      !value.closesAt ||
      new Date(value.opensAt) < new Date(value.closesAt),
    { message: 'Thời gian đóng phải sau thời gian mở' },
  );

const patchSchema = z
  .object({
    opensAt: dateInput,
    closesAt: dateInput,
    maxAttempts: z.number().int().min(1).max(20).optional(),
    showScore: z.boolean().optional(),
    showAnswers: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: 'Cần ít nhất một trường cập nhật',
  });

const includeSummary = {
  exam: { select: { id: true, title: true, status: true, durationMin: true } },
  examVersion: { select: { id: true, number: true, publishedAt: true } },
  class: { select: { id: true, name: true, code: true } },
  student: { select: { id: true, fullName: true, email: true } },
  _count: { select: { attempts: true } },
} satisfies Prisma.ExamAssignmentInclude;

@Injectable()
export class ExamAssignmentsService {
  constructor(private readonly db: PrismaService) {}

  private readScope(
    actor: AuthRequest['user'],
  ): Prisma.ExamAssignmentWhereInput {
    return actor.role === 'STUDENT'
      ? {
          OR: [
            { studentId: actor.id },
            { class: { is: { members: { some: { studentId: actor.id } } } } },
          ],
        }
      : resultAssignmentScope(actor);
  }

  private summary(actor: AuthRequest['user']) {
    return {
      ...includeSummary,
      ...(actor.role === 'STUDENT'
        ? {
            // Student counts and attempts describe only their own activity.
            student: { select: { id: true, fullName: true, email: true } },
            _count: {
              select: { attempts: { where: { studentId: actor.id } } },
            },
          }
        : {}),
    } satisfies Prisma.ExamAssignmentInclude;
  }

  private async authorize(
    id: string,
    actor: AuthRequest['user'],
    db = this.db,
  ) {
    const assignment = await db.examAssignment.findFirst({
      where: { id, ...this.readScope(actor) },
      select: { id: true, createdById: true, classId: true, studentId: true },
    });
    if (assignment) return assignment;
    if (
      !(await db.examAssignment.findUnique({
        where: { id },
        select: { id: true },
      }))
    )
      throw new NotFoundException('Không tìm thấy bài giao');
    throw new ForbiddenException();
  }

  private async withPinnedDuration<
    T extends {
      examVersion: { id: string } | null;
      exam: { title: string; durationMin: number };
    },
  >(items: T[]) {
    const ids = [
      ...new Set(
        items.flatMap((item) =>
          item.examVersion ? [item.examVersion.id] : [],
        ),
      ),
    ];
    const versions = ids.length
      ? await this.db.examVersion.findMany({
          where: { id: { in: ids } },
          select: { id: true, snapshot: true },
        })
      : [];
    const metadata = new Map(
      versions.map((version) => [
        version.id,
        historicalExamMetadata(version.snapshot),
      ]),
    );
    return items.map((item) => ({
      ...item,
      exam: {
        ...item.exam,
        ...((item.examVersion
          ? metadata.get(item.examVersion.id)
          : undefined) ?? historicalExamMetadata(null)),
      },
    }));
  }

  private async owned(id: string, actor: AuthRequest['user']) {
    await this.authorize(id, actor);
    // Keep the scope on the actual sensitive query as well as the denial check.
    const assignment = await this.db.examAssignment.findFirst({
      where: { id, ...this.readScope(actor) },
      include: {
        ...this.summary(actor),
        attempts: {
          where: { studentId: actor.id },
          select: {
            id: true,
            status: true,
            startedAt: true,
            submittedAt: true,
          },
          orderBy: { startedAt: 'desc' },
        },
      },
    });
    if (!assignment) throw new ForbiddenException();
    return assignment;
  }

  async list(actor: AuthRequest['user'], rawQuery: unknown) {
    const query = z
      .object({
        examId: z.uuid().optional(),
        search: z.string().trim().max(200).optional(),
        page: z.coerce.number().int().min(1).default(1),
      })
      .parse(rawQuery);
    const where: Prisma.ExamAssignmentWhereInput = {
      ...(query.examId ? { examId: query.examId } : {}),
      ...(query.search
        ? {
            examVersion: {
              is: {
                snapshot: {
                  path: ['title'],
                  string_contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
            },
          }
        : {}),
      ...this.readScope(actor),
    };
    const [items, total] = await this.db.$transaction([
      this.db.examAssignment.findMany({
        where,
        include: {
          ...this.summary(actor),
          ...(actor.role === 'STUDENT'
            ? {
                attempts: {
                  where: { studentId: actor.id },
                  select: {
                    id: true,
                    status: true,
                    startedAt: true,
                    submittedAt: true,
                  },
                  orderBy: { startedAt: 'desc' as const },
                },
              }
            : {}),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * 20,
        take: 20,
      }),
      this.db.examAssignment.count({ where }),
    ]);
    return {
      items: await this.withPinnedDuration(items),
      total,
      page: query.page,
      pageCount: Math.ceil(total / 20),
    };
  }

  async create(actor: AuthRequest['user'], raw: unknown) {
    if (actor.role !== 'TEACHER' && actor.role !== 'ADMIN')
      throw new ForbiddenException();
    const input = createSchema.parse(raw);
    const exam = await this.db.exam.findUnique({
      where: { id: input.examId },
      select: { id: true, authorId: true, status: true, version: true },
    });
    if (!exam) throw new NotFoundException('Không tìm thấy đề thi');
    if (actor.role === 'TEACHER' && exam.authorId !== actor.id)
      throw new ForbiddenException();
    if (exam.status === 'ARCHIVED')
      throw new BadRequestException('Chỉ có thể giao đề đã xuất bản');
    const examVersion = await this.db.examVersion.findFirst({
      where: {
        examId: exam.id,
        publishedAt: { lte: new Date() },
        ...(input.examVersionId ? { id: input.examVersionId } : {}),
      },
      orderBy: [{ number: 'desc' }, { id: 'desc' }],
      select: { id: true },
    });
    if (!examVersion)
      throw new BadRequestException('Đề thi chưa có phiên bản đã xuất bản');

    if (input.classId) {
      const classroom = await this.db.class.findUnique({
        where: { id: input.classId },
        select: { id: true, teacherId: true, isArchived: true },
      });
      if (!classroom || classroom.isArchived)
        throw new NotFoundException('Không tìm thấy lớp đang hoạt động');
      if (actor.role === 'TEACHER' && classroom.teacherId !== actor.id)
        throw new ForbiddenException();
    }
    if (input.studentId) {
      const student = await this.db.user.findUnique({
        where: { id: input.studentId },
        select: { id: true, role: true, isActive: true },
      });
      if (!student || student.role !== 'STUDENT' || !student.isActive)
        throw new BadRequestException('Học viên không hợp lệ');
      if (actor.role === 'TEACHER') {
        const enrolled = await this.db.classMember.findFirst({
          where: { studentId: student.id, class: { teacherId: actor.id } },
          select: { id: true },
        });
        if (!enrolled) throw new ForbiddenException();
      }
    }

    const created = await this.db.examAssignment.create({
      data: {
        examId: exam.id,
        examVersionId: examVersion.id,
        classId: input.classId,
        studentId: input.studentId,
        createdById: actor.id,
        opensAt: input.opensAt ? new Date(input.opensAt) : null,
        closesAt: input.closesAt ? new Date(input.closesAt) : null,
        maxAttempts: input.maxAttempts,
        showScore: input.showScore,
        showAnswers: input.showAnswers,
      },
      include: includeSummary,
    });
    return (await this.withPinnedDuration([created]))[0];
  }

  async get(id: string, actor: AuthRequest['user']) {
    const assignment = await this.owned(id, actor);
    const { attempts, ...safeAssignment } = assignment;
    return (
      await this.withPinnedDuration([
        {
          ...safeAssignment,
          ...(actor.role === 'STUDENT' ? { attempts } : {}),
        },
      ])
    )[0];
  }

  async update(id: string, actor: AuthRequest['user'], raw: unknown) {
    if (actor.role !== 'TEACHER' && actor.role !== 'ADMIN')
      throw new ForbiddenException();
    const input = patchSchema.parse(raw);
    const updated = await this.db.$transaction(async (tx) => {
      // start() takes the same lock: a new attempt cannot race a schedule change.
      await tx.$queryRaw`SELECT "id" FROM "ExamAssignment" WHERE "id" = ${id}::uuid FOR UPDATE`;
      const assignment = await tx.examAssignment.findUnique({ where: { id } });
      if (!assignment) throw new NotFoundException();
      if (
        actor.role === 'TEACHER' &&
        (assignment.createdById !== actor.id ||
          !(await tx.examAssignment.findFirst({
            where: { id, ...resultAssignmentScope(actor) },
            select: { id: true },
          })))
      )
        throw new ForbiddenException();
      const opensAt =
        input.opensAt === undefined
          ? assignment.opensAt
          : input.opensAt
            ? new Date(input.opensAt)
            : null;
      const closesAt =
        input.closesAt === undefined
          ? assignment.closesAt
          : input.closesAt
            ? new Date(input.closesAt)
            : null;
      if (opensAt && closesAt && opensAt >= closesAt)
        throw new BadRequestException('Thời gian đóng phải sau thời gian mở');
      const scheduleChanged =
        opensAt?.getTime() !== assignment.opensAt?.getTime() ||
        closesAt?.getTime() !== assignment.closesAt?.getTime();
      if (
        scheduleChanged &&
        (await tx.examAttempt.count({
          where: { assignmentId: id, status: 'IN_PROGRESS' },
        }))
      )
        throw new ConflictException(
          'Không thể đổi lịch khi còn lượt đang làm bài',
        );
      return tx.examAssignment.update({
        where: { id },
        data: {
          opensAt,
          closesAt,
          maxAttempts: input.maxAttempts,
          showScore: input.showScore,
          showAnswers: input.showAnswers,
        },
        include: includeSummary,
      });
    });
    return (await this.withPinnedDuration([updated]))[0];
  }

  async students(id: string, actor: AuthRequest['user']) {
    if (actor.role !== 'TEACHER' && actor.role !== 'ADMIN')
      throw new ForbiddenException();
    const assignment = await this.authorize(id, actor);
    const studentSelect = {
      id: true,
      fullName: true,
      email: true,
      attempts: {
        where: { assignmentId: id },
        select: {
          id: true,
          status: true,
          startedAt: true,
          submittedAt: true,
          score: true,
        },
        orderBy: { startedAt: 'desc' as const },
      },
    } satisfies Prisma.UserSelect;
    const scoped = await this.db.examAssignment.findFirst({
      where: { id: assignment.id, ...this.readScope(actor) },
      select: {
        class: {
          select: {
            members: {
              where: { student: { isActive: true } },
              select: { student: { select: studentSelect } },
              orderBy: { student: { fullName: 'asc' } },
            },
          },
        },
        student: { select: studentSelect },
      },
    });
    if (!scoped) throw new ForbiddenException();
    return scoped.class
      ? scoped.class.members.map(({ student }) => student)
      : scoped.student
        ? [scoped.student]
        : [];
  }
}
