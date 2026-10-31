import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import type { AuthRequest } from '../auth/auth.types';
import {
  examSnapshotSchema,
  publicMatchingOptions,
} from '../exams/exam-snapshot';
import { PrismaService } from '../prisma/prisma.service';
import { resultAssignmentScope } from './result-scope';
import { z } from 'zod';
import { historicalExamMetadata } from '../exams/exam-metadata';

type Actor = AuthRequest['user'];

@Injectable()
export class ResultsService {
  constructor(private readonly db: PrismaService) {}

  async listStudent(actor: Actor, paging?: { skip: number; take: number }) {
    if (actor.role !== 'STUDENT') throw new ForbiddenException();
    const attempts = await this.db.examAttempt.findMany({
      where: { studentId: actor.id, status: { in: ['SUBMITTED', 'EXPIRED'] } },
      include: {
        exam: { select: { id: true, title: true } },
        assignment: { select: { showScore: true, showAnswers: true } },
      },
      orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
      ...(paging ?? {}),
    });
    return attempts.map((attempt) => ({
      id: attempt.id,
      exam: {
        id: attempt.exam.id,
        ...historicalExamMetadata(attempt.examSnapshot),
      },
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      score: attempt.assignment.showScore ? attempt.score : null,
      maxScore: attempt.assignment.showScore ? attempt.maxScore : null,
    }));
  }

  async listStudentPage(actor: Actor, query: unknown) {
    if (actor.role !== 'STUDENT') throw new ForbiddenException();
    const { page } = z
      .object({ page: z.coerce.number().int().positive().default(1) })
      .parse(query);
    const [items, total] = await Promise.all([
      this.listStudent(actor, { skip: (page - 1) * 20, take: 20 }),
      this.db.examAttempt.count({
        where: {
          studentId: actor.id,
          status: { in: ['SUBMITTED', 'EXPIRED'] },
        },
      }),
    ]);
    return { items, total, page, pageCount: Math.ceil(total / 20) };
  }

  async attempt(id: string, actor: Actor) {
    const identity = await this.db.examAttempt.findUnique({
      where: { id },
      select: { id: true, studentId: true, assignmentId: true },
    });
    if (!identity) throw new NotFoundException('Không tìm thấy kết quả');
    const isOwner = actor.role === 'STUDENT' && identity.studentId === actor.id;
    const isTeacher =
      actor.role === 'TEACHER' &&
      Boolean(
        await this.db.examAssignment.findFirst({
          where: { id: identity.assignmentId, ...resultAssignmentScope(actor) },
          select: { id: true },
        }),
      );
    if (!isOwner && !isTeacher && actor.role !== 'ADMIN')
      throw new ForbiddenException();
    const attempt = await this.db.examAttempt.findUnique({
      where: {
        id,
        ...(actor.role === 'TEACHER'
          ? { assignment: { is: resultAssignmentScope(actor) } }
          : actor.role === 'STUDENT'
            ? { studentId: actor.id }
            : {}),
      },
      include: {
        exam: { select: { id: true, title: true, authorId: true } },
        assignment: { select: { showScore: true, showAnswers: true } },
        answers: {
          select: { questionId: true, answer: true, awarded: true },
        },
      },
    });
    if (!attempt) throw new NotFoundException('Không tìm thấy kết quả');
    if (attempt.status === 'IN_PROGRESS')
      throw new BadRequestException('Lượt làm bài chưa hoàn tất');
    const snapshot = examSnapshotSchema.parse(attempt.examSnapshot);
    const answerMap = new Map(
      attempt.answers.map((row) => [row.questionId, row]),
    );
    const revealAnswers = !isOwner || attempt.assignment.showAnswers;
    const revealScore = !isOwner || attempt.assignment.showScore;
    const answeredCount = snapshot.questions.filter((question) => {
      const answer = answerMap.get(question.questionId)?.answer as
        | { optionId?: string; optionIds?: string[]; pairs?: unknown[] }
        | undefined;
      if (!answer) return false;
      if (question.type === 'SINGLE_CHOICE') return Boolean(answer.optionId);
      if (question.type === 'MULTIPLE_CHOICE')
        return Boolean(answer.optionIds?.length);
      return Boolean(answer.pairs?.length);
    }).length;
    const correctCount = attempt.answers.filter((answer) =>
      answer.awarded?.gt(0),
    ).length;
    return {
      id: attempt.id,
      status: attempt.status,
      exam: {
        id: attempt.exam.id,
        title: snapshot.title,
        durationMin: snapshot.durationMin,
      },
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      deadlineAt: attempt.deadlineAt,
      score: revealScore ? attempt.score : null,
      maxScore: revealScore ? attempt.maxScore : null,
      correctCount: revealScore ? correctCount : null,
      wrongCount: revealScore ? answeredCount - correctCount : null,
      unansweredCount: revealScore
        ? snapshot.questions.length - answeredCount
        : null,
      questions: snapshot.questions.map((question) => {
        const answer = answerMap.get(question.questionId);
        const base = {
          questionId: question.questionId,
          type: question.type,
          content: question.content,
          position: question.position,
          points: question.points,
          answer: answer?.answer ?? null,
          awarded: revealScore
            ? (answer?.awarded ?? new Prisma.Decimal(0))
            : null,
        };
        if (!revealAnswers)
          return {
            ...base,
            options: question.options.map(({ id, content }) => ({
              id,
              content,
            })),
            matchingPairs: question.matchingPairs.map(({ id, leftText }) => ({
              id,
              leftText,
            })),
            matchingOptions: publicMatchingOptions(question),
          };
        return {
          ...base,
          explanation: question.explanation,
          options: question.options,
          matchingPairs: question.matchingPairs,
          matchingOptions: question.matchingPairs.map(
            ({ rightId, rightText }) => ({ id: rightId, rightText }),
          ),
        };
      }),
    };
  }

