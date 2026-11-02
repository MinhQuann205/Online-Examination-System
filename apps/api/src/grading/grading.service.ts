import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { z } from 'zod';
import { examSnapshotSchema } from '../exams/exam-snapshot';

const uuid = z.uuid();

export type GradeLine = {
  questionId: string;
  answer: Prisma.JsonValue;
  awarded: Prisma.Decimal;
  correct: boolean;
  answered: boolean;
};

export type GradeResult = {
  score: Prisma.Decimal;
  maxScore: Prisma.Decimal;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  lines: GradeLine[];
};

export function parseStudentAnswer(
  question: z.infer<typeof examSnapshotSchema>['questions'][number],
  raw: unknown,
) {
  if (question.type === 'SINGLE_CHOICE') {
    const value = z.object({ optionId: uuid }).parse(raw);
    if (!question.options.some((option) => option.id === value.optionId))
      throw new BadRequestException('Đáp án không thuộc câu hỏi');
    return value;
  }
  if (question.type === 'MULTIPLE_CHOICE') {
    const value = z
      .object({ optionIds: z.array(uuid).max(question.options.length) })
      .parse(raw);
    if (new Set(value.optionIds).size !== value.optionIds.length)
      throw new BadRequestException('Đáp án bị lặp');
    if (
      value.optionIds.some(
        (id) => !question.options.some((option) => option.id === id),
      )
    )
      throw new BadRequestException('Đáp án không thuộc câu hỏi');
    return value;
  }
  const value = z
    .object({
      pairs: z
        .array(z.object({ leftId: uuid, rightId: uuid }))
        .max(question.matchingPairs.length),
    })
    .parse(raw);
  if (
    new Set(value.pairs.map((pair) => pair.leftId)).size !==
      value.pairs.length ||
    new Set(value.pairs.map((pair) => pair.rightId)).size !== value.pairs.length
  )
    throw new BadRequestException('Không thể ghép lặp cặp');
  if (
    value.pairs.some(
      (pair) =>
        !question.matchingPairs.some((item) => item.id === pair.leftId) ||
        !question.matchingPairs.some((item) => item.rightId === pair.rightId),
    )
  )
    throw new BadRequestException('Cặp ghép không thuộc câu hỏi');
  return value;
}

function answerIsEmpty(
  question: z.infer<typeof examSnapshotSchema>['questions'][number],
  answer: unknown,
) {
  if (question.type === 'SINGLE_CHOICE') return false;
  if (question.type === 'MULTIPLE_CHOICE')
    return (answer as { optionIds: string[] }).optionIds.length === 0;
  return (answer as { pairs: unknown[] }).pairs.length === 0;
}

function isCorrect(
  question: z.infer<typeof examSnapshotSchema>['questions'][number],
  answer: unknown,
) {
  if (question.type === 'SINGLE_CHOICE') {
    const selected = answer as { optionId: string };
    return question.options.some(
      (option) => option.id === selected.optionId && option.isCorrect,
    );
  }
  if (question.type === 'MULTIPLE_CHOICE') {
    const selected = new Set((answer as { optionIds: string[] }).optionIds);
    const correct = new Set(
      question.options
        .filter((option) => option.isCorrect)
        .map((option) => option.id),
    );
    return (
      selected.size === correct.size &&
      [...correct].every((id) => selected.has(id))
    );
  }
  const selected = (answer as { pairs: { leftId: string; rightId: string }[] })
    .pairs;
  return (
    selected.length === question.matchingPairs.length &&
    question.matchingPairs.every((pair) =>
      selected.some(
        (choice) =>
          choice.leftId === pair.id && choice.rightId === pair.rightId,
      ),
    )
  );
}

@Injectable()
export class GradingService {
  grade(
    snapshotInput: unknown,
    savedAnswers: { questionId: string; answer: unknown }[],
  ): GradeResult {
    const snapshot = examSnapshotSchema.parse(snapshotInput);
    const answers = new Map(
      savedAnswers.map((row) => [row.questionId, row.answer]),
    );
    let scoreCents = 0;
    let maxCents = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;
    const lines = snapshot.questions.map((question) => {
      const max = Math.round(question.points * 100);
      maxCents += max;
      const stored = answers.get(question.questionId);
      const answer =
        stored === undefined ? null : parseStudentAnswer(question, stored);
      const answered = answer !== null && !answerIsEmpty(question, answer);
      const correct = answered && isCorrect(question, answer);
      const awardedCents = correct ? max : 0;
      scoreCents += awardedCents;
      if (correct) correctCount += 1;
      else if (answered) wrongCount += 1;
      else unansweredCount += 1;
      return {
        questionId: question.questionId,
        answer: (stored ?? Prisma.JsonNull) as Prisma.JsonValue,
        awarded: new Prisma.Decimal((awardedCents / 100).toFixed(2)),
        correct,
        answered,
      };
    });
    if (maxCents > 99_999_999)
      throw new BadRequestException('Tổng điểm vượt giới hạn lưu trữ');
    return {
      score: new Prisma.Decimal((scoreCents / 100).toFixed(2)),
      maxScore: new Prisma.Decimal((maxCents / 100).toFixed(2)),
      correctCount,
      wrongCount,
      unansweredCount,
      lines,
    };
  }
}
