'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@exam/shared';
import { ArrowRight, GraduationCap, LockKeyhole } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState('');
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
      const user = await api.login(values.email, values.password);
      router.replace(`/dashboard/${user.role.toLowerCase()}`);
      router.refresh();
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : 'Đăng nhập thất bại',
      );
    }
  });
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 p-12 text-white lg:flex">
        <div className="flex items-center gap-3 text-xl font-bold">
          <span className="rounded-xl bg-white/15 p-2">
            <GraduationCap />
          </span>{' '}
          ExamSpace
        </div>
        <div>
          <p className="mb-5 inline-block rounded-full border border-white/25 px-4 py-1 text-sm text-blue-100">
            Nền tảng thi trực tuyến
          </p>
          <h1 className="max-w-xl text-5xl font-bold leading-tight">
            Một nơi cho việc dạy, học và đánh giá.
          </h1>
          <p className="mt-6 max-w-lg text-lg text-blue-100">
            Đăng nhập để truy cập không gian làm việc phù hợp với vai trò của
            bạn.
          </p>
        </div>
        <p className="text-sm text-blue-200">
          © {new Date().getFullYear()} ExamSpace
        </p>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 text-xl font-bold lg:hidden">
            <span className="rounded-xl bg-blue-600 p-2 text-white">
              <GraduationCap />
            </span>{' '}
            ExamSpace
          </div>
          <Card className="p-7 sm:p-9">
            <div className="mb-8">
              <div className="mb-5 inline-flex rounded-xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-950">
                <LockKeyhole size={22} />
              </div>
              <h2 className="text-2xl font-bold">Chào mừng trở lại</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Nhập tài khoản được cấp để tiếp tục.
              </p>
            </div>
            <form onSubmit={onSubmit} className="space-y-5" noValidate>
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium"
                >
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="ten@congty.vn"
                  {...register('email')}
                  aria-invalid={!!errors.email}
                />
                <p className="mt-1 text-sm text-red-600">
                  {errors.email?.message}
                </p>
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium"
                >
                  Mật khẩu
                </label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu"
                  {...register('password')}
                  aria-invalid={!!errors.password}
                />
                <p className="mt-1 text-sm text-red-600">
                  {errors.password?.message}
                </p>
              </div>
              {serverError && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
                >
                  {serverError}
                </p>
              )}
              <Button className="w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  'Đang đăng nhập...'
                ) : (
                  <>
                    Đăng nhập <ArrowRight size={16} />
                  </>
                )}
              </Button>
            </form>
          </Card>
          <p className="mt-6 text-center text-sm text-slate-500">
            Liên hệ quản trị viên nếu bạn cần tài khoản.
          </p>
        </div>
      </section>
    </main>
  );
}
