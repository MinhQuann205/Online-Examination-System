import { z } from 'zod';

const selectionSchema = z
  .object({ examId: z.uuid().optional(), examVersionId: z.uuid().optional() })
  .refine((value) => !value.examVersionId || Boolean(value.examId));
export type AssignmentIntent = {
  examId?: string;
  examVersionId?: string;
  invalid?: boolean;
};
export function readAssignmentIntent(
  query: Record<string, string | string[] | undefined>,
): AssignmentIntent {
  const result = selectionSchema.safeParse({
    examId: query.examId,
    examVersionId: query.examVersionId,
  });
  return result.success
    ? {
        ...(result.data.examId ? { examId: result.data.examId } : {}),
        ...(result.data.examVersionId
          ? { examVersionId: result.data.examVersionId }
          : {}),
      }
    : { invalid: true };
}
// Navigation hints only. The form verifies allowed options and the API authorizes/pins again.
export function assignmentHref(
  examId: string,
  examVersionId: string,
): string | null {
  const result = selectionSchema.safeParse({ examId, examVersionId });
  return result.success
    ? '/teacher/assignments?' +
        new URLSearchParams({ examId, examVersionId }).toString()
    : null;
}
