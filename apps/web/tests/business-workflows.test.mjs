import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readAssignmentIntent,
  assignmentHref,
} from '../src/lib/assignment-intent.ts';
import { assignmentAvailability } from '../src/lib/assignment-availability.ts';
import {
  allowedRoute,
  parentRoute,
  contextualBack,
  InternalNavigation,
} from '../src/lib/safe-navigation.ts';
const id = '10000000-0000-4000-8000-000000000001',
  version = '10000000-0000-4000-8000-000000000002';

test('published-version handoff round-trips exact UUIDs; no implicit latest-version substitution', () => {
  const href = assignmentHref(id, version),
    params = Object.fromEntries(
      new URL(href, 'https://local.test').searchParams,
    );
  assert.equal(href.startsWith('/teacher/assignments?'), true);
  assert.deepEqual(readAssignmentIntent(params), {
    examId: id,
    examVersionId: version,
  });
});
test('untrusted assignment query cannot supply redirect paths, duplicated IDs or a version without an exam', () => {
  for (const value of [
    { examId: '//evil.test' },
    { examId: id, examVersionId: '%2e%2e/admin' },
    { examId: [id, id], examVersionId: version },
    { examVersionId: version },
  ])
    assert.deepEqual(readAssignmentIntent(value), { invalid: true });
  assert.equal(assignmentHref('https://evil.test', version), null);
  assert.deepEqual(readAssignmentIntent({ redirect: '//evil.test' }), {});
});
test('an ordinary assignment visit keeps explicit empty selection', () =>
  assert.deepEqual(readAssignmentIntent({}), {}));

const base = {
  id,
  examId: id,
  maxAttempts: 2,
  _count: { attempts: 0 },
  examVersion: { id: version, number: 1 },
  exam: {
    status: 'DRAFT',
    metadataAvailable: true,
    title: 'Pinned V1',
    durationMin: 30,
  },
  opensAt: null,
  closesAt: null,
};
const now = Date.parse('2026-11-14T00:00:00Z');
test('a pinned published V1 remains available while mutable exam is a V2 draft', () =>
  assert.equal(assignmentAvailability(base, now), 'Đang mở'));
test('the local schedule starts inclusively and closes exclusively', () => {
  const item = {
    ...base,
    opensAt: new Date(now).toISOString(),
    closesAt: new Date(now + 1000).toISOString(),
  };
  assert.equal(assignmentAvailability(item, now - 1), 'Chưa đến giờ');
  assert.equal(assignmentAvailability(item, now), 'Đang mở');
  assert.equal(assignmentAvailability(item, now + 1000), 'Đã đóng');
});
test('missing metadata/version, archived exam and exhausted own attempts cannot advertise a new start', () => {
  for (const item of [
    { ...base, examVersion: null },
    { ...base, exam: { ...base.exam, metadataAvailable: false } },
    { ...base, exam: { ...base.exam, status: 'ARCHIVED' } },
  ])
    assert.equal(assignmentAvailability(item, now), 'Không còn khả dụng');
  assert.equal(
    assignmentAvailability({ ...base, _count: { attempts: 2 } }, now),
    'Đã hết lượt làm bài',
  );
  assert.equal(assignmentAvailability(base, 0), 'Đang kiểm tra lịch');
});
test('Student assignment detail has verified role/parent routes; hostile or other-role destinations reject', () => {
  const detail = '/student/exams/' + id;
  assert.equal(allowedRoute(detail, 'STUDENT'), true);
  assert.equal(allowedRoute(detail, 'TEACHER'), false);
  assert.equal(allowedRoute(detail + '?next=//evil.test', 'STUDENT'), false);
  assert.equal(allowedRoute('/student/exams/invalid', 'STUDENT'), false);
  assert.equal(parentRoute(detail, 'STUDENT'), '/student/exams');
  assert.deepEqual(contextualBack(detail, 'STUDENT'), {
    fallback: '/student/exams',
    label: 'Quay lại bài thi được giao',
  });
});
test('detail history stays account scoped and never resumes an active attempt implicitly', () => {
  const nav = new InternalNavigation(),
    a = { id: 'a', role: 'STUDENT' },
    b = { id: 'b', role: 'STUDENT' },
    detail = '/student/exams/' + id;
  nav.record(a, 1, '/student/attempts/' + id);
  nav.record(a, 1, detail);
  assert.equal(nav.previous(a, 1, detail), '/student/exams');
  assert.equal(nav.previous(b, 1, detail), '/student/exams');
});
