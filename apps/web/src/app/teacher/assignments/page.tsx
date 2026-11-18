import { ExamAssignmentManagement } from '@/components/exam-assignment-management';
import { readAssignmentListFilters } from '@/lib/academic-navigation';
import { readAssignmentIntent } from '@/lib/assignment-intent';

export default async function TeacherAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams,
    selection = readAssignmentIntent(query),
    filters = readAssignmentListFilters(query);
  return (
    <ExamAssignmentManagement
      key={`${JSON.stringify(filters)}:${selection.examId ?? ''}:${selection.examVersionId ?? ''}:${Boolean(selection.invalid)}`}
      initialListFilters={filters}
      initialSelection={selection}
    />
  );
}
