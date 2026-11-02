const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const {
  testDatabaseConfig,
  verifyTestDatabase,
  migrationDatabaseConfig,
  createTestPool,
} = require('./test-database.cjs');
const evidence = require('./restart-evidence.cjs');
const environment = (port) => ({
  DATABASE_TEST_URL:
    'postgresql://fixture:dummy@127.0.0.1:' + port + '/online_exam_phase3_test',
  TEST_DATABASE_HOST: '127.0.0.1',
  TEST_DATABASE_PORT: String(port),
  TEST_DATABASE_SYSTEM_IDENTIFIER: '1000000000000000001',
  DEVELOPMENT_DATABASE_SYSTEM_IDENTIFIER: '1000000000000000002',
});
for (const port of [15433, 16444])
  test(
    'GR02: configured test port ' + port + ' verifies SQL identity',
    async () => {
      const config = testDatabaseConfig(environment(port));
      const identity = await verifyTestDatabase(
        {
          query: async () => ({
            rows: [
              {
                database: config.database,
                system_identifier: config.systemIdentifier,
                recovery: false,
              },
            ],
          }),
        },
        config,
      );
      assert.equal(identity.port, port);
    },
  );
for (const [name, change] of [
  ['missing URL', { DATABASE_TEST_URL: '' }],
  [
    'development port',
    {
      TEST_DATABASE_PORT: '5432',
      DATABASE_TEST_URL:
        'postgresql://dummy@127.0.0.1:5432/online_exam_phase3_test',
    },
  ],
  [
    'development database',
    { DATABASE_TEST_URL: 'postgresql://dummy@127.0.0.1:15433/online_exam' },
  ],
  [
    'wrong host',
    {
      DATABASE_TEST_URL:
        'postgresql://dummy@localhost:15433/online_exam_phase3_test',
    },
  ],
  [
    'wrong port',
    {
      DATABASE_TEST_URL:
        'postgresql://dummy@127.0.0.1:16444/online_exam_phase3_test',
    },
  ],
  [
    'same instance configured',
    { TEST_DATABASE_SYSTEM_IDENTIFIER: '1000000000000000002' },
  ],
  ['missing instance', { TEST_DATABASE_SYSTEM_IDENTIFIER: '' }],
  [
    'connection override',
    {
      DATABASE_TEST_URL:
        'postgresql://dummy@127.0.0.1:15433/online_exam_phase3_test?host=localhost',
    },
  ],
])
  test('GR02: rejects ' + name + ' before connecting', () => {
    assert.throws(() =>
      testDatabaseConfig({ ...environment(15433), ...change }),
    );
  });
for (const [name, row] of [
  [
    'wrong database',
    {
      database: 'online_exam',
      system_identifier: '1000000000000000001',
      recovery: false,
    },
  ],
  [
    'wrong instance',
    {
      database: 'online_exam_phase3_test',
      system_identifier: '1000000000000000003',
      recovery: false,
    },
  ],
  [
    'development instance',
    {
      database: 'online_exam_phase3_test',
      system_identifier: '1000000000000000002',
      recovery: false,
    },
  ],
  [
    'recovery instance',
    {
      database: 'online_exam_phase3_test',
      system_identifier: '1000000000000000001',
      recovery: true,
    },
  ],
])
  test('GR02: rejects SQL ' + name, async () => {
    await assert.rejects(
      verifyTestDatabase(
        { query: async () => ({ rows: [row] }) },
        testDatabaseConfig(environment(15433)),
      ),
    );
  });
test('GR02: migration database names cannot escape the test namespace', () => {
  const config = testDatabaseConfig(environment(15433));
  assert.equal(
    migrationDatabaseConfig(
      config,
      'online_exam_phase3_migration_test_abcdef12',
    ).database,
    'online_exam_phase3_migration_test_abcdef12',
  );
  for (const name of [
    'online_exam',
    'online_exam_phase3_test',
    'online_exam_phase3_migration_test_x;DROP DATABASE',
  ])
    assert.throws(() => migrationDatabaseConfig(config, name));
});
test('GR02: failed identity blocks every query and connect, not only fixture setup', async () => {
  let writes = 0;
  class FakePool {
    async connect() {
      return {
        query: async () => ({
          rows: [
            {
              database: 'online_exam',
              system_identifier: '1000000000000000002',
              recovery: false,
            },
          ],
        }),
        release() {},
      };
    }
    async query() {
      writes++;
    }
  }
  const pool = createTestPool(FakePool, testDatabaseConfig(environment(15433)));
  await assert.rejects(pool.query('INSERT forbidden'));
  await assert.rejects(pool.connect());
  assert.equal(writes, 0);
});
test('GR06: clean TEMP, matching run, existing evidence, wrong run/database and no overwrites', () => {
  const parent = fs.mkdtempSync(
    path.join(os.tmpdir(), 'examspace-restart-regression-'),
  );
  const location = evidence.evidenceLocation({
    EXAMSPACE_RESTART_EVIDENCE_DIR: path.join(parent, 'new', 'nested'),
    EXAMSPACE_RESTART_RUN_ID: randomUUID(),
  });
  evidence.reserveEvidence(location);
  const identity = {
    database: 'online_exam_phase3_test',
    host: '127.0.0.1',
    port: 15433,
    systemIdentifier: '1000000000000000001',
  };
  const ids = Array.from({ length: 115 }, () => randomUUID());
  evidence.writePrepared(location, identity, ids);
  const original = fs.readFileSync(
    path.join(location.directory, 'restart.json'),
  );
  assert.deepEqual(evidence.readPrepared(location, identity).ids, ids);
  assert.throws(() => evidence.reserveEvidence(location));
  assert.throws(() => evidence.writePrepared(location, identity, ids));
  const data = evidence.readPrepared(location, identity);
  assert.throws(() =>
    evidence.validatePrepared(
      data,
      { ...location, runId: randomUUID() },
      identity,
    ),
  );
  assert.throws(() =>
    evidence.readPrepared(location, { ...identity, database: 'online_exam' }),
  );
  assert.throws(() =>
    evidence.validatePrepared({ ...data, ids: [ids[0]] }, location, identity),
  );
  assert.throws(() =>
    evidence.evidenceLocation({ EXAMSPACE_RESTART_RUN_ID: '../old' }),
  );
  evidence.writeVerified(location, { result: 'PASS', expired: 115 });
  assert.throws(() => evidence.writeVerified(location, { result: 'PASS' }));
  assert.deepEqual(
    fs.readFileSync(path.join(location.directory, 'restart.json')),
    original,
  );
  const another = evidence.evidenceLocation({
    EXAMSPACE_RESTART_EVIDENCE_DIR: path.dirname(location.directory),
    EXAMSPACE_RESTART_RUN_ID: randomUUID(),
  });
  evidence.reserveEvidence(another);
  evidence.writePrepared(another, identity, ids);
  assert.deepEqual(
    fs.readFileSync(path.join(location.directory, 'restart.json')),
    original,
  );
});
