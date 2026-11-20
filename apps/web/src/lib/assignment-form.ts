import { z } from 'zod';
import { validLocalDateTime } from '@exam/shared';

const localTime = z
  .string()
  .refine(validLocalDateTime, 'Thời gian không hợp lệ.');
const fieldsSchema = z
  .object({
    examId: z.uuid('Hãy chọn đề thi hợp lệ.'),
    examVersionId: z.uuid('Hãy chọn phiên bản đã xuất bản.'),
    targetKind: z.enum(['class', 'student']),
    targetId: z.uuid('Hãy chọn người nhận hợp lệ.'),
    opensAt: localTime,
    closesAt: localTime,
    maxAttempts: z
      .string()
      .trim()
      .regex(/^\d+$/, 'Số lượt phải là số nguyên từ 1 đến 20.')
      .transform(Number)
      .pipe(z.number().int().min(1).max(20)),
    showScore: z.boolean(),
    showAnswers: z.boolean(),
  })
  .refine(
    (value) =>
      !value.opensAt ||
      !value.closesAt ||
      new Date(value.opensAt) < new Date(value.closesAt),
    {
      message: 'Thời gian đóng phải sau thời gian mở.',
      path: ['closesAt'],
    },
  );

// Resolve an explicit version before confirmation, including "latest".
// Options and URL hints do not replace backend authorization/validation.
export function prepareAssignment(
  fields: {
    examId: string;
    examVersionId: string;
    targetKind: 'class' | 'student';
    targetId: string;
    opensAt: string;
    closesAt: string;
    maxAttempts: string;
    showScore: boolean;
    showAnswers: boolean;
  },
  options: {
    exams: Array<{ id: string; title: string }>;
    versions: Array<{ id: string; number: number }>;
    targets: Array<{ id: string; label: string }>;
  },
) {
  const version = fields.examVersionId
    ? options.versions.find((item) => item.id === fields.examVersionId)
    : options.versions.reduce<{ id: string; number: number } | undefined>(
        (latest, item) =>
          !latest || item.number > latest.number ? item : latest,
        undefined,
      );
  const parsed = fieldsSchema.safeParse({
    ...fields,
    examVersionId: version?.id ?? '',
  });
  if (!parsed.success)
    return { ok: false as const, error: parsed.error.issues[0].message };
  const exam = options.exams.find((item) => item.id === parsed.data.examId);
  const target = options.targets.find(
    (item) => item.id === parsed.data.targetId,
  );
  if (!exam || !target || !version)
    return {
      ok: false as const,
      error:
        'Đề, phiên bản hoặc người nhận không còn khả dụng. Hãy tải lại danh sách.',
    };
  const value = parsed.data;
  return {
    ok: true as const,
    examTitle: exam.title,
    versionNumber: version.number,
    targetLabel: target.label,
    body: {
      examId: value.examId,
      examVersionId: value.examVersionId,
      ...(value.targetKind === 'class'
        ? { classId: value.targetId }
        : { studentId: value.targetId }),
      opensAt: value.opensAt ? new Date(value.opensAt).toISOString() : null,
      closesAt: value.closesAt ? new Date(value.closesAt).toISOString() : null,
      maxAttempts: value.maxAttempts,
      showScore: value.showScore,
      showAnswers: value.showAnswers,
    },
  };
}

export function assignmentWindow(
  opensAt: string | null,
  closesAt: string | null,
  now: number,
) {
  if (!now) return 'Đang kiểm tra lịch';
  if (closesAt && now >= Date.parse(closesAt)) return 'Đã đóng';
  if (opensAt && now < Date.parse(opensAt)) return 'Chưa mở';
  return 'Đang mở';
}

// In-progress attempts have no final score, including when stale fields exist.
export function finalAttemptScore(attempt: {
  status: string;
  score: string | null;
}) {
  return attempt.status === 'IN_PROGRESS'
    ? 'Chưa hoàn tất'
    : (attempt.score ?? 'Chưa có điểm');
}
