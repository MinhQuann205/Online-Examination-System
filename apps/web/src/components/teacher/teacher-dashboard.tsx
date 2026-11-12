'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Library, FileText, Send, ArrowUpRight } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { TeacherHeading, ErrorState } from './teacher-ui';
const cards = [
  {
    title: 'Lớp phụ trách',
    href: '/teacher/classes',
    Icon: BookOpen,
    load: () => api.classes('page=1'),
    description: 'Lớp đang thuộc phạm vi quản lý.',
  },
  {
    title: 'Câu hỏi của bạn',
    href: '/teacher/questions',
    Icon: Library,
    load: () => api.questions('page=1'),
    description: 'Câu hỏi chưa lưu trữ trong ngân hàng.',
  },
  {
    title: 'Đề thi của bạn',
    href: '/teacher/exams',
    Icon: FileText,
    load: () => api.exams('page=1'),
    description: 'Bản nháp, đã xuất bản và đã lưu trữ.',
  },
  {
    title: 'Bài giao trong phạm vi',
    href: '/teacher/assignments',
    Icon: Send,
    load: () => api.examAssignments('page=1'),
    description: 'Bài giao được backend cho phép đọc.',
  },
];
function Stat({ item }: { item: (typeof cards)[number] }) {
  const q = useQuery({
    queryKey: ['teacher-total', item.href],
    queryFn: item.load,
  });
  return (
    <Card className="admin-stat">
      <div>
        {item.title}
        <item.Icon size={23} />
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
export function TeacherDashboard() {
  const dashboard = useQuery({
    queryKey: ['dashboard', 'teacher'],
    queryFn: () => api.dashboard('teacher'),
    retry: false,
  });
  const me = useQuery({ queryKey: ['me'], queryFn: api.me });
  return (
    <>
      <TeacherHeading
        title={'Xin chào, ' + (me.data?.fullName ?? 'giảng viên')}
        description="Từ ngân hàng câu hỏi đến một bài kiểm tra sẵn sàng cho lớp học."
      />
      {dashboard.isError && (
        <ErrorState
          error={dashboard.error}
          retry={() => void dashboard.refetch()}
        />
      )}
      <section className="admin-stats-grid" aria-label="Tổng quan giảng dạy">
        {cards.map((item) => (
          <Stat key={item.href} item={item} />
        ))}
      </section>
      <Card className="teacher-welcome">
        <div>
          <p className="eyebrow">MỘT QUY TRÌNH, ĐỦ TỪNG BƯỚC</p>
          <h2>Chuẩn bị bài kiểm tra tiếp theo</h2>
          <p>
            Soạn câu hỏi → xây bản nháp → xuất bản → chọn phiên bản và giao bài.
            Xuất bản đề chưa tự động giao cho học viên.
          </p>
          <Link className="admin-primary-link" href="/teacher/exams/new">
            Soạn đề thi mới <ArrowUpRight size={18} />
          </Link>
        </div>
        <ol>
          <li>
            <b>01</b> Xây ngân hàng ba dạng câu hỏi
          </li>
          <li>
            <b>02</b> Sắp thứ tự và kiểm tra tổng điểm
          </li>
          <li>
            <b>03</b> Giao đúng phiên bản, đúng lớp
          </li>
        </ol>
      </Card>
      <section className="teacher-quick-grid" aria-label="Thao tác nhanh">
        {cards.map((item) => (
          <Link className="admin-quick-card" key={item.href} href={item.href}>
            <item.Icon className="admin-quick-icon" size={44} />
            <h2>{item.title}</h2>
            <p>{item.description}</p>
            <span>
              Tiếp tục <ArrowUpRight size={16} />
            </span>
          </Link>
        ))}
      </section>
    </>
  );
}
