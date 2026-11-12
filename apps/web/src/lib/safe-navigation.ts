import type { CurrentUser } from '@exam/shared';
// In-memory, account/role/epoch scoped routes only; no response or answer data.
export function allowedRoute(
  route: string,
  role: CurrentUser['role'],
): boolean {
  if (route === '/') return true;
  if (/[?#\\%]/.test(route)) return false;
  const id =
    '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
  const patterns = {
    ADMIN: new RegExp(
      '^(/dashboard/admin|/admin/(users|classes|exams)|/admin/exams/' +
        id +
        '/results|/admin/results/' +
        id +
        ')$',
    ),
    TEACHER: new RegExp(
      '^(/dashboard/teacher|/teacher/(classes|questions|assignments|results|exams)|/teacher/exams/new|/teacher/exams/' +
        id +
        '(/edit|/results)?|/teacher/results/' +
        id +
        ')$',
    ),
    STUDENT: new RegExp(
      '^(/dashboard/student|/student/(classes|exams|results)|/student/(attempts|results)/' +
        id +
        ')$',
    ),
  };
  return patterns[role].test(route);
}
export function parentRoute(route: string, role: CurrentUser['role']): string {
  if (route === '/dashboard/' + role.toLowerCase()) return '/';
  if (role === 'STUDENT' && route.startsWith('/student/attempts/'))
    return '/student/exams';
  if (role === 'STUDENT' && route.startsWith('/student/results/'))
    return '/student/results';
  if (role === 'TEACHER' && route.startsWith('/teacher/exams/'))
    return '/teacher/exams';
  if (role === 'TEACHER' && route.startsWith('/teacher/results/'))
    return '/teacher/results';
  return '/dashboard/' + role.toLowerCase();
}
export class InternalNavigation {
  private owner = '';
  private routes: string[] = [];
  record(user: CurrentUser | undefined, epoch: number, route: string) {
    const owner = user ? user.id + ':' + user.role + ':' + epoch : '';
    if (owner !== this.owner) {
      this.routes = [];
      this.owner = owner;
    }
    if (!user || !allowedRoute(route, user.role)) {
      this.routes = [];
      return;
    }
    if (this.routes.at(-1) === route) return;
    const prior = this.routes.lastIndexOf(route);
    this.routes =
      prior >= 0
        ? this.routes.slice(0, prior + 1)
        : [...this.routes, route].slice(-32);
  }
  previous(user: CurrentUser, epoch: number, route: string, fallback?: string) {
    if (
      this.owner === user.id + ':' + user.role + ':' + epoch &&
      this.routes.at(-1) === route
    ) {
      const candidate = this.routes.at(-2);
      // Returning to a live attempt must always be an explicit start/resume action.
      if (
        candidate &&
        !candidate.startsWith('/student/attempts/') &&
        allowedRoute(candidate, user.role)
      )
        return candidate;
    }
    return fallback && allowedRoute(fallback, user.role) && fallback !== route
      ? fallback
      : parentRoute(route, user.role);
  }
}

// Root navigation belongs to the sidebar. Detail actions have explicit, verified parents.
export function contextualBack(
  route: string,
  role: CurrentUser['role'],
): { fallback: string; label: string } | null {
  if (!allowedRoute(route, role)) return null;
  if (role === 'TEACHER') {
    if (
      /^\/teacher\/results\//.test(route) ||
      /^\/teacher\/exams\/.+\/results$/.test(route)
    )
      return { fallback: '/teacher/results', label: 'Quay lại Kết quả thi' };
    if (route === '/teacher/exams/new')
      return { fallback: '/teacher/exams', label: 'Quay lại danh sách đề thi' };
    if (/^\/teacher\/exams\/.+\/edit$/.test(route))
      return {
        fallback: route.slice(0, -5),
        label: 'Quay lại chi tiết đề thi',
      };
    if (/^\/teacher\/exams\//.test(route))
      return { fallback: '/teacher/exams', label: 'Quay lại danh sách đề thi' };
  }
  if (role === 'STUDENT' && route.startsWith('/student/results/'))
    return { fallback: '/student/results', label: 'Quay lại lịch sử kết quả' };
  if (
    role === 'ADMIN' &&
    (route.startsWith('/admin/exams/') || route.startsWith('/admin/results/'))
  )
    return { fallback: '/admin/exams', label: 'Quay lại Theo dõi bài thi' };
  return null;
}
