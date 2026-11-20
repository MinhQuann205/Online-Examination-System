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
import { snapshotStructure } from '../exams/exam-structure';
import { resultAssignmentScope } from '../results/result-scope';
import {
  historicalExamMetadata,
  historicalExamDescription,
} from '../exams/exam-metadata';

import {
  assignmentViewSchema,
  studentAssignmentView,
} from './student-assignment-view';

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
        {
          ...historicalExamMetadata(version.snapshot),
          description: historicalExamDescription(version.snapshot),
        },
      ]),
    );
    return items.map((item) => ({
      ...item,
      exam: {
        ...item.exam,
        ...((item.examVersion
          ? metadata.get(item.examVersion.id)
          : undefined) ?? {
          ...historicalExamMetadata(null),
          description: null,
        }),
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
        view: assignmentViewSchema.default('all'),
        operations: z.literal('true').optional(),
        scheduleOrder: z
          .enum(['recent', 'opening', 'closing'])
          .default('recent'),
        examId: z.uuid().optional(),
        examVersionId: z.uuid().optional(),
        classId: z.uuid().optional(),
        recipientKind: z.enum(['all', 'class', 'student']).default('all'),
        window: z.enum(['all', 'upcoming', 'open', 'closed']).default('all'),
        search: z.string().trim().max(200).optional(),
        page: z.coerce.number().int().min(1).default(1),
      })
      .parse(rawQuery);
    if (
      actor.role === 'STUDENT' &&
      (query.operations ||
        query.examVersionId ||
        query.classId ||
        query.recipientKind !== 'all' ||
        query.window !== 'all')
    )
      throw new ForbiddenException(
        'Bộ lọc quản lý dành cho giảng viên và quản trị viên',
      );
    if (query.classId && query.recipientKind === 'student')
      throw new BadRequestException('Bài giao cá nhân không có lớp nhận');
    const now = new Date();
    const managementFilters: Prisma.ExamAssignmentWhereInput[] = [];
    if (query.examVersionId)
      managementFilters.push({ examVersionId: query.examVersionId });
    if (query.classId) managementFilters.push({ classId: query.classId });
    if (query.recipientKind === 'class')
      managementFilters.push({ classId: { not: null } });
    if (query.recipientKind === 'student')
      managementFilters.push({ classId: null, studentId: { not: null } });
    if (query.window === 'upcoming')
      managementFilters.push({ opensAt: { gt: now } });
    if (query.window === 'closed')
      managementFilters.push({ closesAt: { lte: now } });
    if (query.window === 'open')
      managementFilters.push({
        AND: [
          { OR: [{ opensAt: null }, { opensAt: { lte: now } }] },
          { OR: [{ closesAt: null }, { closesAt: { gt: now } }] },
        ],
      });
    if (actor.role !== 'STUDENT' && query.view !== 'all')
      throw new ForbiddenException('Bộ lọc tiến độ này dành cho học viên');
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
      ...(actor.role === 'STUDENT' && query.view !== 'all'
        ? { AND: [studentAssignmentView(query.view, actor.id, now)] }
        : managementFilters.length
          ? { AND: managementFilters }
          : {}),
    };
    const readArgs = {
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
                  deadlineAt: true,
                },
                orderBy: { startedAt: 'desc' as const },
              },
            }
          : {}),
      },
      orderBy:
        query.scheduleOrder === 'opening'
          ? [{ opensAt: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }]
          : query.scheduleOrder === 'closing'
            ? [{ closesAt: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }]
            : [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (query.page - 1) * 20,
      take: 20,
    } satisfies Prisma.ExamAssignmentFindManyArgs;
    const { items, total, operationCounts } = query.operations
      ? await this.db.$transaction(
          async (tx) => {
            const items = await tx.examAssignment.findMany(readArgs),
              total = await tx.examAssignment.count({ where });
            const operationCounts = await Promise.all([
              tx.examAssignment.count({
                where: { AND: [where, { opensAt: { gt: now } }] },
              }),
              tx.examAssignment.count({
                where: {
                  AND: [
                    where,
                    {
                      AND: [
                        { OR: [{ opensAt: null }, { opensAt: { lte: now } }] },
                        { OR: [{ closesAt: null }, { closesAt: { gt: now } }] },
                      ],
                    },
                  ],
                },
              }),
              tx.examAssignment.count({
                where: { AND: [where, { closesAt: { lte: now } }] },
              }),
            ]);

            return { items, total, operationCounts };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
        )
      : await this.db
          .$transaction([
            this.db.examAssignment.findMany(readArgs),
            this.db.examAssignment.count({ where }),
          ])
          .then(([items, total]) => ({
            items,
            total,
            operationCounts: undefined,
          }));
    return {
      serverNow: now.toISOString(),
      ...(operationCounts
        ? {
            operations: {
              upcoming: operationCounts[0],
              open: operationCounts[1],
              closed: operationCounts[2],
              population: 'FILTERED_ASSIGNMENTS' as const,
            },
          }
        : {}),
      items: await this.withPinnedDuration(items),
      total,
      page: query.page,
      pageCount: Math.ceil(total / 20),
    };
  }

  private async prepareCreation(actor: AuthRequest['user'], raw: unknown) {
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
      select: { id: true, number: true, snapshot: true },
    });
    if (!examVersion)
      throw new BadRequestException('Đề thi chưa có phiên bản đã xuất bản');

    let recipient:
      { id: string; label: string; kind: 'class' | 'student' } | undefined;
    if (input.classId) {
      const classroom = await this.db.class.findUnique({
        where: { id: input.classId },
        select: {
          id: true,
          name: true,
          code: true,
          teacherId: true,
          isArchived: true,
        },
      });
      if (!classroom || classroom.isArchived)
        throw new NotFoundException('Không tìm thấy lớp đang hoạt động');
      if (actor.role === 'TEACHER' && classroom.teacherId !== actor.id)
        throw new ForbiddenException();
      recipient = {
        id: classroom.id,
        label: classroom.name + ' · ' + classroom.code,
        kind: 'class',
      };
    }
    if (input.studentId) {
      const student = await this.db.user.findUnique({
        where: { id: input.studentId },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          isActive: true,
        },
      });
      if (!student || student.role !== 'STUDENT' || !student.isActive)
        throw new BadRequestException('Học viên không hợp lệ');
      recipient = {
        id: student.id,
        label: student.fullName + ' · ' + student.email,
        kind: 'student',
      };
      if (actor.role === 'TEACHER') {
        const enrolled = await this.db.classMember.findFirst({
          where: { studentId: student.id, class: { teacherId: actor.id } },
          select: { id: true },
        });
        if (!enrolled) throw new ForbiddenException();
      }
    }

    return { input, exam, examVersion, recipient };
  }

  /** Read-only preparation: no assignment, attempt or scheduler write is performed. */
  async review(actor: AuthRequest['user'], raw: unknown) {
    if (actor.role !== 'TEACHER' && actor.role !== 'ADMIN')
      throw new ForbiddenException();
    const explicit = createSchema.parse(raw);
    if (!explicit.examVersionId)
      throw new BadRequestException(
        'Chọn đúng phiên bản đã xuất bản trước khi kiểm tra',
      );
    const { input, examVersion, recipient } = await this.prepareCreation(
      actor,
      explicit,
    );
    const structure = snapshotStructure(examVersion.snapshot),
      metadata = historicalExamMetadata(examVersion.snapshot);
    if (!structure || !metadata.metadataAvailable || !recipient)
      throw new BadRequestException('Snapshot hoặc người nhận không khả dụng');
    return {
      body: { ...input, examVersionId: examVersion.id },
      exam: {
        id: input.examId,
        title: metadata.title,
        versionId: examVersion.id,
        version: examVersion.number,
        ...structure,
      },
      recipient,
      checkedAt: new Date().toISOString(),
    };
  }

  async create(actor: AuthRequest['user'], raw: unknown) {
    const { input, exam, examVersion } = await this.prepareCreation(actor, raw);
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

  async progress(id: string, actor: AuthRequest['user']) {
    if (actor.role !== 'TEACHER' && actor.role !== 'ADMIN')
      throw new ForbiddenException();
    await this.authorize(id, actor);
    return this.db.$transaction(
      async (tx) => {
        const assignment = await tx.examAssignment.findFirst({
          where: { id, ...this.readScope(actor) },
          select: { classId: true, studentId: true },
        });
        if (!assignment) throw new ForbiddenException();
        const recipients: Prisma.UserWhereInput = {
          role: 'STUDENT',
          isActive: true,
          ...(assignment.classId
            ? { memberships: { some: { classId: assignment.classId } } }
            : {
                id:
                  assignment.studentId ??
                  '00000000-0000-4000-8000-000000000000',
              }),
        };
        const total = await tx.user.count({ where: recipients });
        const started = await tx.user.count({
          where: {
            AND: [recipients, { attempts: { some: { assignmentId: id } } }],
          },
        });
        const inProgress = await tx.user.count({
          where: {
            AND: [
              recipients,
              {
                attempts: { some: { assignmentId: id, status: 'IN_PROGRESS' } },
              },
            ],
          },
        });
        const groups = await tx.examAttempt.groupBy({
          by: ['status'],
          where: {
            assignmentId: id,
            assignment: { is: this.readScope(actor) },
          },
          _count: { _all: true },
        });
        const counts = new Map(
          groups.map((row) => [row.status, row._count._all]),
        );
        const active = counts.get('IN_PROGRESS') ?? 0,
          submitted = counts.get('SUBMITTED') ?? 0,
          expired = counts.get('EXPIRED') ?? 0;
        return {
          recipients: {
            total,
            notStarted: total - started,
            inProgress,
            completed: started - inProgress,
          },
          attempts: {
            total: active + submitted + expired,
            inProgress: active,
            submitted,
            expired,
            finalized: submitted + expired,
          },
          observedAt: new Date().toISOString(),
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }

  async studentsPage(id: string, actor: AuthRequest['user'], raw: unknown) {
    if (actor.role !== 'ADMIN' && actor.role !== 'TEACHER')
      throw new ForbiddenException();
    const q = z
      .object({
        paged: z.literal('true'),
        page: z.coerce.number().int().min(1).max(1000000).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        search: z.string().trim().max(150).optional(),
        status: z
          .enum(['all', 'not_started', 'in_progress', 'completed'])
          .default('all'),
      })
      .parse(raw);
    await this.authorize(id, actor);
    return this.db.$transaction(
      async (tx) => {
        const assignment = await tx.examAssignment.findFirst({
          where: { id, ...this.readScope(actor) },
          select: { classId: true, studentId: true },
        });
        if (!assignment) throw new ForbiddenException();
        const active = { assignmentId: id, status: 'IN_PROGRESS' as const };
        const activity: Prisma.UserWhereInput =
          q.status === 'not_started'
            ? { attempts: { none: { assignmentId: id } } }
            : q.status === 'in_progress'
              ? { attempts: { some: active } }
              : q.status === 'completed'
                ? {
                    AND: [
                      {
                        attempts: {
                          some: {
                            assignmentId: id,
                            status: { in: ['SUBMITTED', 'EXPIRED'] },
                          },
                        },
                      },
                      { attempts: { none: active } },
                    ],
                  }
                : {};
        const where: Prisma.UserWhereInput = {
          role: 'STUDENT',
          isActive: true,
          ...(assignment.classId
            ? { memberships: { some: { classId: assignment.classId } } }
            : {
                id:
                  assignment.studentId ??
                  '00000000-0000-4000-8000-000000000000',
              }),
          AND: [
            activity,
            ...(q.search
              ? [
                  {
                    OR: [
                      {
                        fullName: {
                          contains: q.search,
                          mode: 'insensitive' as const,
                        },
                      },
                      {
                        email: {
                          contains: q.search,
                          mode: 'insensitive' as const,
                        },
                      },
                    ],
                  },
                ]
              : []),
          ],
        };
        const total = await tx.user.count({ where }),
          pageCount = Math.ceil(total / q.limit),
          page = Math.min(q.page, Math.max(1, pageCount));
        const items = await tx.user.findMany({
          where,
          select: {
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
              orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
            },
          },
          orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
          skip: (page - 1) * q.limit,
          take: q.limit,
        });
        return { items, total, page, limit: q.limit, pageCount };
      },
      { isolationLevel: 'RepeatableRead' },
    );
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
