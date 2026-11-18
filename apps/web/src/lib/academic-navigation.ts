// Construct role-specific local paths only; never accept a redirect destination.
type Query = Record<string, unknown>;
export type ReportRole = 'teacher' | 'admin';
const scalar = (v: unknown) => (typeof v === 'string' ? v : '');
const id = (v: unknown) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  )
    ? v
    : '';
export type ReportFilters = {
  search: string;
  status: 'all' | 'SUBMITTED' | 'EXPIRED';
  assignmentId: string;
  versionId: string;
  page: number;
  limit: number;
  invalid: boolean;
};
export function readReportFilters(q: Query): ReportFilters {
  const assignmentId = id(q.reportAssignmentId),
    versionId = id(q.reportVersionId);
  return {
    search: scalar(q.reportSearch).slice(0, 200),
    status:
      q.reportStatus === 'SUBMITTED' || q.reportStatus === 'EXPIRED'
        ? q.reportStatus
        : 'all',
    assignmentId,
    versionId,
    page: /^[1-9]\d{0,5}$/.test(scalar(q.reportPage))
      ? Number(q.reportPage)
      : 1,
    limit: [10, 20, 50, 100].includes(Number(q.reportLimit))
      ? Number(q.reportLimit)
      : 20,
    invalid:
      ('reportAssignmentId' in q && !assignmentId) ||
      ('reportVersionId' in q && !versionId),
  };
}
function params(f: ReportFilters) {
  const q = new URLSearchParams();
  if (f.search.trim()) q.set('reportSearch', f.search.trim());
  if (f.status !== 'all') q.set('reportStatus', f.status);
  if (f.assignmentId) q.set('reportAssignmentId', f.assignmentId);
  if (f.versionId) q.set('reportVersionId', f.versionId);
  if (f.page > 1) q.set('reportPage', String(f.page));
  if (f.limit !== 20) q.set('reportLimit', String(f.limit));
  return q;
}
export function reportHref(role: ReportRole, examId: string, f: ReportFilters) {
  if (!id(examId) || f.invalid) return '/' + role + '/results';
  const q = params(f).toString();
  return '/' + role + '/exams/' + examId + '/results' + (q ? '?' + q : '');
}
export function reportAttemptHref(
  role: ReportRole,
  examId: string,
  attemptId: string,
  f: ReportFilters,
) {
  if (!id(examId) || !id(attemptId) || f.invalid)
    return '/' + role + '/results';
  const q = params(f);
  q.set('reportExamId', examId);
  return '/' + role + '/results/' + attemptId + '?' + q;
}
export function reportReturnHref(role: ReportRole, q: Query) {
  const examId = id(q.reportExamId),
    f = readReportFilters(q);
  return examId && !f.invalid ? reportHref(role, examId, f) : undefined;
}
export function reportApiQuery(f: ReportFilters, summaryOnly = false) {
  if (f.invalid) throw new Error('Bộ lọc báo cáo không hợp lệ');
  return new URLSearchParams({
    paged: 'true',
    search: f.search.trim(),
    status: f.status,
    page: String(f.page),
    limit: String(f.limit),
    ...(f.assignmentId ? { assignmentId: f.assignmentId } : {}),
    ...(f.versionId ? { versionId: f.versionId } : {}),
    ...(summaryOnly ? { summaryOnly: 'true' } : {}),
  }).toString();
}

export type AssignmentListFilters = {
  search: string;
  examId: string;
  versionId: string;
  classId: string;
  recipient: 'all' | 'class' | 'student';
  window: 'all' | 'upcoming' | 'open' | 'closed';
  page: number;
  invalid: boolean;
};
export function readAssignmentListFilters(q: Query): AssignmentListFilters {
  const examId = id(q.listExamId),
    versionId = id(q.listVersionId),
    classId = id(q.listClassId);
  return {
    search: scalar(q.listSearch).slice(0, 200),
    examId,
    versionId,
    classId,
    recipient:
      q.listRecipient === 'class' || q.listRecipient === 'student'
        ? q.listRecipient
        : 'all',
    window:
      q.listWindow === 'upcoming' ||
      q.listWindow === 'open' ||
      q.listWindow === 'closed'
        ? q.listWindow
        : 'all',
    page: /^[1-9]\d{0,5}$/.test(scalar(q.listPage)) ? Number(q.listPage) : 1,
    invalid:
      ('listExamId' in q && !examId) ||
      ('listVersionId' in q && !versionId) ||
      ('listClassId' in q && !classId),
  };
}
export function assignmentListHref(f: AssignmentListFilters) {
  const q = new URLSearchParams();
  if (f.examId) q.set('listExamId', f.examId);
  if (f.versionId) q.set('listVersionId', f.versionId);
  if (f.classId) q.set('listClassId', f.classId);
  if (f.search.trim()) q.set('listSearch', f.search.trim());
  if (f.window !== 'all') q.set('listWindow', f.window);
  if (f.recipient !== 'all') q.set('listRecipient', f.recipient);
  if (f.page > 1) q.set('listPage', String(f.page));
  return '/teacher/assignments' + (q.size ? '?' + q : '');
}
export function assignmentListApiQuery(f: AssignmentListFilters) {
  if (f.invalid) throw new Error('Bộ lọc bài giao không hợp lệ');
  return new URLSearchParams({
    page: String(f.page),
    search: f.search.trim(),
    recipientKind: f.recipient,
    window: f.window,
    ...(f.examId ? { examId: f.examId } : {}),
    ...(f.versionId ? { examVersionId: f.versionId } : {}),
    ...(f.classId ? { classId: f.classId } : {}),
  }).toString();
}

export function assignmentDetailHref(
  assignmentId: string,
  f: AssignmentListFilters,
) {
  if (!id(assignmentId) || f.invalid) return '/teacher/assignments';
  const query = assignmentListHref(f).split('?')[1];
  return '/teacher/assignments/' + assignmentId + (query ? '?' + query : '');
}
export function assignmentReturnHref(q: Query) {
  const f = readAssignmentListFilters(q);
  if (f.invalid || !Object.keys(q).some((k) => k.startsWith('list')))
    return undefined;
  return assignmentListHref(f);
}
