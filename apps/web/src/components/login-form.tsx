'use client';
import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@exam/shared';
import {
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  BookOpen,
  ShieldCheck,
} from 'lucide-react';
import { checkExamBeforeLogout } from '@/lib/exam-session-guard';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthPageShell } from './auth-page-shell';

const subscribeReady = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
const roles = [
  { id: 'student', name: 'Học viên', Icon: GraduationCap },
  { id: 'teacher', name: 'Giảng viên', Icon: BookOpen },
  { id: 'admin', name: 'Quản trị viên', Icon: ShieldCheck },
];
export function LoginForm({
  initialRole = 'student',
}: {
  initialRole?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const account = useQuery({
    queryKey: ['me'],
    queryFn: api.me,
    retry: false,
    staleTime: 0,
  });
  const [selected, setSelected] = useState(initialRole);
  const [visible, setVisible] = useState(false);
  const [serverError, setServerError] = useState('');
  const ready = useSyncExternalStore(subscribeReady, clientReady, serverReady);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const onSubmit = handleSubmit(async (values) => {
    setServerError('');
    try {
      const blocked = await checkExamBeforeLogout();
      if (blocked) {
        setServerError(blocked);
        return;
      }
      await queryClient.cancelQueries();
      queryClient.clear();
      const user = await api.login(values.email, values.password);
      queryClient.clear();
      router.replace(`/dashboard/${user.role.toLowerCase()}`);
      router.refresh();
    } catch (error) {
      setServerError(
        error instanceof ApiError
          ? error.status === 401
            ? 'Email hoặc mật khẩu không đúng, hoặc tài khoản không còn hoạt động.'
            : error.status === 403
              ? 'Yêu cầu đăng nhập bị từ chối (403). Vui lòng liên hệ quản trị viên để kiểm tra cấu hình truy cập.'
              : error.message
          : error instanceof Error && error.name === 'TimeoutError'
            ? 'Máy chủ phản hồi quá lâu. Chưa xác nhận đăng nhập. Kiểm tra kết nối rồi thử lại.'
            : 'Không kết nối được máy chủ. Kiểm tra kết nối và thử lại.',
      );
    }
  });
  return (
    <AuthPageShell>
      <div className="login-card">
        <span className="eyebrow">Chào mừng trở lại</span>
        <h2>Đăng nhập ExamSpace</h2>
        <p className="login-intro">
          Sử dụng email và mật khẩu tài khoản được cấp.
        </p>
        {account.data && !account.isError && (
          <div className="auth-session-notice" role="status">
            <p>
              Bạn đang đăng nhập bằng tài khoản{' '}
              <strong>{account.data.fullName}</strong>.
            </p>
            <Link href={`/dashboard/${account.data.role.toLowerCase()}`}>
              Tiếp tục vào không gian làm việc <ArrowRight size={16} />
            </Link>
            <p>Chỉ nhập thông tin bên dưới nếu muốn đổi tài khoản.</p>
          </div>
        )}
        <form
          method="post"
          action="/login/unavailable"
          onSubmit={onSubmit}
          noValidate
          aria-busy={isSubmitting}
        >
          <noscript>
            <p role="alert" className="auth-error">
              Vui lòng bật JavaScript để đăng nhập an toàn.
            </p>
          </noscript>
          <fieldset disabled={!ready || isSubmitting}>
            <legend className="role-choice-label">
              Không gian bạn muốn tìm hiểu
            </legend>
            <div
              className="role-choices"
              role="group"
              aria-label="Giới thiệu vai trò"
            >
              {roles.map(({ id, name, Icon }) => (
                <button
                  type="button"
                  key={id}
                  aria-pressed={selected === id}
                  onClick={() => setSelected(id)}
                >
                  <Icon size={19} aria-hidden="true" />
                  <span>{name}</span>
                </button>
              ))}
            </div>
            <p className="role-hint" id="role-hint">
              {selected === 'student'
                ? 'Làm bài được giao và xem kết quả cá nhân.'
                : selected === 'teacher'
                  ? 'Soạn đề, giao bài và theo dõi lớp phụ trách.'
                  : 'Quản lý tài khoản, lớp học và bài kiểm tra.'}{' '}
              Vai trò truy cập được xác định từ tài khoản.
            </p>
            <div className="login-field">
              <label htmlFor="email">Email</label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="ban@truong.edu.vn"
                {...register('email')}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <p id="email-error" className="field-error" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="login-field">
              <label htmlFor="password">Mật khẩu</label>
              <div className="password-field">
                <Input
                  id="password"
                  type={visible ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu"
                  {...register('password')}
                  aria-invalid={!!errors.password}
                  aria-describedby={
                    errors.password ? 'password-error' : undefined
                  }
                />
                <button
                  type="button"
                  aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  aria-pressed={visible}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="field-error" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>
            {serverError && (
              <p role="alert" className="auth-error">
                {serverError}
              </p>
            )}
            <Button
              type="submit"
              className="login-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                'Đang đăng nhập...'
              ) : (
                <>
                  Đăng nhập <ArrowRight size={18} />
                </>
              )}
            </Button>
            <p className="login-help">
              Cần tài khoản hoặc quên mật khẩu? Liên hệ quản trị viên phụ trách.
            </p>
          </fieldset>
        </form>
        <p role="status" className="sr-only">
          {isSubmitting ? 'Đang xác thực tài khoản' : ''}
        </p>
      </div>
    </AuthPageShell>
  );
}
