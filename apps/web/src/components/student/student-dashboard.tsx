'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, ClipboardList, BarChart3, ArrowUpRight } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import {
  StudentHeading,
  ErrorState,
  EmptyState,
  useStudentSessionError,
  displayDate,
} from './student-ui';
const cards = [
  {
    title: 'Lớp học của tôi',
    href: '/student/classes',
    Icon: BookOpen,
    load: () => api.classes('page=1'),
    description: 'Lớp bạn đang là thành viên.',
  },
  {
    title: 'Bài thi được giao',
    href: '/student/exams',
    Icon: ClipboardList,
    load: () => api.examAssignments('page=1'),
    description: 'Bài giao cá nhân và theo lớp bạn được phép xem.',
  },
  {
    title: 'Lượt làm đã hoàn tất',
    href: '/student/results',
    Icon: BarChart3,
    load: () => api.studentResultsPage(1),
    description: 'Các lượt đã nộp hoặc hết giờ của bạn.',
  },
];
function Stat({ item }: { item: (typeof cards)[number] }) {
  const q = useQuery({
    queryKey: ['student-total', item.href],
    queryFn: item.load,
    staleTime: 0,
    gcTime: 0,
  });
  useStudentSessionError(q.error);
  return (
    <Card className="admin-stat">
      <div>
        {item.title}
        <item.Icon size={23} aria-hidden="true" />
      </div>
      {q.isError ? (
        <ErrorState error={q.error} retry={() => void q.refetch()} />
      ) : (
        <strong aria-live="polite">{q.isPending ? '…' : q.data.total}</strong>
      )}
      <p>{item.description}</p>
      <Link href={item.href}>
        Mở danh sách <ArrowUpRight size={16} />
      </Link>
    </Card>
  );
}
export function StudentDashboard() {
  const me = useQuery({ queryKey: ['me'], queryFn: api.me });
  const dashboard = useQuery({
    queryKey: ['dashboard', 'student'],
    queryFn: () => api.dashboard('student'),
    staleTime: 0,
    gcTime: 0,
  });
  const recent = useQuery({
    queryKey: ['student-recent-assignments'],
    queryFn: () => api.examAssignments('page=1'),
    staleTime: 0,
    gcTime: 0,
  });
  useStudentSessionError(dashboard.error || recent.error);
  return (
    <div className="student-page">
      <StudentHeading
        title={'Xin chào, ' + (me.data?.fullName ?? 'học viên')}
        description="Theo dõi lớp học, chuẩn bị bài được giao và xem lại kết quả của bạn."
      />
      {dashboard.isError && (
        <ErrorState
          error={dashboard.error}
          retry={() => void dashboard.refetch()}
        />
      )}
      <section className="student-stats-grid" aria-label="Tổng quan học tập">
        {cards.map((item) => (
          <Stat key={item.href} item={item} />
        ))}
      </section>
      <Card className="student-welcome">
        <div>
          <p className="eyebrow">SẴN SÀNG CHO BÀI KIỂM TRA TIẾP THEO</p>
          <h2>Mỗi bài làm, một bước tiến</h2>
          <p>
            Kiểm tra thời gian mở, hạn đóng và số lượt còn lại trước khi bắt
            đầu. Khi đã vào phòng thi, theo dõi trạng thái lưu và nộp bài trên
            hệ thống.
          </p>
          <Link className="admin-primary-link" href="/student/exams">
            Xem bài thi được giao <ArrowUpRight size={18} />
          </Link>
        </div>
        <ol>
          <li>
            <b>01</b> Chọn đúng bài được giao
          </li>
          <li>
            <b>02</b> Làm bài và kiểm tra trạng thái lưu
          </li>
          <li>
            <b>03</b> Nộp bài, xem kết quả theo công bố
          </li>
        </ol>
      </Card>
      <Card className="student-panel">
        <div className="student-section-heading">
          <div>
            <h2>Bài giao gần đây</h2>
            <p className="muted">
              Tối đa 3 bài mới nhất trong phạm vi bạn được xem.
            </p>
          </div>
          <Link href="/student/exams">Xem tất cả</Link>
        </div>
        {recent.isError ? (
          <ErrorState
            error={recent.error}
            retry={() => void recent.refetch()}
          />
        ) : recent.isPending ? (
          <p role="status">Đang tải bài giao...</p>
        ) : recent.data.items.length === 0 ? (
          <EmptyState title="Chưa có bài kiểm tra được giao." />
        ) : (
          <ul className="student-recent">
            {recent.data.items.slice(0, 3).map((item) => (
              <li key={item.id}>
                <div>
                  <h3>{item.exam.title}</h3>
                  <p>
                    {item.class?.name ?? 'Bài giao cá nhân'} ·{' '}
                    {item.examVersion
                      ? 'Phiên bản ' + item.examVersion.number
                      : 'Chưa có phiên bản khả dụng'}
                  </p>
                  <p>Hạn đóng: {displayDate(item.closesAt)}</p>
                </div>
                <Link href="/student/exams">
                  Xem bài giao <ArrowUpRight size={16} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <section className="student-quick-grid" aria-label="Lối tắt học tập">
        {cards.map((item) => (
          <Link className="admin-quick-card" key={item.href} href={item.href}>
            <item.Icon className="admin-quick-icon" size={36} />
            <h2>{item.title}</h2>
            <p>{item.description}</p>
            <span>
              Tiếp tục <ArrowUpRight size={16} />
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
