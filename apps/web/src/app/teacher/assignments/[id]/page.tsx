import { TeacherAssignmentDetail } from '@/components/teacher/teacher-assignment-detail';
import { assignmentReturnHref } from '@/lib/academic-navigation';
import { readRecipientFilters } from '@/lib/management-page-state';
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const id = (await params).id,
    query = await searchParams,
    filters = readRecipientFilters(query);
  return (
    <TeacherAssignmentDetail
      key={id}
      assignmentId={id}
      returnHref={assignmentReturnHref(query)}
      initialFilters={filters}
    />
  );
}
