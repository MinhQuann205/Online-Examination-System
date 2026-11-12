import {
  BookOpen,
  CheckCircle2,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';
import { PublicHeader } from './public-header';
import { PublicFooter } from './public-footer';
export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#login-content">
        Đến nội dung đăng nhập
      </a>
      <PublicHeader />
      <main className="auth-layout" id="login-content">
        <section className="auth-story" aria-labelledby="auth-story-title">
          <span className="eyebrow">
            <ShieldCheck size={16} aria-hidden="true" /> Một tài khoản, đúng
            không gian
          </span>
          <h1 id="auth-story-title">
            Kết nối việc dạy,
            <br />
            <span>học và đánh giá.</span>
          </h1>
          <p>
            Truy cập ExamSpace bằng tài khoản được cấp. Không gian làm việc được
            xác định theo vai trò của tài khoản.
          </p>
          <div className="auth-story-note">
            <ShieldCheck size={25} aria-hidden="true" />
            <div>
              <strong>Quyền truy cập theo tài khoản</strong>
              <p>
                Đề thi, lớp học và kết quả được kiểm tra quyền truy cập trên máy
                chủ.
              </p>
            </div>
          </div>
          <div className="auth-role-summary">
            {[
              [
                GraduationCap,
                'Học viên',
                'Làm bài và theo dõi kết quả cá nhân.',
              ],
              [BookOpen, 'Giảng viên', 'Soạn đề, giao bài và xem báo cáo lớp.'],
              [
                CheckCircle2,
                'Quản trị viên',
                'Quản lý tài khoản, lớp học và bài thi.',
              ],
            ].map(([Icon, title, text]) => {
              const Component = Icon as typeof GraduationCap;
              return (
                <div key={String(title)}>
                  <Component size={22} aria-hidden="true" />
                  <p>
                    <strong>{String(title)}</strong>
                    <span>{String(text)}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </section>
        <section className="auth-form-region" aria-label="Đăng nhập tài khoản">
          {children}
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
