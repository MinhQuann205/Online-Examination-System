import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  prepareAssignment,
  assignmentWindow,
  finalAttemptScore,
} from '../src/lib/assignment-form.ts';
import {
  readAdminUsersFilters,
  adminUsersHref,
} from '../src/lib/admin-users-query.ts';
import {
  readPreviewVersion,
  examPreviewHref,
} from '../src/lib/exam-preview-selection.ts';
import {
  allowedRoute,
  parentRoute,
  contextualBack,
} from '../src/lib/safe-navigation.ts';
const examId = '20000000-0000-4000-8000-000000000001',
  v1 = '30000000-0000-4000-8000-000000000001',
  v2 = '30000000-0000-4000-8000-000000000002',
  targetId = '40000000-0000-4000-8000-000000000001';
const input = {
  examId,
  examVersionId: v1,
  targetKind: 'class',
  targetId,
  opensAt: '',
  closesAt: '',
  maxAttempts: '2',
  showScore: true,
  showAnswers: false,
};
const options = {
  exams: [{ id: examId, title: 'Pinned exam' }],
  versions: [
    { id: v1, number: 1 },
    { id: v2, number: 2 },
  ],
  targets: [{ id: targetId, label: 'Class A' }],
};
test('confirmation pins the requested V1 despite a later published version', () => {
  const result = prepareAssignment(input, options);
  assert.equal(result.ok, true);
  assert.equal(result.versionNumber, 1);
  assert.equal(result.body.examVersionId, v1);
  assert.equal(result.body.classId, targetId);
  assert.equal(Object.hasOwn(result.body, 'studentId'), false);
  assert.equal(result.body.maxAttempts, 2);
  assert.equal(result.body.opensAt, null);
});
test('latest is resolved to an exact UUID at confirmation and captured body cannot silently follow later options', () => {
  const mutable = structuredClone(options),
    result = prepareAssignment({ ...input, examVersionId: '' }, mutable);
  assert.equal(result.ok, true);
  assert.equal(result.body.examVersionId, v2);
  mutable.versions.push({
    id: '30000000-0000-4000-8000-000000000003',
    number: 3,
  });
  assert.equal(result.body.examVersionId, v2);
});
test('a missing explicit version is rejected instead of substituting latest', () =>
  assert.equal(
    prepareAssignment(
      { ...input, examVersionId: '30000000-0000-4000-8000-000000000099' },
      options,
    ).ok,
    false,
  ));
test('unavailable exam, recipient or version collection cannot produce a mutation body', () => {
  for (const value of [
    { ...options, exams: [] },
    { ...options, targets: [] },
    { ...options, versions: [] },
  ])
    assert.equal(prepareAssignment(input, value).ok, false);
});
test('invalid schedules and attempt limits are rejected before confirmation', () => {
  for (const patch of [
    { opensAt: 'not a date' },
    { opensAt: '2026-11-14T12:00', closesAt: '2026-11-14T11:59' },
    { opensAt: '2026-11-14T12:00', closesAt: '2026-11-14T12:00' },
    { maxAttempts: '0' },
    { maxAttempts: '21' },
    { maxAttempts: '1.5' },
  ])
    assert.equal(prepareAssignment({ ...input, ...patch }, options).ok, false);
});
test('individual assignment captures only Student target and independently chosen policies', () => {
  const result = prepareAssignment(
    { ...input, targetKind: 'student', showScore: false, showAnswers: true },
    options,
  );
  assert.equal(result.ok, true);
  assert.equal(result.body.studentId, targetId);
  assert.equal(Object.hasOwn(result.body, 'classId'), false);
  assert.equal(result.body.showScore, false);
  assert.equal(result.body.showAnswers, true);
});
test('assignment window is guidance with inclusive opening and exclusive closing', () => {
  const at = Date.parse('2026-11-14T00:00:00Z'),
    open = new Date(at).toISOString(),
    close = new Date(at + 1000).toISOString();
  assert.equal(assignmentWindow(open, close, 0), 'Đang kiểm tra lịch');
  assert.equal(assignmentWindow(open, close, at - 1), 'Chưa mở');
  assert.equal(assignmentWindow(open, close, at), 'Đang mở');
  assert.equal(assignmentWindow(open, close, at + 1000), 'Đã đóng');
});
test('teacher rows preserve a final zero and never show a stale score for IN_PROGRESS', () => {
  assert.equal(finalAttemptScore({ status: 'SUBMITTED', score: '0' }), '0');
  assert.equal(
    finalAttemptScore({ status: 'EXPIRED', score: null }),
    'Chưa có điểm',
  );
  assert.equal(
    finalAttemptScore({ status: 'IN_PROGRESS', score: '9' }),
    'Chưa hoàn tất',
  );
});
test('Users filters round-trip through a reloadable fixed route, including search and page', () => {
  const state = readAdminUsersFilters({
    role: 'TEACHER',
    active: 'true',
    search: 'Nguyễn Văn',
    page: '3',
  });
  const url = new URL(adminUsersHref(state), 'https://local.test');
  assert.equal(url.pathname, '/admin/users');
  assert.deepEqual(
    readAdminUsersFilters(Object.fromEntries(url.searchParams)),
    state,
  );
});
test('Users query discards redirect keys, arrays and invalid role/status/page without broadening navigation', () => {
  assert.deepEqual(
    readAdminUsersFilters({
      role: ['TEACHER', 'STUDENT'],
      active: 'enabled',
      page: '1e3',
      search: ['a', 'b'],
      next: '//outside.test',
    }),
    { search: '', role: '', active: '', page: 1 },
  );
  assert.equal(
    adminUsersHref(readAdminUsersFilters({ next: '//outside.test' })),
    '/admin/users',
  );
  assert.equal(readAdminUsersFilters({ page: '0' }).page, 1);
});
test('historical preview survives URL serialization and rejects malformed or duplicated version intent', () => {
  const url = new URL(examPreviewHref(examId, v1), 'https://local.test');
  assert.deepEqual(readPreviewVersion(url.searchParams.get('versionId')), {
    versionId: v1,
  });
  assert.deepEqual(readPreviewVersion(undefined), { versionId: '' });
  assert.deepEqual(readPreviewVersion([v1, v1]), { invalid: true });
  assert.deepEqual(readPreviewVersion('//outside.test'), { invalid: true });
  assert.equal(examPreviewHref('//outside.test', v1), null);
});
test('Teacher assignment detail is role-scoped, canonical and has a verified parent', () => {
  const route = '/teacher/assignments/' + targetId;
  assert.equal(allowedRoute(route, 'TEACHER'), true);
  for (const role of ['ADMIN', 'STUDENT'])
    assert.equal(allowedRoute(route, role), false);
  assert.equal(allowedRoute(route + '?next=//outside.test', 'TEACHER'), false);
  assert.equal(parentRoute(route, 'TEACHER'), '/teacher/assignments');
  assert.deepEqual(contextualBack(route, 'TEACHER'), {
    fallback: '/teacher/assignments',
    label: 'Quay lại bài đã giao',
  });
});
