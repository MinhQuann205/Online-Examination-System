import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  retainChoice,
  preparationSummary,
  deadlineGuidance,
  readStudentOperationContext,
} from '../src/lib/examination-operations.ts';
test('explicit recipient IDs persist independently of results and paging, duplicate selection stays one record', () => {
  let selected = retainChoice(null, { id: 'student-1', label: 'An' });
  const pages = [
    [{ id: 'student-2', label: 'Bình' }],
    [],
    [{ id: 'student-3', label: 'Cường' }],
  ];
  for (const page of pages) {
    assert.ok(Array.isArray(page));
    assert.equal(selected.id, 'student-1');
  }
  selected = retainChoice(selected, { id: 'student-1', label: 'An mới' });
  assert.deepEqual(selected, { id: 'student-1', label: 'An mới' });
  assert.equal(retainChoice(selected, null), null);
});
test('an explicit changed selection replaces the identifier rather than appending duplicate recipients', () => {
  assert.deepEqual(
    retainChoice({ id: 'A', label: 'Class A' }, { id: 'B', label: 'Class B' }),
    { id: 'B', label: 'Class B' },
  );
});
test('preparation summary respects exact configured cents and type composition without grading', () => {
  const r = preparationSummary('Exam', 30, [
    { type: 'SINGLE_CHOICE', points: '0.10' },
    { type: 'MULTIPLE_CHOICE', points: 0.2 },
    { type: 'MATCHING', points: 2.5 },
  ]);
  assert.equal(r.totalPoints, '2.80');
  assert.deepEqual(r.types, {
    SINGLE_CHOICE: 1,
    MULTIPLE_CHOICE: 1,
    MATCHING: 1,
  });
  assert.deepEqual(r.blockers, []);
});
test('readiness reports invalid title/time/size without silently truncating chosen questions', () => {
  const q = Array.from({ length: 201 }, () => ({
      type: 'MATCHING',
      points: 1,
    })),
    r = preparationSummary('', 0, q);
  assert.equal(r.questionCount, 201);
  assert.equal(r.blockers.length, 3);
  assert.equal(preparationSummary('Valid', 30, []).blockers.length, 1);
});
test('invalid/overprecision/overflow configured points are not presented as valid total', () => {
  for (const points of [-1, 0, 0.123, Infinity, 'invalid'])
    assert.equal(
      preparationSummary('Exam', 30, [{ points }]).totalPoints,
      null,
    );
  assert.equal(
    preparationSummary('Exam', 30, [{ points: 999999.99 }, { points: 1 }])
      .totalPoints,
    null,
  );
});
test('200 selected questions and two-decimal points are accepted without durable-storage claims', () => {
  const r = preparationSummary(
    'Exam',
    1440,
    Array.from({ length: 200 }, () => ({ points: '0.01', type: 'MATCHING' })),
  );
  assert.equal(r.totalPoints, '2.00');
  assert.deepEqual(r.blockers, []);
});
test('active attempt deadline takes precedence over closing reminder and remains server-issued', () => {
  const r = deadlineGuidance(
    {
      closesAt: '2026-11-20T10:00:00Z',
      attempts: [{ status: 'IN_PROGRESS', deadlineAt: '2026-11-20T09:30:00Z' }],
    },
    '2026-11-20T09:00:00Z',
  );
  assert.equal(r.kind, 'active');
  assert.equal(r.at, '2026-11-20T09:30:00Z');
});
test('near-close guidance uses bounded24h window at server measurement, excluding closed/far/no-close', () => {
  const now = '2026-11-20T00:00:00Z';
  assert.equal(
    deadlineGuidance({ closesAt: '2026-11-21T00:00:00Z' }, now).kind,
    'closing',
  );
  for (const closesAt of [
    null,
    'bad',
    '2026-11-20T00:00:00Z',
    '2026-11-21T00:00:01Z',
  ])
    assert.equal(deadlineGuidance({ closesAt }, now), null);
  assert.equal(
    deadlineGuidance({ closesAt: '2026-11-21T00:00:00Z' }, undefined),
    null,
  );
});
test('completed attempts never create resume/deadline hints from stale fields', () => {
  assert.equal(
    deadlineGuidance(
      {
        closesAt: null,
        attempts: [{ status: 'SUBMITTED', deadlineAt: '2026-11-20T00:00:00Z' }],
      },
      '2026-11-19T00:00:00Z',
    ),
    null,
  );
});
test('Student search/page/schedule context validates controls and ignores arbitrary redirects', () => {
  assert.deepEqual(
    readStudentOperationContext({
      search: 'An',
      page: '3',
      scheduleOrder: 'closing',
      redirect: 'https://external.test',
    }),
    { search: 'An', page: 3, scheduleOrder: 'closing' },
  );
  assert.deepEqual(
    readStudentOperationContext({
      search: ['x'],
      page: '-1',
      scheduleOrder: 'grade',
    }),
    { search: '', page: 1, scheduleOrder: 'recent' },
  );
  assert.equal(
    readStudentOperationContext({ search: 'x'.repeat(201) }).search.length,
    200,
  );
});
