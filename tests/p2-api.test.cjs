const { test, before, after } = require('node:test');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const {
  assert,
  db,
  api: base,
  web,
  fixtures,
  call,
  assignment,
  start,
  waitUntil,
} = require('./p0-support.cjs');
let f;
before(async () => {
  // p0-support validated this exact test host/port/name before this hook.
  // A direct scheduler service must never inherit a development DATABASE_URL.
  process.env.DATABASE_URL = process.env.DATABASE_TEST_URL;
  f = await fixtures();
});
after(async () => {
  await db.end();
});

test('NT02: concurrent client 401s share rotation and every original request succeeds', async () => {
  // Missing access cookie has the same guard response as an expired JWT, without waiting 15m.
  const actor = {
    cookies: { refresh_token: f.studentA.cookies.refresh_token },
  };
  const nativeFetch = global.fetch;
  let refreshes = 0;
  global.fetch = async (url, init = {}) => {
    if (String(url).endsWith('/auth/refresh')) refreshes++;
    const response = await nativeFetch(url, {
      ...init,
      headers: {
        ...init.headers,
        Origin: web,
        Cookie: Object.entries(actor.cookies)
          .map(([k, v]) => `${k}=${v}`)
          .join('; '),
      },
    });
    for (const header of response.headers.getSetCookie()) {
      const [key, ...value] = header.split(';')[0].split('=');
      actor.cookies[key] = value.join('=');
    }
    return response;
  };
  try {
    process.env.NEXT_PUBLIC_API_URL = base;
    const ts = require('typescript');
    const file = path.resolve(__dirname, '../apps/web/src/lib/api.ts');
    const compiled = new Module(file, module);
    compiled._compile(
      ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText,
      file,
    );
    const { api } = compiled.exports;
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, () => api.me()),
    );
    assert.equal(results.filter((x) => x.status === 'fulfilled').length, 6);
    assert.equal(refreshes, 1);
    global.fetch = nativeFetch;
    const old = { cookies: { ...f.studentA.cookies } };
    await call(old, 'POST', '/auth/refresh', undefined, 401);
    f.studentA.cookies = actor.cookies;
  } finally {
    global.fetch = nativeFetch;
  }
});

test('NT02: PostgreSQL rotation CAS accepts only one concurrent replay', async () => {
  const { login } = require('./p0-support.cjs');
  await login(f.studentB);
  const cookies = { ...f.studentB.cookies };
  const requests = await Promise.all(
    Array.from({ length: 5 }, () =>
      call({ cookies: { ...cookies } }, 'POST', '/auth/refresh'),
    ),
  );
  assert.equal(requests.filter((x) => x.status === 200).length, 1);
  assert.equal(requests.filter((x) => x.status === 401).length, 4);
  assert(
    requests.every(
      (x) =>
        !JSON.stringify(x.data).match(
          /"(?:accessToken|refreshToken|passwordHash|refreshTokenHash)"/,
        ),
    ),
  );
});

test('NT02: logout still revokes a session when rotation won immediately before it', async () => {
  const { login } = require('./p0-support.cjs');
  await login(f.studentB);
  const old = { cookies: { ...f.studentB.cookies } };
  await call(f.studentB, 'POST', '/auth/refresh', undefined, 200);
  await call(old, 'POST', '/auth/logout', undefined, 204);
  await call(f.studentB, 'GET', '/auth/me', undefined, 401);
  await call(f.studentB, 'POST', '/auth/refresh', undefined, 401);
});

test('NT02: concurrent logout and refresh cannot leave an authenticated session', async () => {
  const { login } = require('./p0-support.cjs');
  for (let i = 0; i < 5; i++) {
    await login(f.studentB);
    const rotating = { cookies: { ...f.studentB.cookies } };
    const leaving = { cookies: { ...f.studentB.cookies } };
    const [rotation, logout] = await Promise.all([
      call(rotating, 'POST', '/auth/refresh'),
      call(leaving, 'POST', '/auth/logout'),
    ]);
    assert([200, 401].includes(rotation.status));
    assert.equal(logout.status, 204);
    await call(rotating, 'GET', '/auth/me', undefined, 401);
    await call(rotating, 'POST', '/auth/refresh', undefined, 401);
  }
});

