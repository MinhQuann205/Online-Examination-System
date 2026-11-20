import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  prepareQuestion,
  validPointText,
  validLocalDateTime,
  examAuthoringError,
  prepareNewUser,
  prepareUserProfile,
  prepareClass,
} from '../src/lib/authoring-validation.ts';
import { prepareAssignment } from '../src/lib/assignment-form.ts';
import { addQuestions } from '../src/lib/question-selection.ts';
import {
  normalizedEmailSchema,
  loginSchema,
  questionInputSchema,
} from '@exam/shared';
const id = '10000000-0000-4000-8000-000000000001',
  v1 = '20000000-0000-4000-8000-000000000001';
const question = {
  type: 'SINGLE_CHOICE',
  content: ' Valid ',
  topic: ' Math ',
  difficulty: 'MEDIUM',
  explanation: ' Why ',
  options: [
    { content: ' A ', isCorrect: true },
    { content: ' B ', isCorrect: false },
  ],
};
test('choice authoring trims fields and preserves one correct answer without deriving keys from labels', () => {
  const r = prepareQuestion(question);
  assert.equal(r.ok, true);
  assert.equal(r.body.content, 'Valid');
  assert.equal(r.body.options[0].content, 'A');
  assert.equal(r.body.options[0].isCorrect, true);
  assert.equal(r.body.explanation, 'Why');
});
test('removing the correct choice must require an explicit replacement before saving', () => {
  const options = [
    { content: 'B', isCorrect: false },
    { content: 'C', isCorrect: false },
  ];
  assert.equal(prepareQuestion({ ...question, options }).ok, false);
  options[1].isCorrect = true;
  assert.equal(prepareQuestion({ ...question, options }).ok, true);
});
test('question authoring rejects whitespace, duplicate trimmed choices, too few options and conflicting correct counts', () => {
  for (const patch of [
    { content: '  ' },
    { options: [question.options[0]] },
    { options: [question.options[0], { content: ' A', isCorrect: false }] },
    { options: question.options.map((x) => ({ ...x, isCorrect: true })) },
    { difficulty: 'other' },
    { topic: 'x'.repeat(121) },
    { content: 'x'.repeat(10001) },
    { explanation: 'x'.repeat(5001) },
    {
      options: [
        { content: 'x'.repeat(1001), isCorrect: true },
        question.options[1],
      ],
    },
  ])
    assert.equal(prepareQuestion({ ...question, ...patch }).ok, false);
});
test('MULTIPLE_CHOICE accepts multiple correct answers but rejects zero; at least two options remain required', () => {
  assert.equal(
    prepareQuestion({
      ...question,
      type: 'MULTIPLE_CHOICE',
      options: question.options.map((x) => ({ ...x, isCorrect: true })),
    }).ok,
    true,
  );
  assert.equal(
    prepareQuestion({
      ...question,
      type: 'MULTIPLE_CHOICE',
      options: question.options.map((x) => ({ ...x, isCorrect: false })),
    }).ok,
    false,
  );
});
test('MATCHING requires two complete unique pairs and cannot carry choice keys', () => {
  const q = {
    type: 'MATCHING',
    content: 'Match',
    matchingPairs: [
      { leftText: ' one ', rightText: ' A ' },
      { leftText: 'two', rightText: 'B' },
    ],
  };
  assert.equal(prepareQuestion(q).ok, true);
  for (const matchingPairs of [
    [q.matchingPairs[0]],
    [
      { leftText: 'one', rightText: 'A' },
      { leftText: 'one ', rightText: 'B' },
    ],
    [
      { leftText: 'one', rightText: 'A' },
      { leftText: 'two', rightText: 'A ' },
    ],
    [
      { leftText: 'one', rightText: 'A' },
      { leftText: 'two', rightText: ' ' },
    ],
  ])
    assert.equal(prepareQuestion({ ...q, matchingPairs }).ok, false);
  assert.equal(
    questionInputSchema.safeParse({ ...q, options: question.options }).success,
    false,
  );
  assert.equal(
    questionInputSchema.safeParse({
      ...question,
      matchingPairs: q.matchingPairs,
    }).success,
    false,
  );
});
test('question size boundaries accept 10000/5000/120 and reject one extra character', () => {
  assert.equal(
    prepareQuestion({
      ...question,
      content: 'x'.repeat(10000),
      explanation: 'x'.repeat(5000),
      topic: 'x'.repeat(120),
    }).ok,
    true,
  );
});
test('calendar validation rejects normalized impossible days, leap years and invalid time components', () => {
  for (const value of [
    '2026-02-29T12:00',
    '2026-02-30T12:00',
    '2026-04-31T12:00',
    '2026-00-01T12:00',
    '2026-01-01T24:00',
    '2026-01-01T12:60',
    '2026-01-01T12:00:60',
    '2026-01-01',
    'garbage',
  ])
    assert.equal(validLocalDateTime(value), false, value);
  for (const value of ['', '2028-02-29T23:59', '2026-11-17T12:00:01'])
    assert.equal(validLocalDateTime(value), true, value);
});
test('a local DST gap is rejected instead of converting a different hour to UTC', () => {
  const script =
    "import {validLocalDateTime} from '@exam/shared'; if(validLocalDateTime('2026-03-08T02:30') || !validLocalDateTime('2026-03-08T03:30')) process.exit(1);";
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: process.cwd(),
    env: { ...process.env, TZ: 'America/New_York' },
    encoding: 'utf8',
    windowsHide: true,
  });
  assert.equal(r.status, 0, r.stderr);
});
test('points accept decimal cents only; reject coercion syntax, zero, nonfinite and overflow', () => {
  for (const value of ['0.01', '.25', '2.50', '999999.99', ' 1 '])
    assert.equal(validPointText(value), true, value);
  for (const value of [
    '',
    ' ',
    '0',
    '-1',
    '1e2',
    '0x10',
    'Infinity',
    'NaN',
    '1.001',
    '1000000',
    '1,5',
  ])
    assert.equal(validPointText(value), false, value);
});
const exam = {
  title: ' Exam ',
  description: '',
  durationMin: 30,
  order: [id],
  points: { [id]: '1.25' },
};
test('exam validation accepts valid endpoints and enforces trimmed title, duration, selection and total cents', () => {
  assert.equal(examAuthoringError(exam), null);
  for (const patch of [
    { title: ' ' },
    { title: 'x'.repeat(201) },
    { description: 'x'.repeat(5001) },
    { durationMin: 0 },
    { durationMin: 1441 },
    { durationMin: 1.5 },
    { order: [] },
    { order: [id, id] },
    { points: { [id]: '1e2' } },
  ])
    assert.equal(typeof examAuthoringError({ ...exam, ...patch }), 'string');
  assert.equal(
    examAuthoringError({
      ...exam,
      durationMin: 1440,
      title: 'x'.repeat(200),
      points: { [id]: '999999.99' },
    }),
    null,
  );
  assert.equal(
    typeof examAuthoringError({
      ...exam,
      order: [id, v1],
      points: { [id]: '999999.99', [v1]: '0.01' },
    }),
    'string',
  );
});
test('bulk selection retains order/points, deduplicates a page and rejects 201 atomically', () => {
  const order = Array.from({ length: 199 }, (_, i) => String(i)),
    points = { 0: '2.5' };
  const r = addQuestions(order, points, ['198', 'new', 'new'], '1.25');
  assert.equal(r.order.length, 200);
  assert.equal(r.points['0'], '2.5');
  assert.equal(r.points.new, '1.25');
  assert.deepEqual(order.length, 199);
  assert.deepEqual(points, { 0: '2.5' });
  assert.throws(() => addQuestions(r.order, r.points, ['extra'], '1'));
  assert.equal(r.order.length, 200);
});
test('bulk selection rejects invalid default points before changing selections', () => {
  for (const value of ['', '0x10', '1e2', '0', '1.001'])
    assert.throws(() => addQuestions([id], { [id]: '3' }, [v1], value));
});
const fields = {
  examId: id,
  examVersionId: v1,
  targetKind: 'class',
  targetId: id,
  opensAt: '',
  closesAt: '',
  maxAttempts: '1',
  showScore: true,
  showAnswers: false,
};
const choices = {
  exams: [{ id, title: 'Exam' }],
  versions: [{ id: v1, number: 1 }],
  targets: [{ id, label: 'Class' }],
};
test('assignment attempts reject coercible syntax and schedules reject impossible/equal/reversed times before review', () => {
  for (const patch of [
    { maxAttempts: '' },
    { maxAttempts: '1e1' },
    { maxAttempts: '0x10' },
    { maxAttempts: '0' },
    { maxAttempts: '21' },
    { opensAt: '2026-02-30T12:00' },
    { opensAt: '2026-11-17T12:00', closesAt: '2026-11-17T12:00' },
    { opensAt: '2026-11-17T12:00', closesAt: '2026-11-17T11:59' },
  ])
    assert.equal(prepareAssignment({ ...fields, ...patch }, choices).ok, false);
  for (const maxAttempts of ['1', '20'])
    assert.equal(
      prepareAssignment({ ...fields, maxAttempts }, choices).ok,
      true,
    );
});
test('email normalization happens before validation in profile, create and login', () => {
  assert.equal(
    normalizedEmailSchema.parse(' USER@Example.test '),
    'user@example.test',
  );
  assert.equal(
    loginSchema.parse({ email: ' USER@Example.test ', password: 'password' })
      .email,
    'user@example.test',
  );
  assert.equal(
    prepareUserProfile({
      fullName: ' Test User ',
      email: ' USER@Example.test ',
    }).fullName,
    'Test User',
  );
});
test('Admin user form validates trimmed fields, roles and password boundaries without rewriting password', () => {
  const input = {
    fullName: ' User ',
    email: ' USER@Example.test ',
    role: 'TEACHER',
    password: 'x'.repeat(12),
  };
  assert.equal(prepareNewUser(input).email, 'user@example.test');
  assert.equal(
    prepareNewUser({ ...input, password: 'x'.repeat(128) }).password.length,
    128,
  );
  for (const patch of [
    { fullName: ' ' },
    { fullName: 'x'.repeat(151) },
    { email: 'bad' },
    { role: 'ADMIN' },
    { password: 'x'.repeat(11) },
    { password: 'x'.repeat(129) },
  ])
    assert.throws(() => prepareNewUser({ ...input, ...patch }));
  assert.throws(() =>
    prepareUserProfile({ fullName: ' ', email: input.email }),
  );
});
test('class create/edit validate teacher UUID, name/code/description boundaries and trim before mutation', () => {
  const input = {
    name: ' Class ',
    code: ' C1 ',
    description: ' notes ',
    teacherId: id,
  };
  assert.deepEqual(prepareClass(input, true), {
    name: 'Class',
    code: 'C1',
    description: 'notes',
    teacherId: id,
  });
  for (const patch of [
    { name: ' ' },
    { name: 'x'.repeat(151) },
    { code: 'x' },
    { code: 'x'.repeat(41) },
    { teacherId: '' },
    { description: 'x'.repeat(2001) },
  ])
    assert.throws(() => prepareClass({ ...input, ...patch }, true));
  assert.equal(
    prepareClass(
      {
        ...input,
        name: 'x'.repeat(150),
        code: 'x'.repeat(40),
        description: 'x'.repeat(2000),
      },
      true,
    ).name.length,
    150,
  );
  assert.equal(Object.hasOwn(prepareClass(input), 'code'), false);
  assert.throws(() => prepareClass({ ...input, name: ' ' }));
});
