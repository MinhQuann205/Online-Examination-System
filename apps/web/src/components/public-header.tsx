'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Brand } from './brand';
import { ThemeToggle } from './theme-toggle';
import { LogoutDialog } from './logout-dialog';
const labels = {
  ADMIN: 'Quản trị viên',
  TEACHER: 'Giảng viên',
  STUDENT: 'Học viên',
};

export function PublicHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const account = useQuery({
    queryKey: ['me'],
    queryFn: api.me,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        document.getElementById('public-menu-button')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  const user = account.data;
  const unavailable =
    account.isError &&
    !(account.error instanceof ApiError && account.error.status === 401);
  return (
    <header className="public-header">
      <div className="public-header-inner">
        <Brand />
        <button
          id="public-menu-button"
          type="button"
          className="icon-button mobile-menu"
          aria-label={open ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={open}
          aria-controls="public-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
        <nav
          id="public-navigation"
          className={`public-navigation ${open ? 'is-open' : ''}`}
          aria-label="Điều hướng chính"
        >
          <Link
            href="/"
            aria-current={pathname === '/' ? 'page' : undefined}
            onClick={() => setOpen(false)}
          >
            Trang chủ
          </Link>
          <Link href="/#chuc-nang" onClick={() => setOpen(false)}>
            Chức năng
          </Link>
          <Link href="/#huong-dan" onClick={() => setOpen(false)}>
            Hướng dẫn
          </Link>
          <div className="account-navigation">
            {account.isPending ? (
              <span className="muted" role="status">
                Đang kiểm tra tài khoản...
              </span>
            ) : user && !account.isError ? (
              <>
                <span className="account-identity">
                  <strong>{user.fullName}</strong>
                  <small>{labels[user.role]}</small>
                </span>
                <Link
                  href={`/dashboard/${user.role.toLowerCase()}`}
                  className="public-workspace"
                  onClick={() => setOpen(false)}
                >
                  Không gian làm việc <ArrowUpRight size={16} />
                </Link>
                <LogoutDialog />
              </>
            ) : unavailable ? (
              <span className="account-unavailable" role="status">
                Chưa kiểm tra được tài khoản.{' '}
                <button type="button" onClick={() => void account.refetch()}>
                  Thử lại
                </button>
              </span>
            ) : (
              <Link
                href="/login"
                className="public-workspace"
                aria-current={pathname === '/login' ? 'page' : undefined}
              >
                Đăng nhập <ArrowUpRight size={16} />
              </Link>
            )}
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}