test('NT02: real expired signed access JWT is rejected; concurrent client calls rotate once', async () => {
  const { fork } = require('node:child_process');
  const { randomUUID } = require('node:crypto');
  const { createRequire } = require('node:module');
  const { JwtService } = createRequire(
    path.resolve(__dirname, '../apps/api/package.json'),
  )('@nestjs/jwt');
  const secret = 'p2-expiry-' + randomUUID();
  const worker = fork(path.resolve(__dirname, 'p2-api-worker.cjs'), [], {
    silent: true,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      WEB_ORIGIN: web,
      JWT_ACCESS_SECRET: secret,
      JWT_REFRESH_SECRET: 'p2-refresh-' + randomUUID(),
    },
  });
  worker.stdout.resume();
  worker.stderr.resume();
  const nativeFetch = global.fetch;
  try {
    const port = await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Nest worker startup timeout')),
        15000,
      );
      worker.once('message', (m) => {
        clearTimeout(timer);
        resolve(m.port);
      });
      worker.once('exit', () => {
        clearTimeout(timer);
        reject(new Error('Nest worker exited before ready'));
      });
    });
    const endpoint = `http://127.0.0.1:${port}`;
    const response = await nativeFetch(endpoint + '/auth/login', {
      method: 'POST',
      headers: { Origin: web, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: f.teacherB.email,
        password: require('./p0-support.cjs').password,
      }),
    });
    assert.equal(response.status, 200);
    const cookies = Object.fromEntries(
      response.headers.getSetCookie().map((x) => {
        const [k, ...v] = x.split(';')[0].split('=');
        return [k, v.join('=')];
      }),
    );
    const expired = await new JwtService().signAsync(
      { sub: f.teacherB.id, role: 'TEACHER', version: 0, kind: 'access' },
      { secret, expiresIn: -1 },
    );
    cookies.access_token = expired;
    const header = () =>
      Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
    assert.equal(
      (
        await nativeFetch(endpoint + '/auth/me', {
          headers: { Cookie: header() },
        })
      ).status,
      401,
    );
    let refreshes = 0;
    global.fetch = async (url, init = {}) => {
      if (String(url).endsWith('/auth/refresh')) refreshes++;
      const r = await nativeFetch(url, {
        ...init,
        headers: { ...init.headers, Origin: web, Cookie: header() },
      });
      for (const x of r.headers.getSetCookie()) {
        const [k, ...v] = x.split(';')[0].split('=');
        cookies[k] = v.join('=');
      }
      return r;
    };
    process.env.NEXT_PUBLIC_API_URL = endpoint;
    const ts = require('typescript'),
      file = path.resolve(__dirname, '../apps/web/src/lib/api.ts'),
      compiled = new Module(file, module);
    compiled._compile(
      ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText,
      file,
    );
    const users = await Promise.all(
      Array.from({ length: 6 }, () => compiled.exports.api.me()),
    );
    assert(users.every((u) => u.id === f.teacherB.id));
    assert.equal(refreshes, 1);
    assert(users.every((u) => !('accessToken' in u || 'refreshToken' in u)));
  } finally {
    global.fetch = nativeFetch;
    process.env.NEXT_PUBLIC_API_URL = base;
    if (worker.connected) worker.send('stop');
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        worker.kill();
        resolve();
      }, 5000);
      worker.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
});

test('NT04/05: 125 persisted expired attempts, scheduler row failure isolation and idempotent grading', async () => {
  const asg = await assignment(f);
  const a = await start(f, asg);
  const ids = (
    await db.query(
      `INSERT INTO "ExamAttempt" (id,"examId","assignmentId","examVersionId","studentId","examVersion","examSnapshot",status,"startedAt","deadlineAt","createdAt","updatedAt")
    SELECT gen_random_uuid(),"examId","assignmentId","examVersionId","studentId","examVersion","examSnapshot",'IN_PROGRESS',now()-interval '10 days',now()-interval '9 days',now(),now() FROM "ExamAttempt" CROSS JOIN generate_series(1,125) WHERE id=$1`,
      [a.id],
    )
  ).rowCount;
  assert.equal(ids, 125);
  // SQL fixture deliberately has an old start, so it sorts ahead of unrelated audit fixtures.
  const rows = (
    await db.query(
      'SELECT id FROM "ExamAttempt" WHERE "assignmentId"=$1 AND id<>$2',
      [asg.id, a.id],
    )
  ).rows;
  const poison = rows[0].id;
  await db.query(
    `CREATE OR REPLACE FUNCTION p2_expiry_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id='${poison}'::uuid AND NEW.status='EXPIRED' THEN RAISE EXCEPTION 'P2 fixture fault'; END IF; RETURN NEW; END $$`,
  );
  await db.query(
    'CREATE TRIGGER p2_expiry_fault BEFORE UPDATE ON "ExamAttempt" FOR EACH ROW EXECUTE FUNCTION p2_expiry_fault()',
  );
  try {
    await waitUntil(
      async () =>
        (
          await db.query(
            'SELECT count(*)::int n FROM "ExamAttempt" WHERE "assignmentId"=$1 AND status=\'EXPIRED\'',
            [asg.id],
          )
        ).rows[0].n === 124,
      90000,
    );
    const row = (
      await db.query(
        'SELECT status,score,"submittedAt" FROM "ExamAttempt" WHERE id=$1',
        [poison],
      )
    ).rows[0];
    assert.deepEqual(row, {
      status: 'IN_PROGRESS',
      score: null,
      submittedAt: null,
    });
  } finally {
    await db.query('DROP TRIGGER IF EXISTS p2_expiry_fault ON "ExamAttempt"');
    await db.query('DROP FUNCTION IF EXISTS p2_expiry_fault()');
  }
  await waitUntil(
    async () =>
      (await db.query('SELECT status FROM "ExamAttempt" WHERE id=$1', [poison]))
        .rows[0].status === 'EXPIRED',
    30000,
  );
  const before = (
    await db.query(
      'SELECT id,status,score,"maxScore","submittedAt" FROM "ExamAttempt" WHERE "assignmentId"=$1 AND id<>$2 ORDER BY id',
      [asg.id, a.id],
    )
  ).rows;
  assert(before.every((x) => x.score === '0.00' && x.maxScore === '6.75'));
  await Promise.all([
    call(f.studentA, 'POST', `/exam-attempts/${poison}/submit`, undefined, 201),
    call(f.studentA, 'POST', `/exam-attempts/${poison}/submit`, undefined, 201),
  ]);
  assert.deepEqual(
    (
      await db.query(
        'SELECT id,status,score,"maxScore","submittedAt" FROM "ExamAttempt" WHERE "assignmentId"=$1 AND id<>$2 ORDER BY id',
        [asg.id, a.id],
      )
    ).rows,
    before,
  );
});

