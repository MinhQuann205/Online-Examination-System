import { StudentAssignmentDetail } from '@/components/student/student-assignment-detail';

export default async function StudentExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StudentAssignmentDetail assignmentId={id} />;
}
