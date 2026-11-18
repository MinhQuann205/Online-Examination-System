import { z } from 'zod';

export type AdminUsersFilters = {
  search: string;
  role: '' | 'ADMIN' | 'TEACHER' | 'STUDENT';
  active: '' | 'true' | 'false';
  page: number;
};
export function readAdminUsersFilters(
  query: Record<string, string | string[] | undefined>,
): AdminUsersFilters {
  return {
    search: z.string().max(150).catch('').parse(query.search),
    role: z
      .enum(['', 'ADMIN', 'TEACHER', 'STUDENT'])
      .catch('')
      .parse(query.role),
    active: z.enum(['', 'true', 'false']).catch('').parse(query.active),
    page:
      typeof query.page === 'string' && /^[1-9]\d{0,5}$/.test(query.page)
        ? Number(query.page)
        : 1,
  };
}
// Always a fixed same-role list path. Unknown redirect/query keys are discarded.
export function adminUsersHref(value: AdminUsersFilters) {
  const query = new URLSearchParams();
  if (value.role) query.set('role', value.role);
  if (value.active) query.set('active', value.active);
  if (value.search) query.set('search', value.search);
  if (value.page > 1) query.set('page', String(value.page));
  return '/admin/users' + (query.size ? '?' + query.toString() : '');
}
