import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addQuestions, filterBank } from '../src/lib/question-selection.ts';
import { filterRecipients } from '../src/lib/assignment-recipient-filter.ts';
import { managementId, managementHref } from '../src/lib/management-links.ts';
import { readStudentExamView } from '../src/lib/student-exam-views.ts';
test('builder combines content/type/topic/difficulty filters without altering source records', () => {
  const rows = [
    {
      id: 'a',
      content: 'Đại số',
      type: 'MATCHING',
      topic: 'Toán',
      difficulty: 'HARD',
    },
    {
      id: 'b',
      content: 'Đại số 2',
      type: 'SINGLE_CHOICE',
      topic: 'Toán',
      difficulty: 'EASY',
    },
  ];
  assert.deepEqual(filterBank(rows, ' ĐẠI ', 'MATCHING', 'Toán', 'HARD'), [
    rows[0],
  ]);
  assert.equal(rows.length, 2);
  assert.deepEqual(filterBank(rows, '', 'MATCHING', 'Lý', ''), []);
});
test('bulk selection reuses IDs, retains authored points/order and adds each new question once', () => {
  const order = ['a', 'b'],
    points = { a: '2.5', b: '3' };
  assert.deepEqual(addQuestions(order, points, ['b', 'c', 'c', 'd'], '1.25'), {
    order: ['a', 'b', 'c', 'd'],
    points: { a: '2.5', b: '3', c: '1.25', d: '1.25' },
  });
  assert.deepEqual(order, ['a', 'b']);
  assert.deepEqual(points, { a: '2.5', b: '3' });
});
test('selection limit failure is atomic and preserves a complete200-question draft', () => {
  const order = Array.from({ length: 200 }, (_, i) => String(i)),
    points = Object.fromEntries(order.map((id) => [id, '1']));
  assert.throws(() => addQuestions(order, points, ['new'], '1'), /200/);
  assert.equal(order.length, 200);
  assert.equal(Object.keys(points).length, 200);
  assert.equal(addQuestions(order, points, ['0'], '1').order.length, 200);
});
test('new question points reject invalid, overprecision and out-of-contract values', () => {
  for (const value of ['', '0', '-1', 'NaN', 'Infinity', '1.001', '1000000'])
    assert.throws(() => addQuestions([], {}, ['a'], value));
  assert.equal(addQuestions([], {}, ['a'], '0.01').points.a, '0.01');
});
const rows = [
  { fullName: 'Chưa làm', email: 'a@example.test', attempts: [] },
  {
    fullName: 'Đang làm',
    email: 'b@example.test',
    attempts: [{ status: 'SUBMITTED' }, { status: 'IN_PROGRESS' }],
  },
  {
    fullName: 'Đã xong',
    email: 'c@example.test',
    attempts: [{ status: 'EXPIRED' }, { status: 'SUBMITTED' }],
  },
];
test('recipient filter counts people, gives active retry precedence over previous completion and keeps all attempts', () => {
  assert.deepEqual(filterRecipients(rows, '', 'not_started'), [rows[0]]);
  assert.deepEqual(filterRecipients(rows, '', 'in_progress'), [rows[1]]);
  assert.deepEqual(filterRecipients(rows, '', 'completed'), [rows[2]]);
  assert.equal(filterRecipients(rows, '', 'in_progress')[0].attempts.length, 2);
});
test('recipient search and status are combined across the complete collection', () => {
  assert.deepEqual(filterRecipients(rows, ' C@EXAMPLE.TEST ', 'completed'), [
    rows[2],
  ]);
  assert.deepEqual(filterRecipients(rows, 'a@example', 'completed'), []);
});
test('management navigation accepts UUID only and produces fixed Admin parent routes', () => {
  const id = '10000000-0000-4000-8000-000000000001';
  assert.equal(managementHref('classes', id), '/admin/classes?classId=' + id);
  assert.equal(managementHref('users', id), '/admin/users?userId=' + id);
  for (const value of [
    null,
    undefined,
    [id],
    'https://evil.test',
    '/teacher/users',
    encodeURIComponent(id + '?next=evil'),
    id + '&role=ADMIN',
  ]) {
    assert.equal(managementId(value), '');
    assert.equal(managementHref('users', value), '/admin/users');
  }
});
test('Student view URL parser accepts only supported single-valued views', () => {
  for (const view of ['all', 'upcoming', 'open', 'in_progress', 'completed'])
    assert.equal(readStudentExamView(view), view);
  for (const value of [
    null,
    ['completed'],
    'constructor',
    '__proto__',
    '/admin',
    'open&role=ADMIN',
  ])
    assert.equal(readStudentExamView(value), 'all');
});
