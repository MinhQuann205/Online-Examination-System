'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  BookOpen,
  GraduationCap,
  ClipboardList,
  ArrowUpRight,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AdminPageHeader, ErrorState } from './admin-ui';
const entries = [
  {
    href: '/admin/users',
    title: 'Người dùng',
    text: 'Tạo tài khoản, cập nhật hồ sơ và quản lý quyền truy cập.',
    Icon: Users,
  },
  {
    href: '/admin/classes',
    title: 'Lớp học',
    text: 'Phân công giảng viên và tổ chức danh sách học viên.',
    Icon: BookOpen,
  },
  {
    href: '/admin/exams',
    title: 'Theo dõi bài thi',
    text: 'Xem đề, phiên bản, bài giao và mở báo cáo kết quả.',
    Icon: ClipboardList,
  },
];
export function AdminDashboard() {
  const session = useQuery({ queryKey: ['me'], queryFn: api.me });
  const dashboard = useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: () => api.dashboard('admin'),
  });
  const users = useQuery({
    queryKey: ['admin-totals', 'users'],
    queryFn: () => api.users('limit=1'),
  });
  const students = useQuery({
    queryKey: ['admin-totals', 'students'],
    queryFn: () => api.users('role=STUDENT&limit=1'),
  });
  const classes = useQuery({
    queryKey: ['admin-totals', 'classes'],
    queryFn: () => api.classes('limit=1'),
  });
  const exams = useQuery({
    queryKey: ['admin-totals', 'exams'],
    queryFn: () => api.exams(),
  });
  const stats = [
    {
      title: 'Tài khoản',
      caption: 'Tất cả vai trò',
      query: users,
      Icon: Users,
      href: '/admin/users',
    },
    {
      title: 'Học viên',
      caption: 'Tài khoản học viên',
      query: students,
      Icon: GraduationCap,
      href: '/admin/users',
    },
    {
      title: 'Lớp học',
      caption: 'Chưa lưu trữ',
      query: classes,
      Icon: BookOpen,
      href: '/admin/classes',
    },
    {
      title: 'Đề thi',
      caption: 'Tất cả trạng thái',
      query: exams,
      Icon: ClipboardList,
      href: '/admin/exams',
    },
  ];
  return (
    <>
      <AdminPageHeader
        title={`Xin chào, ${session.data?.fullName || dashboard.data?.user.fullName || ''}`}
        description="Tổng quan công việc và dữ liệu quản trị của ExamSpace."
      >
        <Link href="/admin/users#tao-moi" className="admin-primary-link">
          <Plus size={18} /> Tạo tài khoản
        </Link>
      </AdminPageHeader>
      {dashboard.isPending && (
        <p role="status">Đang tải thông tin tài khoản...</p>
      )}
      {dashboard.error && (
        <ErrorState
          error={dashboard.error}
          retry={() => void dashboard.refetch()}
        />
      )}
      <section className="admin-stats-grid" aria-label="Tổng quan quản trị">
        {stats.map(({ title, caption, query, Icon, href }) => (
          <Card className="admin-stat" key={title}>
            <div>
              <span>{title}</span>
              <Icon size={22} aria-hidden="true" />
            </div>
            <strong>
              {query.isError ? '—' : query.isPending ? '…' : query.data.total}
            </strong>
            <p>{caption}</p>
            {query.isError ? (
              <div role="alert">
                <span>Không tải được số liệu.</span>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => void query.refetch()}
                >
                  Thử lại
                </Button>
              </div>
            ) : (
              <Link href={href}>
                Xem danh sách <ArrowUpRight size={16} />
              </Link>
            )}
          </Card>
        ))}
      </section>
      <div className="admin-section-title">
        <div>
          <span className="eyebrow">Lối tắt quản trị</span>
          <h2>Bắt đầu công việc của bạn</h2>
        </div>
      </div>
      <section className="admin-quick-grid" aria-label="Lối tắt quản trị">
        {entries.map(({ href, title, text, Icon }) => (
          <Link className="admin-quick-card" href={href} key={href}>
            <span className="admin-quick-icon">
              <Icon size={25} />
            </span>
            <h3>{title}</h3>
            <p>{text}</p>
            <span>
              Mở không gian <ArrowUpRight size={17} />
            </span>
          </Link>
        ))}
      </section>
      <Card className="admin-account-card">
        <div>
          <ShieldCheck size={25} aria-hidden="true" />
          <div>
            <h2>Thông tin tài khoản</h2>
            <p className="muted">
              Quyền quản trị được xác định bởi tài khoản đăng nhập.
            </p>
          </div>
        </div>
        <dl>
          <div>
            <dt>Họ và tên</dt>
            <dd>{session.data?.fullName}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{session.data?.email}</dd>
          </div>
          <div>
            <dt>Vai trò</dt>
            <dd>Quản trị viên</dd>
          </div>
          <div>
            <dt>Trạng thái kết nối</dt>
            <dd>
              {dashboard.isError
                ? 'Chưa xác nhận'
                : dashboard.isPending
                  ? 'Đang tải...'
                  : 'Đã kết nối'}
            </dd>
          </div>
        </dl>
      </Card>
    </>
  );
}
