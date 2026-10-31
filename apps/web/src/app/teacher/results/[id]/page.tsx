import { TeacherResultDetail } from '@/components/student-results';

export default async function TeacherResultDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TeacherResultDetail attemptId={id} />;
}
