import { ExamEditor } from '@/components/exam-management';

export default async function EditExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ExamEditor examId={id} />;
}
