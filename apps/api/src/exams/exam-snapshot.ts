import { randomInt, randomUUID } from 'node:crypto';
import { z } from 'zod';

export const questionSnapshotSchema = z.object({
  id: z.uuid(),
  type: z.enum(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'MATCHING']),
  content: z.string(),
  explanation: z.string().nullable(),
  options: z.array(
    z.object({ id: z.uuid(), content: z.string(), isCorrect: z.boolean() }),
  ),
  matchingPairs: z.array(
    z.object({
      id: z.uuid(),
      leftText: z.string(),
      rightText: z.string(),
    }),
  ),
});

export const examSnapshotSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
  durationMin: z.number().int().positive(),
  questions: z
    .array(
      questionSnapshotSchema.extend({
        questionId: z.uuid(),
        position: z.number().int().nonnegative(),
        points: z.number().positive(),
        matchingPairs: z.array(
          z.object({
            id: z.uuid(),
            rightId: z.uuid(),
            leftText: z.string(),
            rightText: z.string(),
          }),
        ),
      }),
    )
    .min(1),
});

export type ExamSnapshot = z.infer<typeof examSnapshotSchema>;

export function snapshotQuestion(question: {
  id: string;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'MATCHING';
  content: string;
  explanation: string | null;
  options: { id: string; content: string; isCorrect: boolean }[];
  matchingPairs: { id: string; leftText: string; rightText: string }[];
}) {
  return {
    id: question.id,
    type: question.type,
    content: question.content,
    explanation: question.explanation,
    options: question.options.map(({ id, content, isCorrect }) => ({
      id,
      content,
      isCorrect,
    })),
    matchingPairs: question.matchingPairs.map(({ leftText, rightText }) => ({
      id: randomUUID(),
      rightId: randomUUID(),
      leftText,
      rightText,
    })),
  };
}

export function publicSnapshot(snapshot: ExamSnapshot) {
  return {
    title: snapshot.title,
    description: snapshot.description,
    durationMin: snapshot.durationMin,
    questions: snapshot.questions.map((question) => ({
      id: question.id,
      questionId: question.questionId,
      type: question.type,
      content: question.content,
      position: question.position,
      points: question.points,
      options: question.options.map(({ id, content }) => ({ id, content })),
      matchingPairs: question.matchingPairs.map(({ id, leftText }) => ({
        id,
        leftText,
      })),
      matchingOptions: publicMatchingOptions(question),
    })),
  };
}

export function publicMatchingOptions(
  question: ExamSnapshot['questions'][number],
) {
  const options = question.matchingPairs.map(({ rightId, rightText }) => ({
    id: rightId,
    rightText,
  }));
  for (let index = options.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [options[index], options[swapIndex]] = [options[swapIndex], options[index]];
  }
  return options;
}
