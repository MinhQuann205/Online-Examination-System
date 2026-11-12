'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CurrentUser } from '@exam/shared';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  Menu,
  X,
  ArrowUpRight,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { ContextualBackButton } from '@/components/back-navigation';
import { Brand } from '@/components/brand';
import { ThemeToggle } from '@/components/theme-toggle';
import { LogoutDialog } from '@/components/logout-dialog';
import { ErrorState } from './admin-ui';
import './admin.css';
const navigation = [
  { href: '/dashboard/admin', label: 'Tổng quan', Icon: LayoutDashboard },
  { href: '/admin/users', label: 'Người dùng', Icon: Users },
  { href: '/admin/classes', label: 'Lớp học', Icon: BookOpen },
  { href: '/admin/exams', label: 'Theo dõi bài thi', Icon: ClipboardList },
];
export function WorkspaceShell({
  children,
  initialUser,
  role = 'ADMIN',
  links = navigation,
}: {
  children: ReactNode;
  initialUser?: CurrentUser;
  role?: 'ADMIN' | 'TEACHER' | 'STUDENT';
  links?: typeof navigation;
}) {
  const teacher = role === 'TEACHER';
  const student = role === 'STUDENT';
  const space = student ? 'học tập' : teacher ? 'giảng dạy' : 'quản trị';
  const router = useRouter(),
    pathname = usePathname();
  const session = useQuery({
    queryKey: ['me'],
    queryFn: api.me,
    initialData: initialUser,
    retry: false,
    staleTime: 0,
  });
  const [open, setOpen] = useState(false),
    [wide, setWide] = useState(false);
  const sidebar = useRef<HTMLElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    restoreFocus = useRef(false);
  useEffect(() => {
    const media = matchMedia('(min-width: 1024px)');
    const update = () => {
      setWide(media.matches);
      if (media.matches) setOpen(false);
    };
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (session.error instanceof ApiError && session.error.status === 401)
      router.replace('/login');
    else if (session.data && !session.isError && session.data.role !== role)
      router.replace(`/dashboard/${session.data.role.toLowerCase()}`);
  }, [session.error, session.data, session.isError, router, role]);
  function close() {
    restoreFocus.current = true;
    setOpen(false);
  }
  useEffect(() => {
    if (!open || wide) {
      if (restoreFocus.current) {
        if (!wide) trigger.current?.focus();
        restoreFocus.current = false;
      }
      return;
    }
    const area = sidebar.current;
    let focusFrame: number;
    const focusVisibleMenu = () => {
      if (!area?.isConnected) return;
      const target = area?.querySelector<HTMLButtonElement>('button');
      // Hidden CSS surfaces cannot receive focus, including during style transitions.
      if (
        target &&
        getComputedStyle(target).visibility === 'visible' &&
        target.getClientRects().length
      ) {
        target.focus();
      } else {
        focusFrame = requestAnimationFrame(focusVisibleMenu);
      }
    };
    focusFrame = requestAnimationFrame(focusVisibleMenu);
    const key = (event: KeyboardEvent) => {
      if (document.querySelector('dialog[open]')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        restoreFocus.current = true;
        setOpen(false);
      }
      if (event.key === 'Tab') {
        const items = [
          ...(area?.querySelectorAll<HTMLElement>(
            'a[href],button:not(:disabled),[tabindex="0"]',
          ) || []),
        ].filter((item) => item.getClientRects().length);
        if (!items.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (!area?.contains(document.activeElement)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', key);
    return () => {
      cancelAnimationFrame(focusFrame);
      window.removeEventListener('keydown', key);
    };
  }, [open, wide]);
  if (session.isPending)
    return (
      <main className="admin-auth-state" role="status">
        Đang xác thực phiên...
      </main>
    );
  if (session.isError)
    return (
      <main className="admin-auth-state">
        <h1>Chưa xác thực được phiên</h1>
        <ErrorState
          error={session.error}
          retry={() => void session.refetch()}
        />
        <Link href="/login">Về trang đăng nhập</Link>
      </main>
    );
  if (session.data.role !== role)
    return (
      <main className="admin-auth-state" role="status">
        Đang chuyển đến không gian phù hợp...
      </main>
    );
  const navigationPath =
    teacher &&
    (pathname.startsWith('/teacher/results') || pathname.endsWith('/results'))
      ? '/teacher/results'
      : role === 'ADMIN' && pathname.startsWith('/admin/results/')
        ? '/admin/exams'
        : pathname;
  const title =
    links.find(
      (item) =>
        item.href === navigationPath ||
        (!item.href.startsWith('/dashboard/') &&
          navigationPath.startsWith(item.href + '/')),
    )?.label || (student ? 'Học tập' : teacher ? 'Giảng dạy' : 'Quản trị');
  return (
    <div
      className={`admin-workspace ${student ? 'student-workspace' : teacher ? 'teacher-workspace' : ''}`}
    >
      <a href="#admin-content" className="skip-link">
        Đến nội dung {space}
      </a>
      {open && !wide && (
        <button
          className="admin-backdrop"
          tabIndex={-1}
          aria-label="Đóng menu nền"
          onClick={close}
        />
      )}
      <aside
        ref={sidebar}
        id="admin-sidebar-navigation"
        className={`admin-sidebar ${open ? 'is-open' : ''}`}
        role={open && !wide ? 'dialog' : undefined}
        aria-modal={open && !wide ? true : undefined}
        aria-label={`Điều hướng ${space}`}
      >
        <div className="admin-sidebar-brand">
          <Brand />
          <button
            className="icon-button admin-menu-toggle"
            aria-label="Đóng menu"
            onClick={close}
          >
            <X size={20} />
          </button>
        </div>
        <p className="admin-nav-caption">
          {student
            ? 'KHÔNG GIAN HỌC TẬP'
            : teacher
              ? 'KHÔNG GIAN GIẢNG DẠY'
              : 'QUẢN TRỊ HỆ THỐNG'}
        </p>
        <nav aria-label="Điều hướng chính">
          {links.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={
                navigationPath === href ||
                (!href.startsWith('/dashboard/') &&
                  navigationPath.startsWith(href + '/'))
                  ? 'page'
                  : undefined
              }
              onClick={close}
            >
              <Icon size={20} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-note">
          <BookOpen size={20} aria-hidden="true" />
          <p>
            <strong>
              {student
                ? 'Học tập, từng bước vững vàng.'
                : 'Tổ chức thi, từ đầu đến cuối.'}
            </strong>
            <span>
              {student
                ? 'Theo dõi lớp học, làm bài được giao và xem kết quả của chính bạn.'
                : teacher
                  ? 'Soạn câu hỏi, xuất bản đề và giao bài đúng phiên bản cho lớp của bạn.'
                  : 'Quản lý tài khoản, lớp học và theo dõi kết quả trong một không gian.'}
            </span>
          </p>
        </div>
        <div className="admin-sidebar-account">
          <div className="admin-avatar" aria-hidden="true">
            {session.data.fullName.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <strong>{session.data.fullName}</strong>
            <span>{session.data.email}</span>
          </div>
          <LogoutDialog />
        </div>
      </aside>
      <div className="admin-main-column" inert={open && !wide}>
        <header className="admin-topbar">
          <div>
            <button
              ref={trigger}
              className="icon-button admin-menu-toggle"
              aria-label="Mở menu"
              aria-expanded={open}
              aria-controls="admin-sidebar-navigation"
              onClick={() => setOpen(true)}
            >
              <Menu size={21} />
            </button>
            <span>
              {student ? 'Học tập' : teacher ? 'Giảng dạy' : 'Quản trị'}{' '}
              <span aria-hidden="true">/</span> <strong>{title}</strong>
            </span>
          </div>
          <div>
            <span className="admin-role">
              {student ? 'Học viên' : teacher ? 'Giảng viên' : 'Quản trị viên'}
            </span>
            <ThemeToggle />
            <Link href="/" className="admin-home-link">
              Trang chủ <ArrowUpRight size={16} />
            </Link>
          </div>
        </header>
        <main id="admin-content" className="admin-content">
          <div id="admin-navigation-content">{children}</div>
          <ContextualBackButton role={role} />
        </main>
        <footer className="admin-footer">
          <span>ExamSpace · Không gian {space}</span>
          <span>Dữ liệu theo quyền truy cập tài khoản</span>
        </footer>
      </div>
    </div>
  );
}

export function AdminShell(props: {
  children: ReactNode;
  initialUser?: CurrentUser;
}) {
  return <WorkspaceShell {...props} />;
}
