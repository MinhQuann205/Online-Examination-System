import Link from 'next/link';
import {
  ArrowRight,
  Check,
  GraduationCap,
  NotebookPen,
  ShieldCheck,
} from 'lucide-react';
const roles = {
  student: {
    title: 'Học viên',
    subtitle: 'Học tập & đánh giá',
    Icon: GraduationCap,
    description:
      'Tập trung vào từng câu hỏi, theo dõi bài được giao và xem lại kết quả của chính bạn.',
    items: [
      'Làm bài được giao cho lớp hoặc cá nhân',
      'Lưu câu trả lời và tiếp tục lượt đang làm',
      'Xem kết quả theo chính sách công bố',
    ],
  },
  teacher: {
    title: 'Giảng viên',
    subtitle: 'Giảng dạy & tổ chức thi',
    Icon: NotebookPen,
    description:
      'Từ ngân hàng câu hỏi đến một bài kiểm tra hoàn chỉnh, trong cùng một không gian.',
    items: [
      'Soạn đề và quản lý phiên bản đã phát hành',
      'Giao bài theo lớp hoặc từng học viên',
      'Theo dõi kết quả trong phạm vi phụ trách',
    ],
  },
  admin: {
    title: 'Quản trị viên',
    subtitle: 'Quản lý & điều phối',
    Icon: ShieldCheck,
    description:
      'Quản lý tài khoản, lớp học và theo dõi hoạt động kiểm tra trên hệ thống.',
    items: [
      'Quản lý trạng thái và thông tin tài khoản',
      'Tổ chức lớp và phân công giảng viên',
      'Theo dõi bài thi và báo cáo kết quả',
    ],
  },
};
export function RolePortalCard({ role }: { role: keyof typeof roles }) {
  const data = roles[role],
    Icon = data.Icon;
  return (
    <article className={`role-card role-${role}`}>
      <div className="role-card-top">
        <span className="role-icon">
          <Icon size={27} aria-hidden="true" />
        </span>
        <span className="role-eyebrow">{data.subtitle}</span>
      </div>
      <h3>{data.title}</h3>
      <p>{data.description}</p>
      <ul>
        {data.items.map((item) => (
          <li key={item}>
            <Check size={17} aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <Link className="role-card-link" href={`/login?role=${role}`}>
        Cổng {data.title.toLowerCase()}
        <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </article>
  );
}
