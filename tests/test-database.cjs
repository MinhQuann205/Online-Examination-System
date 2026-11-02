const assert = require('node:assert/strict');

function testDatabaseConfig(env = process.env) {
  assert(
    env.DATABASE_TEST_URL,
    'DATABASE_TEST_URL is required; tests cannot silently skip',
  );
  assert.equal(
    env.TEST_DATABASE_HOST,
    '127.0.0.1',
    'Explicit loopback test host is required',
  );
  assert(
    /^[1-9][0-9]{3,4}$/.test(env.TEST_DATABASE_PORT || ''),
    'Explicit TEST_DATABASE_PORT is required',
  );
  const port = Number(env.TEST_DATABASE_PORT);
  assert(port <= 65535 && port !== 5432, 'Development port is forbidden');
  for (const name of [
    'TEST_DATABASE_SYSTEM_IDENTIFIER',
    'DEVELOPMENT_DATABASE_SYSTEM_IDENTIFIER',
  ])
    assert(/^[0-9]{10,20}$/.test(env[name] || ''), name + ' is required');
  assert.notEqual(
    env.TEST_DATABASE_SYSTEM_IDENTIFIER,
    env.DEVELOPMENT_DATABASE_SYSTEM_IDENTIFIER,
    'Test and development instances must differ',
  );
  let url;
  try {
    url = new URL(env.DATABASE_TEST_URL);
  } catch {
    throw new Error('Invalid test database URL');
  }
  assert(
    ['postgres:', 'postgresql:'].includes(url.protocol),
    'Expected PostgreSQL URL',
  );
  assert.equal(
    url.hostname,
    env.TEST_DATABASE_HOST,
    'Host does not match explicit test configuration',
  );
  assert.equal(
    Number(url.port),
    port,
    'Port does not match explicit test configuration',
  );
  assert.equal(
    url.pathname,
    '/online_exam_phase3_test',
    'Only the fixture test database is allowed',
  );
  assert.equal(url.search, '', 'Connection overrides are forbidden');
  return {
    connectionString: url.toString(),
    host: url.hostname,
    port,
    database: 'online_exam_phase3_test',
    systemIdentifier: env.TEST_DATABASE_SYSTEM_IDENTIFIER,
    developmentSystemIdentifier: env.DEVELOPMENT_DATABASE_SYSTEM_IDENTIFIER,
  };
}

const identitySql =
  'SELECT current_database() AS database, (SELECT system_identifier::text FROM pg_control_system()) AS system_identifier, pg_is_in_recovery() AS recovery';
async function verifyTestDatabase(db, config) {
  const result = await db.query(identitySql);
  const identity = result.rows[0];
  assert.equal(
    identity.database,
    config.database,
    'Unexpected SQL database identity',
  );
  assert.equal(
    identity.system_identifier,
    config.systemIdentifier,
    'Unexpected PostgreSQL instance',
  );
  assert.notEqual(
    identity.system_identifier,
    config.developmentSystemIdentifier,
    'Development instance is forbidden',
  );
  assert.equal(
    identity.recovery,
    false,
    'Test instance must be writable primary',
  );
  return {
    database: config.database,
    host: config.host,
    port: config.port,
    systemIdentifier: config.systemIdentifier,
  };
}

function migrationDatabaseConfig(config, name) {
  assert(
    /^online_exam_phase3_migration_test_[a-f0-9]{8}$/.test(name),
    'Invalid migration test database name',
  );
  const url = new URL(config.connectionString);
  url.pathname = '/' + name;
  return { ...config, connectionString: url.toString(), database: name };
}

// Every query/connect is gated, including queries outside fixtures(). Verification
// uses a raw connection and finishes before the caller receives any connection.
function createTestPool(Pool, config) {
  const pool = new Pool({
    connectionString: config.connectionString,
    application_name: 'examspace-verified-test',
  });
  const connect = pool.connect.bind(pool),
    query = pool.query.bind(pool);
  let verified;
  const ready = () =>
    (verified ??= verifyTestDatabase(
      {
        query: async (sql) => {
          const client = await connect();
          try {
            return await client.query(sql);
          } finally {
            client.release();
          }
        },
      },
      config,
    ));
  pool.connect = function (callback) {
    if (callback) {
      ready().then(
        () => connect(callback),
        (error) => callback(error),
      );
      return;
    }
    return ready().then(() => connect());
  };
  pool.query = async (...args) => {
    await ready();
    return query(...args);
  };
  pool.verifiedIdentity = ready;
  return pool;
}
module.exports = {
  testDatabaseConfig,
  verifyTestDatabase,
  migrationDatabaseConfig,
  createTestPool,
};
