import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { z } from 'zod';
import type { AuthRequest } from '../auth/auth.types';
import { examSnapshotSchema, publicSnapshot } from '../exams/exam-snapshot';
import { PrismaService } from '../prisma/prisma.service';
import { GradingService, parseStudentAnswer } from '../grading/grading.service';

type Actor = AuthRequest['user'];
type Tx = Prisma.TransactionClient;
type SafeAttempt = {
  id: string;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';
  version: number;
  snapshot: ReturnType<typeof publicSnapshot>;
  startedAt: Date;
  deadlineAt: Date | null;
  reviewQuestionIds: string[];
  submittedAt: Date | null;
  answers: Array<{
    questionId: string;
    answer: Prisma.JsonValue;
    revision: number;
  }>;
  exam: { id: string; title: string };
  closesAt: Date | null;
};

function calculateDeadline(
  startedAt: Date,
  snapshotInput: Prisma.JsonValue,
  closesAt: Date | null,
) {
  const snapshot = examSnapshotSchema.parse(snapshotInput);
  const durationDeadline = new Date(
    startedAt.getTime() + snapshot.durationMin * 60_000,
  );
  return closesAt && closesAt < durationDeadline ? closesAt : durationDeadline;
}

@Injectable()
export class ExamAttemptsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExamAttemptsService.name);
  private expiryTimer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly db: PrismaService,
    private readonly grading: GradingService,
  ) {}

  onModuleInit() {
    this.expiryTimer = setInterval(() => {
      void this.expireDueAttempts().catch(() =>
        this.logger.error('Attempt expiry scan failed'),
      );
    }, 15_000);
    this.expiryTimer.unref?.();
  }

  onModuleDestroy() {
    if (this.expiryTimer) clearInterval(this.expiryTimer);
  }

  private serialize(attempt: {
    id: string;
    status: 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';
    examVersion: number;
    examSnapshot: Prisma.JsonValue;
    startedAt: Date;
    deadlineAt: Date | null;
    submittedAt: Date | null;
    reviewQuestionIds: string[];
    answers: Array<{
      questionId: string;
      answer: Prisma.JsonValue;
      revision: number;
    }>;
  }) {
    const snapshot = examSnapshotSchema.parse(attempt.examSnapshot);
    return {
      id: attempt.id,
      status: attempt.status,
      version: attempt.examVersion,
      snapshot: publicSnapshot(snapshot),
      startedAt: attempt.startedAt,
      deadlineAt: attempt.deadlineAt,
      submittedAt: attempt.submittedAt,
      reviewQuestionIds: attempt.reviewQuestionIds,
      answers: attempt.answers.map((row) => ({
        questionId: row.questionId,
        answer: row.answer,
        revision: row.revision,
      })),
    };
  }

  private async load(id: string) {
    return this.db.examAttempt.findUnique({
      where: { id },
      include: {
        answers: {
          select: { questionId: true, answer: true, revision: true },
          orderBy: { createdAt: 'asc' },
        },
        assignment: { select: { closesAt: true } },
      },
    });
  }

  async start(assignmentId: string, actor: Actor) {
    if (actor.role !== 'STUDENT') throw new ForbiddenException();
    const result = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "ExamAssignment" WHERE "id" = ${assignmentId}::uuid FOR UPDATE`;
      const assignment = await tx.examAssignment.findUnique({
        where: { id: assignmentId },
        include: {
          exam: { select: { id: true, title: true, status: true } },
          examVersion: true,
          attempts: {
            where: { studentId: actor.id },
            orderBy: { startedAt: 'desc' },
          },
        },
      });
      if (!assignment) throw new NotFoundException('Không tìm thấy bài giao');
      const recipient =
        assignment.studentId === actor.id ||
        (assignment.classId !== null &&
          (await tx.classMember.findUnique({
            where: {
              classId_studentId: {
                classId: assignment.classId,
                studentId: actor.id,
              },
            },
            select: { id: true },
          })) !== null);
      if (!recipient) throw new ForbiddenException();
      const active = assignment.attempts.find(
        (item) => item.status === 'IN_PROGRESS',
      );
      if (active)
        return {
          id: active.id,
          shouldExpire: Boolean(
            active.deadlineAt && active.deadlineAt <= new Date(),
          ),
        };
      const now = new Date();
      if (assignment.opensAt && now < assignment.opensAt)
        throw new BadRequestException('Bài thi chưa đến giờ mở');
      if (assignment.closesAt && now >= assignment.closesAt)
        throw new BadRequestException('Bài thi đã đóng');
      if (assignment.attempts.length >= assignment.maxAttempts)
        throw new ConflictException('Bạn đã sử dụng hết số lượt làm bài');
      if (assignment.exam.status === 'ARCHIVED')
        throw new BadRequestException('Đề thi đã lưu trữ, không nhận lượt mới');
      const version = assignment.examVersion;
      if (
        !version ||
        version.examId !== assignment.examId ||
        version.publishedAt > now
      )
        throw new BadRequestException(
          'Bài giao chưa tham chiếu phiên bản đã phát hành hợp lệ',
        );
      const snapshot = examSnapshotSchema.parse(version.snapshot);
      const deadlineAt = new Date(
        now.getTime() + snapshot.durationMin * 60_000,
      );
      if (assignment.closesAt && assignment.closesAt < deadlineAt)
        deadlineAt.setTime(assignment.closesAt.getTime());
      const attempt = await tx.examAttempt.create({
        data: {
          assignmentId,
          examId: assignment.examId,
          examVersion: version.number,
          examVersionId: version.id,
          examSnapshot: snapshot as Prisma.InputJsonValue,
          studentId: actor.id,
          startedAt: now,
          deadlineAt,
        },
        include: {
          answers: {
            select: { questionId: true, answer: true, revision: true },
          },
        },
      });
      return { id: attempt.id, shouldExpire: false };
    });
    if (result.shouldExpire) await this.finalizeDueById(result.id);
    return this.get(result.id, actor);
  }

  async get(id: string, actor: Actor): Promise<SafeAttempt> {
    if (actor.role !== 'STUDENT') throw new ForbiddenException();
    let attempt = await this.load(id);
    if (!attempt) throw new NotFoundException('Không tìm thấy lượt làm bài');
    if (attempt.studentId !== actor.id) throw new ForbiddenException();
    if (attempt.status === 'IN_PROGRESS') {
      await this.finalizeDueById(id);
      attempt = await this.load(id);
      if (!attempt) throw new NotFoundException('Không tìm thấy lượt làm bài');
    }
    const safeAttempt = this.serialize(attempt);
    return {
      ...safeAttempt,
      exam: {
        id: attempt.examId,
        title: examSnapshotSchema.parse(attempt.examSnapshot).title,
      },
      closesAt: attempt.assignment.closesAt,
    };
  }

  async saveAnswer(id: string, questionId: string, actor: Actor, raw: unknown) {
    if (actor.role !== 'STUDENT') throw new ForbiddenException();
    const input = z
      .object({ revision: z.number().int().positive(), answer: z.unknown() })
      .parse(raw);
    const result = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "ExamAttempt" WHERE "id" = ${id}::uuid FOR UPDATE`;
      const attempt = await tx.examAttempt.findUnique({
        where: { id },
        include: {
          assignment: { select: { closesAt: true } },
          answers: true,
        },
      });
      if (!attempt) throw new NotFoundException('Không tìm thấy lượt làm bài');
      if (attempt.studentId !== actor.id) throw new ForbiddenException();
      if (attempt.status !== 'IN_PROGRESS')
        throw new ConflictException('Lượt làm bài đã kết thúc');
      const deadlineAt = await this.effectiveDeadline(tx, attempt);
      if (deadlineAt <= new Date()) {
        await this.finalizeLocked(tx, attempt, 'EXPIRED');
        return { expired: true as const };
      }
      const snapshot = examSnapshotSchema.parse(attempt.examSnapshot);
      const question = snapshot.questions.find(
        (item) => item.questionId === questionId,
      );
      if (!question)
        throw new NotFoundException('Câu hỏi không thuộc lượt thi');
      const parsed = parseStudentAnswer(question, input.answer);
      const existing = attempt.answers.find(
        (row) => row.questionId === questionId,
      );
      const previousRevision = existing?.revision ?? 0;
      if (input.revision <= previousRevision) {
        const sameAnswer =
          input.revision === previousRevision &&
          JSON.stringify(existing?.answer) === JSON.stringify(parsed);
        if (sameAnswer)
          return { expired: false as const, revision: previousRevision };
        throw new ConflictException(
          `Phiên bản đáp án hiện tại là ${previousRevision}`,
        );
      }
      if (input.revision !== previousRevision + 1)
        throw new ConflictException(
          `Phiên bản kế tiếp phải là ${previousRevision + 1}`,
        );
      if (existing) {
        await tx.attemptAnswer.update({
          where: { id: existing.id },
          data: {
            answer: parsed as Prisma.InputJsonValue,
            revision: input.revision,
          },
        });
      } else {
        await tx.attemptAnswer.create({
          data: {
            attemptId: id,
            questionId,
            answer: parsed as Prisma.InputJsonValue,
            revision: input.revision,
          },
        });
      }
      return { expired: false as const, revision: input.revision };
    });
    if (result.expired) return { saved: false, status: 'EXPIRED' };
    return { saved: true, revision: result.revision };
  }

  async setReview(id: string, questionId: string, actor: Actor, raw: unknown) {
    if (actor.role !== 'STUDENT') throw new ForbiddenException();
    const { marked } = z.object({ marked: z.boolean() }).parse(raw);
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "ExamAttempt" WHERE "id" = ${id}::uuid FOR UPDATE`;
      const attempt = await tx.examAttempt.findUnique({
        where: { id },
        include: { assignment: { select: { closesAt: true } }, answers: true },
      });
      if (!attempt) throw new NotFoundException();
      if (attempt.studentId !== actor.id) throw new ForbiddenException();
      if (attempt.status !== 'IN_PROGRESS')
        throw new ConflictException('Attempt has ended');
      const deadline = await this.effectiveDeadline(tx, attempt);
      if (deadline <= new Date()) {
        await this.finalizeLocked(tx, attempt, 'EXPIRED');
        return { saved: false, reviewQuestionIds: attempt.reviewQuestionIds };
      }
      if (
        !examSnapshotSchema
          .parse(attempt.examSnapshot)
          .questions.some((q) => q.questionId === questionId)
      )
        throw new BadRequestException('Question is not in this attempt');
      const ids = new Set(attempt.reviewQuestionIds);
      if (marked) ids.add(questionId);
      else ids.delete(questionId);
      const updated = await tx.examAttempt.update({
        where: { id },
        data: { reviewQuestionIds: [...ids] },
        select: { reviewQuestionIds: true },
      });
      return { saved: true, ...updated };
    });
  }

  async submit(id: string, actor: Actor) {
    if (actor.role !== 'STUDENT') throw new ForbiddenException();
    const status = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "ExamAttempt" WHERE "id" = ${id}::uuid FOR UPDATE`;
      const attempt = await tx.examAttempt.findUnique({
        where: { id },
        include: { answers: true, assignment: { select: { closesAt: true } } },
      });
      if (!attempt) throw new NotFoundException('Không tìm thấy lượt làm bài');
      if (attempt.studentId !== actor.id) throw new ForbiddenException();
      if (attempt.status !== 'IN_PROGRESS') return attempt.status;
      const deadlineAt = await this.effectiveDeadline(tx, attempt);
      const finalStatus = deadlineAt <= new Date() ? 'EXPIRED' : 'SUBMITTED';
      await this.finalizeLocked(tx, attempt, finalStatus);
      return finalStatus;
    });
    return this.get(id, actor).then((attempt) => ({ ...attempt, status }));
  }

  private async effectiveDeadline(
    tx: Tx,
    attempt: {
      id: string;
      startedAt: Date;
      examSnapshot: Prisma.JsonValue;
      deadlineAt: Date | null;
      assignment: { closesAt: Date | null };
    },
  ) {
    const derived = calculateDeadline(
      attempt.startedAt,
      attempt.examSnapshot,
      attempt.assignment.closesAt,
    );
    const deadlineAt =
      attempt.deadlineAt && attempt.deadlineAt < derived
        ? attempt.deadlineAt
        : derived;
    if (
      !attempt.deadlineAt ||
      deadlineAt.getTime() !== attempt.deadlineAt.getTime()
    ) {
      await tx.examAttempt.update({
        where: { id: attempt.id },
        data: { deadlineAt },
      });
      attempt.deadlineAt = deadlineAt;
    }
    return deadlineAt;
  }

  private async finalizeLocked(
    tx: Tx,
    attempt: Prisma.ExamAttemptGetPayload<{ include: { answers: true } }>,
    status: 'SUBMITTED' | 'EXPIRED',
  ) {
    const grade = this.grading.grade(
      attempt.examSnapshot,
      attempt.answers.map((answer) => ({
        questionId: answer.questionId,
        answer: answer.answer,
      })),
    );
    const savedQuestionIds = new Set(
      attempt.answers.map((answer) => answer.questionId),
    );
    for (const line of grade.lines) {
      if (!savedQuestionIds.has(line.questionId)) continue;
      await tx.attemptAnswer.updateMany({
        where: { attemptId: attempt.id, questionId: line.questionId },
        data: { awarded: line.awarded },
      });
    }
    await tx.examAttempt.updateMany({
      where: { id: attempt.id, status: 'IN_PROGRESS' },
      data: {
        status,
        submittedAt: new Date(),
        score: grade.score,
        maxScore: grade.maxScore,
      },
    });
  }

  private async finalizeDueById(id: string) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "ExamAttempt" WHERE "id" = ${id}::uuid FOR UPDATE`;
      const attempt = await tx.examAttempt.findUnique({
        where: { id },
        include: {
          answers: true,
          assignment: { select: { closesAt: true } },
        },
      });
      if (!attempt || attempt.status !== 'IN_PROGRESS') return false;
      const deadlineAt = await this.effectiveDeadline(tx, attempt);
      if (deadlineAt > new Date()) return false;
      await this.finalizeLocked(tx, attempt, 'EXPIRED');
      return true;
    });
  }

  async expireDueAttempts() {
    const due = await this.db.examAttempt.findMany({
      where: {
        status: 'IN_PROGRESS',
        OR: [{ deadlineAt: { lte: new Date() } }, { deadlineAt: null }],
      },
      select: { id: true },
      orderBy: { startedAt: 'asc' },
      take: 100,
    });
    for (const attempt of due) {
      try {
        await this.finalizeDueById(attempt.id);
      } catch {
        this.logger.error(`Failed to expire attempt ${attempt.id}`);
      }
    }
    return due.length;
  }
}
