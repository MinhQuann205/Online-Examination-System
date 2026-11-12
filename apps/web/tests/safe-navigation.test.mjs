import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  InternalNavigation,
  allowedRoute,
  parentRoute,
  contextualBack,
} from '../src/lib/safe-navigation.ts';
const a = { id: 'a', role: 'STUDENT' },
  b = { id: 'b', role: 'STUDENT' },
  teacher = { id: 't', role: 'TEACHER' };
test('navigation uses only verified role routes, rejecting external/encoded/query destinations', () => {
  for (const route of [
    'https://example.com',
    '//evil.test',
    '/student/exams?next=//evil.test',
    '/student/%2e%2e/admin/users',
    '/student/exams#private',
    '/admin/users',
  ])
    assert.equal(allowedRoute(route, 'STUDENT'), false);
  assert.equal(allowedRoute('/student/exams', 'STUDENT'), true);
});
test('history is account, role and epoch scoped', () => {
  const h = new InternalNavigation();
  h.record(a, 0, '/dashboard/student');
  h.record(a, 0, '/student/exams');
  assert.equal(h.previous(a, 0, '/student/exams'), '/dashboard/student');
  assert.equal(h.previous(b, 0, '/student/exams'), '/dashboard/student');
  assert.equal(h.previous(a, 1, '/student/exams'), '/dashboard/student');
  h.record(teacher, 1, '/teacher/exams');
  assert.equal(h.previous(teacher, 1, '/teacher/exams'), '/dashboard/teacher');
});
test('back truncates cycles, excludes active attempts and unsafe fallback', () => {
  const h = new InternalNavigation(),
    id = '12345678-1234-1234-1234-123456789012';
  h.record(a, 0, '/dashboard/student');
  h.record(a, 0, '/student/exams');
  h.record(a, 0, '/student/attempts/' + id);
  h.record(a, 0, '/student/results/' + id);
  assert.equal(h.previous(a, 0, '/student/results/' + id), '/student/results');
  assert.equal(
    h.previous(a, 0, '/student/exams', '/admin/users'),
    '/dashboard/student',
  );
  assert.equal(
    parentRoute('/teacher/exams/' + id, 'TEACHER'),
    '/teacher/exams',
  );
});

test('UI09 contextual Back is absent on every root even when a prior route exists', () => {
  for (const [role, paths] of [
    [
      'TEACHER',
      [
        '/dashboard/teacher',
        '/teacher/classes',
        '/teacher/questions',
        '/teacher/exams',
        '/teacher/assignments',
        '/teacher/results',
      ],
    ],
    [
      'ADMIN',
      ['/dashboard/admin', '/admin/users', '/admin/classes', '/admin/exams'],
    ],
    [
      'STUDENT',
      [
        '/dashboard/student',
        '/student/classes',
        '/student/exams',
        '/student/results',
      ],
    ],
  ])
    for (const p of paths) assert.equal(contextualBack(p, role), null, p);
});
test('UI09 real details have contextual role parents; active exam stays a special flow', () => {
  const id = '12345678-1234-1234-1234-123456789012';
  for (const [role, route, parent] of [
    ['TEACHER', '/teacher/exams/' + id + '/results', '/teacher/results'],
    ['TEACHER', '/teacher/results/' + id, '/teacher/results'],
    ['TEACHER', '/teacher/exams/new', '/teacher/exams'],
    ['TEACHER', '/teacher/exams/' + id + '/edit', '/teacher/exams/' + id],
    ['STUDENT', '/student/results/' + id, '/student/results'],
    ['ADMIN', '/admin/exams/' + id + '/results', '/admin/exams'],
    ['ADMIN', '/admin/results/' + id, '/admin/exams'],
  ])
    assert.equal(contextualBack(route, role).fallback, parent);
  assert.equal(contextualBack('/student/attempts/' + id, 'STUDENT'), null);
});
test('UI09 Admin report routes cannot grant cross-role or encoded navigation', () => {
  const id = '12345678-1234-1234-1234-123456789012';
  assert(allowedRoute('/admin/exams/' + id + '/results', 'ADMIN'));
  assert(!allowedRoute('/admin/exams/' + id + '/results', 'TEACHER'));
  for (const p of [
    '//evil.test',
    '/admin/results/%2f',
    '/teacher/results/' + id,
  ])
    assert.equal(contextualBack(p, 'ADMIN'), null);
});
