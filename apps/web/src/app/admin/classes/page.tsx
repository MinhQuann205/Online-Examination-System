import { readMemberFilters } from '@/lib/management-page-state';
import { AdminClasses } from '@/components/admin/admin-classes';
import { managementId } from '@/lib/management-links';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const id = managementId(query.classId);
  return (
    <AdminClasses
      key={id}
      initialClassId={id}
      initialRosterFilters={readMemberFilters(query)}
    />
  );
}
