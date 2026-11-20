import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readReportFilters,
  reportHref,
  reportAttemptHref,
  reportReturnHref,
  reportApiQuery,
  readAssignmentListFilters,
  assignmentListHref,
  assignmentListApiQuery,
} from '../src/lib/academic-navigation.ts';
const id = '10000000-0000-4000-8000-000000000001',
  assignment = '10000000-0000-4000-8000-000000000002',
  version = '10000000-0000-4000-8000-000000000003',
  query = (h) =>
    Object.fromEntries(new URL(h, 'http://example.test').searchParams);
test('historical report roundtrips search/status/page/size and exact pin through role-specific result detail', () => {
  const f = readReportFilters({
    reportSearch: 'An & Bình',
    reportStatus: 'EXPIRED',
    reportAssignmentId: assignment,
    reportVersionId: version,
    reportPage: '3',
    reportLimit: '50',
  });
  for (const role of ['teacher', 'admin']) {
    const h = reportHref(role, id, f),
      detail = reportAttemptHref(role, id, assignment, f);
    assert.deepEqual(readReportFilters(query(h)), f);
    assert.equal(reportReturnHref(role, query(detail)), h);
    assert.match(detail, new RegExp('^/' + role + '/results/'));
  }
});
test('public report query is opt-in bounded finalized history with no arbitrary redirect', () => {
  const f = readReportFilters({
      reportAssignmentId: assignment,
      reportVersionId: version,
      reportStatus: 'SUBMITTED',
      reportLimit: '100',
      redirect: 'https://attacker.test',
    }),
    q = Object.fromEntries(new URLSearchParams(reportApiQuery(f, true)));
  assert.deepEqual(q, {
    paged: 'true',
    search: '',
    status: 'SUBMITTED',
    page: '1',
    limit: '100',
    assignmentId: assignment,
    versionId: version,
    summaryOnly: 'true',
  });
});
test('invalid explicit identities never broaden report or fall back to a recent version', () => {
  for (const q of [
    { reportAssignmentId: 'bad' },
    { reportVersionId: '%2F' },
    { reportAssignmentId: [assignment] },
    { reportVersionId: '' },
  ]) {
    const f = readReportFilters(q);
    assert.equal(f.invalid, true);
    assert.throws(() => reportApiQuery(f));
    assert.equal(
      reportReturnHref('teacher', { ...q, reportExamId: id }),
      undefined,
    );
    assert.equal(reportHref('teacher', id, f), '/teacher/results');
  }
});
test('external encoded cross-role return destinations cannot replace verified role/exam path', () => {
  for (const v of [
    'https://attacker.test',
    id + '?next=/admin',
    encodeURIComponent('/admin'),
    [id],
  ])
    assert.equal(reportReturnHref('teacher', { reportExamId: v }), undefined);
  assert.equal(
    reportReturnHref('teacher', { reportExamId: id, next: '/admin/results' }),
    '/teacher/exams/' + id + '/results',
  );
});
test('search bounded, array controls ignored, active status rejected and unbounded size/page normalized', () => {
  const f = readReportFilters({
    reportSearch: 'x'.repeat(201),
    reportStatus: 'IN_PROGRESS',
    reportLimit: '999999',
    reportPage: '999999999',
  });
  assert.equal(f.search.length, 200);
  assert.equal(f.status, 'all');
  assert.equal(f.limit, 20);
  assert.equal(f.page, 1);
  assert.equal(readReportFilters({ reportSearch: ['x'] }).search, '');
});
test('assignment inventory URL roundtrips filters separately from creation intent', () => {
  const f = readAssignmentListFilters({
    listExamId: id,
    listVersionId: version,
    listClassId: assignment,
    listSearch: 'Pinned V1',
    listRecipient: 'class',
    listWindow: 'closed',
    listPage: '4',
    examId: assignment,
    examVersionId: assignment,
  });
  assert.deepEqual(readAssignmentListFilters(query(assignmentListHref(f))), f);
  const q = Object.fromEntries(new URLSearchParams(assignmentListApiQuery(f)));
  assert.equal(q.examId, id);
  assert.equal(q.examVersionId, version);
  assert.equal(q.recipientKind, 'class');
  assert.equal(q.window, 'closed');
  assert.equal(q.page, '4');
});
test('assignment malformed exact-version context is explicit and does not fetch all', () => {
  for (const raw of [
    { listExamId: 'bad' },
    { listVersionId: ['bad'] },
    { listClassId: '/admin' },
  ]) {
    const f = readAssignmentListFilters(raw);
    assert.equal(f.invalid, true);
    assert.throws(() => assignmentListApiQuery(f));
  }
});
test('creation selection cannot silently filter inventory and clear restores independent inventory defaults', () => {
  const f = readAssignmentListFilters({ examId: id, examVersionId: version });
  assert.equal(f.examId, '');
  assert.equal(f.versionId, '');
  assert.equal(assignmentListHref(f), '/teacher/assignments');
  assert.deepEqual(
    Object.fromEntries(new URLSearchParams(assignmentListApiQuery(f))),
    { page: '1', search: '', recipientKind: 'all', window: 'all' },
  );
});

test('filtered assignment detail preserves inventory context without overriding recipient filters', async () => {
  const { assignmentDetailHref, assignmentReturnHref } =
    await import('../src/lib/academic-navigation.ts');
  const f = readAssignmentListFilters({
    listExamId: id,
    listVersionId: version,
    listRecipient: 'student',
    listWindow: 'open',
    listPage: '2',
  });
  const href = assignmentDetailHref(assignment, f);
  assert.match(href, new RegExp('^/teacher/assignments/' + assignment + '\\?'));
  assert.equal(
    assignmentReturnHref({
      ...query(href),
      recipientSearch: 'Lan',
      recipientPage: '3',
    }),
    assignmentListHref(f),
  );
});
test('assignment detail return path cannot be replaced by redirect, cross-role URL or malformed exact ID', async () => {
  const { assignmentDetailHref, assignmentReturnHref } =
    await import('../src/lib/academic-navigation.ts');
  assert.equal(
    assignmentReturnHref({
      redirect: 'https://attacker.test',
      next: '/admin/results',
    }),
    undefined,
  );
  assert.equal(assignmentReturnHref({ listVersionId: '/admin' }), undefined);
  assert.equal(
    assignmentDetailHref(
      'https://attacker.test',
      readAssignmentListFilters({}),
    ),
    '/teacher/assignments',
  );
});
