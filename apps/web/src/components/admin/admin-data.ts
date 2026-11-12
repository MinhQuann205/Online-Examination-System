import { api, type ExamAssignment } from '@/lib/api';
export type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  memberships?: Array<{
    classId: string;
    class: { name: string; code: string };
  }>;
};
export type AdminClass = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  teacherId: string;
  teacher: { id: string; fullName: string; email: string };
  _count?: { members: number };
  members?: Array<{
    id: string;
    studentId: string;
    student: { id: string; fullName: string; email: string };
  }>;
};
export type AdminExam = {
  id: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  version: number;
  durationMin: number;
  _count: { assignments: number; attempts: number };
  versions: Array<{ id: string; number: number; publishedAt: string }>;
};
export type Page<T> = { items: T[]; total: number; pageCount: number };
export const loadUsers = async (query: string) =>
  (await api.users(query)) as unknown as Page<AdminUser>;
export const loadUser = async (id: string) =>
  (await api.user(id)) as unknown as AdminUser;
export const loadClasses = async (query: string) =>
  (await api.classes(query)) as unknown as Page<AdminClass>;
export const loadClass = async (id: string) =>
  (await api.classDetail(id)) as unknown as AdminClass;
export const loadExams = async (query: string) =>
  (await api.exams(query)) as Page<AdminExam>;
export const roleLabel = {
  ADMIN: 'Quản trị viên',
  TEACHER: 'Giảng viên',
  STUDENT: 'Học viên',
};
export type { ExamAssignment };
