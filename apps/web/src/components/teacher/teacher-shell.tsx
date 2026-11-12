'use client';
import type { ReactNode } from 'react';
import type { CurrentUser } from '@exam/shared';
import {
  LayoutDashboard,
  BookOpen,
  Library,
  FileText,
  Send,
  BarChart3,
} from 'lucide-react';
import { WorkspaceShell } from '@/components/admin/admin-shell';
import './teacher.css';
const links = [
  { href: '/dashboard/teacher', label: 'Tổng quan', Icon: LayoutDashboard },
  { href: '/teacher/classes', label: 'Lớp học', Icon: BookOpen },
  { href: '/teacher/questions', label: 'Ngân hàng câu hỏi', Icon: Library },
  { href: '/teacher/exams', label: 'Đề thi', Icon: FileText },
  { href: '/teacher/assignments', label: 'Giao bài', Icon: Send },
  { href: '/teacher/results', label: 'Kết quả', Icon: BarChart3 },
];
export function TeacherShell(props: {
  children: ReactNode;
  initialUser?: CurrentUser;
}) {
  return <WorkspaceShell {...props} role="TEACHER" links={links} />;
}
