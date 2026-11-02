import { StudentResultDetail } from '@/components/student-results';

export default async function StudentResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StudentResultDetail attemptId={id} />;
}
