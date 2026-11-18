import { questionInputSchema, validPointText } from '@exam/shared';
export { validLocalDateTime, validPointText } from '@exam/shared';
import { z } from 'zod';
import { normalizedEmailSchema } from '@exam/shared';

export function prepareQuestion(input: unknown) {
  const parsed = questionInputSchema.safeParse(input);
  if (parsed.success)
    return {
      ok: true as const,
      body: parsed.data,
      errors: {} as Record<string, string>,
    };
  return {
    ok: false as const,
    errors: Object.fromEntries(
      parsed.error.issues.map((issue) => [issue.path.join('.'), issue.message]),
    ),
  };
}

export function examAuthoringError({
  title,
  description,
  durationMin,
  order,
  points,
}: {
  title: string;
  description: string;
  durationMin: number;
  order: string[];
  points: Record<string, string>;
}) {
  if (title.trim().length < 2 || title.trim().length > 200)
    return 'Tên đề phải có từ 2 đến 200 ký tự.';
  if (description.trim().length > 5000) return 'Mô tả tối đa 5000 ký tự.';
  if (!Number.isInteger(durationMin) || durationMin < 1 || durationMin > 1440)
    return 'Thời lượng phải là số nguyên từ 1 đến 1440 phút.';
  if (
    order.length < 1 ||
    order.length > 200 ||
    new Set(order).size !== order.length
  )
    return 'Chọn từ 1 đến 200 câu hỏi khác nhau.';
  if (
    order.some((id) => !validPointText(points[id] ?? '')) ||
    order.reduce((sum, id) => sum + Math.round(Number(points[id]) * 100), 0) >
      99999999
  )
    return 'Điểm phải lớn hơn 0, tối đa hai chữ số thập phân và tổng không vượt 999999.99.';
  return null;
}

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  email: normalizedEmailSchema,
});
const newUserSchema = profileSchema.extend({
  role: z.enum(['STUDENT', 'TEACHER']),
  password: z.string().min(12).max(128),
});
const classSchema = z.object({
  name: z.string().trim().min(2).max(150),
  description: z.string().trim().max(2000),
  teacherId: z.uuid(),
});
const newClassSchema = classSchema.extend({
  code: z.string().trim().min(2).max(40),
});
function checked<T>(parsed: z.ZodSafeParseResult<T>, message: string): T {
  if (!parsed.success) throw new Error(message);
  return parsed.data;
}
export const prepareUserProfile = (input: unknown) =>
  checked(
    profileSchema.safeParse(input),
    'Kiểm tra email và họ tên (2–150 ký tự sau khi bỏ khoảng trắng).',
  );
export const prepareNewUser = (input: unknown) =>
  checked(
    newUserSchema.safeParse(input),
    'Kiểm tra email, họ tên (2–150 ký tự), vai trò và mật khẩu (12–128 ký tự).',
  );
export const prepareClass = (input: unknown, creating = false) =>
  creating
    ? checked(
        newClassSchema.safeParse(input),
        'Kiểm tra tên lớp (2–150), mã lớp (2–40), mô tả (tối đa 2000 ký tự) và giảng viên.',
      )
    : checked(
        classSchema.safeParse(input),
        'Kiểm tra tên lớp (2–150), mô tả (tối đa 2000 ký tự) và giảng viên.',
      );