  async exam(examId: string, actor: Actor) {
    if (actor.role !== 'TEACHER' && actor.role !== 'ADMIN')
      throw new ForbiddenException();
    const exam = await this.db.exam.findUnique({
      where: { id: examId },
      select: { id: true, title: true, authorId: true },
    });
    if (!exam) throw new NotFoundException('Không tìm thấy đề thi');
    const assignments = await this.db.examAssignment.findMany({
      where: { examId, ...resultAssignmentScope(actor) },
      include: {
        examVersion: { select: { id: true, number: true, snapshot: true } },
        class: {
          select: {
            id: true,
            name: true,
            members: {
              select: {
                student: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    isActive: true,
                  },
                },
              },
            },
          },
        },
        student: {
          select: { id: true, fullName: true, email: true, isActive: true },
        },
        attempts: {
          include: {
            student: {
              select: { id: true, fullName: true, email: true, isActive: true },
            },
          },
          orderBy: { startedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (
      actor.role === 'TEACHER' &&
      exam.authorId !== actor.id &&
      !assignments.length
    )
      throw new ForbiddenException();
    return {
      exam,
      assignments: assignments.map((assignment) => {
        const currentRecipients = assignment.class
          ? assignment.class.members.map(({ student }) => student)
          : assignment.student
            ? [assignment.student]
            : [];
        const currentIds = new Set(
          currentRecipients.map((student) => student.id),
        );
        const recipients = new Map(
          currentRecipients.map((student) => [student.id, student]),
        );
        for (const attempt of assignment.attempts) {
          if (attempt.status !== 'IN_PROGRESS')
            recipients.set(attempt.studentId, attempt.student);
        }
        const students = [...recipients.values()].map((student) => ({
          ...student,
          isCurrentRecipient: currentIds.has(student.id),
          attempts: assignment.attempts
            .filter((attempt) => attempt.studentId === student.id)
            .map((attempt) => ({
              id: attempt.id,
              exam: {
                id: attempt.examId,
                ...historicalExamMetadata(attempt.examSnapshot),
              },
              status: attempt.status,
              startedAt: attempt.startedAt,
              submittedAt: attempt.submittedAt,
              score: attempt.score,
              maxScore: attempt.maxScore,
            })),
        }));
        return {
          id: assignment.id,
          examVersion: assignment.examVersion
            ? {
                id: assignment.examVersion.id,
                number: assignment.examVersion.number,
                ...historicalExamMetadata(assignment.examVersion.snapshot),
              }
            : { id: null, number: null, ...historicalExamMetadata(null) },
          class: assignment.class
            ? { id: assignment.class.id, name: assignment.class.name }
            : null,
          student: assignment.student,
          opensAt: assignment.opensAt,
          closesAt: assignment.closesAt,
          maxAttempts: assignment.maxAttempts,
          students,
        };
      }),
    };
  }
}