test('NT05: scheduler and submit waiting on the same PostgreSQL row finalize exactly once', async () => {
  const {
    PrismaService,
  } = require('../apps/api/dist/prisma/prisma.service.js');
  const {
    GradingService,
  } = require('../apps/api/dist/grading/grading.service.js');
  const {
    ExamAttemptsService,
  } = require('../apps/api/dist/exam-attempts/exam-attempts.service.js');
  const prisma = new PrismaService();
  await prisma.$connect();
  const scheduler = new ExamAttemptsService(prisma, new GradingService());
  const a = await start(f, await assignment(f));
  await db.query(
    'UPDATE "ExamAttempt" SET "startedAt"=timestamp \'1980-01-01\',"deadlineAt"=now()-interval \'1 second\' WHERE id=$1',
    [a.id],
  );
  const lock = await db.connect();
  let pending;
  try {
    await lock.query('BEGIN');
    await lock.query('SELECT id FROM "ExamAttempt" WHERE id=$1 FOR UPDATE', [
      a.id,
    ]);
    pending = Promise.all([
      scheduler.expireDueAttempts(),
      call(f.studentA, 'POST', `/exam-attempts/${a.id}/submit`, undefined, 201),
    ]);
    await waitUntil(
      async () =>
        (
          await db.query(
            "SELECT count(*)::int n FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE '%ExamAttempt%' AND query LIKE '%FOR UPDATE%'",
          )
        ).rows[0].n >= 2,
    );
    await lock.query('COMMIT');
    await pending;
    const first = (
      await db.query(
        'SELECT status,score,"maxScore","submittedAt" FROM "ExamAttempt" WHERE id=$1',
        [a.id],
      )
    ).rows[0];
    assert.equal(first.status, 'EXPIRED');
    assert.equal(first.score, '0.00');
    assert.equal(first.maxScore, '6.75');
    assert(first.submittedAt);
    await call(
      f.studentA,
      'POST',
      `/exam-attempts/${a.id}/submit`,
      undefined,
      201,
    );
    assert.deepEqual(
      (
        await db.query(
          'SELECT status,score,"maxScore","submittedAt" FROM "ExamAttempt" WHERE id=$1',
          [a.id],
        )
      ).rows[0],
      first,
    );
  } finally {
    await lock.query('ROLLBACK');
    lock.release();
    if (pending) await pending.catch(() => {});
    await prisma.$disconnect();
  }
});

test('F10 regression: assignment summary duration follows pinned v1 after publishing a shorter v2', async () => {
  const { suffix } = require('./p0-support.cjs');
  const exam = (
    await call(
      f.teacherA,
      'POST',
      '/exams',
      {
        title: `P2 duration ${suffix}`,
        durationMin: 30,
        questions: [{ questionId: f.questions[0].id, points: 1 }],
      },
      201,
    )
  ).data;
  const v1 = (
    await call(f.teacherA, 'POST', `/exams/${exam.id}/publish`, undefined, 201)
  ).data;
  await call(
    f.teacherA,
    'POST',
    `/exams/${exam.id}/new-version`,
    undefined,
    201,
  );
  await call(
    f.teacherA,
    'PATCH',
    `/exams/${exam.id}`,
    {
      title: exam.title,
      durationMin: 5,
      questions: [{ questionId: f.questions[0].id, points: 1 }],
    },
    200,
  );
  await call(f.teacherA, 'POST', `/exams/${exam.id}/publish`, undefined, 201);
  const asg = await assignment(f, { examId: exam.id, examVersionId: v1.id });
  const listing = (
    await call(
      f.studentA,
      'GET',
      `/exam-assignments?examId=${exam.id}`,
      undefined,
      200,
    )
  ).data;
  const detail = (
    await call(f.studentA, 'GET', `/exam-assignments/${asg.id}`, undefined, 200)
  ).data;
  assert.equal(listing.items[0].exam.durationMin, 30);
  assert.equal(detail.exam.durationMin, 30);
  assert.equal(asg.exam.durationMin, 30);
  for (const item of [listing, detail, asg])
    assert(
      !JSON.stringify(item).match(/isCorrect|questionSnapshot|"snapshot"/),
    );
});
