import { AdminResultDetail } from '@/components/student-results';
import { reportReturnHref } from '@/lib/academic-navigation';
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  return (
    <AdminResultDetail
      attemptId={id}
      returnHref={reportReturnHref('admin', await searchParams)}
    />
  );
}
