import { TeacherExamResults } from '@/components/teacher-results';

export default async function TeacherExamResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TeacherExamResults examId={id} />;
}
