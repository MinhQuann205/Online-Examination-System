const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');
const { randomUUID } = require('node:crypto');
const apiRequire = createRequire(
  path.resolve(__dirname, '../apps/api/package.json'),
);
const { Pool } = apiRequire('pg');
const argon2 = apiRequire('argon2');
const api = process.env.P0_API_URL || 'http://localhost:4000';
const web = process.env.P0_WEB_URL || 'http://localhost:3000';
const { testDatabaseConfig, createTestPool } = require('./test-database.cjs');
const db = createTestPool(Pool, testDatabaseConfig());
const suffix = randomUUID().slice(0, 8);
const password = `P0-test-only!${randomUUID()}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function call(actor, method, endpoint, body, expected, headers = {}) {
  const response = await fetch(api + endpoint, {
    method,
    headers: {
      Origin: web,
      ...(actor
        ? {
            Cookie: Object.entries(actor.cookies)
              .map(([k, v]) => `${k}=${v}`)
              .join('; '),
          }
        : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(15000),
  });
  for (const value of response.headers.getSetCookie()) {
    const part = value.split(';')[0],
      index = part.indexOf('=');
    if (actor) actor.cookies[part.slice(0, index)] = part.slice(index + 1);
  }
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (expected !== undefined)
    assert.equal(
      response.status,
      expected,
      `${method} ${endpoint}: ${response.status}, expected ${expected}`,
    );
  return { status: response.status, data, headers: response.headers };
}

async function login(actor) {
  return call(
    actor,
    'POST',
    '/auth/login',
    { email: actor.email, password },
    200,
  );
}

async function fixtures() {
  assert.equal(
    (await db.query('SELECT current_database() AS name')).rows[0].name,
    'online_exam_phase3_test',
  );
  const admin = {
    id: randomUUID(),
    email: `p0-admin-${suffix}@example.test`,
    fullName: 'P0 Admin',
    role: 'ADMIN',
    cookies: {},
  };
  await db.query(
    'INSERT INTO "User" (id,email,"fullName","passwordHash",role,"updatedAt") VALUES ($1,$2,$3,$4,$5,now())',
    [
      admin.id,
      admin.email,
      admin.fullName,
      await argon2.hash(password),
      admin.role,
    ],
  );
  // If the running API points at a different database this bootstrap login fails,
  // before any application mutation is attempted.
  await login(admin);
  const actors = { admin };
  for (const [name, role] of [
    ['teacherA', 'TEACHER'],
    ['teacherB', 'TEACHER'],
    ['studentA', 'STUDENT'],
    ['studentB', 'STUDENT'],
  ]) {
    const result = await call(
      admin,
      'POST',
      '/users',
      {
        email: `p0-${name}-${suffix}@example.test`,
        fullName: `P0 ${name} ${suffix}`,
        role,
        password,
      },
      201,
    );
    assert(!JSON.stringify(result.data).match(/password|token/i));
    actors[name] = { ...result.data, cookies: {} };
    await login(actors[name]);
  }
  const classes = {};
  for (const key of ['A', 'B']) {
    classes[key] = (
      await call(
        admin,
        'POST',
        '/classes',
        {
          name: `P0 Class ${key} ${suffix}`,
          code: `P0-${key}-${suffix}`,
          teacherId: actors[`teacher${key}`].id,
        },
        201,
      )
    ).data;
    await call(
      admin,
      'POST',
      `/classes/${classes[key].id}/students`,
      { studentId: actors[`student${key}`].id },
      201,
    );
  }
  const questions = [];
  for (const type of ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'MATCHING']) {
    questions.push(
      (
        await call(
          actors.teacherA,
          'POST',
          '/questions',
          {
            type,
            content: `P0 ${type} ${suffix}`,
            ...(type === 'MATCHING'
              ? {
                  matchingPairs: [
                    { leftText: 'P0 left one', rightText: 'P0 right one' },
                    { leftText: 'P0 left two', rightText: 'P0 right two' },
                  ],
                }
              : {
                  options: [
                    { content: 'P0 A', isCorrect: true },
                    { content: 'P0 B', isCorrect: type === 'MULTIPLE_CHOICE' },
                    { content: 'P0 C', isCorrect: false },
                  ],
                }),
          },
          201,
        )
      ).data,
    );
  }
  const exam = (
    await call(
      actors.teacherA,
      'POST',
      '/exams',
      {
        title: `P0 Exam ${suffix}`,
        durationMin: 30,
        questions: questions.map((q, index) => ({
          questionId: q.id,
          points: [2.5, 1.25, 3][index],
        })),
      },
      201,
    )
  ).data;
  const version = (
    await call(
      actors.teacherA,
      'POST',
      `/exams/${exam.id}/publish`,
      undefined,
      201,
    )
  ).data;
  return { ...actors, classes, questions, exam, version };
}

async function assignment(f, overrides = {}, actor = f.teacherA) {
  return (
    await call(
      actor,
      'POST',
      '/exam-assignments',
      {
        examId: f.exam.id,
        studentId: f.studentA.id,
        showScore: true,
        showAnswers: true,
        ...overrides,
      },
      201,
    )
  ).data;
}
async function start(f, asg, actor = f.studentA) {
  return (
    await call(
      actor,
      'POST',
      `/exam-assignments/${asg.id}/start`,
      undefined,
      201,
    )
  ).data;
}
async function answers(id) {
  return (
    await db.query(
      'SELECT "questionId",answer,revision FROM "AttemptAnswer" WHERE "attemptId"=$1',
      [id],
    )
  ).rows;
}
async function waitUntil(fn, timeout = 10000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await fn()) return;
    await sleep(30);
  }
  throw new Error('Timed out waiting for controlled condition');
}
async function lockOrder(id, actions, table = 'ExamAttempt') {
  assert(['ExamAttempt', 'ExamAssignment'].includes(table));
  const client = await db.connect(),
    pending = [];
  await client.query('BEGIN');
  await client.query(`SELECT id FROM "${table}" WHERE id=$1 FOR UPDATE`, [id]);
  try {
    for (let index = 0; index < actions.length; index++) {
      pending.push(actions[index]());
      await waitUntil(
        async () =>
          Number(
            (
              await db.query(
                "SELECT count(*) AS n FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE $1",
                [`%${table}%FOR UPDATE%`],
              )
            ).rows[0].n,
          ) >=
          index + 1,
      );
    }
    await client.query('COMMIT');
    return await Promise.all(pending);
  } finally {
    await client.query('ROLLBACK');
    client.release();
    await Promise.allSettled(pending);
  }
}

module.exports = {
  assert,
  api,
  web,
  db,
  suffix,
  password,
  sleep,
  call,
  login,
  fixtures,
  assignment,
  start,
  answers,
  waitUntil,
  lockOrder,
};
