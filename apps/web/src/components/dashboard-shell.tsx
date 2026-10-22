'use client';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import type { CurrentUser } from '@exam/shared';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const labels = {
  ADMIN: 'Quản trị viên',
  TEACHER: 'Giảng viên',
  STUDENT: 'Học viên',
};
const descriptions = {
  ADMIN: 'Quản lý hệ thống và tài khoản',
  TEACHER: 'Không gian giảng dạy',
  STUDENT: 'Không gian học tập',
};
const icons = { ADMIN: Users, TEACHER: BookOpen, STUDENT: GraduationCap };

export function DashboardShell({ initialUser }: { initialUser: CurrentUser }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: api.me,
    initialData: initialUser,
  });
  const role = user.role.toLowerCase() as Lowercase<CurrentUser['role']>;
  const { data: dashboard, error } = useQuery({
    queryKey: ['dashboard', role],
    queryFn: () => api.dashboard(role),
  });
  const Icon = icons[user.role];
  async function logout() {
    try {
      await api.logout();
    } finally {
      queryClient.clear();
      router.replace('/login');
      router.refresh();
    }
  }
  return (
    <div className="min-h-screen lg:flex">
      {menuOpen && (
        <button
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-label="Đóng menu"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200 bg-white p-5 transition-transform dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="mb-12 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xl font-bold">
            <span className="rounded-xl bg-blue-600 p-2 text-white">
              <GraduationCap size={23} />
            </span>{' '}
            ExamSpace
          </div>
          <Button
            variant="ghost"
            className="lg:hidden"
            onClick={() => setMenuOpen(false)}
            aria-label="Đóng menu"
          >
            <X size={20} />
          </Button>
        </div>
        <div className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Không gian làm việc
        </div>
        <nav aria-label="Điều hướng chính">
          <a
            href={`/dashboard/${role}`}
            className="flex items-center gap-3 rounded-lg bg-blue-50 px-3 py-3 text-sm font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300"
          >
            <LayoutDashboard size={18} /> Tổng quan
          </a>
        </nav>
        <div className="absolute bottom-5 left-5 right-5 border-t border-slate-200 pt-5 dark:border-slate-800">
          <p className="truncate text-sm font-semibold">{user.fullName}</p>
          <p className="truncate text-xs text-slate-500">{user.email}</p>
          <Button
            variant="ghost"
            className="mt-4 w-full justify-start"
            onClick={logout}
          >
            <LogOut size={17} /> Đăng xuất
          </Button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 dark:border-slate-800 dark:bg-slate-900 sm:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              className="lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Mở menu"
            >
              <Menu size={20} />
            </Button>
            <span className="text-sm font-medium text-slate-500">
              {labels[user.role]} / Tổng quan
            </span>
          </div>
          <Button
            variant="outline"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Đổi giao diện sáng tối"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </Button>
        </header>
        <main className="mx-auto max-w-5xl p-5 sm:p-8">
          <div className="mb-8">
            <p className="mb-2 text-sm font-semibold text-blue-600">
              {labels[user.role]}
            </p>
            <h1 className="text-3xl font-bold tracking-tight">
              Xin chào, {user.fullName}
            </h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              {descriptions[user.role]}
            </p>
          </div>
          {error ? (
            <Card className="p-6 text-red-600" role="alert">
              Không thể tải dữ liệu: {error.message}
            </Card>
          ) : (
            <Card className="p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-950">
                  <Icon size={25} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Thông tin tài khoản</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Dữ liệu đã xác thực từ API.
                  </p>
                </div>
              </div>
              <dl className="mt-7 grid gap-5 border-t border-slate-100 pt-6 dark:border-slate-800 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-slate-500">Họ và tên</dt>
                  <dd className="mt-1 font-medium">
                    {dashboard?.user.fullName || user.fullName}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">Email</dt>
                  <dd className="mt-1 font-medium">
                    {dashboard?.user.email || user.email}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">Vai trò</dt>
                  <dd className="mt-1 font-medium">{labels[user.role]}</dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">Trạng thái kết nối</dt>
                  <dd className="mt-1 font-medium text-emerald-600">
                    {dashboard ? 'Đã kết nối' : 'Đang tải...'}
                  </dd>
                </div>
              </dl>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
