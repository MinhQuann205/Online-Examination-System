import { LoginForm } from '@/components/login-form';
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  return (
    <LoginForm
      initialRole={
        role && ['student', 'teacher', 'admin'].includes(role)
          ? role
          : 'student'
      }
    />
  );
}
