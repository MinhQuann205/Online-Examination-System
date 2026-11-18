import { managementId } from '@/lib/management-links';
import { AdminUsers } from '@/components/admin/admin-users';
import { readAdminUsersFilters } from '@/lib/admin-users-query';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const initialUserId = managementId(params.userId);
  const initialFilters = readAdminUsersFilters(params);
  return (
    <AdminUsers
      key={JSON.stringify([initialFilters, initialUserId])}
      initialUserId={initialUserId}
      initialFilters={initialFilters}
    />
  );
}
