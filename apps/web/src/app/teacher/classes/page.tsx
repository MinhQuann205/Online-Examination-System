import { TeacherClasses } from '@/components/teacher/teacher-classes';
import { readMemberFilters } from '@/lib/management-page-state';
import { managementId } from '@/lib/management-links';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = await searchParams,
    id = managementId(q.classId);
  return (
    <TeacherClasses
      key={id}
      initialClassId={id}
      initialRosterFilters={readMemberFilters(q)}
    />
  );
}
