import { ExamPreview } from '@/components/exam-management';

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ExamPreview examId={id} />;
}
