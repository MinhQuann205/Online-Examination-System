// Pure URL parsing is shared by server pages and the client controls.
const managementId = (v: unknown) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  )
    ? v
    : '';
type Query = Record<string, unknown>;
const scalar = (v: unknown) => (typeof v === 'string' ? v : '');
const page = (v: unknown) =>
  typeof v === 'string' && /^[1-9]\d{0,5}$/.test(v) ? Number(v) : 1;
export type MemberFilters = {
  search: string;
  active: string;
  page: number;
  limit: number;
};
export function readMemberFilters(q: Query): MemberFilters {
  return {
    search: scalar(q.rosterSearch).trim().slice(0, 150),
    active: ['true', 'false'].includes(scalar(q.rosterActive))
      ? scalar(q.rosterActive)
      : 'all',
    page: page(q.rosterPage),
    limit: [10, 20, 50, 100].includes(Number(scalar(q.rosterLimit)))
      ? Number(q.rosterLimit)
      : 20,
  };
}
export function memberHref(
  role: 'admin' | 'teacher',
  id: string,
  f: MemberFilters,
) {
  const q = new URLSearchParams({ classId: managementId(id) });
  if (f.search) q.set('rosterSearch', f.search);
  if (f.active !== 'all') q.set('rosterActive', f.active);
  if (f.page > 1) q.set('rosterPage', String(f.page));
  if (f.limit !== 20) q.set('rosterLimit', String(f.limit));
  return '/' + role + '/classes?' + q;
}
export type ExamFilters = { search: string; status: string; page: number };
export function readExamFilters(q: Query, prefix = ''): ExamFilters {
  return {
    search: scalar(q[prefix + 'search'])
      .trim()
      .slice(0, 200),
    status: ['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(
      scalar(q[prefix + 'status']),
    )
      ? scalar(q[prefix + 'status'])
      : '',
    page: page(q[prefix + 'page']),
  };
}
export function examListHref(f: ExamFilters) {
  const q = new URLSearchParams();
  if (f.search) q.set('search', f.search);
  if (f.status) q.set('status', f.status);
  if (f.page > 1) q.set('page', String(f.page));
  return '/teacher/exams' + (q.size ? '?' + q : '');
}
export function examContextHref(id: string, f: ExamFilters, versionId = '') {
  if (versionId && !managementId(versionId))
    throw new Error('Liên kết phiên bản không hợp lệ');
  const q = new URLSearchParams();
  if (f.search) q.set('list_search', f.search);
  if (f.status) q.set('list_status', f.status);
  if (f.page > 1) q.set('list_page', String(f.page));
  if (managementId(versionId)) q.set('versionId', versionId);
  return '/teacher/exams/' + encodeURIComponent(id) + (q.size ? '?' + q : '');
}
export type RecipientFilters = {
  search: string;
  status: string;
  page: number;
  limit: number;
};
export function readRecipientFilters(q: Query): RecipientFilters {
  return {
    search: scalar(q.recipientSearch).trim().slice(0, 150),
    status: ['not_started', 'in_progress', 'completed'].includes(
      scalar(q.recipientStatus),
    )
      ? scalar(q.recipientStatus)
      : 'all',
    page: page(q.recipientPage),
    limit: [10, 20, 50, 100].includes(Number(scalar(q.recipientLimit)))
      ? Number(q.recipientLimit)
      : 20,
  };
}
export function recipientHref(id: string, f: RecipientFilters) {
  const q = new URLSearchParams();
  if (f.search) q.set('recipientSearch', f.search);
  if (f.status !== 'all') q.set('recipientStatus', f.status);
  if (f.page > 1) q.set('recipientPage', String(f.page));
  if (f.limit !== 20) q.set('recipientLimit', String(f.limit));
  return (
    '/teacher/assignments/' + encodeURIComponent(id) + (q.size ? '?' + q : '')
  );
}
export type HistoryFilters = {
  search: string;
  status: string;
  assignmentId: string;
  page: number;
};
export function readHistoryFilters(q: Query): HistoryFilters {
  return {
    search: scalar(q.search).trim().slice(0, 200),
    status: ['SUBMITTED', 'EXPIRED'].includes(scalar(q.status))
      ? scalar(q.status)
      : 'all',
    assignmentId: managementId(q.assignmentId),
    page: page(q.page),
  };
}
export function historyHref(f: HistoryFilters) {
  const q = new URLSearchParams();
  if (f.search) q.set('search', f.search);
  if (f.status !== 'all') q.set('status', f.status);
  if (f.assignmentId) q.set('assignmentId', f.assignmentId);
  if (f.page > 1) q.set('page', String(f.page));
  return '/student/results' + (q.size ? '?' + q : '');
}
