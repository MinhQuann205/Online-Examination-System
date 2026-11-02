const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function evidenceLocation(env = process.env) {
  assert(
    uuid.test(env.EXAMSPACE_RESTART_RUN_ID || ''),
    'EXAMSPACE_RESTART_RUN_ID must be a UUID shared by prepare and verify',
  );
  const parent = path.resolve(
    env.EXAMSPACE_RESTART_EVIDENCE_DIR ||
      path.join(os.tmpdir(), 'examspace-restart'),
  );
  return {
    runId: env.EXAMSPACE_RESTART_RUN_ID,
    directory: path.join(parent, env.EXAMSPACE_RESTART_RUN_ID),
  };
}
function reserveEvidence(location) {
  fs.mkdirSync(path.dirname(location.directory), { recursive: true });
  fs.mkdirSync(location.directory); // EEXIST deliberately prevents stale reuse.
}
function writePrepared(location, identity, ids) {
  const data = {
    schemaVersion: 1,
    runId: location.runId,
    identity,
    ids,
    preparedAt: new Date().toISOString(),
  };
  validatePrepared(data, location, identity);
  fs.writeFileSync(
    path.join(location.directory, 'restart.json'),
    JSON.stringify(data, null, 2),
    { flag: 'wx' },
  );
}
function validatePrepared(data, location, identity) {
  assert.equal(data.schemaVersion, 1);
  assert.equal(data.runId, location.runId, 'Restart run identity mismatch');
  assert.deepEqual(
    data.identity,
    identity,
    'Restart database identity mismatch',
  );
  assert(
    Array.isArray(data.ids) &&
      data.ids.length === 115 &&
      new Set(data.ids).size === 115 &&
      data.ids.every((id) => uuid.test(id)),
    'Invalid attempt IDs',
  );
  assert(
    typeof data.preparedAt === 'string' &&
      Number.isFinite(Date.parse(data.preparedAt)),
    'Invalid prepared timestamp',
  );
  return data;
}
function readPrepared(location, identity) {
  const data = JSON.parse(
    fs.readFileSync(path.join(location.directory, 'restart.json'), 'utf8'),
  );
  return validatePrepared(data, location, identity);
}
function writeVerified(location, result) {
  fs.writeFileSync(
    path.join(location.directory, 'verification.json'),
    JSON.stringify(
      {
        ...result,
        runId: location.runId,
        verifiedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    { flag: 'wx' },
  );
}
module.exports = {
  evidenceLocation,
  reserveEvidence,
  writePrepared,
  readPrepared,
  writeVerified,
  validatePrepared,
};
