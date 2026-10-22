import { z } from 'zod';

export const roles = ['ADMIN', 'TEACHER', 'STUDENT'] as const;
export type Role = (typeof roles)[number];

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12).max(128),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}
