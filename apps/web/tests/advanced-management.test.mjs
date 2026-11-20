import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readMemberFilters,
  memberHref,
  readExamFilters,
  examListHref,
  examContextHref,
  readRecipientFilters,
  recipientHref,
  readHistoryFilters,
  historyHref,
} from '../src/lib/management-page-state.ts';
const id = '10000000-0000-4000-8000-000000000001',
  version = '10000000-0000-4000-8000-000000000002',
  query = (href) =>
    Object.fromEntries(new URL(href, 'http://example.test').searchParams);
test('roster filters roundtrip role/class identity, page and supported size on refresh', () => {
  const f = readMemberFilters({
    rosterSearch: ' An ',
    rosterActive: 'false',
    rosterPage: '3',
    rosterLimit: '50',
  });
  assert.deepEqual(readMemberFilters(query(memberHref('teacher', id, f))), f);
  assert.match(memberHref('admin', id, f), /^\/admin\/classes\?/);
  assert.equal(query(memberHref('teacher', id, f)).classId, id);
});
test('roster parser bounds data and ignores arrays, invalid page/size and unrelated redirects', () => {
  assert.deepEqual(
    readMemberFilters({
      rosterSearch: ['unsafe'],
      rosterActive: 'ADMIN',
      rosterPage: '-2',
      rosterLimit: '1000',
      redirect: 'https://evil.test',
    }),
    { search: '', active: 'all', page: 1, limit: 20 },
  );
  assert.equal(
    readMemberFilters({
      rosterSearch: 'x'.repeat(200),
      rosterPage: '999999999',
    }).search.length,
    150,
  );
  assert.equal(readMemberFilters({ rosterPage: '999999999' }).page, 1);
});
test('exam list keeps combined search/status/page and detail return context without redirect destinations', () => {
  const f = { search: 'Môn toán', status: 'PUBLISHED', page: 4 },
    href = examContextHref(id, f, version);
  assert.deepEqual(readExamFilters(query(examListHref(f))), f);
  assert.deepEqual(readExamFilters(query(href), 'list_'), f);
  assert.equal(query(href).versionId, version);
  assert.match(href, new RegExp('^/teacher/exams/' + id));
  assert(!href.includes('redirect'));
});
test('exam filters reject duplicate/unknown state and normalize only supported list fields', () => {
  assert.deepEqual(
    readExamFilters({
      search: ['x'],
      status: 'DELETED',
      page: '1e3',
      next: '/admin',
    }),
    { search: '', status: '', page: 1 },
  );
  assert.equal(
    readExamFilters({ search: ' q '.repeat(100) }).search.length,
    200,
  );
  assert.equal(
    examListHref(readExamFilters({ next: 'https://evil.test' })),
    '/teacher/exams',
  );
});
test('exact version context is never silently replaced when a malformed version is supplied', () => {
  assert.throws(() =>
    examContextHref(id, { search: '', status: '', page: 1 }, 'invalid-version'),
  );
  assert.equal(
    query(examContextHref(id, { search: '', status: '', page: 1 }, version))
      .versionId,
    version,
  );
});
test('recipient filters remain shareable and one metric selection resets page/search while retaining page size', () => {
  const f = readRecipientFilters({
    recipientSearch: 'Lan',
    recipientStatus: 'completed',
    recipientPage: '2',
    recipientLimit: '10',
  });
  assert.deepEqual(readRecipientFilters(query(recipientHref(id, f))), f);
  const selected = { ...f, status: 'not_started', search: '', page: 1 };
  assert.deepEqual(
    readRecipientFilters(query(recipientHref(id, selected))),
    selected,
  );
});
test('recipient parser rejects invalid status, duplicate query and unbounded pages', () => {
  assert.deepEqual(
    readRecipientFilters({
      recipientSearch: ['Lan'],
      recipientStatus: 'foreign',
      recipientPage: '0',
      recipientLimit: '-1',
    }),
    { search: '', status: 'all', page: 1, limit: 20 },
  );
});
test('history filters preserve exact assignment, pinned-title search/status and page in a fixed Student route', () => {
  const f = { search: 'Đề V1', status: 'EXPIRED', assignmentId: id, page: 2 };
  assert.deepEqual(readHistoryFilters(query(historyHref(f))), f);
  assert.match(historyHref(f), /^\/student\/results\?/);
});
test('history query cannot inject foreign routes, arbitrary statuses or multi-valued assignment IDs', () => {
  const f = readHistoryFilters({
    search: ['x'],
    status: 'IN_PROGRESS',
    assignmentId: [id],
    page: '-1',
    next: '/teacher/results',
  });
  assert.deepEqual(f, { search: '', status: 'all', assignmentId: '', page: 1 });
  assert.equal(historyHref(f), '/student/results');
});
