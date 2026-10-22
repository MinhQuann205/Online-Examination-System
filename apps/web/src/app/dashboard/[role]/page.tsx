import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import type { CurrentUser } from '@exam/shared';
import { DashboardShell } from '@/components/dashboard-shell';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  if (!['admin', 'teacher', 'student'].includes(role)) notFound();
  const baseUrl =
    process.env.API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:4000';
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/auth/me`, {
      headers: { Cookie: (await cookies()).toString() },
      cache: 'no-store',
    });
  } catch {
    redirect('/login');
  }
  if (!response.ok) redirect('/login');
  const user = (await response.json()) as CurrentUser;
  if (user.role.toLowerCase() !== role)
    redirect(`/dashboard/${user.role.toLowerCase()}`);
  return <DashboardShell initialUser={user} />;
}
