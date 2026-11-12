import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Check,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  Layers3,
  ShieldCheck,
} from 'lucide-react';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';
import { RolePortalCard } from '@/components/role-portal-card';

export default function HomePage() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      <PublicHeader />
      <main id="main-content">
        <section className="landing-hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <GraduationIcon /> Không gian thi trực tuyến
            </span>
            <h1>
              Mỗi bài kiểm tra.
              <br />
              <span>Một bước tiến mới.</span>
            </h1>
            <p>
              Một nơi để giảng viên xây dựng đề thi, học viên tập trung làm bài
              và nhà trường theo dõi kết quả.
            </p>
            <div className="hero-actions">
              <Link href="#vai-tro" className="primary-link">
                Khám phá không gian của bạn <ArrowRight size={18} />
              </Link>
              <Link href="#chuc-nang" className="secondary-link">
                Tìm hiểu ExamSpace
              </Link>
            </div>
            <div className="hero-assurance">
              <span>
                <Check size={16} /> Ba dạng câu hỏi
              </span>
              <span>
                <Check size={16} /> Lưu câu trả lời
              </span>
              <span>
                <Check size={16} /> Chấm điểm trên máy chủ
              </span>
            </div>
          </div>
          <div
            className="hero-illustration"
            aria-label="Quy trình kiểm tra trên ExamSpace"
          >
            <div className="illustration-heading">
              <span className="illustration-icon">
                <ClipboardCheck size={26} />
              </span>
              <div>
                <span className="eyebrow">Từ chuẩn bị đến kết quả</span>
                <h2>Một quy trình liền mạch</h2>
              </div>
            </div>
            <ol className="workflow-steps">
              <li>
                <span>01</span>
                <div>
                  <strong>Soạn & phát hành</strong>
                  <p>Chọn câu hỏi, sắp xếp thứ tự và phân bổ điểm.</p>
                </div>
                <FileCheck2 size={21} />
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>Giao & làm bài</strong>
                  <p>Giao đúng đối tượng, làm bài trong thời hạn.</p>
                </div>
                <Clock3 size={21} />
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>Chấm & xem kết quả</strong>
                  <p>Kết quả theo phiên bản đề đã được giao.</p>
                </div>
                <Check size={21} />
              </li>
            </ol>
            <div className="illustration-note">
              <ShieldCheck size={20} />
              <p>Đề đã phát hành được giữ theo phiên bản.</p>
            </div>
          </div>
        </section>
        <section className="landing-section" id="vai-tro">
          <div className="section-heading">
            <span className="eyebrow">Dành cho mọi vai trò</span>
            <h2>Chọn không gian của bạn</h2>
            <p>Cùng một hệ thống, công cụ phù hợp với từng công việc.</p>
          </div>
          <div className="role-grid">
            <RolePortalCard role="student" />
            <RolePortalCard role="teacher" />
            <RolePortalCard role="admin" />
          </div>
        </section>
        <section className="feature-section" id="chuc-nang">
          <div className="landing-section">
            <div className="section-heading">
              <span className="eyebrow">Công cụ thiết thực</span>
              <h2>Chuẩn bị kỹ. Làm bài tập trung.</h2>
              <p>Các chức năng đang có trên ExamSpace.</p>
            </div>
            <div className="feature-grid">
              {[
                {
                  Icon: BookOpen,
                  title: 'Ngân hàng câu hỏi',
                  text: 'Câu hỏi một lựa chọn, nhiều lựa chọn và ghép nối. Tìm kiếm, chỉnh sửa và tái sử dụng khi soạn đề.',
                },
                {
                  Icon: Layers3,
                  title: 'Đề thi có phiên bản',
                  text: 'Xem trước, phát hành và chọn phiên bản khi giao bài. Nội dung đã giao được giữ theo snapshot.',
                },
                {
                  Icon: ClipboardCheck,
                  title: 'Làm bài & xem kết quả',
                  text: 'Lưu câu trả lời, đánh dấu xem lại và nộp bài. Xem điểm, đáp án theo chính sách của bài được giao.',
                },
              ].map(({ Icon, title, text }) => (
                <article key={title}>
                  <span className="feature-icon">
                    <Icon size={25} />
                  </span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="landing-section guide-section" id="huong-dan">
          <div className="section-heading">
            <span className="eyebrow">Trước khi bắt đầu</span>
            <h2>Sẵn sàng cho bài kiểm tra</h2>
            <p>Một vài lưu ý để việc làm bài được liền mạch.</p>
            <Link className="text-link" href="/login">
              Đăng nhập để tiếp tục <ArrowRight size={17} />
            </Link>
          </div>
          <div className="guide-list">
            <article>
              <span>01</span>
              <div>
                <h3>Sử dụng tài khoản được cấp</h3>
                <p>
                  Liên hệ quản trị viên hoặc giảng viên phụ trách nếu bạn cần
                  tài khoản hay hỗ trợ truy cập.
                </p>
              </div>
            </article>
            <article>
              <span>02</span>
              <div>
                <h3>Kiểm tra bài được giao</h3>
                <p>
                  Đọc thời gian mở, đóng và số lượt cho phép trước khi bắt đầu.
                  Thời hạn làm bài do máy chủ quyết định.
                </p>
              </div>
            </article>
            <article>
              <span>03</span>
              <div>
                <h3>Theo dõi trạng thái lưu</h3>
                <p>
                  Giữ kết nối, kiểm tra thông báo lưu và xử lý lỗi trước khi rời
                  trang. Xác nhận nộp bài khi đã sẵn sàng.
                </p>
              </div>
            </article>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
function GraduationIcon() {
  return <BookOpen size={16} aria-hidden="true" />;
}
