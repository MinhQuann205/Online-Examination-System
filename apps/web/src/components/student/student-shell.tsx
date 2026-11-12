'use client';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import type { CurrentUser } from '@exam/shared';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  BarChart3,
} from 'lucide-react';
import { WorkspaceShell } from '@/components/admin/admin-shell';
import './student.css';
const links = [
  { href: '/dashboard/student', label: 'Tổng quan', Icon: LayoutDashboard },
  { href: '/student/classes', label: 'Lớp học của tôi', Icon: BookOpen },
  { href: '/student/exams', label: 'Bài thi được giao', Icon: ClipboardList },
  { href: '/student/results', label: 'Kết quả của tôi', Icon: BarChart3 },
];
export function StudentShell(props: {
  children: ReactNode;
  initialUser?: CurrentUser;
}) {
  const pathname = usePathname();
  // The active exam retains its isolated workspace and existing leave guards.
  if (pathname.startsWith('/student/attempts/')) return props.children;
  return <WorkspaceShell {...props} role="STUDENT" links={links} />;
}
